use wasm_bindgen::{JsCast, JsValue};
use web_sys::{CanvasRenderingContext2d, HtmlCanvasElement};
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
        .class("rust-scatter")
        .attribute("data-vooya-island", "scatter-plot")?;
    let toolbar = view.element("div")?.class("scatter-toolbar");
    let label = view.element("strong")?.text("Rust / WASM canvas");
    let summary = view.element("span")?.attribute("data-scatter-summary", "")?;
    toolbar.append(&label)?;
    toolbar.append(&summary)?;

    let canvas = view
        .element("canvas")?
        .attribute("data-scatter-canvas", "")?
        .attribute("width", "960")?
        .attribute("height", "360")?
        .attribute("aria-label", "Scatter plot canvas")?;
    root.append(&toolbar)?;
    root.append(&canvas)?;
    draw(&canvas, &summary, props.points, props.zoom)?;
    Ok(root)
}

fn draw(
    canvas: &voo::ViewElement,
    summary: &voo::ViewElement,
    points: u32,
    zoom: f64,
) -> Result<(), JsValue> {
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
    let zoom = zoom.clamp(0.45, 5.0);

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
    let seed = |value: u32| {
        let x = (value as f64 * 12.9898).sin() * 43_758.5453;
        x - x.floor()
    };
    for index in 0..points {
        let group = (index % 3) as usize;
        let center_x = [0.30, 0.55, 0.74][group];
        let center_y = [0.65, 0.35, 0.60][group];
        let x = ((center_x + (seed(index) - 0.5) * 0.30 - 0.5) * zoom + 0.5) * width;
        let y = ((center_y + (seed(index.wrapping_add(1)) - 0.5) * 0.36 - 0.5) * zoom + 0.5) * height;
        if (0.0..width).contains(&x) && (0.0..height).contains(&y) {
            context.set_fill_style_str(colors[group]);
            context.set_global_alpha(0.42);
            context.fill_rect(x, y, 1.7, 1.7);
        }
    }
    context.set_global_alpha(1.0);
    summary.set_text(&format!("{} points | {:.0}% zoom", points, zoom * 100.0));
    Ok(())
}
