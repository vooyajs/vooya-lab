use std::rc::Rc;

use rstar::RTree;
use wasm_bindgen::{JsCast, JsValue};
use web_sys::{CanvasRenderingContext2d, HtmlCanvasElement, MouseEvent};
use vooya as voo;

#[voo::props]
#[derive(voo::FromJs)]
pub struct ScatterPlotProps {
    pub points: u32,
    pub zoom: f64,
}

#[voo::component]
#[voo::style("./ScatterPlot.css", scoped)]
#[allow(non_snake_case)]
pub fn ScatterPlot(
    view: &voo::View,
    props: ScatterPlotProps,
) -> Result<voo::ViewElement, JsValue> {
    let root = view
        .element("section")?
        .class("scatter-shell rust-scatter")
        .attribute("data-vooya-island", "scatter-plot")?;
    let toolbar = view.element("div")?.class("scatter-toolbar");
    let label = view.element("strong")?.text("Rust R-tree");
    let summary = view.element("span")?.attribute("data-scatter-summary", "")?;
    let query = view.element("span")?.class("scatter-query").text("Move over the plot to query");
    toolbar.append(&label)?;
    toolbar.append(&summary)?;
    toolbar.append(&query)?;

    let surface = view.element("div")?.class("scatter-surface");
    let canvas = view
        .element("canvas")?
        .attribute("data-scatter-canvas", "")?
        .attribute("width", "960")?
        .attribute("height", "360")?
        .attribute("aria-label", "R-tree scatter plot canvas")?;
    let marker = view.element("i")?.class("scatter-nearest-marker");
    surface.append(&canvas)?;
    surface.append(&marker)?;
    root.append(&toolbar)?;
    root.append(&surface)?;

    let points = generate_points(props.points, props.zoom);
    draw(&canvas, &points)?;
    let indexed_points = points.len();
    summary.set_text(&format!("{indexed_points} indexed points · {:.0}% zoom", props.zoom * 100.0));

    let started = now();
    let tree = Rc::new(RTree::bulk_load(points));
    let index_ms = now() - started;
    query.set_text(&format!("build {index_ms:.2} ms · move to query"));

    let canvas_for_query = canvas.clone();
    let marker_for_query = marker.clone();
    let query_for_query = query.clone();
    canvas.on_owned("mousemove", move |event| {
        let Some(event) = event.dyn_ref::<MouseEvent>() else {
            return;
        };
        let rect = canvas_for_query.as_element().get_bounding_client_rect();
        if rect.width() <= 0.0 || rect.height() <= 0.0 {
            return;
        }
        let x = ((event.client_x() as f64 - rect.left()) / rect.width() * 960.0).clamp(0.0, 960.0);
        let y = ((event.client_y() as f64 - rect.top()) / rect.height() * 360.0).clamp(0.0, 360.0);
        let started = now();
        let Some(nearest) = tree.nearest_neighbor(&[x, y]) else {
            return;
        };
        let elapsed = now() - started;
        let left = nearest[0] / 960.0 * 100.0;
        let top = nearest[1] / 360.0 * 100.0;
        let _ = marker_for_query.as_element().set_attribute(
            "style",
            &format!("left:{left:.3}%;top:{top:.3}%;opacity:1"),
        );
        query_for_query.set_text(&format!("nearest {elapsed:.3} ms"));
    })?;

    Ok(root)
}

fn generate_points(count: u32, zoom: f64) -> Vec<[f64; 2]> {
    let zoom = zoom.clamp(0.45, 5.0);
    let seed = |value: u32| {
        let x = (value as f64 * 12.9898).sin() * 43_758.5453;
        x - x.floor()
    };
    (0..count)
        .filter_map(|index| {
            let group = (index % 3) as usize;
            let center_x = [0.30, 0.55, 0.74][group];
            let center_y = [0.65, 0.35, 0.60][group];
            let x = ((center_x + (seed(index) - 0.5) * 0.30 - 0.5) * zoom + 0.5) * 960.0;
            let y = ((center_y + (seed(index.wrapping_add(1)) - 0.5) * 0.36 - 0.5) * zoom + 0.5) * 360.0;
            ((0.0..960.0).contains(&x) && (0.0..360.0).contains(&y)).then_some([x, y])
        })
        .collect()
}

fn draw(canvas: &voo::ViewElement, points: &[[f64; 2]]) -> Result<(), JsValue> {
    let canvas = canvas
        .as_element()
        .dyn_ref::<HtmlCanvasElement>()
        .ok_or_else(|| JsValue::from_str("scatter case canvas is unavailable"))?;
    let context = canvas
        .get_context("2d")?
        .ok_or_else(|| JsValue::from_str("scatter case has no 2d context"))?
        .dyn_into::<CanvasRenderingContext2d>()?;
    let width = canvas.width() as f64;
    let height = canvas.height() as f64;

    context.set_fill_style_str("#081119");
    context.fill_rect(0.0, 0.0, width, height);
    context.set_stroke_style_str("#213644");
    for ratio in [0.25, 0.5, 0.75] {
        context.begin_path();
        context.move_to(width * ratio, 0.0);
        context.line_to(width * ratio, height);
        context.move_to(0.0, height * ratio);
        context.line_to(width, height * ratio);
        context.stroke();
    }

    let colors = ["#76e3ba", "#8ea4ff", "#f3c96b"];
    for (index, [x, y]) in points.iter().enumerate() {
        context.set_fill_style_str(colors[index % 3]);
        context.set_global_alpha(0.42);
        context.fill_rect(*x, *y, 1.7, 1.7);
    }
    context.set_global_alpha(1.0);
    Ok(())
}

fn now() -> f64 {
    web_sys::window()
        .and_then(|window| window.performance())
        .map(|performance| performance.now())
        .unwrap_or_else(js_sys::Date::now)
}
