use std::{collections::BTreeMap, sync::OnceLock};

use regex::Regex;
use wasm_bindgen::JsValue;
use vooya as voo;

#[voo::props]
#[derive(voo::FromJs)]
pub struct LogAtlasProps {
    pub query: String,
    pub minimum_duration: u32,
    pub window: u32,
}

#[derive(Clone)]
struct Span {
    offset: u32,
    duration: u32,
    service: String,
    route: String,
    level: String,
    status: u16,
}

struct TraceCorpus {
    spans: Vec<Span>,
    service_index: BTreeMap<String, Vec<usize>>,
}

static TRACE_CORPUS: OnceLock<TraceCorpus> = OnceLock::new();

#[voo::component]
#[voo::style("./LogAtlas.css", scoped)]
#[allow(non_snake_case)]
pub fn LogAtlas(view: &voo::View, props: LogAtlasProps) -> Result<voo::ViewElement, JsValue> {
    let root = view
        .element("section")?
        .class("log-atlas-engine")
        .attribute("data-vooya-island", "log-atlas")?;
    let corpus = TRACE_CORPUS.get_or_init(build_corpus);
    let matcher = match Regex::new(if props.query.trim().is_empty() { ".*" } else { props.query.trim() }) {
        Ok(regex) => regex,
        Err(error) => {
            let panel = view.element("div")?.class("atlas-error");
            panel.append(&view.element("strong")?.text("Query rejected by Rust regex"))?;
            panel.append(&view.element("p")?.text(&error.to_string()))?;
            root.append(&panel)?;
            return Ok(root);
        }
    };

    let window = props.window.clamp(1_000, 12_000);
    let mut matches = corpus
        .spans
        .iter()
        .filter(|span| span.offset < window)
        .filter(|span| span.duration >= props.minimum_duration)
        .filter(|span| matcher.is_match(&format!("{} {} {} {}", span.service, span.route, span.level, span.status)))
        .collect::<Vec<_>>();
    matches.sort_by_key(|span| (span.offset, std::cmp::Reverse(span.duration)));

    let errors = matches.iter().filter(|span| span.status >= 500).count();
    let slow = matches.iter().filter(|span| span.duration >= 600).count();
    let header = view.element("header")?.class("atlas-engine-header");
    let identity = view.element("div")?;
    identity.append(&view.element("span")?.text("WASM-RESIDENT TRACE INDEX"))?;
    identity.append(&view.element("strong")?.text(&format!("{} / {} spans", matches.len(), corpus.spans.len())))?;
    header.append(&identity)?;
    for (label, value) in [("services", corpus.service_index.len()), ("errors", errors), ("slow", slow), ("window", window as usize)] {
        let metric = view.element("div")?.class("atlas-metric");
        metric.append(&view.element("span")?.text(label))?;
        metric.append(&view.element("strong")?.text(&value.to_string()))?;
        header.append(&metric)?;
    }
    root.append(&header)?;

    let ruler = view.element("div")?.class("atlas-ruler");
    for mark in 0..=4 {
        ruler.append(&view.element("span")?.text(&format!("{}ms", window * mark / 4)))?;
    }
    root.append(&ruler)?;

    let rows = view.element("div")?.class("atlas-rows");
    for span in matches.iter().take(32) {
        let row = view
            .element("article")?
            .class(if span.status >= 500 { "atlas-row is-error" } else { "atlas-row" });
        let service = view.element("div")?.class("atlas-service");
        service.append(&view.element("strong")?.text(&span.service))?;
        service.append(&view.element("span")?.text(&span.route))?;
        let track = view.element("div")?.class("atlas-track");
        let left = span.offset as f64 / window as f64 * 100.0;
        let width = (span.duration as f64 / window as f64 * 100.0).clamp(0.8, 100.0 - left);
        let bar = view
            .element("i")?
            .attribute("style", &format!("--atlas-left:{left:.3}%;--atlas-width:{width:.3}%"))?
            .attribute("aria-hidden", "true")?;
        track.append(&bar)?;
        let duration = view.element("div")?.class("atlas-duration");
        duration.append(&view.element("strong")?.text(&format!("{}ms", span.duration)))?;
        duration.append(&view.element("span")?.text(&span.status.to_string()))?;
        row.append(&service)?;
        row.append(&track)?;
        row.append(&duration)?;
        rows.append(&row)?;
    }
    if matches.is_empty() {
        rows.append(&view.element("p")?.class("atlas-empty").text("No spans match this Rust-side query."))?;
    }
    root.append(&rows)?;
    Ok(root)
}

fn build_corpus() -> TraceCorpus {
    let services = ["gateway", "auth", "catalog", "checkout", "ledger", "search"];
    let routes = ["GET /search", "POST /session", "GET /items", "POST /orders", "PUT /ledger", "GET /facets"];
    let spans = (0..1_800_u32)
        .filter_map(|index| {
            let service_index = ((index * 7 + index / 11) % services.len() as u32) as usize;
            let offset = (index * 97 + (index % 17) * 31) % 12_000;
            let duration = 18 + ((index * 43 + index * index % 211) % 1_280);
            let failed = index % 29 == 0 || (service_index == 3 && index % 17 == 0);
            let level = if failed { "error" } else if duration > 650 { "warn" } else { "info" };
            let status = if failed { 500 + (index % 4) as u16 } else { 200 + (index % 5) as u16 };
            let line = format!("{offset}|{duration}|{}|{}|{level}|{status}", services[service_index], routes[service_index]);
            parse_span_line(&line)
        })
        .collect::<Vec<_>>();
    let mut service_index = BTreeMap::<String, Vec<usize>>::new();
    for (index, span) in spans.iter().enumerate() {
        service_index.entry(span.service.clone()).or_default().push(index);
    }
    TraceCorpus { spans, service_index }
}

fn parse_span_line(line: &str) -> Option<Span> {
    let mut fields = line.split('|');
    Some(Span {
        offset: fields.next()?.parse().ok()?,
        duration: fields.next()?.parse().ok()?,
        service: fields.next()?.to_owned(),
        route: fields.next()?.to_owned(),
        level: fields.next()?.to_owned(),
        status: fields.next()?.parse().ok()?,
    })
}
