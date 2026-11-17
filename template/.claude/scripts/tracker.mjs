// This game's door to the studio's task tracker (CLAUDE.md, "Task tracker").
//
//   node .claude/scripts/tracker.mjs digest                  what a session reads first (this game's project)
//   node .claude/scripts/tracker.mjs tree                    the whole plan
//   node .claude/scripts/tracker.mjs <action> key=value ...  any tracker action (task.start, task.done, ...)
//   node .claude/scripts/tracker.mjs <action> --file x.json  long arguments
//   node .claude/scripts/tracker.mjs --status                which project, actor, CLI and server it uses
//   node .claude/scripts/tracker.mjs --session-start         the session-start block (used by the hook)
//
// It reads `tracker.project_id` and `tracker.actor` from project.yaml, adds `projectId=` to the actions that take
// one, sets the actor (unless --actor is given), and runs the tracker's own CLI: the installed skill's
// (~/.claude/skills/nhanh-project-tracking/scripts/nhanh.mjs) or the workspace copy
// (../project-task-tracking/skills/...). It only talks to the tracker's API; it never touches the tracker's
// folder or data. Exit codes: the CLI's; 3 when the game has no tracker project or no CLI is found.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const SKILL_CLI = ['skills', 'nhanh-project-tracking', 'scripts', 'nhanh.mjs'];

/** `tracker.project_id` and `tracker.actor` from project.yaml (a two-level read, no YAML library). */
export function readConfig(file = path.join(ROOT, 'project.yaml')) {
  const out = { projectId: '', actor: '' };
  if (!fs.existsSync(file)) return out;
  let inside = false;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    if (/^tracker:\s*(#.*)?$/.test(line)) { inside = true; continue; }
    if (inside && /^\S/.test(line)) break;
    const m = inside && line.match(/^\s+(project_id|actor):\s*["']?([^"'#]*?)["']?\s*(#.*)?$/);
    if (m) out[m[1] === 'project_id' ? 'projectId' : 'actor'] = m[2].trim();
  }
  return out;
}

/** The tracker CLI: the installed skill first, then the workspace copy; null when neither is there. */
export function findCli() {
  const candidates = [
    process.env.NHANH_CLI,
    path.join(os.homedir(), '.claude', ...SKILL_CLI),
    path.join(ROOT, '..', 'project-task-tracking', ...SKILL_CLI),
  ].filter(Boolean);
  return candidates.find((p) => fs.existsSync(p)) ?? null;
}

/** Names of the actions whose arguments include projectId, from the CLI's actions.json. */
function actionsWithProject(cli) {
  try {
    const list = JSON.parse(fs.readFileSync(path.join(path.dirname(cli), 'actions.json'), 'utf8'));
    return new Set((Array.isArray(list) ? list : list.actions).filter((a) => a.arguments && 'projectId' in a.arguments).map((a) => a.name));
  } catch {
    return new Set(['digest', 'project.get', 'project.update', 'project.log', 'plan.apply', 'task.add', 'flow.create']);
  }
}

/** The CLI arguments for one call: the project id added where the action takes one, the actor set. */
export function buildArgs(argv, config, withProject) {
  const args = [...argv];
  const takesValue = new Set(['--actor', '--file', '--json', '--request']);
  const action = args.find((a, i) => !a.startsWith('-') && !a.includes('=') && !takesValue.has(args[i - 1]));
  const given = args.some((a) => a.startsWith('projectId='));
  if (action && !given && config.projectId) {
    if (action === 'digest' || action === 'tree') {
      const at = args.indexOf(action);
      if (!args[at + 1] || args[at + 1].startsWith('-') || args[at + 1].includes('=')) args.splice(at + 1, 0, config.projectId);
    } else if (withProject.has(action)) {
      args.push(`projectId=${config.projectId}`);
    }
  }
  if (!args.includes('--actor') && config.actor) args.unshift('--actor', config.actor);
  return args;
}

function run(cli, args, capture) {
  return spawnSync(process.execPath, [cli, ...args], {
    cwd: ROOT,
    encoding: 'utf8',
    stdio: capture ? ['ignore', 'pipe', 'pipe'] : 'inherit',
    timeout: capture ? 8000 : 0,
  });
}

/** The block the session-start hook prints. Every case says what happened, so a silent skip cannot look like an empty plan. */
function sessionStart(config, cli) {
  if (!config.projectId) return; // not tracked: nothing to say
  console.log('');
  console.log(`=== TASK TRACKER: ${config.projectId} (actor ${config.actor || 'not set'}) ===`);
  if (!cli) {
    console.log('NOT CHECKED: no tracker CLI found (install the tracker skill: bash studio-setup.sh --tracker in the workspace).');
    console.log('Carry on and say so under "Left" (CLAUDE.md, "Task tracker").');
    return;
  }
  const r = run(cli, buildArgs(['digest'], config, new Set()), true);
  if (r.status !== 0) {
    const why = (r.stderr || r.error?.message || 'no answer').trim().split('\n')[0];
    console.log(`NOT CHECKED: the tracker did not answer (${why}).`);
    console.log('Carry on and say so under "Left"; never start the server or write its files from here.');
    return;
  }
  // Claude Code keeps about 10,000 characters of hook output; stay well under it.
  const lines = r.stdout.trimEnd().split('\n');
  let used = 0;
  let shown = 0;
  for (const line of lines) {
    if (shown >= 40 || used + line.length > 3000) break;
    console.log(line);
    used += line.length + 1;
    shown += 1;
  }
  if (shown < lines.length) console.log(`... ${lines.length - shown} more lines: node .claude/scripts/tracker.mjs digest`);
  console.log('Commands: node .claude/scripts/tracker.mjs <action> key=value ... (project id and actor are added).');
  console.log('=== END TASK TRACKER ===');
}

function main() {
  const argv = process.argv.slice(2);
  const config = readConfig();
  const cli = findCli();
  if (argv[0] === '--session-start') return sessionStart(config, cli);
  if (argv[0] === '--status' || argv.length === 0) {
    console.log(`project_id: ${config.projectId || '(empty: this game is not tracked)'}`);
    console.log(`actor:      ${config.actor || '(empty)'}`);
    console.log(`cli:        ${cli || '(not found)'}`);
    if (cli) {
      const r = run(cli, ['projects.list'], true);
      console.log(`server:     ${r.status === 0 ? 'answering' : `not answering (${(r.stderr || r.error?.message || '').trim().split('\n')[0]})`}`);
    }
    process.exit(config.projectId && cli ? 0 : 3);
  }
  if (!config.projectId) {
    console.error('This game has no tracker project: tracker.project_id in project.yaml is empty. The workspace links it (bash tools/tracker/link-game.sh <GameFolder>).');
    process.exit(3);
  }
  if (!cli) {
    console.error('No tracker CLI found. In the workspace: bash studio-setup.sh --tracker');
    process.exit(3);
  }
  const r = run(cli, buildArgs(argv, config, actionsWithProject(cli)), false);
  process.exit(r.status ?? 1);
}

main();
