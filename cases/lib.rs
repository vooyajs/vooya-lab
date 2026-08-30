// The lab keeps case implementations in their category folders while this
// authored crate root makes every selected component part of one Vooya build.
#[path = "bundlers/rspack/src/RspackSummary.rs"]
pub mod rspack_summary;

#[path = "bundlers/rolldown/src/RolldownSummary.rs"]
pub mod rolldown_summary;

#[path = "examples/scatter-plot/src/ScatterPlot.rs"]
pub mod scatter_plot;

#[path = "data/log-atlas/src/LogAtlas.rs"]
pub mod log_atlas;

#[path = "state/workflow-replay/src/WorkflowReplay.rs"]
pub mod workflow_replay;
