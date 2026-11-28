#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SKILLS_SRC = path.resolve(__dirname, "..", "skills");
const AGENTS_SRC = path.resolve(__dirname, "..", "agents");

function printUsage() {
  console.log(`neonskill — Install or remove the 9 neon-* skills & @verifier agent for Antigravity, T3 Code & Orca

Usage:
  npx github:thapld/neonskill                       Install globally for Antigravity/T3 Code (~/.gemini/config/{skills,agents})
  npx github:thapld/neonskill --orca                Install globally for Orca shared agents (~/.agents/{skills,agents})
  npx github:thapld/neonskill --target <t>          Target: antigravity | orca | universal | all
  npx github:thapld/neonskill --project [dir]       Install into <dir>/.agents/{skills,agents} (works in Antigravity, T3 Code & Orca)
  npx github:thapld/neonskill --only neon-plan,...  Target only selected skills (skips agents to avoid partial wipes)
  npx github:thapld/neonskill --no-agents           Install or uninstall skills only without touching agents/verifier.md
  npx github:thapld/neonskill --uninstall           Remove installed neon-* skills (and verifier.md unless --only/--no-agents)
  npx github:thapld/neonskill --dry-run             Preview actions without writing or deleting files
  npx github:thapld/neonskill --list                List bundled skills and agents
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

function getAvailableAgents() {
  if (!fs.existsSync(AGENTS_SRC)) return [];
  return fs
    .readdirSync(AGENTS_SRC, { withFileTypes: true })
    .filter((d) => (d.isFile() || d.isSymbolicLink()) && d.name.endsWith(".md"))
    .map((d) => d.name)
    .sort();
}

function pathExists(targetPath) {
  return Boolean(fs.lstatSync(targetPath, { throwIfNoEntry: false }));
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
let skipAgents = false;
let onlyList = null;

for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if (arg === "-h" || arg === "--help") {
    printUsage();
    process.exit(0);
  } else if (arg === "--list") {
    console.log("Skills:");
    for (const s of getAvailableSkills()) console.log(`  ${s}`);
    console.log("Agents:");
    for (const a of getAvailableAgents()) console.log(`  ${a}`);
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
  } else if (arg === "--no-agents") {
    skipAgents = true;
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

const availableSkills = getAvailableSkills();
const availableAgents = getAvailableAgents();
let selectedSkills = availableSkills;

if (onlyList) {
  const unknown = onlyList.filter((s) => !availableSkills.includes(s));
  if (unknown.length > 0) {
    console.error(`Unknown skill(s): ${unknown.join(", ")}`);
    console.error(`Available skills: ${availableSkills.join(", ")}`);
    process.exit(1);
  }
  selectedSkills = onlyList;
}

if (mode === "project" && projectExplicit && !fs.existsSync(projectDir)) {
  console.error(
    `Error: Target project directory does not exist: ${projectDir}\nCreate it first or omit the path to use the current directory.`
  );
  process.exit(1);
}

const antigravityTarget = {
  skillsDir: path.join(os.homedir(), ".gemini", "config", "skills"),
  agentsDir: path.join(os.homedir(), ".gemini", "config", "agents"),
};
const orcaTarget = {
  skillsDir: path.join(os.homedir(), ".agents", "skills"),
  agentsDir: path.join(os.homedir(), ".agents", "agents"),
};

const destTargets =
  mode === "project"
    ? [
        {
          skillsDir: path.join(projectDir, ".agents", "skills"),
          agentsDir: path.join(projectDir, ".agents", "agents"),
        },
      ]
    : target === "all"
      ? [antigravityTarget, orcaTarget]
      : target === "orca"
        ? [orcaTarget]
        : [antigravityTarget];

const manageAgents = !skipAgents && !onlyList && availableAgents.length > 0;

for (const { skillsDir, agentsDir } of destTargets) {
  if (uninstall) {
    console.log(
      `${dryRun ? "[dry-run] " : ""}Removing ${selectedSkills.length} skill(s) (${mode}) from ${skillsDir}`
    );
    for (const name of selectedSkills) {
      const dst = path.join(skillsDir, name);
      if (!pathExists(dst)) {
        console.log(`  skip (not installed) ${name}`);
      } else if (dryRun) {
        console.log(`  would remove ${name} -> ${dst}`);
      } else {
        fs.rmSync(dst, { recursive: true, force: true });
        console.log(`  removed ${name} -> ${dst}`);
      }
    }

    if (manageAgents) {
      console.log(
        `${dryRun ? "[dry-run] " : ""}Removing ${availableAgents.length} agent(s) (${mode}) from ${agentsDir}`
      );
      for (const file of availableAgents) {
        const dst = path.join(agentsDir, file);
        if (!pathExists(dst)) {
          console.log(`  skip (not installed) ${file}`);
        } else if (dryRun) {
          console.log(`  would remove ${file} -> ${dst}`);
        } else {
          fs.rmSync(dst, { force: true });
          console.log(`  removed ${file} -> ${dst}`);
        }
      }
    }
  } else {
    console.log(
      `${dryRun ? "[dry-run] " : ""}Installing ${selectedSkills.length} skill(s) (${mode}) -> ${skillsDir}`
    );
    if (!dryRun) {
      fs.mkdirSync(skillsDir, { recursive: true });
    }
    for (const name of selectedSkills) {
      const src = path.join(SKILLS_SRC, name);
      const dst = path.join(skillsDir, name);
      if (dryRun) {
        console.log(`  would install ${name} -> ${dst}`);
      } else {
        fs.rmSync(dst, { recursive: true, force: true });
        fs.cpSync(src, dst, { recursive: true, force: true });
        console.log(`  installed ${name} -> ${dst}`);
      }
    }

    if (manageAgents) {
      console.log(
        `${dryRun ? "[dry-run] " : ""}Installing ${availableAgents.length} agent(s) (${mode}) -> ${agentsDir}`
      );
      if (!dryRun) {
        fs.mkdirSync(agentsDir, { recursive: true });
      }
      for (const file of availableAgents) {
        const src = path.join(AGENTS_SRC, file);
        const dst = path.join(agentsDir, file);
        if (dryRun) {
          console.log(`  would install ${file} -> ${dst}`);
        } else {
          fs.rmSync(dst, { force: true });
          fs.copyFileSync(src, dst);
          console.log(`  installed ${file} -> ${dst}`);
        }
      }
    }
  }
}

if (skipAgents) {
  console.log(`${dryRun ? "[dry-run] " : ""}Skipped agents (--no-agents).`);
} else if (onlyList) {
  console.log(`${dryRun ? "[dry-run] " : ""}Skipped agents (--only restricts target to selected skills).`);
}

console.log(
  dryRun
    ? "Dry-run complete. No files were written or deleted."
    : uninstall
      ? "Uninstall complete."
      : "Done. Open a new thread/session in Antigravity, T3 Code, or Orca to load the updated skills & @verifier agent."
);
