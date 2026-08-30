use std::{env, path::PathBuf};

use wasm_bindgen_cli_support::Bindgen;

fn main() {
    if let Err(error) = run() {
        eprintln!("vooya-wasm-bindgen-wasi: {error:#}");
        std::process::exit(1);
    }
}

fn run() -> Result<(), Box<dyn std::error::Error>> {
    let mut arguments = env::args_os().skip(1);
    let input = PathBuf::from(arguments.next().ok_or("missing input WASM path")?);
    let output = PathBuf::from(arguments.next().ok_or("missing output directory")?);
    let out_name = arguments
        .next()
        .and_then(|value| value.into_string().ok())
        .unwrap_or_else(|| "vooya_component".to_owned());
    if arguments.next().is_some() {
        return Err("usage: vooya-wasm-bindgen-wasi <input.wasm> <output-directory> [out-name]".into());
    }

    let mut bindgen = Bindgen::new();
    bindgen.input_path(input).out_name(&out_name).web(true)?;
    bindgen.generate(output)?;
    Ok(())
}
