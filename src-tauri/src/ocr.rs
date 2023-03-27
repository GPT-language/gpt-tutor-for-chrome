#[cfg(not(target_os = "macos"))]
pub fn do_ocr() -> Result<(), Box<dyn std::error::Error>> {
    use scrap::{Capturer, Display};
    use std::io::ErrorKind::WouldBlock;
    use std::fs::File;
    use std::thread;
    use std::time::Duration;

    let one_second = Duration::new(1, 0);
    let one_frame = one_second / 60;

    let display = Display::primary().expect("Couldn't find primary display.");
    let mut capturer = Capturer::new(display).expect("Couldn't begin capture.");
    let (w, h) = (capturer.width(), capturer.height());

    loop {
        // Wait until there's a frame.

        let buffer = match capturer.frame() {
            Ok(buffer) => buffer,
            Err(error) => {
                if error.kind() == WouldBlock {
                    // Keep spinning.
                    thread::sleep(one_frame);
                    continue;
                } else {
                    panic!("Error: {}", error);
                }
            }
        };

        println!("Captured! Saving...");

        // Flip the ARGB image into a BGRA image.

        let mut bitflipped = Vec::with_capacity(w * h * 4);
        let stride = buffer.len() / h;

        for y in 0..h {
            for x in 0..w {
                let i = stride * y + 4 * x;
                bitflipped.extend_from_slice(&[
                    buffer[i + 2],
                    buffer[i + 1],
                    buffer[i],
                    255,
                ]);
            }
        }

        // Save the image.

        repng::encode(
            File::create("screenshot.png").unwrap(),
            w as u32,
            h as u32,
            &bitflipped,
        ).unwrap();

        println!("Image saved to `screenshot.png`.");
        break;
    }
    Ok(())
}

#[cfg(target_os = "macos")]
pub fn do_ocr() -> Result<(), Box<dyn std::error::Error>> {
    use crate::{APP_HANDLE, CPU_VENDOR};

    let mut rel_path = "resources/bin/ocr_intel".to_string();
    if *CPU_VENDOR.lock() == "Apple" {
        rel_path = "resources/bin/ocr_apple".to_string();
    }

    let bin_path = APP_HANDLE
        .get()
        .unwrap()
        .path_resolver()
        .resolve_resource(rel_path)
        .expect("failed to resolve ocr binary resource");

    let output = std::process::Command::new(bin_path)
        .args(["-l", "zh"])
        .output()
        .expect("failed to execute ocr binary");

    // check exit code
    if output.status.success() {
        // get output content
        let content = String::from_utf8(output.stdout).expect("failed to parse ocr binary output");
        crate::utils::send_text(content);
        crate::windows::show_main_window(false).set_focus().unwrap();
        Ok(())
    } else {
        Err("ocr binary failed".into())
    }
}

#[tauri::command]
pub fn ocr() {
    do_ocr().unwrap();
}
