// No extra console window next to the game on Windows (release builds).
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    tqq_tcg_lib::run()
}
