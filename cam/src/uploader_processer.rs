use std::io::Cursor;
use std::sync::Arc;
use std::sync::atomic::AtomicU8;

use image::DynamicImage;
use image::GenericImageView;
use image::ImageBuffer;

use image::Luma;
use image::codecs::jpeg::JpegDecoder;
use reqwest::Client;
use reqwest::multipart::Form;
use reqwest::multipart::Part;

use crate::CameraState;

use crate::ws::Session;
use ort::session::{Session as OrtSession, builder::GraphOptimizationLevel};
use tokio::sync::mpsc::Receiver;
use tokio::sync::mpsc::Sender;

pub fn init_ort_bg() -> OrtSession {
    OrtSession::builder()
        .unwrap()
        .with_optimization_level(GraphOptimizationLevel::Level3)
        .unwrap()
        .with_intra_threads(4)
        .unwrap()
        .commit_from_file(std::env::var("MODNET_LOCATION")
            .expect("MODNET_LOCATION is not set"))
        .unwrap()
}
pub async fn start(
    mut rx: tokio::sync::mpsc::Receiver<Event>,
    session: Arc<std::sync::Mutex<Option<Session>>>,
    tx: tokio::sync::mpsc::Sender<Event>,
    client: Client,
    state: Arc<AtomicU8>,
) {
    let env = Env {
        cloud_name: std::env::var("CLOUDINARY_CLOUD_NAME")
            .expect("CLOUDINARY_CLOUD_NAME is not set"),
        upload_preset: std::env::var("CLOUDINARY_PRESET").expect("CLOUDINARY_PRESET is not set"),
    };
    let (ort_tx, mut ort_rx) = tokio::sync::mpsc::channel::<ProcesserEvent>(64);
    let tx2 = tx.clone();

    std::thread::spawn(move || {
        let mut ort_session = init_ort_bg();
        let mut nth = 0;

        while let Some(event) = ort_rx.blocking_recv() {
            let ProcesserEvent::ProcessImage(image) = event;
            if let Err(err) = process_image(&mut ort_session, image, &tx2, &mut nth) {
                eprintln!("Error happened in processing: {}", err);
            }
        }
    });
    let mut aborting = None;
    let mut total_bytes: usize = 0;
    loop {
        match uploader_handle(
            &mut rx,
            &session,
            &state,
            &ort_tx,
            &client,
            &env,
            &mut aborting,
            &mut total_bytes,
        )
        .await
        {
            Ok(redo) => {
                if !redo {
                    break;
                }
            }
            Err(err) => {
                eprintln!("Error happened in uploader: {}", err);
            }
        }
    }
}
pub fn process_image(
    ort_session: &mut OrtSession,
    image: Vec<u8>,
    tx: &Sender<Event>,
    nth: &mut u8,
) -> anyhow::Result<bool> {
    *nth += 1;
    let jpeg = JpegDecoder::new(Cursor::new(image))?;
    let img = DynamicImage::from_decoder(jpeg)?;
    let mut webp = Vec::with_capacity(img.as_bytes().len());
    img.write_to(&mut Cursor::new(&mut webp), image::ImageFormat::WebP)?;

    tx.blocking_send(Event::UploadImage(ProcessedImage {
        bytes: webp,
        image_type: ImageType::Original,
        nth: *nth,
    }))?;
    let resized = img.resize_exact(512, 512, image::imageops::FilterType::Triangle);

    let mut input_tensor = ndarray::Array4::<f32>::zeros((1, 3, 512, 512));

    for (x, y, pixel) in resized.pixels() {
        // Formula: (pixel_value / 127.5) - 1.0
        input_tensor[[0, 0, y as usize, x as usize]] = (pixel[0] as f32 / 127.5) - 1.0; // Red
        input_tensor[[0, 1, y as usize, x as usize]] = (pixel[1] as f32 / 127.5) - 1.0; // Green
        input_tensor[[0, 2, y as usize, x as usize]] = (pixel[2] as f32 / 127.5) - 1.0; // Blue
    }
    let input_value = ort::value::Value::from_array(input_tensor)?;
    let outputs = ort_session.run(ort::inputs! {"input" => input_value})?;
    let (_shape, output_data) = outputs["output"].try_extract_tensor::<f32>()?;
    let mut mask_512 = ImageBuffer::new(512, 512);
    for y in 0..512 {
        for x in 0..512 {
            let idx = (y * 512 + x) as usize;
            // Index into the data slice instead of the tuple
            let alpha_val = output_data[idx];
            let pixel_val = (alpha_val * 255.0).clamp(0.0, 255.0) as u8;
            mask_512.put_pixel(x as u32, y as u32, Luma([pixel_val]));
        }
    }
    let raw_mask = mask_512.into_raw();

    tx.blocking_send(Event::UploadImage(ProcessedImage {
        bytes: raw_mask,
        image_type: ImageType::AlphaMask,
        nth: *nth,
    }))?;
    Ok(false)
}
pub async fn uploader_handle(
    rx: &mut Receiver<Event>,
    session: &Arc<std::sync::Mutex<Option<Session>>>,
    state: &Arc<AtomicU8>,
    ort_tx: &Sender<ProcesserEvent>,
    client: &Client,
    env: &Env,
    aborting: &mut Option<u8>,
    total_bytes: &mut usize,
) -> anyhow::Result<bool> {
    let event = match rx.recv().await {
        Some(event) => event,
        None => return Ok(false),
    };

    match event {
        Event::ProcessImage(image) => {
            if let Err(err) = ort_tx.send(ProcesserEvent::ProcessImage(image)).await {
                eprintln!("Failed to queue image for ORT processing: {}", err);
            }
        }
        Event::UploadImage(image) => {
            *total_bytes += image.bytes.len();
            let (prefix, abort) = {
                let lock = session
                    .try_lock()
                    .map_err(|e| anyhow::anyhow!("Failed to lock session: {e:#?}",))?;

                let session = lock.as_ref().ok_or(anyhow::anyhow!("Session not found"))?;
                let photos_max = &session.tier.limits.max_photos;
                let photos_max_size = &session.tier.limits.max_total_size;

                (
                    format!(
                        "/users/{}/sessions/{}/take/{}",
                        session.user.auth0_id, session.id, image.nth
                    ),
                    if Some(image.nth) > *photos_max {
                        Some(LimitReached::MaxPhotos(image.nth))
                    } else if Some(*total_bytes) > *photos_max_size {
                        Some(LimitReached::MaxTotalSize(*total_bytes))
                    } else {
                        None
                    },
                )
            };
            let name = if let ImageType::AlphaMask = image.image_type {
                format!("{}/alpha_mask.webp", prefix)
            } else {
                format!("{}/image.webp", prefix)
            };

            let form = Form::new()
                .part("file", Part::bytes(image.bytes).file_name(name.clone()))
                .part("upload_preset", Part::text(env.upload_preset.clone()))
                .part("public_id", Part::text(name));
            client
                .post(format!(
                    "https://api.cloudinary.com/v1_1/{}/image/upload",
                    env.cloud_name
                ))
                .multipart(form)
                .send()
                .await?;
            if let Some(limit) = abort {
                if if let Some(nth) = aborting {
                    if image.nth == *nth { false } else { true }
                } else {
                    *aborting = Some(image.nth);
                    false
                } {
                    eprintln!("Limit reached: {:?}", limit);
                    state.store(
                        CameraState::Finished as u8,
                        std::sync::atomic::Ordering::Relaxed,
                    );
                }
            }
        }
    }

    Ok(true)
}

pub enum Event {
    ProcessImage(Vec<u8>),
    /// The bool indicates if this the alpha mask or not.
    UploadImage(ProcessedImage),
}

pub struct Env {
    pub cloud_name: String,

    pub upload_preset: String,
}
pub struct ProcessedImage {
    pub bytes: Vec<u8>,
    pub image_type: ImageType,
    pub nth: u8,
}
pub enum ImageType {
    Original,
    AlphaMask,
}
pub enum ProcesserEvent {
    ProcessImage(Vec<u8>),
}

#[derive(Clone, Debug)]
pub enum LimitReached {
    MaxPhotos(u8),
    MaxMinutes(u8),
    MaxTotalSize(usize),
}
