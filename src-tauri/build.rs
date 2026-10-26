fn main() {
    println!("cargo:rerun-if-changed=tauri.conf.json");
    println!("cargo:rerun-if-changed=app-icon-source.png");
    println!("cargo:rerun-if-changed=icons");
    println!("cargo:rerun-if-changed=permissions");
    println!("cargo:rerun-if-changed=capabilities");
    tauri_build::build()
}
