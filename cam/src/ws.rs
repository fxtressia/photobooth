use std::{sync::Arc, time::Duration};

use futures_util::{SinkExt, StreamExt};

use reqwest::Client;
use rustix::fs::Timespec;
use serde::{Deserialize, Serialize};
use tokio_tungstenite::{
    connect_async,
    tungstenite::{Message, protocol::frame::coding::CloseCode},
};

use crate::{VenueConfig, utils::CLOCK_ID};

#[derive(Deserialize, Serialize)]
pub struct User {
    pub auth0_id: String,
}

#[derive(Deserialize, Serialize)]
pub struct Tier {
    pub id: String,
    pub name: String,
    pub limits: Limits,
}

#[derive(Deserialize, Serialize)]
pub struct PusherEvent<A> {
    pub event: String,
    pub data: A,
}

#[derive(Serialize)]
pub struct SubscribePayload {
    pub channel: String,
    pub auth: Option<String>,
    pub channel_data: Option<String>,
}

#[derive(Serialize, Deserialize)]
pub struct PresenceAuthBody {
    auth: String,
    channel_data: String,
}

#[derive(Serialize, Deserialize)]
pub struct UserAuthBody {
    auth: String,
    user_data: String,
}
#[derive(Serialize, Deserialize)]
pub struct AuthResponseBody {
    pub presence: PresenceAuthBody,
    pub user: UserAuthBody,
    pub metadata: VenueConfig,
}

#[derive(Deserialize)]
pub struct PusherConnectionEstablished {
    pub socket_id: String,
    pub activity_timeout: usize,
}

#[derive(Deserialize, Serialize)]
pub struct Limits {
    pub max_minutes: Option<u8>,
    pub max_photos: Option<u8>,
    pub max_total_size: Option<usize>,
    pub auto_click: Option<u8>,
}

#[derive(Deserialize, Serialize)]
pub struct Session {
    pub user: User,
    pub id: String,
    pub tier: Tier,
}

pub struct Image {}

pub enum Event {
    Connected,
    Login,
    Disconnected,
    UploadImage(Image),
}

#[derive(Clone)]
pub struct Env {
    pub pusher_ws_region: String,
    pub pusher_ws_key: String,
}
/// Returns whether the websocket connection needs to be restarted
pub async fn websocket(
    tx: std::sync::mpsc::Sender<Event>,
    config: &Arc<std::sync::Mutex<Option<VenueConfig>>>,
    session: &Arc<std::sync::Mutex<Option<Session>>>,
    env: Env,
    client: &Client,
) -> anyhow::Result<bool> {
    let url = format!(
        "wss://ws-{}.pusher.com/app/{}?protocol=7&client=linux-photobooth",
        env.pusher_ws_region, env.pusher_ws_key,
    );
    let (ws_stream, _) = connect_async(&url)
        .await
        .map_err(|err| anyhow::anyhow!("Failed connecting with {url}:\n{err:?}"))?;

    tx.send(Event::Connected)?;
    let (mut write, mut read) = ws_stream.split();
    while let Some(message) = read.next().await {
        let raw_event = match message {
            Ok(Message::Text(text)) => text.as_str().to_owned(),
            Ok(Message::Close(e)) => {
                tx.send(Event::Disconnected)?;

                if let Some(frame) = e {
                    let code: u16 = frame.code.into();
                    let msg = format!(
                        "Pusher closed our websocket connection with code {}: {}",
                        frame.code, frame.reason
                    );
                    if let CloseCode::Normal = frame.code {
                        return Ok(false);
                    } else if code < 4199 && code > 4100 {
                        anyhow::bail!("{}\nRetrying... Backing off for a moment", &msg);
                    } else {
                        panic!(
                            "{}\nClosure code indicates that we cannot continue. Panicking",
                            &msg
                        );
                    }
                }
                break;
            }
            _ => continue,
        };
        let event: PusherEvent<String> = serde_json::from_str(&raw_event)?;

        match event.event.as_str() {
            "pusher:connection_established" => {
                let data: PusherConnectionEstablished = serde_json::from_str(&event.data)?;

                let res = client
                    .post(format!("{}/api/venue/auth?socket_id={}", std::env::var("BACKEND_API_HOST")
            .expect("Tip: BACKEND_API_HOST is required to be present. Have you set it up?"), data.socket_id))
                    .header("Authorization", format!("Bearer {}", std::env::var("BACKEND_API_KEY").expect("Tip: BACKEND_API_KEY is required to be present. Have you set it up?"),))
                    .send()
                    .await?;

                if !res.status().is_success() {
                    return Err(anyhow::Error::msg(format!(
                        "Error fetching authorization from backend:\nError {}\n{}",
                        res.status(),
                        res.text().await?
                    )));
                }
                let body = res.json::<AuthResponseBody>().await?;
                config.lock().unwrap().replace(body.metadata);

                let signin_frame = PusherEvent {
                    event: "pusher:signin".to_owned(),
                    data: body.user,
                };
                let frame = PusherEvent {
                    event: "pusher:subscribe".to_owned(),
                    data: SubscribePayload {
                        channel: "presence-venues".to_string(),
                        auth: Some(body.presence.auth),
                        channel_data: Some(body.presence.channel_data),
                    },
                };
                write
                    .send(Message::Text(serde_json::to_string(&signin_frame)?.into()))
                    .await?;
                write
                    .send(Message::Text(serde_json::to_string(&frame)?.into()))
                    .await?;
            }
            "pusher:user_notification" => {
                let upstream_session: PusherEvent<Session> = serde_json::from_str(&event.data)?;
                let mut session = session.lock().map_err(|e| {
                    anyhow::anyhow!("Failed to acquire session lock. We got poisoned: {}", e)
                })?;
                if let None = session.as_ref() {
                    session.replace(upstream_session.data);
                    tx.send(Event::Login)?;
                } else {
                    println!(
                        "Received a user notification {}, but we already have a session. Ignoring it.",
                        upstream_session.data.id
                    );
                }
            }
            _ => {}
        }
    }
    return Ok(true);
}
pub async fn start(
    tx: std::sync::mpsc::Sender<Event>,
    config: Arc<std::sync::Mutex<Option<VenueConfig>>>,
    session: Arc<std::sync::Mutex<Option<Session>>>,
    client: Client,
    env: Env,
) {
    let mut retry_delay = Duration::from_secs(1);
    let max_delay = Duration::from_secs(60);
    let unstable_limit = Timespec {
        tv_sec: 15,
        tv_nsec: 0,
    };

    loop {
        let start = rustix::time::clock_gettime(CLOCK_ID);
        match websocket(tx.clone(), &config, &session, env.clone(), &client).await {
            Ok(should_continue) => {
                if !should_continue {
                    let _ = tx.send(Event::Disconnected);
                    println!("Clean shutdown");
                    break;
                }
            }
            Err(e) => {
                eprintln!("An error happened in the websocket task:\n{}", e);
            }
        };
        let end = rustix::time::clock_gettime(CLOCK_ID);

        let _ = tx.send(Event::Disconnected);
        if let Some(t) = end.checked_sub(start) {
            if t > unstable_limit {
                retry_delay = Duration::from_secs(1);
            }
        }

        println!("Reconnecting in {} seconds", retry_delay.as_secs());
        tokio::time::sleep(retry_delay).await;
        retry_delay = std::cmp::min(max_delay, retry_delay * 2);
    }
}
