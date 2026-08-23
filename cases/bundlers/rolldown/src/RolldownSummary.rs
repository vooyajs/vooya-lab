use wasm_bindgen::JsValue;
use vooya as voo;

#[voo::props]
#[derive(voo::FromJs)]
pub struct RolldownSummaryProps {
    pub status: String,
    pub output: String,
    pub asset_count: i32,
    pub duration_ms: i32,
}

#[voo::component]
#[voo::style("./RolldownSummary.css", scoped)]
#[allow(non_snake_case)]
pub fn RolldownSummary(
    view: &voo::View,
    props: RolldownSummaryProps,
) -> Result<voo::ViewElement, JsValue> {
    let title = match props.status.as_str() {
        "success" => "Build succeeded",
        "error" => "Build failed",
        "building" => "Building in the browser…",
        "needs-isolation" => "Build paused by the host",
        _ => "Ready to build",
    };
    let summary = format!("{} · {} emitted files · {} ms", title, props.asset_count, props.duration_ms);
    Ok(voo::rsx!(view,
        <article class="vooya-summary">
            <p class="summary-label">{"Vooya Rust summary"}</p>
            <strong>{summary}</strong>
        </article>
    )?)
}
