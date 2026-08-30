//! Trusted, fixed Gate 2 component scaffold.
//!
//! This source is expanded and compiled by the toolchain packaging job. The
//! browser never runs its attribute macro and never rewrites editable source.

use std::cell::RefCell;

use wasm_bindgen::{prelude::wasm_bindgen, JsValue};
use web_sys::Element;

use vooya_core::{View, ViewElement};

unsafe extern "C" {
    fn vooya_user_answer(value: i32) -> i32;
}

struct BrowserProbeHandle {
    host: Element,
    root: ViewElement,
}

thread_local! {
    static BROWSER_PROBE_HANDLES: RefCell<Vec<Option<BrowserProbeHandle>>> =
        const { RefCell::new(Vec::new()) };
}

fn seed_from_props(props: &JsValue) -> i32 {
    js_sys::Reflect::get(props, &JsValue::from_str("seed"))
        .ok()
        .and_then(|value| value.as_f64())
        .map(|value| value as i32)
        .unwrap_or(40)
}

fn render(view: &View, props: &JsValue) -> Result<ViewElement, JsValue> {
    let answer = unsafe { vooya_user_answer(seed_from_props(props)) };
    let root = view
        .element("article")?
        .class("browser-built-vooya")
        .attribute("data-browser-built-vooya", "")?;

    root.append(
        &view
            .element("p")?
            .attribute("data-browser-runtime", "vooya-core")?
            .text("Vooya component compiled in this browser"),
    )?;
    root.append(
        &view
            .element("strong")?
            .attribute("data-browser-answer", "")?
            .text(&format!("Rust answer: {answer}")),
    )?;

    Ok(root)
}

#[wasm_bindgen]
pub fn voo_abi_version() -> u32 {
    1
}

#[wasm_bindgen]
pub fn voo_browser_probe_mount(host: Element, props: JsValue) -> Result<u32, JsValue> {
    let view = View::from_host(&host)?;
    let root = render(&view, &props)?;
    root.mount(&host)?;
    BROWSER_PROBE_HANDLES.with(|handles| {
        let mut handles = handles.borrow_mut();
        handles.push(Some(BrowserProbeHandle { host, root }));
        Ok((handles.len() - 1) as u32)
    })
}

#[wasm_bindgen]
pub fn voo_browser_probe_update_props(handle: u32, props: JsValue) -> Result<(), JsValue> {
    BROWSER_PROBE_HANDLES.with(|handles| {
        let mut handles = handles.borrow_mut();
        let Some(Some(existing)) = handles.get_mut(handle as usize) else {
            return Err(JsValue::from_str("invalid component handle"));
        };
        existing.root.remove();
        let view = View::from_host(&existing.host)?;
        let root = render(&view, &props)?;
        root.mount(&existing.host)?;
        existing.root = root;
        Ok(())
    })
}

#[wasm_bindgen]
pub fn voo_browser_probe_dispose(handle: u32) {
    BROWSER_PROBE_HANDLES.with(|handles| {
        let mut handles = handles.borrow_mut();
        if let Some(slot) = handles.get_mut(handle as usize) {
            if let Some(existing) = slot.take() {
                existing.root.remove();
            }
        }
    });
}

#[inline(never)]
pub fn link() {}
