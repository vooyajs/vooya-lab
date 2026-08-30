use std::collections::{HashMap, HashSet, VecDeque};
use std::io::Cursor;

use vooya as voo;

const DAMAGED_OBJ: &str = r#"
o clinic_damaged
v -1 -1 -1
v  1 -1 -1
v  1  1 -1
v -1  1 -1
v -1 -1  1
v  1 -1  1
v  1  1  1
v -1  1  1
v  0 -2  0
f 1 2 3 4
f 5 8 7 6
f 1 5 6 2
f 2 6 7 3
f 4 3 7 8
f 1 2 3
f 1 2 2
f 1 2 9
"#;

const CLEAN_OBJ: &str = r#"
o clinic_clean
v -1 -1 -1
v  1 -1 -1
v  1  1 -1
v -1  1 -1
v -1 -1  1
v  1 -1  1
v  1  1  1
v -1  1  1
f 1 2 3 4
f 5 8 7 6
f 1 5 6 2
f 2 6 7 3
f 3 7 8 4
f 5 1 4 8
"#;

#[derive(voo::ToJs, Clone, PartialEq)]
pub struct MeshTriangleProjection {
    pub points: String,
    pub status: String,
    pub depth: f64,
}

#[derive(voo::ToJs, Clone, PartialEq)]
pub struct MeshClinicSnapshot {
    pub specimen: String,
    pub health: String,
    pub vertex_count: u32,
    pub triangle_count: u32,
    pub degenerate_count: u32,
    pub duplicate_count: u32,
    pub boundary_edges: u32,
    pub nonmanifold_edges: u32,
    pub components: u32,
    pub removed_faces: u32,
    pub rotation: u32,
    pub triangles: Vec<MeshTriangleProjection>,
}

pub struct MeshClinic {
    specimen: String,
    vertices: Vec<[f64; 3]>,
    triangles: Vec<[u32; 3]>,
    removed_faces: u32,
    rotation: u32,
}

impl Default for MeshClinic {
    fn default() -> Self {
        Self::from_obj("DAMAGED SPECIMEN", DAMAGED_OBJ).unwrap_or_else(|_| Self {
            specimen: "LOAD FAILED".to_owned(),
            vertices: Vec::new(),
            triangles: Vec::new(),
            removed_faces: 0,
            rotation: 28,
        })
    }
}

#[voo::store]
impl MeshClinic {
    #[voo::action]
    pub fn load_damaged(&mut self) {
        *self = Self::from_obj("DAMAGED SPECIMEN", DAMAGED_OBJ).unwrap_or_default_fallback();
    }

    #[voo::action]
    pub fn load_clean(&mut self) {
        *self = Self::from_obj("REFERENCE CUBE", CLEAN_OBJ).unwrap_or_default_fallback();
    }

    #[voo::action]
    pub fn rotate(&mut self, degrees: u32) {
        self.rotation = degrees.min(360);
    }

    #[voo::action]
    pub fn repair(&mut self) {
        let mut seen = HashSet::new();
        let before = self.triangles.len();
        self.triangles.retain(|triangle| {
            !is_degenerate(&self.vertices, triangle) && seen.insert(face_key(triangle))
        });
        self.removed_faces = self.removed_faces.saturating_add((before - self.triangles.len()) as u32);
        self.specimen = "BOUNDED REPAIR".to_owned();
    }

    #[voo::action]
    pub fn reset(&mut self) {
        *self = Self::default();
    }

    #[voo::snapshot]
    pub fn snapshot(&self) -> MeshClinicSnapshot {
        let diagnostics = analyze(&self.vertices, &self.triangles);
        let mut duplicate_faces = HashSet::new();
        let mut seen_faces = HashSet::new();
        for triangle in &self.triangles {
            let key = face_key(triangle);
            if !seen_faces.insert(key) {
                duplicate_faces.insert(key);
            }
        }
        let edge_counts = edge_incidence(&self.triangles);
        let mut triangles = self.triangles.iter().map(|triangle| {
            let status = if is_degenerate(&self.vertices, triangle) {
                "degenerate"
            } else if duplicate_faces.contains(&face_key(triangle)) {
                "duplicate"
            } else if triangle_edges(triangle).iter().any(|edge| edge_counts.get(edge).copied().unwrap_or(0) > 2) {
                "nonmanifold"
            } else {
                "healthy"
            };
            project_triangle(&self.vertices, triangle, self.rotation, status)
        }).collect::<Vec<_>>();
        triangles.sort_by(|left, right| left.depth.total_cmp(&right.depth));
        let health = if diagnostics.degenerate_count == 0 && diagnostics.duplicate_count == 0 && diagnostics.nonmanifold_edges == 0 && diagnostics.boundary_edges == 0 {
            "SEALED"
        } else if diagnostics.degenerate_count == 0 && diagnostics.duplicate_count == 0 {
            "STABLE · OPEN TOPOLOGY"
        } else {
            "INTERVENTION REQUIRED"
        };

        MeshClinicSnapshot {
            specimen: self.specimen.clone(),
            health: health.to_owned(),
            vertex_count: self.vertices.len() as u32,
            triangle_count: self.triangles.len() as u32,
            degenerate_count: diagnostics.degenerate_count,
            duplicate_count: diagnostics.duplicate_count,
            boundary_edges: diagnostics.boundary_edges,
            nonmanifold_edges: diagnostics.nonmanifold_edges,
            components: diagnostics.components,
            removed_faces: self.removed_faces,
            rotation: self.rotation,
            triangles,
        }
    }
}

impl MeshClinic {
    fn from_obj(specimen: &str, source: &str) -> Result<Self, String> {
        let mut reader = Cursor::new(source.as_bytes());
        let options = tobj::LoadOptions { triangulate: true, single_index: true, ..Default::default() };
        let (models, _) = tobj::load_obj_buf(&mut reader, &options, |_| Ok((Vec::new(), Default::default())))
            .map_err(|error| error.to_string())?;
        let mesh = models.first().ok_or_else(|| "OBJ contains no mesh".to_owned())?.mesh.clone();
        let vertices = mesh.positions.chunks_exact(3).map(|point| [point[0] as f64, point[1] as f64, point[2] as f64]).collect();
        let triangles = mesh.indices.chunks_exact(3).map(|face| [face[0], face[1], face[2]]).collect();
        Ok(Self { specimen: specimen.to_owned(), vertices, triangles, removed_faces: 0, rotation: 28 })
    }
}

trait MeshClinicFallback {
    fn unwrap_or_default_fallback(self) -> MeshClinic;
}

impl MeshClinicFallback for Result<MeshClinic, String> {
    fn unwrap_or_default_fallback(self) -> MeshClinic {
        self.unwrap_or_else(|_| MeshClinic { specimen: "LOAD FAILED".to_owned(), vertices: Vec::new(), triangles: Vec::new(), removed_faces: 0, rotation: 28 })
    }
}

struct MeshDiagnostics {
    degenerate_count: u32,
    duplicate_count: u32,
    boundary_edges: u32,
    nonmanifold_edges: u32,
    components: u32,
}

fn analyze(vertices: &[[f64; 3]], triangles: &[[u32; 3]]) -> MeshDiagnostics {
    let mut faces = HashSet::new();
    let degenerate_count = triangles.iter().filter(|triangle| is_degenerate(vertices, triangle)).count() as u32;
    let duplicate_count = triangles.iter().filter(|triangle| !faces.insert(face_key(triangle))).count() as u32;
    let edges = edge_incidence(triangles);
    MeshDiagnostics {
        degenerate_count,
        duplicate_count,
        boundary_edges: edges.values().filter(|count| **count == 1).count() as u32,
        nonmanifold_edges: edges.values().filter(|count| **count > 2).count() as u32,
        components: connected_components(triangles),
    }
}

fn face_key(triangle: &[u32; 3]) -> [u32; 3] {
    let mut key = *triangle;
    key.sort_unstable();
    key
}

fn triangle_edges(triangle: &[u32; 3]) -> [(u32, u32); 3] {
    let edge = |left: u32, right: u32| if left < right { (left, right) } else { (right, left) };
    [edge(triangle[0], triangle[1]), edge(triangle[1], triangle[2]), edge(triangle[2], triangle[0])]
}

fn edge_incidence(triangles: &[[u32; 3]]) -> HashMap<(u32, u32), u32> {
    let mut edges = HashMap::new();
    for triangle in triangles {
        for edge in triangle_edges(triangle) {
            *edges.entry(edge).or_insert(0) += 1;
        }
    }
    edges
}

fn is_degenerate(vertices: &[[f64; 3]], triangle: &[u32; 3]) -> bool {
    if triangle[0] == triangle[1] || triangle[1] == triangle[2] || triangle[2] == triangle[0] {
        return true;
    }
    let Some(a) = vertices.get(triangle[0] as usize) else { return true; };
    let Some(b) = vertices.get(triangle[1] as usize) else { return true; };
    let Some(c) = vertices.get(triangle[2] as usize) else { return true; };
    let ab = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
    let ac = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
    let cross = [ab[1] * ac[2] - ab[2] * ac[1], ab[2] * ac[0] - ab[0] * ac[2], ab[0] * ac[1] - ab[1] * ac[0]];
    cross.iter().map(|value| value * value).sum::<f64>() < 0.000_001
}

fn connected_components(triangles: &[[u32; 3]]) -> u32 {
    if triangles.is_empty() { return 0; }
    let mut edge_faces = HashMap::<(u32, u32), Vec<usize>>::new();
    for (index, triangle) in triangles.iter().enumerate() {
        for edge in triangle_edges(triangle) { edge_faces.entry(edge).or_default().push(index); }
    }
    let mut visited = vec![false; triangles.len()];
    let mut components = 0;
    for start in 0..triangles.len() {
        if visited[start] { continue; }
        components += 1;
        visited[start] = true;
        let mut queue = VecDeque::from([start]);
        while let Some(face) = queue.pop_front() {
            for edge in triangle_edges(&triangles[face]) {
                for neighbor in edge_faces.get(&edge).into_iter().flatten() {
                    if !visited[*neighbor] { visited[*neighbor] = true; queue.push_back(*neighbor); }
                }
            }
        }
    }
    components
}

fn project_triangle(vertices: &[[f64; 3]], triangle: &[u32; 3], degrees: u32, status: &str) -> MeshTriangleProjection {
    let angle = degrees as f64 / 180.0 * std::f64::consts::PI;
    let tilt: f64 = -0.42;
    let mut depth = 0.0;
    let points = triangle.iter().filter_map(|index| vertices.get(*index as usize)).map(|point| {
        let x = point[0] * angle.cos() - point[2] * angle.sin();
        let z = point[0] * angle.sin() + point[2] * angle.cos();
        let y = point[1] * tilt.cos() - z * tilt.sin();
        let projected_z = point[1] * tilt.sin() + z * tilt.cos();
        depth += projected_z;
        format!("{:.1},{:.1}", 360.0 + x * 142.0, 220.0 - y * 142.0)
    }).collect::<Vec<_>>().join(" ");
    MeshTriangleProjection { points, status: status.to_owned(), depth: depth / 3.0 }
}
