#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SKILLS_SRC = path.resolve(__dirname, "..", "skills");

function printUsage() {
  console.log(`neonskill — Install or remove the 8 neon-* skills for Antigravity / T3 Code

Usage:
  npx github:thapld/neonskill                       Install all 8 skills globally (~/.gemini/config/skills)
  npx github:thapld/neonskill --global              Same as above (explicit)
  npx github:thapld/neonskill --project [dir]       Install into <dir>/.agents/skills (default: current directory)
  npx github:thapld/neonskill --only neon-plan,...  Target only selected skills (comma-separated)
  npx github:thapld/neonskill --uninstall           Remove installed neon-* skills from target location
  npx github:thapld/neonskill --dry-run             Preview actions without writing or deleting files
  npx github:thapld/neonskill --list                List bundled skills
  npx github:thapld/neonskill --help                Show this help
`);
}

function getAvailableSkills() {
  return fs
    .readdirSync(SKILLS_SRC, { withFileTypes: true })
    .filter((d) => d.isDirectory() && d.name.startsWith("neon-"))
    .map((d) => d.name)
    .sort();
}

function parseOnlyValue(raw) {
  const list = [
    ...new Set(
      raw
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    ),
  ];
  if (list.length === 0) {
    console.error("Error: --only requires at least one skill name.");
    process.exit(1);
  }
  return list;
}

const args = process.argv.slice(2);
let mode = "global";
let projectDir = process.cwd();
let projectExplicit = false;
let dryRun = false;
let uninstall = false;
let onlyList = null;

for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if (arg === "-h" || arg === "--help") {
    printUsage();
    process.exit(0);
  } else if (arg === "--list") {
    for (const s of getAvailableSkills()) console.log(s);
    process.exit(0);
  } else if (arg === "--global" || arg === "-g") {
    mode = "global";
  } else if (arg === "--project" || arg === "-p") {
    mode = "project";
    const next = args[i + 1];
    if (next && !next.startsWith("-")) {
      projectDir = path.resolve(next);
      projectExplicit = true;
      i++;
    } else {
      projectDir = process.cwd();
    }
  } else if (arg.startsWith("--project=")) {
    mode = "project";
    const val = arg.slice("--project=".length);
    projectDir = path.resolve(val || ".");
    projectExplicit = Boolean(val);
  } else if (arg === "--only") {
    const val = args[i + 1];
    if (!val || val.startsWith("-")) {
      console.error("Error: --only requires a comma-separated list of skill names.");
      process.exit(1);
    }
    onlyList = parseOnlyValue(val);
    i++;
  } else if (arg.startsWith("--only=")) {
    onlyList = parseOnlyValue(arg.slice("--only=".length));
  } else if (arg === "--uninstall") {
    uninstall = true;
  } else if (arg === "--dry-run") {
    dryRun = true;
  } else {
    console.error(`Unknown option: ${arg}`);
    printUsage();
    process.exit(1);
  }
}

const available = getAvailableSkills();
let selected = available;

if (onlyList) {
  const unknown = onlyList.filter((s) => !available.includes(s));
  if (unknown.length > 0) {
    console.error(`Unknown skill(s): ${unknown.join(", ")}`);
    console.error(`Available skills: ${available.join(", ")}`);
    process.exit(1);
  }
  selected = onlyList;
}

if (mode === "project" && projectExplicit && !fs.existsSync(projectDir)) {
  console.error(
    `Error: Target project directory does not exist: ${projectDir}\nCreate it first or omit the path to use the current directory.`
  );
  process.exit(1);
}

const destRoot =
  mode === "global"
    ? path.join(os.homedir(), ".gemini", "config", "skills")
    : path.join(projectDir, ".agents", "skills");

if (uninstall) {
  console.log(
    `${dryRun ? "[dry-run] " : ""}Removing ${selected.length} skill(s) (${mode}) from ${destRoot}`
  );
  for (const name of selected) {
    const dst = path.join(destRoot, name);
    const exists = fs.existsSync(dst);
    if (!exists) {
      console.log(`  skip (not installed) ${name}`);
    } else if (dryRun) {
      console.log(`  would remove ${name} -> ${dst}`);
    } else {
      fs.rmSync(dst, { recursive: true, force: true });
      console.log(`  removed ${name} -> ${dst}`);
    }
  }
  console.log(dryRun ? "Dry-run complete. No files were deleted." : "Uninstall complete.");
  process.exit(0);
}

console.log(
  `${dryRun ? "[dry-run] " : ""}Installing ${selected.length} skill(s) (${mode}) -> ${destRoot}`
);

if (!dryRun) {
  fs.mkdirSync(destRoot, { recursive: true });
}

for (const name of selected) {
  const src = path.join(SKILLS_SRC, name);
  const dst = path.join(destRoot, name);
  if (dryRun) {
    console.log(`  would install ${name} -> ${dst}`);
  } else {
    fs.rmSync(dst, { recursive: true, force: true });
    fs.cpSync(src, dst, { recursive: true, force: true });
    console.log(`  installed ${name} -> ${dst}`);
  }
}

console.log(
  dryRun
    ? "Dry-run complete. No files were written."
    : "Done. Open a new thread in Antigravity / T3 Code to load the updated skills."
);
