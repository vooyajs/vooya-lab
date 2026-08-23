use wasm_bindgen::JsValue;
use vooya as voo;

#[voo::props]
#[derive(voo::FromJs)]
pub struct RspackSummaryProps {
    pub status: String,
    pub output: String,
    pub asset_count: i32,
    pub duration_ms: i32,
}

#[voo::component]
#[voo::style("./RspackSummary.css", scoped)]
#[allow(non_snake_case)]
pub fn RspackSummary(
    view: &voo::View,
    props: RspackSummaryProps,
) -> Result<voo::ViewElement, JsValue> {
    let summary = format!("{} · {} assets · {} ms", props.status, props.asset_count, props.duration_ms);
    Ok(voo::rsx!(view,
        <article class="vooya-summary">
            <p class="summary-label">{"Vooya Rust summary"}</p>
            <strong>{summary}</strong>
            <pre>{props.output}</pre>
        </article>
    )?)
}
