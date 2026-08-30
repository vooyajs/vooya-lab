use vooya as voo;

const STAGES: [&str; 5] = ["Draft", "Review", "Approved", "Scheduled", "Released"];

#[derive(voo::ToJs, PartialEq, Clone)]
pub struct WorkflowReplaySnapshot {
    pub stage: String,
    pub stage_index: u32,
    pub cursor: u32,
    pub event_count: u32,
    pub violation_count: u32,
    pub can_advance: bool,
    pub can_rewind: bool,
    pub is_terminal: bool,
    pub integrity: String,
    pub last_attempt: String,
    pub history: Vec<String>,
}

pub struct WorkflowReplay {
    events: Vec<u32>,
    cursor: usize,
    violation_count: u32,
    last_attempt: String,
}

impl Default for WorkflowReplay {
    fn default() -> Self {
        Self {
            events: vec![0],
            cursor: 0,
            violation_count: 0,
            last_attempt: "Store created at Draft".to_owned(),
        }
    }
}

#[voo::store]
impl WorkflowReplay {
    #[voo::action]
    pub fn advance(&mut self) {
        let current = self.events[self.cursor];
        if current >= (STAGES.len() - 1) as u32 {
            self.violation_count += 1;
            self.last_attempt = "Rejected: Released is a terminal state".to_owned();
            return;
        }

        self.events.truncate(self.cursor + 1);
        let next = current + 1;
        self.events.push(next);
        self.cursor += 1;
        self.last_attempt = format!(
            "Accepted: {} → {}",
            stage_name(current),
            stage_name(next)
        );
    }

    #[voo::action]
    pub fn rewind(&mut self) {
        if self.cursor == 0 {
            self.last_attempt = "Ignored: already at the first event".to_owned();
            return;
        }

        self.cursor -= 1;
        self.last_attempt = format!("Rewound to {}", stage_name(self.events[self.cursor]));
    }

    #[voo::action]
    pub fn replay_to(&mut self, target: u32) {
        let last = self.events.len().saturating_sub(1);
        self.cursor = (target as usize).min(last);
        self.last_attempt = format!(
            "Replayed event {:02}: {}",
            self.cursor + 1,
            stage_name(self.events[self.cursor])
        );
    }

    #[voo::action]
    pub fn attempt_invalid(&mut self) {
        self.violation_count += 1;
        self.last_attempt = format!(
            "Rejected: {} cannot skip the required next transition",
            stage_name(self.events[self.cursor])
        );
    }

    #[voo::action]
    pub fn reset(&mut self) {
        *self = Self::default();
    }

    #[voo::snapshot]
    pub fn snapshot(&self) -> WorkflowReplaySnapshot {
        let stage_index = self.events[self.cursor];
        let history_start = self.events.len().saturating_sub(6);
        let history = self
            .events
            .iter()
            .enumerate()
            .skip(history_start)
            .map(|(index, stage)| {
                let marker = if index == self.cursor { " · CURRENT" } else { "" };
                format!("{:02} · {}{}", index + 1, stage_name(*stage), marker)
            })
            .collect();

        WorkflowReplaySnapshot {
            stage: stage_name(stage_index).to_owned(),
            stage_index,
            cursor: self.cursor as u32,
            event_count: self.events.len() as u32,
            violation_count: self.violation_count,
            can_advance: stage_index < (STAGES.len() - 1) as u32,
            can_rewind: self.cursor > 0,
            is_terminal: stage_index == (STAGES.len() - 1) as u32,
            integrity: if has_valid_sequence(&self.events) {
                "SEALED".to_owned()
            } else {
                "BROKEN".to_owned()
            },
            last_attempt: self.last_attempt.clone(),
            history,
        }
    }
}

fn stage_name(index: u32) -> &'static str {
    STAGES.get(index as usize).copied().unwrap_or("Unknown")
}

fn has_valid_sequence(events: &[u32]) -> bool {
    events.first() == Some(&0)
        && events
            .windows(2)
            .all(|pair| pair.get(1) == pair.first().map(|stage| stage + 1).as_ref())
}
