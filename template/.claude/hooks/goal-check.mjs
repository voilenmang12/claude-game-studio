#!/usr/bin/env node
// Stop hook for autonomous goals (CGS). It keeps a goal running until its checklist is done, with no model judge,
// so it cannot loop: it nudges only while production/session-state/goal.md changes between stops.
//
// goal.md (written by /run-goal):
//   Status: active | done | stalled
//   Max nudges: 40            (optional)
//   ## Checklist
//   - [ ] open item  |  - [x] done item — evidence: ...  |  - [~] given up — why
//
// Rules:
//   - No goal.md, or Status is not "active": allow the stop.
//   - Open items and goal.md changed since the last nudge: block once with the next item.
//   - goal.md unchanged since the last nudge (no progress): allow the stop and set Status: stalled.
//   - Nudge count reaches "Max nudges" (default 40): allow the stop and set Status: stalled.
//   - All items ticked but Status still active: one last nudge to verify, report and set Status: done.
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const goalPath = join(root, "production", "session-state", "goal.md");
const statePath = join(root, "production", "session-state", ".goal-hook.json");
if (!existsSync(goalPath)) process.exit(0);

let text = readFileSync(goalPath, "utf8");
const status = (/^Status:\s*([\w-]+)/m.exec(text)?.[1] ?? "").toLowerCase();
if (status !== "active") process.exit(0);

const title = (/^#\s+(.+)$/m.exec(text)?.[1] ?? "goal").trim();
const maxNudges = Number(/^Max nudges:\s*(\d+)/m.exec(text)?.[1] ?? 40);
const section = /^##\s+Checklist\s*$([\s\S]*?)(?=^##\s|(?![\s\S]))/m.exec(text)?.[1] ?? "";
const open = section.split(/\r?\n/).filter((l) => /^\s*-\s\[\s\]/.test(l)).map((l) => l.replace(/^\s*-\s\[\s\]\s*/, "").trim());
const hash = createHash("sha1").update(text).digest("hex");
let state = {};
try { state = JSON.parse(readFileSync(statePath, "utf8")); } catch { /* first stop of this goal */ }
if (state.title !== title) state = { title, nudges: 0 };

const saveState = () => writeFileSync(statePath, JSON.stringify(state, null, 2) + "\n");
const stall = (why) => {
  const stamp = new Date().toISOString().slice(0, 16).replace("T", " ");
  text = text.replace(/^Status:\s*active/m, "Status: stalled");
  text += `${text.endsWith("\n") ? "" : "\n"}- ${stamp} stalled: ${why}\n`;
  writeFileSync(goalPath, text);
  state.stalled = why; saveState();
  console.log(JSON.stringify({ systemMessage: `Goal "${title}" stalled: ${why}. Write the report (.claude/docs/task-report.md) with what is left.` }));
  process.exit(0);
};

if (!open.length) {
  if (state.finishHash === hash) process.exit(0);
  state.finishHash = hash; saveState();
  console.log(JSON.stringify({ decision: "block", reason:
    `Goal "${title}": every checklist item is ticked. Run the final check once, commit, set "Status: done" in goal.md, ` +
    "write the report with its images (.claude/docs/task-report.md), send them to the user, then stop." }));
  process.exit(0);
}
if (state.lastHash === hash) stall("goal.md did not change since the last nudge (no item ticked, no log line)");
if (state.nudges >= maxNudges) stall(`reached ${maxNudges} nudges`);

state.lastHash = hash; state.nudges += 1; saveState();
console.log(JSON.stringify({ decision: "block", reason:
  `Goal "${title}": ${open.length} item(s) left (nudge ${state.nudges}/${maxNudges}). Next: ${open[0]}. ` +
  "Do it now without asking the user. Tick it in goal.md with its evidence (- [x] ... — evidence: ...) and add a Log " +
  "line; an item that fails after 3 different attempts becomes - [~] with the reason. Stopping without changing goal.md " +
  "ends the goal as stalled." }));
