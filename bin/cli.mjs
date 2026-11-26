#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SKILLS_SRC = path.resolve(__dirname, "..", "skills");

function printUsage() {
  console.log(`neonskill — Install the 8 neon-* skills for Antigravity / T3 Code

Usage:
  npx github:thapld/neonskill                       Install all 8 skills globally (~/.gemini/config/skills)
  npx github:thapld/neonskill --global              Same as above (explicit)
  npx github:thapld/neonskill --project [dir]       Install into <dir>/.agents/skills (default: current directory)
  npx github:thapld/neonskill --only neon-plan,...  Install only selected skills (comma-separated)
  npx github:thapld/neonskill --dry-run             Preview target paths without writing files
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

const args = process.argv.slice(2);
let mode = "global";
let projectDir = process.cwd();
let dryRun = false;
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
      i++;
    } else {
      projectDir = process.cwd();
    }
  } else if (arg === "--only") {
    const val = args[i + 1];
    if (!val || val.startsWith("-")) {
      console.error("Error: --only requires a comma-separated list of skill names.");
      process.exit(1);
    }
    onlyList = val.split(",").map((s) => s.trim()).filter(Boolean);
    i++;
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

const destRoot =
  mode === "global"
    ? path.join(os.homedir(), ".gemini", "config", "skills")
    : path.join(projectDir, ".agents", "skills");

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
