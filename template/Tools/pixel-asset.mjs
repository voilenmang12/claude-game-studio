#!/usr/bin/env node
// Client for Codex Asset Studio (https://github.com/voilenmang12/codex-asset-studio), the asset connector, API v1 (tested with 1.2.0).
// PIXEL_ASSET_API sets its URL, PIXEL_ASSET_CONNECTOR_DIR the folder it runs from (only used in error hints).
// Submit jobs and read the worker's PNG path. `pull` is an optional local copy into Assets/Art/ (pixel)
// or Assets/ArtRaster/ (raster). Guide: Assets/Integration/PixelArt.md, section 6.
//
//   node Tools/pixel-asset.mjs caps
//   node Tools/pixel-asset.mjs init
//   node Tools/pixel-asset.mjs submit --name Items/iron_sword --type item --view "front view" --asset "Common iron sword, grip at the bottom, tip pointing straight up" [--rarity common] [--size 32]
//   node Tools/pixel-asset.mjs submit --name UI/Panels/panel_modal --type ui_9_slice --size 64 --border 16 --colors 8 --view "flat front view" --asset "..."   (UI: Assets/Integration/UIPrompting.md)
//   node Tools/pixel-asset.mjs submit --pipeline raster --name Backgrounds/bg_menu --width 1600 --height 900 --background opaque --view "wide front view" --asset "..."
//   Any submit: [--ref <job-id | path/to/file.png> | --no-ref] [--style "..."]. --pipeline defaults to "pipeline" in the config.
//   node Tools/pixel-asset.mjs status
//   node Tools/pixel-asset.mjs pull <job-id>... | --all [--force]
import { constants, copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync, appendFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const CONFIG_PATH = join(ROOT, "design/art/pixel-asset-project.json");
const LEDGER_PATH = join(ROOT, "design/asset-ledger.csv");
const API = process.env.PIXEL_ASSET_API || "http://127.0.0.1:3941";
const CONNECTOR_DIR = process.env.PIXEL_ASSET_CONNECTOR_DIR || "<codex-asset-studio>/asset-connector";
const API_MAJOR = "1";
// Unity import roots: PixelArtImporter owns Assets/Art/, RasterArtImporter owns Assets/ArtRaster/.
const ART_ROOTS = { pixel: "Assets/Art", raster: "Assets/ArtRaster" };

function fail(message) {
  console.error(`ERROR: ${message}`);
  process.exit(1);
}

async function api(method, path, body) {
  let response;
  try {
    response = await fetch(API + path, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(process.env.ASSET_API_TOKEN ? { Authorization: `Bearer ${process.env.ASSET_API_TOKEN}` } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(10000),
    });
  } catch (error) {
    fail(`Connector not reachable at ${API} (${error.message}). Start it: cd "${CONNECTOR_DIR}" && node server.mjs --worker`);
  }
  const data = await response.json();
  if (!response.ok) fail(`${method} ${path}: ${data.error ?? response.status}`);
  return data;
}

function readConfig() {
  return JSON.parse(readFileSync(CONFIG_PATH, "utf8"));
}

function requireProjectId(config) {
  if (!config.project_id) fail(`No project_id in ${CONFIG_PATH}. Run: node Tools/pixel-asset.mjs init`);
  return config.project_id;
}

async function init() {
  const config = readConfig();
  if (config.project_id) fail(`Already registered as ${config.project_id}. To change the prompt, use PATCH /v1/projects/{id}/master-prompt.`);
  for (const key of ["name", "master_prompt"]) {
    if (typeof config[key] !== "string" || !config[key].trim() || config[key].includes("TODO")) {
      fail(`Fill "${key}" in ${CONFIG_PATH} first (from the game's art bible).`);
    }
  }
  const project = await api("POST", "/v1/projects", {
    name: config.name,
    description: config.description ?? "",
    master_prompt: config.master_prompt,
    defaults: config.defaults,
  });
  config.project_id = project.id;
  writeFileSync(CONFIG_PATH, `${JSON.stringify(config, null, 2)}\n`);
  console.log(`Project ${project.id}: ${project.name}`);
}

async function caps() {
  const data = await api("GET", "/v1/capabilities");
  console.log(JSON.stringify(data, null, 2));
  if (!String(data.api_version).startsWith(`${API_MAJOR}.`)) fail(`Connector API ${data.api_version} is not ${API_MAJOR}.x; update this client.`);
}

function readReference(values) {
  if (values["no-ref"]) return null;
  if (!values.ref) return undefined; // inherit the project default reference, if any
  if (/^[0-9a-f-]{36}$/i.test(values.ref)) return { job_id: values.ref };
  const file = resolve(ROOT, values.ref);
  if (!existsSync(file)) fail(`--ref is neither a job ID nor a file: ${values.ref}`);
  const png = readFileSync(file);
  try { pngSize(png); } catch { fail(`--ref must be a PNG: ${values.ref}`); }
  return { png_base64: png.toString("base64") };
}

async function submit(values) {
  const config = readConfig();
  const projectId = requireProjectId(config);
  const pipeline = values.pipeline ?? config.pipeline ?? "pixel";
  if (!(pipeline in ART_ROOTS)) fail(`--pipeline must be pixel or raster: ${pipeline}`);
  const raster = pipeline === "raster";
  if (raster && values.colors) fail("--colors is for the pixel pipeline only.");
  if (!raster && (values.width || values.height || values.background)) fail("--width, --height and --background are for the raster pipeline; pixel jobs use --size.");
  // The connector takes camera angle and orientation from the brief and has no default for them.
  if (!values.name || !values.asset || !values.view) fail("submit needs --name, --view (camera angle) and --asset (with facing or orientation).");
  if (!raster && !values.type && !values.size) fail("submit needs --type or --size.");
  if (values.size && (values.width || values.height)) fail("Use --size or --width/--height, not both.");
  if (!/^[a-z0-9_]+(\/[a-z0-9_]+)*$/i.test(values.name)) fail(`--name must look like Items/iron_sword: ${values.name}`);
  const width = Number(values.width ?? values.size ?? NaN);
  const height = Number(values.height ?? values.width ?? values.size ?? NaN);
  const request = {
    pipeline,
    asset: values.asset,
    ...(values.type ? { asset_type: values.type } : {}),
    view: values.view,
    output_name: values.name.replaceAll("/", "__"),
    asset_path: `${ART_ROOTS[pipeline]}/${values.name}.png`,
    ...(values.style ? { style: values.style } : {}),
    ...(values.background ? { background: values.background } : {}),
    ...(values.rarity ? { rarity: values.rarity } : {}),
    ...(Number.isFinite(width) ? { width, height } : {}),
    ...(values.colors ? { color_groups: Number(values.colors) } : {}),
    ...(values.border ? { slice_border: Number(values.border) } : {}),
  };
  const reference = readReference(values);
  const route = values.type === "ui_9_slice" ? "ui-9-slice" : "jobs";
  const job = await api("POST", `/v1/projects/${projectId}/${route}`, { request, ...(reference !== undefined ? { reference } : {}) });
  console.log(`Queued ${job.id} (${pipeline} ${job.request.width}x${job.request.height}, rules ${job.rules_version ?? "?"}) -> ${request.asset_path}`);
  console.log(`GET ${API}/v1/jobs/${job.id}. When status is done, use export_path for the PNG.`);
}

function ledgerText() {
  return existsSync(LEDGER_PATH) ? readFileSync(LEDGER_PATH, "utf8") : "";
}

async function status() {
  const projectId = requireProjectId(readConfig());
  const jobs = await api("GET", `/v1/jobs?project_id=${projectId}&limit=100`);
  const ledger = ledgerText();
  for (const job of jobs) {
    const pulled = ledger.includes(job.id) ? "pulled" : "-";
    console.log(`${job.id}  ${job.status.padEnd(10)}  ${pulled.padEnd(6)}  ${(job.request.pipeline ?? "pixel").padEnd(6)}  ${job.request.width}x${job.request.height}  ${job.export_path ?? assetPathFor(job.request) ?? "-"}${job.error ? `  ${job.error}` : ""}`);
  }
  if (!jobs.length) console.log("No jobs.");
}

function assetPathFor(request) {
  const legacy = typeof request.art_source_path === "string"
    ? /^ArtSource\/([a-z0-9_]+(?:\/[a-z0-9_]+)*)\.pxo$/i.exec(request.art_source_path)
    : null;
  return request.asset_path ?? (legacy ? `Assets/Art/${legacy[1]}.png` : null);
}

function csvField(value) {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function pngSize(png) {
  if (png.length < 33 || png.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a" ||
      png.readUInt32BE(8) !== 13 || png.toString("ascii", 12, 16) !== "IHDR") {
    throw new Error("connector export is not a valid PNG");
  }
  return [png.readUInt32BE(16), png.readUInt32BE(20)];
}

function pullJob(job, config, force) {
  if (job.status !== "done") throw new Error(`job is ${job.status}, not done`);
  const assetPath = assetPathFor(job.request);
  const root = ART_ROOTS[job.request.pipeline ?? "pixel"];
  if (typeof assetPath !== "string" || !root || !assetPath.startsWith(`${root}/`) ||
      !/^Assets\/Art(?:Raster)?\/[A-Za-z0-9_]+(?:\/[A-Za-z0-9_]+)*\.png$/.test(assetPath)) {
    throw new Error(`bad PNG destination: ${assetPath}`);
  }
  const ledger = ledgerText();
  const target = join(ROOT, assetPath);
  const alreadyPulled = ledger.includes(job.id);
  const targetExists = existsSync(target);
  if (alreadyPulled && targetExists && !force) return "up to date (already in the ledger)";
  if (!job.export_path || !existsSync(job.export_path)) throw new Error(`PNG not found: ${job.export_path}`);

  const incoming = readFileSync(job.export_path);
  const [width, height] = pngSize(incoming);
  if (width !== job.request.width || height !== job.request.height) throw new Error(`${assetPath} is ${width}x${height}, job grid is ${job.request.width}x${job.request.height}`);
  const sameContent = targetExists && readFileSync(target).equals(incoming);
  if (targetExists && !sameContent && !force) throw new Error(`${assetPath} already exists with other content; use --force to replace it`);
  if (!sameContent) {
    mkdirSync(dirname(target), { recursive: true });
    copyFileSync(job.export_path, target, force ? 0 : constants.COPYFILE_EXCL);
  }

  if (!alreadyPulled) {
    const exporter = job.pixelorama_project_path ? "Pixelorama" : "Pillow";
    const raster = job.request.pipeline === "raster";
    const row = [
      assetPath, "ai-tool", `pixel-asset-connector job ${job.id}`, config.ai_license,
      raster ? `${config.ai_plan}; Pillow` : `${config.ai_plan}; Pixel Art Fixer (MIT); ${exporter}`,
      "connector worker", new Date().toISOString().slice(0, 10),
      raster ? "Resized with Pillow (Lanczos), raster pipeline" : `Grid recovered with Pixel Art Fixer, colors grouped, exported with ${exporter}`,
      `F1: ${job.image_path}; rules ${job.rules_version ?? "?"}`,
    ];
    appendFileSync(LEDGER_PATH, `${row.map(csvField).join(",")}\n`);
  }
  return `${assetPath} (${width}x${height})`;
}

async function pull(ids, values) {
  const config = readConfig();
  for (const key of ["ai_plan", "ai_license"]) {
    if (!config[key]) fail(`Fill "${key}" in ${CONFIG_PATH} first: every asset needs its license recorded in the ledger.`);
  }
  let jobs;
  if (values.all) {
    if (ids.length) fail("Use either job IDs or --all.");
    const all = await api("GET", `/v1/jobs?project_id=${requireProjectId(config)}&status=done&limit=100`);
    jobs = all.filter((job) => values.force || !ledgerText().includes(job.id));
  } else {
    if (!ids.length) fail("pull needs job IDs or --all.");
    jobs = [];
    for (const id of ids) jobs.push(await api("GET", `/v1/jobs/${encodeURIComponent(id)}`));
  }
  let failed = 0;
  for (const job of jobs) {
    try {
      console.log(`OK    ${job.id}: ${pullJob(job, config, Boolean(values.force))}`);
    } catch (error) {
      console.error(`FAIL  ${job.id}: ${error.message}`);
      failed += 1;
    }
  }
  console.log(`Pulled ${jobs.length - failed} of ${jobs.length}.`);
  if (failed) process.exit(1);
}

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    name: { type: "string" }, asset: { type: "string" }, type: { type: "string" }, view: { type: "string" },
    rarity: { type: "string" }, size: { type: "string" }, colors: { type: "string" }, border: { type: "string" }, all: { type: "boolean" }, force: { type: "boolean" },
    pipeline: { type: "string" }, width: { type: "string" }, height: { type: "string" }, background: { type: "string" },
    style: { type: "string" }, ref: { type: "string" }, "no-ref": { type: "boolean" },
  },
});
const [command, ...rest] = positionals;
switch (command) {
  case "caps": await caps(); break;
  case "init": await init(); break;
  case "submit": await submit(values); break;
  case "status": await status(); break;
  case "pull": await pull(rest, values); break;
  default: fail("Commands: caps, init, submit, status, pull. See the top of Tools/pixel-asset.mjs.");
}
