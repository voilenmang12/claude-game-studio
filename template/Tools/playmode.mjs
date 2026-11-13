#!/usr/bin/env node
// One Play Mode check in one command: recompile, enter Play Mode once, run steps, screenshot the named ones, stop.
// Drives the open Editor through the Unity CLI (`unity command ...`) and Assets/Editor/PlayMode/PlayModeDriver.cs.
// Use it instead of writing ev.sh / click.sh / snap.sh helpers in a session.
//
//   node Tools/playmode.mjs [options] <step>...
//   node Tools/playmode.mjs --steps steps.txt          one step per line, # comments
//
// Steps (one argument each; quote it). Prefix a step with "<name>=" to save <out>/<name>.png after it.
//   snap:<name>              screenshot only
//   click:<target>           click a button by GameObject name, path suffix ("Hud/Btn Pause") or label ("@Play")
//   show:<target>            SetActive(true) on a GameObject, even an inactive one (open a panel)
//   hide:<target>            SetActive(false)
//   scene:<name>             load a scene from the build list
//   waitfor:<target>[@sec]   wait until an active GameObject matches (default 10 s)
//   wait:<seconds>           let the game run
//   eval:<C#>                run C# in the Editor (return a value to print it); call the game's own helpers here
//   state | list             print scene/frame/screen, or the clickables on screen now
//   e.g.  node Tools/playmode.mjs home=snap  "shop=click:Btn Shop"  "click:Btn Back"  "pause=click:@Pause"
//
// Options
//   --out <dir>        screenshot folder (default Logs/playmode/<time>, git-ignored); use production/qa/evidence/...
//                      for screenshots a story must keep
//   --size <WxH>       screenshot size (default: the Game view's size)
//   --scene <s>        where Play Mode starts: first (first enabled build scene, default), current, or a scene
//   --settle <sec>     time after each action before the screenshot (default 0.5)
//   --no-compile       skip refresh + recompile; if Play Mode is already on, reuse it instead of restarting
//   --keep             stay in Play Mode at the end (the next run with --no-compile reuses it)
//   --project <path>   Unity project (default: this script's project); UNITY_CLI overrides the unity executable
// Output: one line per step ("ok|FAIL <step> -> <png> | errors: N"), console errors under it, then a summary.
// Exit code 1 when compile, Play Mode entry or any step fails; console errors alone do not fail the run.
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const args = process.argv.slice(2);
const opt = { scene: "first", out: null, size: null, settle: 0.5, compile: true, keep: false, project: null, steps: [] };
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  const next = () => { if (i + 1 >= args.length) die(2, `${a} needs a value`); return args[++i]; };
  if (a === "--out") opt.out = next();
  else if (a === "--size") opt.size = next();
  else if (a === "--scene") opt.scene = next();
  else if (a === "--settle") opt.settle = Number(next());
  else if (a === "--no-compile") opt.compile = false;
  else if (a === "--keep") opt.keep = true;
  else if (a === "--project") opt.project = next();
  else if (a === "--steps") opt.steps.push(...readFileSync(next(), "utf8").split(/\r?\n/).map(s => s.trim()).filter(s => s && !s.startsWith("#")));
  else if (a === "-h" || a === "--help") { usage(); process.exit(0); }
  else if (a.startsWith("--")) die(2, `unknown option ${a}`);
  else opt.steps.push(a);
}

const ROOT = resolve(opt.project ?? join(dirname(fileURLToPath(import.meta.url)), ".."));
if (!existsSync(join(ROOT, "ProjectSettings"))) die(2, `not a Unity project: ${ROOT}`);
const stamp = new Date().toISOString().replace(/[-:]/g, "").replace("T", "-").slice(0, 15);
const OUT = resolve(ROOT, opt.out ?? join("Logs", "playmode", stamp));
const INSIDE = !relative(ROOT, OUT).startsWith("..") && !isAbsolute(relative(ROOT, OUT));
const UNITY = process.env.UNITY_CLI || findUnity();
const DRIVER = "GameStudio.Editor.PlayModeDriver";
const ACTIONS = ["snap", "click", "show", "hide", "scene", "waitfor", "wait", "eval", "state", "list"];

function usage() {
  const src = readFileSync(fileURLToPath(import.meta.url), "utf8").split("\n");
  console.log(src.slice(1, src.findIndex(l => l.startsWith("import"))).map(l => l.replace(/^\/\/ ?/, "")).join("\n"));
}
function die(code, msg) { console.error(`playmode: ${msg}`); process.exit(code); }
function sleep(sec) { Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, Math.max(0, sec * 1000)); }
// A path as printed: project-relative inside the project, absolute outside it; forward slashes.
function shown(p) { return (INSIDE ? relative(ROOT, p) || "." : p).replace(/\\/g, "/"); }
function findUnity() {
  const local = process.env.LOCALAPPDATA && join(process.env.LOCALAPPDATA, "Unity", "bin", "unity.exe");
  const r = spawnSync(process.platform === "win32" ? "where" : "which", ["unity"], { encoding: "utf8" });
  if (r.status === 0) return "unity";
  if (local && existsSync(local)) return local;
  die(2, "Unity CLI not found (install it or set UNITY_CLI)");
}

// Runs the Unity CLI and returns the parsed JSON envelope ({ success, data, errors }).
function cli(argv, timeoutSec = 60) {
  const r = spawnSync(UNITY, ["--no-banner", "--format", "json", ...argv], {
    encoding: "utf8", timeout: (timeoutSec + 30) * 1000, maxBuffer: 64 << 20, windowsHide: true,
  });
  try { return JSON.parse(r.stdout); }
  catch { return { success: false, errors: [{ code: "NO_JSON", message: (r.stderr || r.stdout || String(r.error ?? "")).trim().slice(0, 400) }] }; }
}
// `unity command <name>`; params go after the -- fence so they never collide with the CLI's own flags.
function cmd(name, params = {}, timeoutSec = 60) {
  const fence = Object.entries(params).flatMap(([k, v]) => [`--${k}`, typeof v === "string" ? v : JSON.stringify(v)]);
  const env = cli(["command", name, "--project-path", ROOT, "--timeout", String(timeoutSec), ...(fence.length ? ["--", ...fence] : [])], timeoutSec);
  return { ok: env.success === true, result: env.data?.result, error: env.errors?.[0]?.message ?? env.errors?.[0]?.code };
}
// C# in the Editor. Returns { ok, value } where value is the C# return value (or the compile/runtime error).
function evalCs(code, timeoutSec = 30) {
  const r = cmd("eval", { code, timeout: timeoutSec * 1000 }, timeoutSec + 5);
  if (!r.ok) return { ok: false, value: r.error ?? "eval failed" };
  const res = r.result ?? {};
  if (res.success === false) {
    const diag = (res.diagnostics ?? []).map(d => d.message ?? d).join("; ");
    return { ok: false, value: diag || res.error || res.output || "eval failed" };
  }
  return { ok: true, value: res.result };
}
function driver(method, ...a) {
  const r = evalCs(`return ${DRIVER}.${method}(${a.map(x => JSON.stringify(String(x))).join(", ")});`);
  if (!r.ok && /PlayModeDriver|GameStudio/.test(String(r.value)))
    return { ok: false, value: "PlayModeDriver missing: copy Assets/Editor/PlayMode/ from the template and recompile" };
  const v = String(r.value ?? "");
  return { ok: r.ok && !v.startsWith("FAIL"), value: v.replace(/^ok /, "") };
}
function status() { return cmd("editor_status", {}, 15).result ?? null; }
// Waits until the Editor answers and is not compiling or reloading (in or out of Play Mode).
function waitReady(timeoutSec = 180) {
  for (const end = Date.now() + timeoutSec * 1000; Date.now() < end; sleep(1)) {
    const s = status();
    if (!s) { cli(["status", "--until-ready", "--project-path", ROOT], 30); continue; } // server down: domain reload
    if (["ready", "playing", "paused"].includes(s.status) && !s.compiling && !s.domainReloadInProgress) return s;
  }
  return null;
}
function consoleCursor() { return cmd("console_status", {}, 15).result?.cursor ?? -1; }
function consoleErrors(since) {
  const r = cmd("console", { tail: 50, level: "error", since }, 15);
  return (r.result?.entries ?? []).map(e => String(e.message ?? "").split("\n")[0].slice(0, 300));
}

// --- 1. compile ------------------------------------------------------------------------------------------------
if (!opt.steps.length) { usage(); process.exit(2); }
const start = waitReady(60);
if (!start) die(1, `no ready Editor for ${ROOT} (open it with: unity open "${ROOT}")`);
let playing = start.playMode === "playing" || start.playMode === "paused";
const reuse = playing && !opt.compile;

if (opt.compile) {
  if (playing) { cmd("editor_stop"); waitReady(); playing = false; }
  evalCs("UnityEditor.AssetDatabase.Refresh(); return \"ok\";", 120); // imports changed assets; may start a compile
  waitReady(300);
  const rc = cli(["recompile", "--project-path", ROOT, "--timeout", "300"], 300);
  const errs = (rc.data?.errors ?? rc.data?.diagnostics ?? rc.errors ?? []).map(e => e.message ?? e.text ?? JSON.stringify(e));
  if (!rc.success) {
    console.log("FAIL compile");
    for (const e of errs.slice(0, 20)) console.log("  " + String(e).split("\n")[0]);
    process.exit(1);
  }
  console.log("ok   compile");
  if (!waitReady(300)) die(1, "Editor did not come back after the recompile");
}

// --- 2. enter Play Mode once and prove frames advance -------------------------------------------------------------
function stop() {
  cmd("editor_stop");
  waitReady(60);
  driver("Restore");
}
if (!reuse) {
  cmd("set_autotick", { enable: true });
  const prep = driver("Prepare", opt.scene);
  if (!prep.ok) die(1, `prepare: ${prep.value}`);
  const p = cmd("editor_play");
  if (!p.ok) die(1, `editor_play failed: ${p.error}`);
  let s = null;
  for (const end = Date.now() + 120000; Date.now() < end; sleep(1)) {
    s = waitReady(60);
    if (s?.playMode === "playing") break;
  }
  if (s?.playMode !== "playing") { driver("Restore"); die(1, "Play Mode did not start"); }
}
const tick = cmd("wait_for", { condition: { member: "UnityEngine.Time.frameCount", op: "changed" }, timeout_s: 10 }, 20);
if (!tick.ok || tick.result?.met === false) {
  console.log("FAIL play: frames do not advance (Editor frozen?)");
  if (!opt.keep) stop();
  process.exit(1);
}
const st = driver("State");
console.log(`ok   play${reuse ? " (reused)" : ""}: ${st.value}`);
let [w, h] = (opt.size ?? (/screen=(\d+x\d+)/.exec(st.value)?.[1] ?? "1280x720")).split("x").map(Number);

// --- 3. steps ---------------------------------------------------------------------------------------------------
mkdirSync(OUT, { recursive: true });
let failed = 0, errorTotal = 0;
for (const raw of opt.steps) {
  let name = null, body = raw;
  const m = /^([\w.-]+)=(.*)$/s.exec(raw);
  if (m && (m[2] === "snap" || ACTIONS.includes(m[2].split(":")[0]))) { name = m[1]; body = m[2]; }
  const i = body.indexOf(":");
  let action = i < 0 ? body : body.slice(0, i), arg = i < 0 ? "" : body.slice(i + 1);
  if (action === "snap" && !name) { name = arg; arg = ""; }
  if (!ACTIONS.includes(action)) { console.log(`FAIL ${raw}: unknown action '${action}'`); failed++; continue; }

  const cursor = consoleCursor();
  let r = { ok: true, value: "" };
  if (action === "click") r = driver("Click", arg);
  else if (action === "show") r = driver("Show", arg);
  else if (action === "hide") r = driver("Hide", arg);
  else if (action === "scene") r = driver("Scene", arg);
  else if (action === "state") r = driver("State");
  else if (action === "list") r = driver("Clickables");
  else if (action === "wait") sleep(Number(arg) || 1);
  else if (action === "eval") { r = evalCs(arg, 60); r.value = r.value === null || r.value === undefined ? "" : typeof r.value === "string" ? r.value : JSON.stringify(r.value); }
  else if (action === "waitfor") {
    const [target, sec] = arg.split(/@(?=[\d.]+$)/);
    const end = Date.now() + (Number(sec) || 10) * 1000;
    do { r = driver("Exists", target); if (r.value === "yes") break; sleep(0.5); } while (Date.now() < end);
    r = r.value === "yes" ? { ok: true, value: `found ${target}` } : { ok: false, value: r.ok ? `timed out waiting for ${target}` : r.value };
  }
  if (r.ok && ["click", "show", "hide", "scene"].includes(action)) sleep(action === "scene" ? Math.max(opt.settle, 1.5) : opt.settle);

  let png = "";
  if (name) {
    // Inline capture written here: capture_game_view's save_path resolves under Assets/ and would import the PNG.
    const file = join(OUT, `${name}.png`);
    const c = cmd("capture_game_view", { source: "screen", width: w, height: h, include_inline_image: true }, 60);
    if (c.ok && c.result?.base64) { writeFileSync(file, Buffer.from(c.result.base64, "base64")); png = shown(file); }
    else r = { ok: false, value: [r.value, `screenshot failed: ${c.error ?? "no image"}`].filter(Boolean).join("; ") };
  }
  const errs = consoleErrors(cursor);
  errorTotal += errs.length;
  if (!r.ok) failed++;
  const label = raw.length > 80 ? raw.slice(0, 77) + "..." : raw;
  console.log(`${r.ok ? "ok  " : "FAIL"} ${label}${r.value ? ": " + r.value : ""}${png ? " -> " + png : ""} | errors: ${errs.length}`);
  for (const e of errs.slice(0, 5)) console.log("     ! " + e);
}

// --- 4. stop ----------------------------------------------------------------------------------------------------
if (!opt.keep) stop();
console.log(`${failed ? "FAIL" : "ok  "} ${opt.steps.length} steps, ${failed} failed, ${errorTotal} console errors; images in ${shown(OUT)}${opt.keep ? "; still in Play Mode" : ""}`);
process.exit(failed ? 1 : 0);
