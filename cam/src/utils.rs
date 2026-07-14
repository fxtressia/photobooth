use rustix::fs::Timespec;

pub fn timespec_to_secs(from: Timespec) -> i64 {
    from.tv_sec + (from.tv_nsec / 1000)
}
#[cfg(target_os = "linux")]
pub const CLOCK_ID: rustix::io_uring::ClockId = rustix::io_uring::ClockId::MonotonicRaw;
#[cfg(not(target_os = "linux"))]
pub const CLOCK_ID: rustix::io_uring::ClockId = rustix::io_uring::ClockId::Monotonic;
