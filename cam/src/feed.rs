use tokio::{io::AsyncBufReadExt, process::Command};
 use crate::{savage, utils::CLOCK_ID};
use gstreamer::{
    glib::object::Cast,
    prelude::{ElementExt, GstBinExt},
};
use gstreamer_video::VideoFrameExt;
use tokio::process::Child;

use std::sync::{atomic::AtomicI64, mpsc::Sender};
use std::{
  
process::Stdio,
    sync::{Arc, atomic::AtomicU8},
    time::Duration,
};

use crate::{CameraState, Frame, uploader_processer, utils::timespec_to_secs};

pub async fn start(
    tx: Sender<Frame>,
    state: Arc<AtomicU8>,
    session: Arc<std::sync::Mutex<Option<crate::ws::Session>>>,
    tx_uploader: tokio::sync::mpsc::Sender<uploader_processer::Event>,
) {
    let camera_test = std::env::var("ENABLE_CAMERA_TEST")
        .map(|v| v == "1")
        .unwrap_or(false);
    let is_camera_disabled = std::env::var("DISABLE_CAMERA").is_ok();
    let last_watchdog_reset = Arc::new(AtomicI64::new(0));
    let mut gphoto2_server: Option<Child> = None;
    let mut gst_server: Option<Child> = None;
    let mut duration_left = None;
    loop {
        let mut start = None;
        if let Err(err) = (|| -> anyhow::Result<()> {
            if state.load(std::sync::atomic::Ordering::Relaxed) == (CameraState::LiveView as u8) {
                if let None = duration_left
                    && !camera_test
                {
                    duration_left = Some(
                        session
                            .lock()
                            .map_err(|err| anyhow::anyhow!("PoisonError: {err:#?}"))?
                            .as_ref()
                            .map(|s| {
                                s.tier.limits.max_minutes.as_ref().map(|m| {
                                    rustix::time::Timespec::try_from(Duration::new(
                                        u64::from(*m) * 60,
                                        0,
                                    ))
                                    .unwrap()
                                })
                            })
                            .unwrap(),
                    );
                }
                start = Some(rustix::time::clock_gettime(CLOCK_ID));
            }
            Ok(())
        })() {
            println!("{err}")
        };

        let res = feed(
            &tx,
            &state,
            &session,
            is_camera_disabled,
            last_watchdog_reset.clone(),
            &mut gphoto2_server,
            &mut gst_server,
            &tx_uploader,
            camera_test,
        )
        .await;
         savage!(gphoto2_server,  gst_server);
        if let Some(Some(duration)) = duration_left
            && !camera_test
        {
            if let Some(start_time) = start {
                let end = rustix::time::clock_gettime(CLOCK_ID);
                let elapsed = end
                    .checked_sub(start_time)
                    .unwrap_or(rustix::time::Timespec {
                        tv_sec: 0,
                        tv_nsec: 0,
                    });

                if elapsed >= duration {
                    println!("Duration limit reached, shutting down...");

                    state.store(
                        CameraState::Finished as u8,
                        std::sync::atomic::Ordering::Relaxed,
                    );
                    session.lock().unwrap().take();
                    break;
                } else {
                    duration_left = Some(Some(duration.checked_sub(elapsed).unwrap_or(
                        rustix::time::Timespec {
                            tv_sec: 0,
                            tv_nsec: 0,
                        },
                    )));
                }
            }
        }

        match res {
            Ok(should_continue) => {
                if !should_continue {
                    break;
                }
            }
            Err(e) => {
                eprintln!("Error in feed: {}", e);
                tokio::time::sleep(Duration::from_secs(2)).await;
            }
        }
    }
}

pub async fn feed(
    tx: &Sender<Frame>,
    state: &Arc<AtomicU8>,
    _session: &Arc<std::sync::Mutex<Option<crate::ws::Session>>>,
    is_camera_disabled: bool,
    last_watchdog_reset: Arc<AtomicI64>,
    gphoto2_server: &mut Option<Child>,
    gst_server: &mut Option<Child>,
    tx_uploader: &tokio::sync::mpsc::Sender<uploader_processer::Event>,
    camera_test: bool,
) -> anyhow::Result<bool> {
    match CameraState::from(state.load(std::sync::atomic::Ordering::Relaxed)) {
        CameraState::Capturing => {
            tokio::time::sleep(Duration::from_secs(1)).await;
            let mut command = Command::new("gphoto2");

            command.arg("--capture-image-and-download").arg("--stdout");
            if camera_test {
                command.arg("--filename=photobooth_%Y%m%d_%H%M%S.jpg");
            }
            let output = command.output().await?;

            if output.status.success() {
                println!("Photo captured and downloaded successfully!");
                tx_uploader
                    .send(uploader_processer::Event::ProcessImage(output.stdout))
                    .await?;
            } else {
                println!("WARNING: Photo capture failed!");
            }

            // STEP 4: Reset the FSM back to Live View
            println!("Resetting State Machine...");
            state.store(
                CameraState::LiveView as u8,
                std::sync::atomic::Ordering::Relaxed,
            );
        }
        CameraState::LiveView => {
            savage!(gst_server, gphoto2_server);
            if !is_camera_disabled {
                let mut new_gphoto2_server = Command::new("gphoto2")
                    .arg("--stdout")
                    .arg("--capture-movie")
                    .stdout(Stdio::piped())
                    .stderr(Stdio::piped())
                    .spawn()?;
                let stderr = new_gphoto2_server.stderr.take().ok_or(anyhow::anyhow!(
                    "couldn't take new_gphoto2_server's stderr.. does it exist?"
                ))?;

                let stdout = new_gphoto2_server.stdout.take().ok_or(anyhow::anyhow!(
                    "couldn't take new_gphoto2_server's stdout.. does it exist?"
                ))?;
                *gphoto2_server = Some(new_gphoto2_server);

                let new_gst_server = 
                        tokio::process::Command::new("gst-launch-1.0")
                            .args("fdsrc fd=0 ! jpegdec ! videoconvert ! video/x-raw,format=RGBA ! pipewiresink mode=provide stream-properties=\"properties,node.name=DSLRCamera,media.class=Video/Source,media.role=Camera\" client-name=\"DSLRCamera\"".split(' '))
                            .stdin(TryInto::<Stdio>::try_into(stdout)?)
                            .spawn()?;
                *gst_server = Some(new_gst_server);
                let buffer = tokio::io::BufReader::new(stderr);
                let mut lines = buffer.lines();
                while let Ok(Some(line)) = lines.next_line().await {
                  
                        if line.contains(
                            "Capturing preview frames as movie to 'stdout'. Press Ctrl-C to abort.",
                        ) {
                            println!("Launching client pipeline");

                            tokio::time::sleep(std::time::Duration::from_secs(3)).await;
                            break;
                        }
                    
                }
            } else {
                *gphoto2_server = None;
                *gst_server = None;
            }
            let watchdog_reset_clone = last_watchdog_reset.clone();
            let pipeline = match gstreamer::parse::launch(&format!(
                "pipewiresrc target-object=\"DSLRCamera\" stream-properties=\"props,{},node.dont-reconnect=true\" ! videoconvert ! capsfilter caps=\"video/x-raw,format=RGB\" ! appsink name=photoboothsink drop=true max-buffers=1",
                if !is_camera_disabled {
                    "node.dont-fallback=true"
                } else {
                    ""
                }
            )) {
                Ok(element) => {
                    if let Ok(pipeline) = element.downcast::<gstreamer::Pipeline>() {
                        pipeline
                    } else {
                        tokio::time::sleep(std::time::Duration::from_secs(2)).await;
                        return Ok(true);
                    }
                }
                Err(e) => {
                    let pipeline = format!("Failed to create pipeline: {e:#?}");

                    eprintln!("{}", pipeline);
                    tokio::time::sleep(std::time::Duration::from_secs(2)).await;
                    anyhow::bail!(pipeline);
                }
            };

            let app_sink = pipeline
                .by_name("photoboothsink")
                .unwrap()
                .downcast::<gstreamer_app::AppSink>()
                .map_err(|_| anyhow::anyhow!("Failed to downcast photoboothsink to AppSink"))?;
            let tx_1 = tx.clone();

            app_sink.set_callbacks(
                gstreamer_app::app_sink::AppSinkCallbacks::builder()
                    .new_sample(move |app_sink| {
                      
                        let sample = app_sink
                            .pull_sample()
                            .map_err(|_| {
                                println!("Failed to pull sample");
                                gstreamer::FlowError::Eos
                    })?;
                        let caps = sample.caps().ok_or(gstreamer::FlowError::Error)?;
                        let info = gstreamer_video::VideoInfo::from_caps(caps)
                            .map_err(|_| {  
                                println!("Failed to get video info from caps");
                                gstreamer::FlowError::Error})?;

                        let buffer = sample.buffer().ok_or(gstreamer::FlowError::Error)?;let fmt = info.format();
                        let buffer_len = buffer.size();


                        let frame =
                            gstreamer_video::VideoFrameRef::from_buffer_ref_readable(buffer, &info)
                                .map_err(|_| gstreamer::FlowError::Error)?;
                        println!(
                            "Received sample: format={:?}, size={}x{}, buffer_size={} bytes, stride={}",
                            fmt,
                            info.width(),
                            info.height(),
                            buffer_len,
                            frame.plane_stride()[0]
                        );
                        let width = info.width() as usize;
                        let height = info.height() as usize;

                        let first_plane = frame
                            .plane_data(0)
                            .map_err(|_| {
                                println!("Failed to get plane data");
                                gstreamer::FlowError::Error }
                            )?;
                        let stride = frame.plane_stride()[0] as usize;

                        let mut unpadded_rgb_image = Vec::with_capacity(width * height * 3);
                       
                        for row in 0..height {
                            let start = row * stride;
                            
                            unpadded_rgb_image
                                .extend_from_slice(&first_plane[start..start + (width * 3)]);
                        }

                        if tx_1.send(Frame {
                            width,
                            height,
                            data: unpadded_rgb_image
                        }).is_err() {
                            return Err(gstreamer::FlowError::Error);
                        }
                        watchdog_reset_clone.store(
                       timespec_to_secs(
                            rustix::time::clock_gettime(CLOCK_ID)
                       )
                            ,
                        std::sync::atomic::Ordering::Relaxed,
                    );
                        Ok(gstreamer::FlowSuccess::Ok)
                    })
                    .build(),
            );
            if let Err(e) = pipeline.set_state(gstreamer::State::Playing) {
                println!("playing is err 99 {e:#?}");
                tokio::time::sleep(std::time::Duration::from_secs(2)).await;
                savage!(gphoto2_server, gst_server);
                let _ = pipeline.set_state(gstreamer::State::Null);
                return Ok(true);
            }
            last_watchdog_reset.store(
                timespec_to_secs(rustix::time::clock_gettime(CLOCK_ID)),
                std::sync::atomic::Ordering::Relaxed,
            );
            let bus = pipeline.bus().unwrap();
            loop {
                if let Some(msg) = bus.timed_pop(gstreamer::ClockTime::from_seconds(1)) {
                    match msg.view() {
                        gstreamer::MessageView::Error(a) => {
                            println!("96 {a:#?}");
                            break;
                        }
                        gstreamer::MessageView::Eos(_) => {
                            println!("EOS 111 ");
                            break;
                        }
                        _ => {}
                    }
                }

                let now = timespec_to_secs(rustix::time::clock_gettime(CLOCK_ID));
                let last_reset = last_watchdog_reset.load(std::sync::atomic::Ordering::Relaxed);
                if now.saturating_sub(last_reset) > 3 {
                    println!("Watchdog timeout, resetting pipeline");
                    break;
                }
                if state.load(std::sync::atomic::Ordering::Relaxed)
                    == (CameraState::Capturing as u8)
                {
                    println!("Shoot state triggered, resetting pipeline");
                    break;
                }
            }

            savage!(gst_server, gphoto2_server);
            let _ = pipeline.set_state(gstreamer::State::Null);

            tokio::time::sleep(Duration::from_secs(2)).await;
        }
        CameraState::Shutdown => {
           
            return Ok(false);
        }
        _ => {
            // do nothing as the Camera view is disabled
        }
    }

    return Ok(true);
}



