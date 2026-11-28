#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");
const SKILLS_SRC = path.join(ROOT_DIR, "skills");
const AGENTS_SRC = path.join(ROOT_DIR, "agents");
const PACKAGE_JSON_PATH = path.join(ROOT_DIR, "package.json");
const UPSTREAM_PACKAGE_URL =
  "https://raw.githubusercontent.com/thapld/neonskill/main/package.json";
const META_FILENAME = ".neonskill.json";
const SUBCOMMANDS = new Set(["install", "update", "check", "uninstall"]);

function getBundledVersion() {
  try {
    const pkg = JSON.parse(fs.readFileSync(PACKAGE_JSON_PATH, "utf8"));
    return pkg.version || "0.0.0";
  } catch {
    return "0.0.0";
  }
}

const BUNDLED_VERSION = getBundledVersion();

function printUsage() {
  console.log(`neonskill v${BUNDLED_VERSION} — Install, update, check, or remove the 9 neon-* skills & @verifier agent for Antigravity, T3 Code & Orca

Usage:
  npx github:thapld/neonskill                       Install globally for Antigravity/T3 Code (~/.gemini/config/{skills,agents})
  npx github:thapld/neonskill --orca                Install globally for Orca shared agents (~/.agents/{skills,agents})
  npx github:thapld/neonskill --target <t>          Target: antigravity | orca | universal | all
  npx github:thapld/neonskill --project [dir]       Install into <dir>/.agents/{skills,agents} (works in Antigravity, T3 Code & Orca)
  npx --yes github:thapld/neonskill#main --update   Auto-detect installed targets & update (use #main / --yes to bypass npx cache)
  npx --yes github:thapld/neonskill#main --check    Check installed versions vs bundled & upstream main (read-only)
  npx github:thapld/neonskill --only neon-plan,...  Target only selected skills (skips agents to avoid partial wipes)
  npx github:thapld/neonskill --no-agents           Install, update, or uninstall skills only without touching agents/verifier.md
  npx github:thapld/neonskill --uninstall           Remove installed neon-* skills (and verifier.md unless --only/--no-agents)
  npx github:thapld/neonskill --dry-run             Preview actions without writing or deleting files
  npx github:thapld/neonskill --list                List bundled skills and agents
  npx github:thapld/neonskill --version             Show bundled neonskill version
  npx github:thapld/neonskill --help                Show this help

Positional aliases:
  install | update | check | uninstall              Optional subcommand aliases for default, --update, --check, --uninstall
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

function getInstalledNeonSkills(skillsDir) {
  if (!fs.existsSync(skillsDir)) return [];
  try {
    return fs
      .readdirSync(skillsDir, { withFileTypes: true })
      .filter(
        (d) =>
          d.name.startsWith("neon-") && (d.isDirectory() || d.isSymbolicLink())
      )
      .map((d) => d.name)
      .sort();
  } catch {
    return [];
  }
}

function getInstalledAgents(agentsDir, availableAgents) {
  if (!fs.existsSync(agentsDir)) return [];
  return availableAgents.filter((name) =>
    pathExists(path.join(agentsDir, name))
  );
}

function readMeta(skillsDir) {
  const metaPath = path.join(skillsDir, META_FILENAME);
  if (!fs.existsSync(metaPath)) return null;
  try {
    const raw = fs.readFileSync(metaPath, "utf8");
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function writeMeta(skillsDir, agentsDir, availableAgents, version = BUNDLED_VERSION) {
  const metaPath = path.join(skillsDir, META_FILENAME);
  const payload = {
    version,
    skills: getInstalledNeonSkills(skillsDir),
    agents: getInstalledAgents(agentsDir, availableAgents),
    updatedAt: new Date().toISOString(),
  };
  fs.writeFileSync(metaPath, JSON.stringify(payload, null, 2) + "\n", "utf8");
  return metaPath;
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
  if (val === "antigravity" || val === "t3" || val === "t3-code") {
    return "antigravity";
  }
  if (val === "orca" || val === "universal") return "orca";
  if (val === "all") return "all";
  console.error(
    `Error: Unknown target '${raw}'. Use one of: antigravity, orca, universal, all.`
  );
  process.exit(1);
}

function deduplicateTargets(targets) {
  const seen = new Set();
  const unique = [];
  for (const t of targets) {
    const key = path.resolve(t.skillsDir);
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(t);
    }
  }
  return unique;
}

function compareSemver(a, b) {
  if (!a || !b) return null;
  const pa = a.replace(/^v/, "").split(".").map((n) => Number.parseInt(n, 10));
  const pb = b.replace(/^v/, "").split(".").map((n) => Number.parseInt(n, 10));
  if (pa.some(Number.isNaN) || pb.some(Number.isNaN)) return null;
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const va = pa[i] ?? 0;
    const vb = pb[i] ?? 0;
    if (va > vb) return 1;
    if (va < vb) return -1;
  }
  return 0;
}

async function fetchUpstreamVersion(timeoutMs = 4000) {
  try {
    const res = await fetch(UPSTREAM_PACKAGE_URL, {
      signal: AbortSignal.timeout(timeoutMs),
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return typeof data?.version === "string" ? data.version : null;
  } catch {
    return null;
  }
}

function buildStandardTargets(projectDir) {
  const antigravityTarget = {
    label: "Antigravity / T3 Code (~/.gemini/config)",
    mode: "global",
    skillsDir: path.join(os.homedir(), ".gemini", "config", "skills"),
    agentsDir: path.join(os.homedir(), ".gemini", "config", "agents"),
  };
  const orcaTarget = {
    label: "Orca / Universal (~/.agents)",
    mode: "global",
    skillsDir: path.join(os.homedir(), ".agents", "skills"),
    agentsDir: path.join(os.homedir(), ".agents", "agents"),
  };
  const projectTarget = {
    label: `Project (${projectDir}/.agents)`,
    mode: "project",
    skillsDir: path.join(projectDir, ".agents", "skills"),
    agentsDir: path.join(projectDir, ".agents", "agents"),
  };
  return { antigravityTarget, orcaTarget, projectTarget };
}

async function runCheck(checkTargets, availableSkills, availableAgents) {
  console.log(`neonskill bundled version: v${BUNDLED_VERSION}`);
  const upstreamVersion = await fetchUpstreamVersion(4000);
  if (upstreamVersion) {
    console.log(`Upstream main version:     v${upstreamVersion}`);
  } else {
    console.log(
      `Upstream main version:     unavailable (offline or unreachable; comparing against bundled v${BUNDLED_VERSION})`
    );
  }
  const latestVersion =
    upstreamVersion && compareSemver(upstreamVersion, BUNDLED_VERSION) > 0
      ? upstreamVersion
      : BUNDLED_VERSION;
  console.log("");

  let hasOutdatedOrLegacy = false;
  let anyInstalled = false;

  for (const t of checkTargets) {
    const installedSkills = getInstalledNeonSkills(t.skillsDir);
    const installedAgents = getInstalledAgents(t.agentsDir, availableAgents);
    const meta = readMeta(t.skillsDir);

    console.log(`${t.label}`);
    console.log(`  skillsDir: ${t.skillsDir}`);

    if (installedSkills.length === 0) {
      console.log(`  status:    not installed`);
      continue;
    }

    anyInstalled = true;
    const installedVersion =
      meta && typeof meta.version === "string" ? meta.version : null;
    const versionDisplay = installedVersion
      ? `v${installedVersion}`
      : "unknown (legacy — no .neonskill.json)";

    let statusNote = "up to date";
    if (!installedVersion) {
      statusNote = `legacy install -> v${latestVersion} available`;
      hasOutdatedOrLegacy = true;
    } else {
      const cmp = compareSemver(installedVersion, latestVersion);
      if (cmp !== null && cmp < 0) {
        statusNote = `outdated -> v${latestVersion} available`;
        hasOutdatedOrLegacy = true;
      } else if (cmp !== null && cmp > 0) {
        statusNote = `ahead of v${latestVersion}`;
      } else if (installedSkills.length < availableSkills.length) {
        statusNote = `partial (${installedSkills.length}/${availableSkills.length} skills)`;
      }
    }

    console.log(`  version:   ${versionDisplay} (${statusNote})`);
    console.log(
      `  installed: ${installedSkills.length}/${availableSkills.length} skills, ${installedAgents.length}/${availableAgents.length} agents`
    );
    if (meta?.updatedAt) {
      console.log(`  updatedAt: ${meta.updatedAt}`);
    }
  }

  console.log("");
  if (!anyInstalled) {
    console.log(
      "No neonskill installations found. Install with --global, --orca, --target all, or --project."
    );
  } else if (hasOutdatedOrLegacy) {
    console.log(
      "Update available. Run:\n  npx --yes github:thapld/neonskill#main --update\n  # or inside a cloned repo: ./install.sh --update"
    );
  } else {
    console.log(`All installed targets are at v${latestVersion}.`);
  }
}

async function main() {
  const args = process.argv.slice(2);
  let action = "install";
  let mode = "global";
  let target = "antigravity";
  let hasExplicitTarget = false;
  let projectDir = process.cwd();
  let projectExplicit = false;
  let dryRun = false;
  let skipAgents = false;
  let onlyList = null;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "-h" || arg === "--help") {
      printUsage();
      process.exit(0);
    } else if (arg === "-v" || arg === "--version") {
      console.log(BUNDLED_VERSION);
      process.exit(0);
    } else if (arg === "--list") {
      console.log("Skills:");
      for (const s of getAvailableSkills()) console.log(`  ${s}`);
      console.log("Agents:");
      for (const a of getAvailableAgents()) console.log(`  ${a}`);
      process.exit(0);
    } else if (arg === "install") {
      action = "install";
    } else if (arg === "--update" || arg === "update") {
      action = "update";
    } else if (arg === "--check" || arg === "check") {
      action = "check";
    } else if (arg === "--uninstall" || arg === "uninstall") {
      action = "uninstall";
    } else if (arg === "--global" || arg === "-g") {
      mode = "global";
      hasExplicitTarget = true;
    } else if (arg === "--orca") {
      mode = "global";
      target = "orca";
      hasExplicitTarget = true;
    } else if (arg === "--target" || arg === "-t") {
      const val = args[i + 1];
      if (!val || val.startsWith("-")) {
        console.error(
          "Error: --target requires one of: antigravity, orca, universal, all."
        );
        process.exit(1);
      }
      target = normalizeTarget(val);
      hasExplicitTarget = true;
      i++;
    } else if (arg.startsWith("--target=")) {
      target = normalizeTarget(arg.slice("--target=".length));
      hasExplicitTarget = true;
    } else if (arg === "--project" || arg === "-p") {
      mode = "project";
      hasExplicitTarget = true;
      const next = args[i + 1];
      if (
        next &&
        !next.startsWith("-") &&
        (!SUBCOMMANDS.has(next) || fs.existsSync(path.resolve(next)))
      ) {
        projectDir = path.resolve(next);
        projectExplicit = true;
        i++;
      } else {
        projectDir = process.cwd();
      }
    } else if (arg.startsWith("--project=")) {
      mode = "project";
      hasExplicitTarget = true;
      const val = arg.slice("--project=".length);
      projectDir = path.resolve(val || ".");
      projectExplicit = Boolean(val);
    } else if (arg === "--only") {
      const val = args[i + 1];
      if (!val || val.startsWith("-")) {
        console.error(
          "Error: --only requires a comma-separated list of skill names."
        );
        process.exit(1);
      }
      onlyList = parseOnlyValue(val);
      i++;
    } else if (arg.startsWith("--only=")) {
      onlyList = parseOnlyValue(arg.slice("--only=".length));
    } else if (arg === "--no-agents") {
      skipAgents = true;
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

  const { antigravityTarget, orcaTarget, projectTarget } =
    buildStandardTargets(projectDir);

  if (action === "check") {
    const checkTargets = hasExplicitTarget
      ? mode === "project"
        ? [projectTarget]
        : target === "all"
          ? [antigravityTarget, orcaTarget]
          : target === "orca"
            ? [orcaTarget]
            : [antigravityTarget]
      : deduplicateTargets([antigravityTarget, orcaTarget, projectTarget]);

    await runCheck(checkTargets, availableSkills, availableAgents);
    return;
  }

  let destTargets;
  if (action === "update" && !hasExplicitTarget) {
    const candidates = deduplicateTargets([
      antigravityTarget,
      orcaTarget,
      projectTarget,
    ]);
    destTargets = candidates.filter(
      (t) => getInstalledNeonSkills(t.skillsDir).length > 0
    );
    if (destTargets.length === 0) {
      console.log(
        `No existing neonskill installations found in:\n  - ${antigravityTarget.skillsDir}\n  - ${orcaTarget.skillsDir}\n  - ${projectTarget.skillsDir}`
      );
      console.log(
        `\nInstall first with one of:\n  npx github:thapld/neonskill --global\n  npx github:thapld/neonskill --orca\n  npx github:thapld/neonskill --target all\n  npx github:thapld/neonskill --project`
      );
      return;
    }
  } else {
    destTargets =
      mode === "project"
        ? [projectTarget]
        : target === "all"
          ? [antigravityTarget, orcaTarget]
          : target === "orca"
            ? [orcaTarget]
            : [antigravityTarget];
  }

  const manageAgents = !skipAgents && !onlyList && availableAgents.length > 0;

  for (const targetInfo of destTargets) {
    const { skillsDir, agentsDir } = targetInfo;
    const targetMode = targetInfo.mode || mode;

    if (action === "uninstall") {
      console.log(
        `${dryRun ? "[dry-run] " : ""}Removing ${selectedSkills.length} skill(s) (${targetMode}) from ${skillsDir}`
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
          `${dryRun ? "[dry-run] " : ""}Removing ${availableAgents.length} agent(s) (${targetMode}) from ${agentsDir}`
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

      const metaPath = path.join(skillsDir, META_FILENAME);
      if (pathExists(metaPath)) {
        const remainingSkills = getInstalledNeonSkills(skillsDir).filter(
          (name) => !(dryRun && selectedSkills.includes(name))
        );
        if (!onlyList || remainingSkills.length === 0) {
          if (dryRun) {
            console.log(`  would remove ${META_FILENAME} -> ${metaPath}`);
          } else {
            fs.rmSync(metaPath, { force: true });
            console.log(`  removed ${META_FILENAME} -> ${metaPath}`);
          }
        } else if (!dryRun) {
          const prevMeta = readMeta(skillsDir);
          writeMeta(
            skillsDir,
            agentsDir,
            availableAgents,
            prevMeta?.version || BUNDLED_VERSION
          );
          console.log(`  updated ${META_FILENAME} -> ${metaPath}`);
        }
      }
    } else {
      const verb = action === "update" ? "Updating" : "Installing";
      const doneVerb = action === "update" ? "updated" : "installed";
      const wouldVerb = action === "update" ? "would update" : "would install";
      console.log(
        `${dryRun ? "[dry-run] " : ""}${verb} ${selectedSkills.length} skill(s) (v${BUNDLED_VERSION}, ${targetMode}) -> ${skillsDir}`
      );
      if (!dryRun) {
        fs.mkdirSync(skillsDir, { recursive: true });
      }
      for (const name of selectedSkills) {
        const src = path.join(SKILLS_SRC, name);
        const dst = path.join(skillsDir, name);
        if (dryRun) {
          console.log(`  ${wouldVerb} ${name} -> ${dst}`);
        } else {
          fs.rmSync(dst, { recursive: true, force: true });
          fs.cpSync(src, dst, { recursive: true, force: true });
          console.log(`  ${doneVerb} ${name} -> ${dst}`);
        }
      }

      if (manageAgents) {
        console.log(
          `${dryRun ? "[dry-run] " : ""}${verb} ${availableAgents.length} agent(s) (${targetMode}) -> ${agentsDir}`
        );
        if (!dryRun) {
          fs.mkdirSync(agentsDir, { recursive: true });
        }
        for (const file of availableAgents) {
          const src = path.join(AGENTS_SRC, file);
          const dst = path.join(agentsDir, file);
          if (dryRun) {
            console.log(`  ${wouldVerb} ${file} -> ${dst}`);
          } else {
            fs.rmSync(dst, { force: true });
            fs.copyFileSync(src, dst);
            console.log(`  ${doneVerb} ${file} -> ${dst}`);
          }
        }
      }

      const metaPath = path.join(skillsDir, META_FILENAME);
      if (dryRun) {
        console.log(`  would write ${META_FILENAME} (v${BUNDLED_VERSION}) -> ${metaPath}`);
      } else {
        writeMeta(skillsDir, agentsDir, availableAgents, BUNDLED_VERSION);
        console.log(`  wrote ${META_FILENAME} (v${BUNDLED_VERSION}) -> ${metaPath}`);
      }
    }
  }

  if (skipAgents) {
    console.log(`${dryRun ? "[dry-run] " : ""}Skipped agents (--no-agents).`);
  } else if (onlyList) {
    console.log(
      `${dryRun ? "[dry-run] " : ""}Skipped agents (--only restricts target to selected skills).`
    );
  }

  console.log(
    dryRun
      ? "Dry-run complete. No files were written or deleted."
      : action === "uninstall"
        ? "Uninstall complete."
        : `Done (v${BUNDLED_VERSION}). Open a new thread/session in Antigravity, T3 Code, or Orca to load the updated skills & @verifier agent.`
  );
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
