# Agent Roster

26 agents, in `.claude/agents/`, sized for small Unity 2D games made by one person with Claude. Every agent runs
autonomously: it decides, writes, checks and reports, and never asks the user (`CLAUDE.md`, "Autonomy"). Use the
agent best suited to the task; when a task spans domains, the coordinating agent (usually `producer` or the domain
lead) delegates.

Which model an agent runs on is set by the `model:` line in its own file; `model-tiers.md` lists the pinned ones.
Every other agent runs on the session's model.

Removed in template v3.01 (none had ever been spawned in a studio session): the Godot, Unreal and DOTS specialists,
and `ai-programmer`, `engine-programmer`, `tools-programmer`, `network-programmer`, `security-engineer`,
`devops-engineer`, `analytics-engineer`, `localization-lead`, `accessibility-specialist`, `world-builder`,
`live-ops-designer`, `community-manager`. Their work goes to the agent named in "Covers" below.

## Tier 1 -- Leadership
| Agent | Domain | When to Use |
|-------|--------|-------------|
| `creative-director` | Vision | Pillar conflicts, tone and direction |
| `technical-director` | Technical vision | Architecture, tech choices, performance strategy |
| `producer` | Production | Plans, milestones, risk, coordination; covers telemetry and analytics needs |

## Tier 2 -- Leads
| Agent | Domain | When to Use |
|-------|--------|-------------|
| `game-designer` | Game design | Mechanics, systems, progression, balancing |
| `lead-programmer` | Code architecture | System design, code review, refactoring; covers save security and anti-cheat |
| `art-director` | Visual direction | Art bible, asset standards, UI look |
| `audio-director` | Audio direction | Music direction, sound palette |
| `narrative-director` | Story and world | Story, characters, world rules and lore |
| `qa-lead` | Quality | Test strategy, bug triage, release readiness |
| `release-manager` | Release | Builds, versioning, changelogs, deploys and build scripts |

## Tier 3 -- Specialists
| Agent | Domain | When to Use |
|-------|--------|-------------|
| `systems-designer` | Systems | Formulas, loops, rules of one mechanic |
| `level-designer` | Levels | Layouts, pacing, encounters |
| `economy-designer` | Economy | Currencies, rewards, progression curves; covers events and seasons |
| `gameplay-programmer` | Gameplay code | Features and gameplay systems, enemy and NPC behaviour |
| `ui-programmer` | UI code | Screens, widgets, data binding |
| `technical-artist` | Tech art | Shaders, VFX, art pipeline |
| `sound-designer` | Sound | SFX lists, audio events, mixing notes |
| `writer` | Text | Dialogue, item and UI text, patch notes and player-facing messages, strings ready for translation |
| `qa-tester` | Tests | Test cases, bug reports, checklists |
| `performance-analyst` | Performance | Profiling, memory, WebGL size and load time |
| `ux-designer` | UX | Flows, wireframes, input; covers accessibility |
| `prototyper` | Prototypes | Throwaway prototypes, feasibility |

## Unity specialists
| Agent | Subsystem | When to Use |
| ---- | ---- | ---- |
| `unity-specialist` | Unity | Unity patterns, URP 2D, optimization; covers engine-level systems and Editor tools |
| `unity-shader-specialist` | Shaders/VFX | Shader Graph, VFX, URP customization |
| `unity-addressables-specialist` | Assets | Addressables, async loading, memory, content size |
| `unity-ui-specialist` | UI | UGUI Canvas, UI Toolkit, data binding, input |
