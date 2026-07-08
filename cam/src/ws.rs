use std::sync::Arc;

use futures_util::{SinkExt, StreamExt};

use reqwest::Client;
use serde::{Deserialize, Serialize};
use tokio_tungstenite::{
    connect_async,
    tungstenite::{Message, protocol::frame::coding::CloseCode},
};

use crate::VenueConfig;

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

#[derive(Deserialize, Serialize, Clone, PartialEq, PartialOrd, Eq, Ord)]
pub enum InfiniteOrFinite<U: Clone> {
    Infinite,
    Finite(U),
}

impl<U: Clone + Copy> InfiniteOrFinite<U> {
    pub fn map<F: FnOnce(U) -> X, X: Clone + Copy>(self, f: F) -> InfiniteOrFinite<X> {
        match self {
            InfiniteOrFinite::Infinite => InfiniteOrFinite::Infinite,
            InfiniteOrFinite::Finite(value) => InfiniteOrFinite::Finite(f(value)),
        }
    }
}

#[derive(Deserialize, Serialize)]
pub struct Limits {
    pub max_minutes: InfiniteOrFinite<u8>,
    pub max_photos: InfiniteOrFinite<u8>,
    pub max_total_size: InfiniteOrFinite<usize>,
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
    pub pusher_ws_host: String,
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
    let (ws_stream, _) = connect_async(format!(
        "wss://{}/app/{}?protocol=7&client=linux-photobooth",
        env.pusher_ws_host, env.pusher_ws_key,
    ))
    .await?;

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
                    .post(format!("https://{}/api/venue/auth?socket_id={}", std::env::var("BACKEND_API_HOST")
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
) {
    let env = Env {
        pusher_ws_host: std::env::var("PUSHER_WS_HOST").expect("tip: PUSHER_WS_HOST is not found"),
        pusher_ws_key: std::env::var("PUSHER_WS_KEY").expect("tip: PUSHER_WS_KEY is not found"),
    };
    loop {
        if let Err(e) = websocket(tx.clone(), &config, &session, env.clone(), &client).await {
            eprintln!("An error happened in the websocket task.\n{}", e);
        } else {
            break;
        };
    }
}
