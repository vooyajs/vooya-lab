use bevy_ecs::prelude::*;
use bevy_ecs::schedule::IntoScheduleConfigs;
use vooya as voo;

const INITIAL_AGENTS: u32 = 24;
const MAX_AGENTS: u32 = 48;
const WORLD_LIMIT: f32 = 94.0;
const RESTITUTION: f32 = 0.92;

#[derive(Component)]
struct AgentId(u32);

#[derive(Component)]
struct Position {
    x: f32,
    y: f32,
}

#[derive(Component)]
struct Velocity {
    x: f32,
    y: f32,
}

#[derive(Component)]
struct Collider {
    radius: f32,
}

#[derive(Component)]
struct Impact(f32);

#[derive(Component)]
struct Energy(f32);

#[derive(Component)]
struct Faction(u8);

#[derive(Component)]
struct Pulse(f32);

#[derive(Resource)]
struct SimClock {
    tick: u32,
    dt: f32,
}

#[derive(Resource, Default)]
struct CollisionStats {
    contacts_last_step: u32,
    contacts_total: u32,
}

#[derive(voo::ToJs, PartialEq, Clone)]
pub struct AgentProjection {
    pub id: u32,
    pub x: f32,
    pub y: f32,
    pub energy: f32,
    pub faction: String,
    pub pulse: f32,
    pub radius: f32,
    pub impact: f32,
    pub selected: bool,
}

#[derive(voo::ToJs, PartialEq, Clone)]
pub struct BevyWorldSnapshot {
    pub tick: u32,
    pub running: bool,
    pub entity_count: u32,
    pub system_count: u32,
    pub selected_id: u32,
    pub selected_label: String,
    pub selected_energy: f32,
    pub average_energy: f32,
    pub contacts_last_step: u32,
    pub contacts_total: u32,
    pub checksum: u32,
    pub agents: Vec<AgentProjection>,
}

pub struct BevyWorld {
    world: World,
    schedule: Schedule,
    entities: Vec<Entity>,
    running: bool,
    selected_id: u32,
    next_id: u32,
}

impl Default for BevyWorld {
    fn default() -> Self {
        let mut world = World::new();
        world.insert_resource(SimClock { tick: 0, dt: 0.24 });
        world.insert_resource(CollisionStats::default());

        let mut schedule = Schedule::default();
        schedule.add_systems(
            (
                impact_decay_system,
                movement_system,
                boundary_system,
                collision_system,
                energy_system,
                pulse_system,
                clock_system,
            )
                .chain(),
        );

        let mut store = Self {
            world,
            schedule,
            entities: Vec::with_capacity(MAX_AGENTS as usize),
            running: true,
            selected_id: 1,
            next_id: 1,
        };
        for _ in 0..INITIAL_AGENTS {
            store.spawn_one();
        }
        store
    }
}

#[voo::store]
impl BevyWorld {
    #[voo::action]
    pub fn tick(&mut self, steps: u32) {
        if !self.running {
            return;
        }
        self.run_steps(steps);
    }

    #[voo::action]
    pub fn step(&mut self) {
        self.run_steps(1);
    }

    #[voo::action]
    pub fn toggle_running(&mut self) {
        self.running = !self.running;
    }

    #[voo::action]
    pub fn select(&mut self, id: u32) {
        if self.entity_for_id(id).is_some() {
            self.selected_id = id;
        }
    }

    #[voo::action]
    pub fn spawn_agent(&mut self) {
        if self.entity_count() < MAX_AGENTS {
            self.selected_id = self.spawn_one();
        }
    }

    #[voo::action]
    pub fn despawn_selected(&mut self) {
        if self.entity_count() <= 1 {
            return;
        }
        if let Some(entity) = self.entity_for_id(self.selected_id) {
            let _ = self.world.despawn(entity);
            self.entities.retain(|candidate| *candidate != entity);
            self.selected_id = self
                .entities
                .iter()
                .filter_map(|entity| {
                    self.world
                        .get_entity(*entity)
                        .ok()?
                        .get::<AgentId>()
                        .map(|id| id.0)
                })
                .min()
                .unwrap_or(0);
        }
    }

    #[voo::action]
    pub fn reset(&mut self) {
        *self = Self::default();
    }

    #[voo::snapshot]
    pub fn snapshot(&self) -> BevyWorldSnapshot {
        let mut agents: Vec<AgentProjection> = self
            .entities
            .iter()
            .filter_map(|entity| {
                let entity_ref = self.world.get_entity(*entity).ok()?;
                let id = entity_ref.get::<AgentId>()?.0;
                let position = entity_ref.get::<Position>()?;
                let energy = entity_ref.get::<Energy>()?.0;
                let faction = entity_ref.get::<Faction>()?.0;
                let pulse = entity_ref.get::<Pulse>()?.0;
                let radius = entity_ref.get::<Collider>()?.radius;
                let impact = entity_ref.get::<Impact>()?.0;
                Some(AgentProjection {
                    id,
                    x: position.x,
                    y: position.y,
                    energy,
                    faction: faction_name(faction).to_owned(),
                    pulse,
                    radius,
                    impact,
                    selected: id == self.selected_id,
                })
            })
            .collect();
        agents.sort_by_key(|agent| agent.id);

        let entity_count = agents.len() as u32;
        let average_energy = if agents.is_empty() {
            0.0
        } else {
            agents.iter().map(|agent| agent.energy).sum::<f32>() / entity_count as f32
        };
        let selected = agents.iter().find(|agent| agent.id == self.selected_id);
        let checksum = agents.iter().fold(0_u32, |checksum, agent| {
            checksum
                .wrapping_add(agent.id.wrapping_mul(31))
                .wrapping_add((agent.x.abs() * 10.0) as u32)
                .wrapping_add((agent.y.abs() * 10.0) as u32)
        });

        let collision_stats = self.world.resource::<CollisionStats>();

        BevyWorldSnapshot {
            tick: self.world.resource::<SimClock>().tick,
            running: self.running,
            entity_count,
            system_count: 7,
            selected_id: self.selected_id,
            selected_label: selected
                .map(|agent| format!("{} AGENT {:02}", agent.faction, agent.id))
                .unwrap_or_else(|| "NO SELECTION".to_owned()),
            selected_energy: selected.map(|agent| agent.energy).unwrap_or(0.0),
            average_energy,
            contacts_last_step: collision_stats.contacts_last_step,
            contacts_total: collision_stats.contacts_total,
            checksum,
            agents,
        }
    }
}

impl BevyWorld {
    fn run_steps(&mut self, steps: u32) {
        for _ in 0..steps.clamp(1, 8) {
            self.schedule.run(&mut self.world);
        }
    }

    fn spawn_one(&mut self) -> u32 {
        let id = self.next_id;
        self.next_id += 1;
        let faction = (id % 3) as u8;
        let (x, y, velocity_x, velocity_y) = if id <= INITIAL_AGENTS {
            let pair = (id - 1) / 2;
            let angle = pair as f32 * std::f32::consts::PI / (INITIAL_AGENTS / 2) as f32;
            let normal_x = angle.cos();
            let normal_y = angle.sin();
            let side = if id % 2 == 1 { 1.0 } else { -1.0 };
            let distance = 24.0 + (pair % 4) as f32 * 6.0;
            let speed = 2.2 + (pair % 3) as f32 * 0.22;
            (
                normal_x * distance * side,
                normal_y * distance * side,
                -normal_x * speed * side - normal_y * 0.12,
                -normal_y * speed * side + normal_x * 0.12,
            )
        } else {
            let x = ((id.wrapping_mul(37) % 181) as f32) - 90.0;
            let y = ((id.wrapping_mul(61) % 173) as f32) - 86.0;
            let speed = 0.8 + (id % 7) as f32 * 0.13;
            (
                x,
                y,
                if id % 2 == 0 { speed } else { -speed },
                if id % 3 == 0 {
                    -speed * 0.72
                } else {
                    speed * 0.72
                },
            )
        };
        let radius = 4.2 + (id % 4) as f32 * 0.55;
        let entity = self
            .world
            .spawn((
                AgentId(id),
                Position { x, y },
                Velocity {
                    x: velocity_x,
                    y: velocity_y,
                },
                Collider { radius },
                Impact(0.0),
                Energy(68.0 + (id % 29) as f32),
                Faction(faction),
                Pulse((id % 10) as f32 / 10.0),
            ))
            .id();
        self.entities.push(entity);
        id
    }

    fn entity_count(&self) -> u32 {
        self.entities.len() as u32
    }

    fn entity_for_id(&self, wanted: u32) -> Option<Entity> {
        self.entities.iter().find_map(|entity| {
            let entity_ref = self.world.get_entity(*entity).ok()?;
            (entity_ref.get::<AgentId>()?.0 == wanted).then_some(*entity)
        })
    }
}

fn movement_system(mut agents: Query<(&mut Position, &Velocity)>, clock: Res<SimClock>) {
    for (mut position, velocity) in &mut agents {
        position.x += velocity.x * clock.dt;
        position.y += velocity.y * clock.dt;
    }
}

fn impact_decay_system(mut agents: Query<&mut Impact>) {
    for mut impact in &mut agents {
        impact.0 *= 0.72;
    }
}

fn boundary_system(mut agents: Query<(&mut Position, &mut Velocity, &Collider)>) {
    for (mut position, mut velocity, collider) in &mut agents {
        let limit = WORLD_LIMIT - collider.radius;
        if position.x.abs() >= limit {
            position.x = position.x.clamp(-limit, limit);
            velocity.x *= -1.0;
        }
        if position.y.abs() >= limit {
            position.y = position.y.clamp(-limit, limit);
            velocity.y *= -1.0;
        }
    }
}

fn collision_system(
    mut agents: Query<(
        &AgentId,
        &mut Position,
        &mut Velocity,
        &Collider,
        &mut Impact,
    )>,
    mut stats: ResMut<CollisionStats>,
) {
    stats.contacts_last_step = 0;
    let mut combinations = agents.iter_combinations_mut::<2>();

    while let Some(
        [(id_a, mut position_a, mut velocity_a, collider_a, mut impact_a), (id_b, mut position_b, mut velocity_b, collider_b, mut impact_b)],
    ) = combinations.fetch_next()
    {
        let delta_x = position_b.x - position_a.x;
        let delta_y = position_b.y - position_a.y;
        let minimum_distance = collider_a.radius + collider_b.radius;
        let distance_squared = delta_x * delta_x + delta_y * delta_y;
        if distance_squared >= minimum_distance * minimum_distance {
            continue;
        }

        let (distance, normal_x, normal_y) = if distance_squared > 0.0001 {
            let distance = distance_squared.sqrt();
            (distance, delta_x / distance, delta_y / distance)
        } else {
            (0.0, if id_a.0 < id_b.0 { 1.0 } else { -1.0 }, 0.0)
        };

        let overlap = minimum_distance - distance;
        position_a.x -= normal_x * overlap * 0.5;
        position_a.y -= normal_y * overlap * 0.5;
        position_b.x += normal_x * overlap * 0.5;
        position_b.y += normal_y * overlap * 0.5;

        let relative_x = velocity_b.x - velocity_a.x;
        let relative_y = velocity_b.y - velocity_a.y;
        let velocity_along_normal = relative_x * normal_x + relative_y * normal_y;
        if velocity_along_normal < 0.0 {
            let impulse = -(1.0 + RESTITUTION) * velocity_along_normal * 0.5;
            velocity_a.x -= impulse * normal_x;
            velocity_a.y -= impulse * normal_y;
            velocity_b.x += impulse * normal_x;
            velocity_b.y += impulse * normal_y;
        }

        impact_a.0 = 1.0;
        impact_b.0 = 1.0;
        stats.contacts_last_step = stats.contacts_last_step.saturating_add(1);
        stats.contacts_total = stats.contacts_total.saturating_add(1);
    }
}

fn energy_system(mut agents: Query<(&AgentId, &mut Energy)>, clock: Res<SimClock>) {
    for (id, mut energy) in &mut agents {
        let recharge = ((clock.tick + id.0) % 17 == 0) as u8 as f32 * 7.0;
        energy.0 = (energy.0 - 0.18 + recharge).clamp(18.0, 100.0);
    }
}

fn pulse_system(mut agents: Query<(&AgentId, &mut Pulse)>, clock: Res<SimClock>) {
    for (id, mut pulse) in &mut agents {
        pulse.0 = ((clock.tick.wrapping_mul(3) + id.0.wrapping_mul(7)) % 100) as f32 / 100.0;
    }
}

fn clock_system(mut clock: ResMut<SimClock>) {
    clock.tick = clock.tick.wrapping_add(1);
}

fn faction_name(faction: u8) -> &'static str {
    match faction % 3 {
        0 => "CYAN",
        1 => "ACID",
        _ => "VIOLET",
    }
}
