pub mod feed;
pub mod uploader_processer;
pub mod ws;
use std::sync::{
    Arc,
    atomic::{AtomicU8, Ordering},
};

use egui_alignments::{center_horizontal, center_vertical};
pub mod utils;

use eframe::egui::{self, ViewportCommand};
use egui::{ColorImage, TextureHandle, TextureOptions};
use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use tokio::runtime::Runtime;
#[macro_use]
pub mod savage {
    /// Called the savage macro for a reason.....
    #[macro_export]
    macro_rules! savage {
    ($($child:expr),* )=> {
        $(
            if let Some(mut child) = $child.take() {
                let _ = child.kill();
                let _ = child.wait().await;
            }
        )*
    }
}
}

use crate::ws::Session;
fn main() -> eframe::Result {
    let camera_test = std::env::var("ENABLE_CAMERA_TEST")
        .map(|v| v == "1")
        .unwrap_or(false);
    let kiosk = std::env::var("ENABLE_KIOSK")
        .map(|v| v == "1")
        .unwrap_or(false);
    let env = ws::Env {
        pusher_ws_region: std::env::var("PUSHER_WS_REGION").expect("PUSHER_WS_REGION is not found"),
        pusher_ws_key: std::env::var("PUSHER_WS_KEY").expect("PUSHER_WS_KEY is not found"),
    };
    gstreamer::init().unwrap();

    env_logger::init(); // Log to stderr (if you run with `RUST_LOG=debug`).
    let options = eframe::NativeOptions {
        viewport: egui::ViewportBuilder::default()
            .with_decorations(false) // Hide the OS-specific "chrome" around the window
            .with_inner_size([768.0, 612.0])
            .with_min_inner_size([768.0, 512.0])
            .with_transparent(true), // To have rounded corners we need transparency

        ..Default::default()
    };

    let (tx, rx) = std::sync::mpsc::channel::<Frame>();
    let config = Arc::new(std::sync::Mutex::new(None));
    let config2 = config.clone();
    let (tx_ws, rx_ws) = std::sync::mpsc::channel::<ws::Event>();
    let (tx_upload, rx_upload) = tokio::sync::mpsc::channel::<uploader_processer::Event>(8);
    let tx_upload2 = tx_upload.clone();
    let camera_state = Arc::new(AtomicU8::new(if camera_test {
        CameraState::LiveView
    } else {
        CameraState::Welcome
    } as u8));

    let session = Arc::new(Mutex::new(None));
    let sessions = (session.clone(), session.clone(), session.clone());
    let rt = Runtime::new().expect("Failed to create Tokio runtime");
    let handle = rt.handle().clone();
    let client = reqwest::Client::new();
    let clients = (client.clone(), client.clone());
    std::thread::spawn(move || {
        rt.block_on(async {
            std::future::pending::<()>().await;
        });
    });

    let camstates = (camera_state.clone(), camera_state.clone());
    handle.spawn(async move {
        feed::start(tx, camstates.0, sessions.0, tx_upload).await;
    });
    if !camera_test {
        handle.spawn(async move {
            ws::start(tx_ws, config2, sessions.1, clients.0, env).await;
        });
        handle.spawn(async move {
            uploader_processer::start(rx_upload, sessions.2, tx_upload2, client, camstates.1).await;
        });
    }

    eframe::run_native(
        "Photobooth Cam", // unused title
        options,
        Box::new(|_cc| {
            Ok(Box::new(App {
                camera_texture: None,
                rx,
                camera_test,
                rx_ws,
                kiosk,
                camera_state,
                config,
                session,
            }))
        }),
    )
}

#[repr(u8)]
pub enum CameraState {
    LiveView = 0,
    Capturing = 1,
    Shutdown = 2,
    Welcome = 3,
    LoggedInHome = 4,
    Finished = 5,
}

impl From<u8> for CameraState {
    fn from(value: u8) -> Self {
        match value {
            0 => CameraState::LiveView,
            1 => CameraState::Capturing,
            2 => CameraState::Shutdown,
            3 => CameraState::Welcome,
            4 => CameraState::LoggedInHome,
            5 => CameraState::Finished,
            _ => panic!("Invalid camera state value: {}", value),
        }
    }
}

pub struct Frame {
    pub width: usize,
    pub height: usize,

    pub data: Vec<u8>,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct VenueConfig {
    pub service_name: String,
    pub venue_name: String,
    pub id: String,
}

struct App {
    pub rx: std::sync::mpsc::Receiver<Frame>,
    pub rx_ws: std::sync::mpsc::Receiver<ws::Event>,
    pub camera_texture: Option<TextureHandle>,
    pub camera_state: Arc<AtomicU8>,
    pub kiosk: bool,
    pub camera_test: bool,
    pub config: Arc<std::sync::Mutex<Option<VenueConfig>>>,
    pub session: Arc<Mutex<Option<Session>>>,
    //  pub camera_width: usize,
    //  pub camera_height: usize,
}

impl App {}

impl eframe::App for App {
    fn clear_color(&self, _visuals: &egui::Visuals) -> [f32; 4] {
        egui::Rgba::TRANSPARENT.to_array() // Make sure we don't paint anything behind the rounded corners
    }

    fn on_exit(&mut self) {
        self.camera_state.store(
            CameraState::Shutdown as u8,
            std::sync::atomic::Ordering::Relaxed,
        );
    }

    fn ui(&mut self, ui: &mut egui::Ui, _frame: &mut eframe::Frame) {
        ui.input(|input| {
            if input.key_pressed(egui::Key::Enter) {
                println!("ENTERED");
                self.camera_state.store(
                    CameraState::Capturing as u8,
                    std::sync::atomic::Ordering::Relaxed,
                );
            }
        });
        if self.kiosk {
            self.ui(ui)
        } else {
            custom_window_frame(ui, "Photobooth Project", |ui| self.ui(ui))
        }
    }
}

impl App {
    fn ui(&mut self, ui: &mut egui::Ui) {
        center_horizontal(ui, |ui| {
            center_vertical(ui, |ui| {
                let state = self
                    .camera_state
                    .load(std::sync::atomic::Ordering::Relaxed)
                    .into();
                match state {
                    CameraState::LiveView | CameraState::Capturing => {
                        if let Some(next_frame) = self.rx.try_iter().last() {
                            let image = ColorImage::from_rgb(
                                [next_frame.width, next_frame.height],
                                &next_frame.data,
                            );
                            if let Some(tex) = &mut self.camera_texture {
                                tex.set(image, TextureOptions::LINEAR);
                            } else {
                                self.camera_texture = Some(ui.ctx().load_texture(
                                    "camera_texture",
                                    image,
                                    egui::TextureOptions::LINEAR,
                                ));
                            }
                        }

                        if let Some(tex) = &self.camera_texture {
                            ui.add(
                                egui::Image::new(tex)
                                    .maintain_aspect_ratio(true)
                                    .fit_to_exact_size(ui.content_rect().size()),
                            );
                            ui.ctx()
                                .request_repaint_after(std::time::Duration::from_millis(33)); // Request a repaint to update the image
                        } else {
                            ui.spinner();
                        }
                    }

                    CameraState::Shutdown => {
                        ui.label("Shutting down...");
                    }
                    CameraState::Welcome | CameraState::Finished => {
                        ui.ctx()
                            .request_repaint_after(std::time::Duration::from_millis(33));
                        for event in self.rx_ws.try_iter() {
                            match event {
                                ws::Event::Connected => {}
                                ws::Event::Login => {
                                    self.camera_state
                                        .store(CameraState::LoggedInHome as u8, Ordering::Relaxed);
                                }
                                _ => {}
                            }
                        }

                        match state {
                            CameraState::Welcome => {
                                ui.label("Welcome to the Photobooth!");
                                ui.label("Hello! Let's start!");
                                if let Ok(config) = self.config.try_lock() {
                                    if let Some(config) = config.as_ref() {
                                        ui.label(format!(
                                            "Press \"Start session in {}\" in {}'s UI!",
                                            config.venue_name, config.service_name
                                        ));
                                    }
                                }
                            }
                            CameraState::Finished => {
                                ui.label("Finished");
                            }
                            _ => unreachable!(),
                        }
                    }
                    CameraState::LoggedInHome => {
                        ui.label("Logged In Home");
                    }
                }
                ui.label("Photobooth Project");
            });
        });
    }
}

fn custom_window_frame(ui: &mut egui::Ui, title: &str, add_contents: impl FnOnce(&mut egui::Ui)) {
    use egui::UiBuilder;

    let panel_frame = egui::Frame::new()
        .fill(ui.global_style().visuals.window_fill())
        .corner_radius(10)
        .stroke(ui.global_style().visuals.widgets.noninteractive.fg_stroke)
        .outer_margin(1); // so the stroke is within the bounds

    panel_frame.show(ui, |ui| {
        let app_rect = ui.max_rect();

        ui.expand_to_include_rect(app_rect); // Expand frame to include it all

        let title_bar_height = 32.0;
        let title_bar_rect = {
            let mut rect = app_rect;
            rect.max.y = rect.min.y + title_bar_height;
            rect
        };
        title_bar_ui(ui, title_bar_rect, title);

        // Add the contents:
        let content_rect = {
            let mut rect = app_rect;
            rect.min.y = title_bar_rect.max.y;
            rect
        }
        .shrink(4.0);
        let mut content_ui = ui.new_child(UiBuilder::new().max_rect(content_rect));
        add_contents(&mut content_ui);
    });
}

fn title_bar_ui(ui: &mut egui::Ui, title_bar_rect: eframe::epaint::Rect, title: &str) {
    use egui::{Align2, FontId, Id, PointerButton, Sense, UiBuilder, vec2};

    let painter = ui.painter();

    let title_bar_response = ui.interact(
        title_bar_rect,
        Id::new("title_bar"),
        Sense::click_and_drag(),
    );

    // Paint the title:
    painter.text(
        title_bar_rect.center(),
        Align2::CENTER_CENTER,
        title,
        FontId::proportional(20.0),
        ui.style().visuals.text_color(),
    );

    // Paint the line under the title:
    painter.line_segment(
        [
            title_bar_rect.left_bottom() + vec2(1.0, 0.0),
            title_bar_rect.right_bottom() + vec2(-1.0, 0.0),
        ],
        ui.visuals().widgets.noninteractive.bg_stroke,
    );

    // Interact with the title bar (drag to move window):
    if title_bar_response.double_clicked() {
        let is_maximized = ui.input(|i| i.viewport().maximized.unwrap_or(false));
        ui.send_viewport_cmd(ViewportCommand::Maximized(!is_maximized));
    }

    if title_bar_response.drag_started_by(PointerButton::Primary) {
        ui.send_viewport_cmd(ViewportCommand::StartDrag);
    }

    ui.scope_builder(
        UiBuilder::new()
            .max_rect(title_bar_rect)
            .layout(egui::Layout::right_to_left(egui::Align::Center)),
        |ui| {
            ui.spacing_mut().item_spacing.x = 0.0;
            ui.visuals_mut().button_frame = false;
            ui.add_space(8.0);
            close_maximize_minimize(ui);
        },
    );
}

/// Show some close/maximize/minimize buttons for the native window.
fn close_maximize_minimize(ui: &mut egui::Ui) {
    use egui::{Button, RichText};

    let button_height = 12.0;

    let close_response = ui
        .add(Button::new(RichText::new("❌").size(button_height)))
        .on_hover_text("Close the window");
    if close_response.clicked() {
        ui.send_viewport_cmd(egui::ViewportCommand::Close);
    }

    let is_maximized = ui.input(|i| i.viewport().maximized.unwrap_or(false));
    if is_maximized {
        let maximized_response = ui
            .add(Button::new(RichText::new("🗗").size(button_height)))
            .on_hover_text("Restore window");
        if maximized_response.clicked() {
            ui.send_viewport_cmd(ViewportCommand::Maximized(false));
        }
    } else {
        let maximized_response = ui
            .add(Button::new(RichText::new("🗗").size(button_height)))
            .on_hover_text("Maximize window");
        if maximized_response.clicked() {
            ui.send_viewport_cmd(ViewportCommand::Maximized(true));
        }
    }

    let minimized_response = ui
        .add(Button::new(RichText::new("🗕").size(button_height)))
        .on_hover_text("Minimize the window");
    if minimized_response.clicked() {
        ui.send_viewport_cmd(ViewportCommand::Minimized(true));
    }
}
