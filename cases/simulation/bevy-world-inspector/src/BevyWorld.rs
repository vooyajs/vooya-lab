use bevy_ecs::prelude::*;
use bevy_ecs::schedule::IntoScheduleConfigs;
use vooya as voo;

const INITIAL_AGENTS: u32 = 24;
const MAX_AGENTS: u32 = 48;
const WORLD_LIMIT: f32 = 94.0;

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

#[derive(voo::ToJs, PartialEq, Clone)]
pub struct AgentProjection {
    pub id: u32,
    pub x: f32,
    pub y: f32,
    pub energy: f32,
    pub faction: String,
    pub pulse: f32,
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
        world.insert_resource(SimClock { tick: 0, dt: 0.72 });

        let mut schedule = Schedule::default();
        schedule.add_systems(
            (
                movement_system,
                boundary_system,
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
                Some(AgentProjection {
                    id,
                    x: position.x,
                    y: position.y,
                    energy,
                    faction: faction_name(faction).to_owned(),
                    pulse,
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

        BevyWorldSnapshot {
            tick: self.world.resource::<SimClock>().tick,
            running: self.running,
            entity_count,
            system_count: 5,
            selected_id: self.selected_id,
            selected_label: selected
                .map(|agent| format!("{} AGENT {:02}", agent.faction, agent.id))
                .unwrap_or_else(|| "NO SELECTION".to_owned()),
            selected_energy: selected.map(|agent| agent.energy).unwrap_or(0.0),
            average_energy,
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
        let x = ((id.wrapping_mul(37) % 181) as f32) - 90.0;
        let y = ((id.wrapping_mul(61) % 173) as f32) - 86.0;
        let speed = 0.8 + (id % 7) as f32 * 0.13;
        let entity = self
            .world
            .spawn((
                AgentId(id),
                Position { x, y },
                Velocity {
                    x: if id % 2 == 0 { speed } else { -speed },
                    y: if id % 3 == 0 {
                        -speed * 0.72
                    } else {
                        speed * 0.72
                    },
                },
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

fn boundary_system(mut agents: Query<(&mut Position, &mut Velocity)>) {
    for (mut position, mut velocity) in &mut agents {
        if position.x.abs() >= WORLD_LIMIT {
            position.x = position.x.clamp(-WORLD_LIMIT, WORLD_LIMIT);
            velocity.x *= -1.0;
        }
        if position.y.abs() >= WORLD_LIMIT {
            position.y = position.y.clamp(-WORLD_LIMIT, WORLD_LIMIT);
            velocity.y *= -1.0;
        }
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
