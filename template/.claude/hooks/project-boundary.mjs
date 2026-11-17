// PreToolUse hook: a session writes only inside the project it was started in
// (.claude/docs/coordination-rules.md, "Project Boundary").
//
// The project sits in a workspace (a parent folder with sync-template.sh and template/). This hook refuses a
// write that lands in the workspace but outside the project: a sibling game or tool, the template, the
// workspace files. Reads are never refused, and paths outside the workspace (temp folders, the user's
// ~/.claude) are not this hook's business.
//
//   Write, Edit, NotebookEdit   refused when file_path is in the workspace and outside the project
//   Bash, PowerShell            refused when the command writes there: `git -C <other> commit`, a `cd` into
//                               another project followed by a writing command, a redirect, rm, mv, cp ... to it
//
// The shell check reads the command text, so it catches the plain cases, not every spelling. The rule in
// coordination-rules.md is what binds; this is the net under it.
//
// Exit 2 refuses (stderr goes to Claude). Exit 0 for everything else, and whenever the hook cannot decide.
// `--self-test` runs the cases at the bottom.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const WIN = process.platform === 'win32';

/** A path as the shell or the tool wrote it, as an absolute native path. */
export function toNative(raw, base) {
  let p = String(raw).trim().replace(/^["']|["']$/g, '');
  if (p === '~' || p.startsWith('~/') || p.startsWith('~\\')) p = path.join(os.homedir(), p.slice(1));
  if (WIN) {
    const gitBash = p.match(/^\/([A-Za-z])(\/.*)?$/); // /c/work/x as C:/work/x
    if (gitBash) p = `${gitBash[1].toUpperCase()}:${gitBash[2] ?? '/'}`;
  }
  return path.resolve(base, p);
}

const key = (p) => (WIN ? p.toLowerCase() : p);

/** True when `child` is `parent` or below it. */
export function isWithin(child, parent) {
  const rel = path.relative(key(parent), key(child));
  return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel));
}

/** The nearest folder above the project that holds the workspace scripts, or null. */
export function findWorkspace(project) {
  let dir = path.dirname(project);
  for (let i = 0; i < 4; i += 1) {
    if (fs.existsSync(path.join(dir, 'sync-template.sh')) && fs.existsSync(path.join(dir, 'template'))) return dir;
    const up = path.dirname(dir);
    if (up === dir) break;
    dir = up;
  }
  return null;
}

/** Makes the test "is this path in the workspace but outside the project". */
export function makeOutside(project, workspace) {
  return (absolute) => isWithin(absolute, workspace) && !isWithin(absolute, project);
}

const GIT_WRITE = /^(add|am|apply|checkout|cherry-pick|clean|commit|merge|mv|pull|push|rebase|reset|restore|revert|rm|stash|switch|tag)$/;
const CHANGES_ANY_PATH = /^(rm|rmdir|mkdir|touch|truncate|chmod|del|erase|rd|md|remove-item|ri|new-item|ni|clear-content|rename-item|ren)$/i;
const CHANGES_LAST_PATH = /^(cp|mv|copy|move|xcopy|robocopy|copy-item|cpi|move-item|mi|install|ln|rsync)$/i;
const WRITES_FILE = /^(tee|out-file|set-content|add-content)$/i;
const CHANGES_HERE = /^(npm|pnpm|yarn|pip|pip3|make|sed|patch|tar|unzip)$/i;
const MOVES = /^(cd|pushd|set-location|sl|chdir)$/i;

const tokens = (segment) => [...segment.matchAll(/"([^"]*)"|'([^']*)'|(\S+)/g)].map((m) => m[1] ?? m[2] ?? m[3]);

/**
 * Looks for a write outside the project in a shell command.
 * @returns {string|null} what was found, or null when nothing was.
 */
export function findShellWrite(command, cwd, outside) {
  let here = cwd;
  for (const segment of String(command).split(/&&|\|\||[;|\n]/)) {
    const words = tokens(segment.replace(/(\d?>>?)/g, ' $1 '));
    if (!words.length) continue;
    const name = path.basename(words[0]).replace(/\.exe$/i, '');
    const paths = words.slice(1).filter((w) => !w.startsWith('-') || /^-[A-Za-z]+:/.test(w));
    const resolve = (w) => toNative(w, here);

    if (MOVES.test(name)) {
      const target = paths.find((w) => !/^-/.test(w));
      if (target) here = resolve(target);
      continue;
    }

    // A redirect or a file-writing command aimed at another project.
    for (let i = 0; i < words.length - 1; i += 1) {
      if (/^\d?>>?$/.test(words[i]) && !/^&|^\/dev\/|^\$null$|^nul$/i.test(words[i + 1]) && outside(resolve(words[i + 1]))) {
        return `a redirect into ${words[i + 1]}`;
      }
    }
    if (WRITES_FILE.test(name)) {
      const target = paths.find((w) => outside(resolve(w)));
      if (target) return `${name} into ${target}`;
    }

    if (name === 'git') {
      let repo = here;
      let verb = null;
      for (let i = 1; i < words.length; i += 1) {
        if (words[i] === '-C' && words[i + 1]) { repo = toNative(words[i + 1], repo); i += 1; continue; }
        if (words[i] === '-c') { i += 1; continue; }
        if (!words[i].startsWith('-')) { verb = words[i]; break; }
      }
      const deletesBranch = verb === 'branch' && words.some((w) => /^-[dDmM]$|^--delete$/.test(w));
      if (verb && outside(repo) && (GIT_WRITE.test(verb) || deletesBranch)) return `git ${verb} in ${repo}`;
      continue;
    }

    if (CHANGES_ANY_PATH.test(name)) {
      const target = paths.find((w) => outside(resolve(w)));
      if (target) return `${name} on ${target}`;
    }
    if (CHANGES_LAST_PATH.test(name) && paths.length) {
      const last = paths[paths.length - 1];
      if (outside(resolve(last))) return `${name} into ${last}`;
    }
    // Run from inside another project, these change it.
    if (outside(here) && (CHANGES_HERE.test(name) || CHANGES_ANY_PATH.test(name) || CHANGES_LAST_PATH.test(name))) {
      const readOnly = /^(npm|pnpm|yarn)$/i.test(name) && /^(test|ls|list|view|run|outdated|--version|-v)$/.test(words[1] ?? '');
      const sedReads = /^sed$/i.test(name) && !words.some((w) => /^-[A-Za-z]*i/.test(w) || w === '--in-place');
      if (!readOnly && !sedReads) return `${name} run in ${here}`;
    }
  }
  return null;
}

/** The refusal for a tool call, or null. `input` is the hook payload. */
export function check(input, project) {
  const workspace = findWorkspace(project);
  if (!workspace) return null;
  const outside = makeOutside(project, workspace);
  const tool = input.tool_name;
  const args = input.tool_input ?? {};
  if (tool === 'Write' || tool === 'Edit' || tool === 'NotebookEdit') {
    const file = args.file_path ?? args.notebook_path;
    if (!file) return null;
    const absolute = toNative(file, input.cwd || project);
    return outside(absolute) ? `${tool} of ${absolute}` : null;
  }
  if (tool === 'Bash' || tool === 'PowerShell') {
    if (!args.command) return null;
    return findShellWrite(args.command, toNative(input.cwd || project, project), outside);
  }
  return null;
}

function selfTest() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'boundary-'));
  const game = path.join(root, 'CG01-Game');
  for (const dir of ['template', 'CG01-Game', 'CG02-Other', 'tool']) fs.mkdirSync(path.join(root, dir));
  fs.writeFileSync(path.join(root, 'sync-template.sh'), '');
  const bash = (command, cwd = game) => check({ tool_name: 'Bash', tool_input: { command }, cwd }, game);
  const write = (file) => check({ tool_name: 'Write', tool_input: { file_path: file } }, game);
  const cases = [
    ['write in the game', write(path.join(game, 'a.md')), false],
    ['write in a sibling', write(path.join(root, 'CG02-Other', 'a.md')), true],
    ['write in the template', write('../template/CLAUDE.md'), true],
    ['write in a temp folder', write(path.join(os.tmpdir(), 'x.txt')), false],
    ['read a sibling', bash('cat ../CG02-Other/a.md && git -C ../CG02-Other log --oneline -3'), false],
    ['use a tool CLI', bash('node ../tool/cli.mjs digest g'), false],
    ['copy from a sibling', bash('cp ../CG02-Other/a.cs Assets/a.cs'), false],
    ['copy into a sibling', bash('cp Assets/a.cs ../CG02-Other/a.cs'), true],
    ['git commit in a sibling', bash('git -C ../CG02-Other commit -m x'), true],
    ['cd then pull', bash('cd ../tool && git pull --ff-only'), true],
    ['cd then npm ci', bash('cd "../tool" ; npm ci'), true],
    ['cd then npm test', bash('cd ../tool && npm test'), false],
    ['redirect into the workspace', bash('echo x > ../notes.md'), true],
    ['redirect in the game', bash('echo x > notes.md 2>/dev/null'), false],
    ['rm in a sibling', bash('rm ../CG02-Other/a.md'), true],
    ['git commit in the game', bash('git add -A && git commit -m x'), false],
    ['PowerShell remove', check({ tool_name: 'PowerShell', tool_input: { command: 'Remove-Item ..\\tool\\x.js' }, cwd: game }, game), true],
    ['cwd already in a sibling', bash('git stash', path.join(root, 'tool')), true],
    ['no workspace above', check({ tool_name: 'Write', tool_input: { file_path: path.join(root, 'x') } }, root), false],
  ];
  let failed = 0;
  for (const [name, result, refused] of cases) {
    const ok = Boolean(result) === refused;
    if (!ok) failed += 1;
    console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${result ? ` -> ${result}` : ''}`);
  }
  fs.rmSync(root, { recursive: true, force: true });
  console.log(failed ? `${failed} failed` : `${cases.length} passed`);
  process.exit(failed ? 1 : 0);
}

function main() {
  if (process.argv.includes('--self-test')) return selfTest();
  let input;
  try { input = JSON.parse(fs.readFileSync(0, 'utf8')); } catch { process.exit(0); }
  let found = null;
  try {
    const project = toNative(process.env.CLAUDE_PROJECT_DIR || input.cwd || process.cwd(), process.cwd());
    found = check(input, project);
  } catch { process.exit(0); }
  if (!found) process.exit(0);
  process.stderr.write(
    `Refused (project boundary): ${found}. This session writes only inside its own project; other projects and the `
    + 'workspace are read-only. If that project must change, file a ticket in design/template-requests/ with a '
    + '`Target:` line and give the user its ID (.claude/docs/coordination-rules.md, "Project Boundary"). '
    + 'Do not retry this another way.\n',
  );
  process.exit(2);
}

main();
