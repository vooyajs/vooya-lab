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

#[path = "simulation/bevy-world-inspector/src/BevyWorld.rs"]
pub mod bevy_world;

#[path = "geometry/mesh-clinic/src/MeshClinic.rs"]
pub mod mesh_clinic;

#[path = "geometry/vector-tile-forge/src/VectorTileForge.rs"]
pub mod vector_tile_forge;

#[path = "tools/source-surgeon/src/SourceSurgeon.rs"]
pub mod source_surgeon;
