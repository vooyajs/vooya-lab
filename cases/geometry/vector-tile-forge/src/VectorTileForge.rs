use geo::{Coord, LineString, Polygon, Simplify};
use geojson::{GeoJson, GeometryValue, Position};
use vooya as voo;

const TILE_GEOJSON: &str = r#"{
  "type":"FeatureCollection",
  "features":[
    {"type":"Feature","properties":{"kind":"district"},"geometry":{"type":"Polygon","coordinates":[[[8,14],[13,9],[21,7],[29,10],[36,8],[45,13],[53,10],[61,15],[70,13],[79,18],[88,17],[93,25],[91,34],[95,42],[89,50],[92,60],[86,67],[88,77],[80,84],[70,82],[62,89],[52,85],[43,91],[34,86],[24,88],[17,80],[10,74],[12,64],[7,55],[11,47],[6,38],[10,29],[8,14]]]}},
    {"type":"Feature","properties":{"kind":"water"},"geometry":{"type":"Polygon","coordinates":[[[53,20],[59,18],[66,21],[70,27],[68,34],[63,38],[57,36],[52,31],[53,20]]]}},
    {"type":"Feature","properties":{"kind":"road-primary"},"geometry":{"type":"LineString","coordinates":[[4,67],[12,62],[18,64],[25,57],[32,59],[40,50],[47,53],[56,43],[64,45],[72,37],[81,39],[96,29]]}},
    {"type":"Feature","properties":{"kind":"road-secondary"},"geometry":{"type":"LineString","coordinates":[[20,4],[23,13],[21,21],[27,29],[25,37],[31,45],[30,54],[36,62],[35,71],[42,82],[44,96]]}},
    {"type":"Feature","properties":{"kind":"road-secondary"},"geometry":{"type":"LineString","coordinates":[[6,35],[16,33],[24,36],[34,31],[43,34],[51,29],[61,32],[71,27],[80,30],[93,24]]}}
  ]
}"#;

enum RawGeometry {
    Polygon(Vec<[f64; 2]>),
    Line(Vec<[f64; 2]>),
}

struct RawLayer {
    kind: String,
    geometry: RawGeometry,
}

#[derive(voo::ToJs, Clone, PartialEq)]
pub struct VectorLayerProjection {
    pub kind: String,
    pub path: String,
    pub vertices: u32,
}

#[derive(voo::ToJs, Clone, PartialEq)]
pub struct VectorTriangleProjection {
    pub points: String,
}

#[derive(voo::ToJs, Clone, PartialEq)]
pub struct VectorTileSnapshot {
    pub tolerance: u32,
    pub original_vertices: u32,
    pub simplified_vertices: u32,
    pub reduction_percent: u32,
    pub triangle_count: u32,
    pub input_bytes: u32,
    pub output_bytes: u32,
    pub layers: Vec<VectorLayerProjection>,
    pub triangles: Vec<VectorTriangleProjection>,
}

pub struct VectorTileForge {
    tolerance: u32,
    layers: Vec<RawLayer>,
}

impl Default for VectorTileForge {
    fn default() -> Self {
        Self { tolerance: 24, layers: parse_tile(TILE_GEOJSON).unwrap_or_default() }
    }
}

#[voo::store]
impl VectorTileForge {
    #[voo::action]
    pub fn set_tolerance(&mut self, tolerance: u32) {
        self.tolerance = tolerance.min(28);
    }

    #[voo::action]
    pub fn reset(&mut self) {
        self.tolerance = 24;
    }

    #[voo::snapshot]
    pub fn snapshot(&self) -> VectorTileSnapshot {
        let epsilon = self.tolerance as f64 / 10.0;
        let original_vertices = self.layers.iter().map(|layer| match &layer.geometry {
            RawGeometry::Polygon(points) | RawGeometry::Line(points) => points.len(),
        }).sum::<usize>();
        let mut layers = Vec::new();
        let mut triangles = Vec::new();
        let mut simplified_vertices = 0usize;

        for layer in &self.layers {
            match &layer.geometry {
                RawGeometry::Line(points) => {
                    let line = line_string(points).simplify(epsilon);
                    simplified_vertices += line.0.len();
                    layers.push(VectorLayerProjection { kind: layer.kind.clone(), path: svg_path(&line.0, false), vertices: line.0.len() as u32 });
                }
                RawGeometry::Polygon(points) => {
                    let polygon = Polygon::new(line_string(points), Vec::new()).simplify(epsilon);
                    let ring = &polygon.exterior().0;
                    simplified_vertices += ring.len();
                    layers.push(VectorLayerProjection { kind: layer.kind.clone(), path: svg_path(ring, true), vertices: ring.len() as u32 });
                    if layer.kind == "district" {
                        triangles = triangulate(ring);
                    }
                }
            }
        }
        let output_bytes = layers.iter().map(|layer| layer.path.len()).sum::<usize>() + triangles.iter().map(|triangle| triangle.points.len()).sum::<usize>();
        let reduction_percent = if original_vertices == 0 { 0 } else { ((original_vertices.saturating_sub(simplified_vertices)) * 100 / original_vertices) as u32 };

        VectorTileSnapshot {
            tolerance: self.tolerance,
            original_vertices: original_vertices as u32,
            simplified_vertices: simplified_vertices as u32,
            reduction_percent,
            triangle_count: triangles.len() as u32,
            input_bytes: TILE_GEOJSON.len() as u32,
            output_bytes: output_bytes as u32,
            layers,
            triangles,
        }
    }
}

fn parse_tile(source: &str) -> Result<Vec<RawLayer>, String> {
    let GeoJson::FeatureCollection(collection) = source.parse::<GeoJson>().map_err(|error| error.to_string())? else {
        return Err("tile is not a FeatureCollection".to_owned());
    };
    collection.features.into_iter().filter_map(|feature| {
        let kind = feature.properties.as_ref()?.get("kind")?.as_str()?.to_owned();
        let geometry = feature.geometry?;
        match geometry.value {
            GeometryValue::LineString { coordinates } => Some(Ok(RawLayer { kind, geometry: RawGeometry::Line(positions(coordinates)) })),
            GeometryValue::Polygon { coordinates } => coordinates.into_iter().next().map(|ring| Ok(RawLayer { kind, geometry: RawGeometry::Polygon(positions(ring)) })),
            _ => None,
        }
    }).collect()
}

fn positions(points: Vec<Position>) -> Vec<[f64; 2]> {
    points.into_iter().filter_map(|point| Some([*point.as_slice().first()?, *point.as_slice().get(1)?])).collect()
}

fn line_string(points: &[[f64; 2]]) -> LineString<f64> {
    LineString::new(points.iter().map(|point| Coord { x: point[0], y: point[1] }).collect())
}

fn svg_path(points: &[Coord<f64>], closed: bool) -> String {
    let mut commands = points.iter().enumerate().map(|(index, point)| format!("{} {:.2} {:.2}", if index == 0 { "M" } else { "L" }, point.x, point.y)).collect::<Vec<_>>().join(" ");
    if closed { commands.push_str(" Z"); }
    commands
}

fn triangulate(ring: &[Coord<f64>]) -> Vec<VectorTriangleProjection> {
    let vertices = ring.iter().take(ring.len().saturating_sub(1)).flat_map(|point| [point.x, point.y]).collect::<Vec<_>>();
    let Ok(indices) = earcutr::earcut(&vertices, &[], 2) else { return Vec::new(); };
    indices.chunks_exact(3).filter_map(|triangle| {
        let points = triangle.iter().filter_map(|index| vertices.get(index * 2).zip(vertices.get(index * 2 + 1))).map(|(x, y)| format!("{x:.2},{y:.2}")).collect::<Vec<_>>();
        (points.len() == 3).then(|| VectorTriangleProjection { points: points.join(" ") })
    }).collect()
}
