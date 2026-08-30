use syn::visit::{self, Visit};
use syn::visit_mut::{self, VisitMut};
use wasm_bindgen::JsValue;
use vooya as voo;

#[voo::props]
#[derive(voo::FromJs)]
pub struct SourceSurgeonProps {
    pub source: String,
    pub rename_to: String,
}

#[derive(Default)]
struct AstMetrics {
    functions: Vec<String>,
    structs: u32,
    enums: u32,
    impls: u32,
    macros: u32,
    unsafe_blocks: u32,
}

impl<'ast> Visit<'ast> for AstMetrics {
    fn visit_item_fn(&mut self, node: &'ast syn::ItemFn) {
        self.functions.push(node.sig.ident.to_string());
        visit::visit_item_fn(self, node);
    }
    fn visit_item_struct(&mut self, node: &'ast syn::ItemStruct) {
        self.structs += 1;
        visit::visit_item_struct(self, node);
    }
    fn visit_item_enum(&mut self, node: &'ast syn::ItemEnum) {
        self.enums += 1;
        visit::visit_item_enum(self, node);
    }
    fn visit_item_impl(&mut self, node: &'ast syn::ItemImpl) {
        self.impls += 1;
        visit::visit_item_impl(self, node);
    }
    fn visit_macro(&mut self, node: &'ast syn::Macro) {
        self.macros += 1;
        visit::visit_macro(self, node);
    }
    fn visit_expr_unsafe(&mut self, node: &'ast syn::ExprUnsafe) {
        self.unsafe_blocks += 1;
        visit::visit_expr_unsafe(self, node);
    }
}

struct RenameIdentifier {
    from: String,
    to: syn::Ident,
    replacements: u32,
}

impl VisitMut for RenameIdentifier {
    fn visit_item_fn_mut(&mut self, function: &mut syn::ItemFn) {
        if function.sig.ident == self.from.as_str() {
            function.sig.ident = self.to.clone();
            self.replacements += 1;
        }
        visit_mut::visit_item_fn_mut(self, function);
    }

    fn visit_path_segment_mut(&mut self, segment: &mut syn::PathSegment) {
        if segment.ident == self.from.as_str() {
            segment.ident = self.to.clone();
            self.replacements += 1;
        }
        visit_mut::visit_path_segment_mut(self, segment);
    }
}

#[voo::component]
#[voo::style("./SourceSurgeon.css", scoped)]
#[allow(non_snake_case)]
pub fn SourceSurgeon(view: &voo::View, props: SourceSurgeonProps) -> Result<voo::ViewElement, JsValue> {
    let root = view.element("section")?.class("source-surgeon-engine").attribute("data-vooya-island", "source-surgeon")?;
    let mut file = match syn::parse_file(&props.source) {
        Ok(file) => file,
        Err(error) => {
            let panel = view.element("div")?.class("surgeon-diagnostic is-error");
            panel.append(&view.element("span")?.text("SYN PARSER · REJECTED"))?;
            panel.append(&view.element("h2")?.text("The draft is not valid Rust syntax"))?;
            panel.append(&view.element("p")?.text(&error.to_string()))?;
            panel.append(&view.element("code")?.text("No regex fallback or partial rewrite was applied."))?;
            root.append(&panel)?;
            return Ok(root);
        }
    };

    let mut metrics = AstMetrics::default();
    metrics.visit_file(&file);
    let first_function = metrics.functions.first().cloned();
    let mut rewrite_label = "ANALYSIS ONLY".to_owned();
    let mut replacements = 0;
    if !props.rename_to.trim().is_empty() {
        match (first_function.as_ref(), syn::parse_str::<syn::Ident>(props.rename_to.trim())) {
            (Some(original), Ok(replacement)) => {
                let mut rename = RenameIdentifier { from: original.clone(), to: replacement.clone(), replacements: 0 };
                rename.visit_file_mut(&mut file);
                replacements = rename.replacements;
                rewrite_label = format!("{} → {}", original, replacement);
            }
            (_, Err(error)) => {
                let warning = view.element("div")?.class("surgeon-diagnostic is-warning");
                warning.append(&view.element("span")?.text("IDENTIFIER REJECTED"))?;
                warning.append(&view.element("p")?.text(&error.to_string()))?;
                root.append(&warning)?;
            }
            _ => {}
        }
    }

    let header = view.element("header")?.class("surgeon-engine-header");
    let identity = view.element("div")?;
    identity.append(&view.element("span")?.text("SYN 3 · FULL AST"))?;
    identity.append(&view.element("strong")?.text("Rust syntax accepted"))?;
    header.append(&identity)?;
    for (label, value) in [("functions", metrics.functions.len() as u32), ("types", metrics.structs + metrics.enums), ("impls", metrics.impls), ("macros", metrics.macros), ("unsafe", metrics.unsafe_blocks)] {
        let metric = view.element("div")?.class(if label == "unsafe" && value > 0 { "surgeon-metric is-alert" } else { "surgeon-metric" });
        metric.append(&view.element("span")?.text(label))?;
        metric.append(&view.element("b")?.text(&value.to_string()))?;
        header.append(&metric)?;
    }
    root.append(&header)?;

    let content = view.element("div")?.class("surgeon-engine-content");
    let inventory = view.element("aside")?.class("surgeon-inventory");
    inventory.append(&view.element("span")?.text("ITEM INVENTORY"))?;
    let list = view.element("ol")?;
    for (index, function) in metrics.functions.iter().enumerate() {
        let item = view.element("li")?;
        item.append(&view.element("code")?.text(&format!("FN {:02}", index + 1)))?;
        item.append(&view.element("strong")?.text(function))?;
        list.append(&item)?;
    }
    if metrics.functions.is_empty() {
        list.append(&view.element("li")?.text("No free functions found"))?;
    }
    inventory.append(&list)?;
    let contract = view.element("div")?.class("surgeon-rewrite-contract");
    contract.append(&view.element("span")?.text("STRUCTURAL REWRITE"))?;
    contract.append(&view.element("strong")?.text(&rewrite_label))?;
    contract.append(&view.element("small")?.text(&format!("{replacements} matching identifiers replaced")))?;
    inventory.append(&contract)?;
    content.append(&inventory)?;

    let output = view.element("section")?.class("surgeon-output");
    let output_header = view.element("header")?;
    output_header.append(&view.element("span")?.text("PRETTYPLEASE OUTPUT"))?;
    output_header.append(&view.element("code")?.text(&format!("{} BYTES", props.source.len())))?;
    output.append(&output_header)?;
    output.append(&view.element("pre")?.attribute("data-surgeon-output", "")?.text(&prettyplease::unparse(&file)))?;
    content.append(&output)?;
    root.append(&content)?;
    Ok(root)
}
