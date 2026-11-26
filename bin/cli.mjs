#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SKILLS_SRC = path.resolve(__dirname, "..", "skills");

function printUsage() {
  console.log(`neonskill — Install or remove the 8 neon-* skills for Antigravity, T3 Code & Orca

Usage:
  npx github:thapld/neonskill                       Install globally for Antigravity/T3 Code (~/.gemini/config/skills)
  npx github:thapld/neonskill --orca                Install globally for Orca shared agents (~/.agents/skills)
  npx github:thapld/neonskill --target <t>          Target: antigravity | orca | universal | all
  npx github:thapld/neonskill --project [dir]       Install into <dir>/.agents/skills (works in Antigravity, T3 Code & Orca)
  npx github:thapld/neonskill --only neon-plan,...  Target only selected skills (comma-separated)
  npx github:thapld/neonskill --uninstall           Remove installed neon-* skills from target location(s)
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

function normalizeTarget(raw) {
  const val = (raw || "").trim().toLowerCase();
  if (val === "antigravity" || val === "t3" || val === "t3-code") return "antigravity";
  if (val === "orca" || val === "universal") return "orca";
  if (val === "all") return "all";
  console.error(
    `Error: Unknown target '${raw}'. Use one of: antigravity, orca, universal, all.`
  );
  process.exit(1);
}

const args = process.argv.slice(2);
let mode = "global";
let target = "antigravity";
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
  } else if (arg === "--orca") {
    mode = "global";
    target = "orca";
  } else if (arg === "--target" || arg === "-t") {
    const val = args[i + 1];
    if (!val || val.startsWith("-")) {
      console.error("Error: --target requires one of: antigravity, orca, universal, all.");
      process.exit(1);
    }
    target = normalizeTarget(val);
    i++;
  } else if (arg.startsWith("--target=")) {
    target = normalizeTarget(arg.slice("--target=".length));
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

const antigravityDir = path.join(os.homedir(), ".gemini", "config", "skills");
const orcaUniversalDir = path.join(os.homedir(), ".agents", "skills");

const destRoots =
  mode === "project"
    ? [path.join(projectDir, ".agents", "skills")]
    : target === "all"
      ? [antigravityDir, orcaUniversalDir]
      : target === "orca"
        ? [orcaUniversalDir]
        : [antigravityDir];

for (const destRoot of destRoots) {
  if (uninstall) {
    console.log(
      `${dryRun ? "[dry-run] " : ""}Removing ${selected.length} skill(s) (${mode}) from ${destRoot}`
    );
    for (const name of selected) {
      const dst = path.join(destRoot, name);
      if (!fs.existsSync(dst)) {
        console.log(`  skip (not installed) ${name}`);
      } else if (dryRun) {
        console.log(`  would remove ${name} -> ${dst}`);
      } else {
        fs.rmSync(dst, { recursive: true, force: true });
        console.log(`  removed ${name} -> ${dst}`);
      }
    }
  } else {
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
  }
}

console.log(
  dryRun
    ? "Dry-run complete. No files were written or deleted."
    : uninstall
      ? "Uninstall complete."
      : "Done. Open a new thread/session in Antigravity, T3 Code, or Orca to load the updated skills."
);
