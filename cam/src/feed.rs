use gstreamer::{
    glib::object::Cast,
    prelude::{ElementExt, GstBinExt},
};
use gstreamer_video::VideoFrameExt;
use std::{
    io::BufRead, process::{Child, Stdio}, sync::{
        Arc,
        atomic::{AtomicBool, AtomicU8, AtomicU64},
    }, time::{Duration, SystemTime}
};

use crate::{CameraState, Frame};

pub fn start_thread(tx: std::sync::mpsc::Sender<Frame>, state: Arc<AtomicU8>) {
    std::thread::spawn(move || {
        let last_watchdog_reset = Arc::new(AtomicU64::new(0));
        let mut gphoto2_server: Option<Child> = None;
        let mut gstreamer_server: Option<Child> = None;
        loop {
            match CameraState::from(state.load(std::sync::atomic::Ordering::Relaxed)) {
                CameraState::Capturing => {
                    std::thread::sleep(Duration::from_secs(1));
                    let capture_status = std::process::Command::new("gphoto2")
                        .arg("--capture-image-and-download")
                        // Use a timestamp to ensure files are never overwritten
                        .arg("--filename=photobooth_%Y%m%d_%H%M%S.jpg")
                        .status()
                        .expect("Failed to execute gphoto2 capture command");

                    if capture_status.success() {
                        println!("Photo captured and downloaded successfully!");
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
                    if let Some(mut server) = gphoto2_server {
                        let _ = server.kill();
                    }
                    if let Some(mut server) = gstreamer_server {
                        let _ = server.kill();
                    }

                    let mut new_gphoto2_server = std::process::Command::new("gphoto2")
                        .arg("--stdout")
                        .arg("--capture-movie")
                        .stdout(Stdio::piped())
                        .stderr(Stdio::piped())
                        .spawn()
                        .expect("Failed to start gphoto2 server");
                    let stderr = new_gphoto2_server.stderr.take().unwrap();
               
                    let stdout = new_gphoto2_server.stdout.take().unwrap();
                    gphoto2_server = Some(new_gphoto2_server);    
                    let mut new_gstreamer_server = 
                        std::process::Command::new("gst-launch-1.0")
                            .args("fdsrc fd=0 ! jpegdec ! videoconvert ! video/x-raw,format=RGBA ! pipewiresink mode=provide stream-properties=\"properties,node.name=DSLRCamera,media.class=Video/Source,media.role=Camera\" client-name=\"DSLRCamera\"".split(' '))
                            .stdin(stdout)
                            .spawn()
                            .expect("Failed to start gstreamer server");
                    gstreamer_server = Some(new_gstreamer_server);
                    let buffer = std::io::BufReader::new(stderr);
                    for line in buffer.lines() {
                        if let Ok(line) = line {
                            if line.contains("Capturing preview frames as movie to 'stdout'. Press Ctrl-C to abort.") {
                                println!("Launching client pipeline");
                                
                            std::thread::sleep(std::time::Duration::from_secs(3));
                                break;
                            }
                          
                        }
                    }

                    let watchdog_reset_clone = last_watchdog_reset.clone();
                    let pipeline = match gstreamer::parse::launch(
                        "pipewiresrc target-object=\"DSLRCamera\" stream-properties=\"props,node.dont-fallback=true,node.dont-reconnect=true\" ! videoconvert ! capsfilter caps=\"video/x-raw,format=RGB\" ! appsink name=photoboothsink drop=true max-buffers=1",
                    ) {
                        Ok(element) => {
                            if let Ok(pipeline) = element.downcast::<gstreamer::Pipeline>() {
                                pipeline
                            } else {
                                std::thread::sleep(std::time::Duration::from_secs(2));
                                continue;
                            }
                        }
                        Err(e) => {
                            println!("Failed to create pipeline: {e:#?}");
                            std::thread::sleep(std::time::Duration::from_secs(2));
                            continue;
                        }
                    };

                    let app_sink = pipeline
                        .by_name("photoboothsink")
                        .unwrap()
                        .downcast::<gstreamer_app::AppSink>()
                        .unwrap();
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
                        watchdog_reset_clone.store(SystemTime::now().duration_since(SystemTime::UNIX_EPOCH).unwrap().as_secs() as u64, std::sync::atomic::Ordering::Relaxed);
                        Ok(gstreamer::FlowSuccess::Ok)
                    })
                    .build(),
            );
                    if let Err(e) = pipeline.set_state(gstreamer::State::Playing) {
                        println!("playing is err 99 {e:#?}");
                        std::thread::sleep(std::time::Duration::from_secs(2));
                        let _ = pipeline.set_state(gstreamer::State::Null);
                        continue;
                    }
                    last_watchdog_reset.store(
                        SystemTime::now()
                            .duration_since(SystemTime::UNIX_EPOCH)
                            .unwrap()
                            .as_secs() as u64,
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

                        let now = SystemTime::now()
                            .duration_since(SystemTime::UNIX_EPOCH)
                            .unwrap()
                            .as_secs() as u64;
                        let last_reset =
                            last_watchdog_reset.load(std::sync::atomic::Ordering::Relaxed);
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

                    let _ = pipeline.set_state(gstreamer::State::Null);

                    std::thread::sleep(Duration::from_secs(2));
                }
                CameraState::Shutdown => {
                    if let Some(mut server) = gphoto2_server {
                        let _ = server.kill();
                    }
                    if let Some(mut server) = gstreamer_server {
                        let _ = server.kill();
                    }

                    break;
                }
            }
        }
    });
}
