#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILLS_SRC="$SCRIPT_DIR/skills"
AGENTS_SRC="$SCRIPT_DIR/agents"
META_FILENAME=".neonskill.json"

get_repo_version() {
  if [[ -f "$SCRIPT_DIR/package.json" ]]; then
    sed -n 's/^[[:space:]]*"version"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' "$SCRIPT_DIR/package.json" | head -n 1
  else
    echo "0.0.0"
  fi
}

usage() {
  cat <<'EOF'
Usage:
  ./install.sh --global                  Install into ~/.gemini/config/{skills,agents} (Antigravity / T3 Code)
  ./install.sh --orca                    Install into ~/.agents/{skills,agents} (Orca shared universal folder)
  ./install.sh --target <t>              Target for global install: antigravity | orca | universal | all
  ./install.sh --project [repo-path]     Install into <repo-path>/.agents/{skills,agents} (default: .)
  ./install.sh --update                  Pull latest main (unless --no-pull) & update auto-detected or explicit target(s)
  ./install.sh --check                   Check installed targets & .neonskill.json versions vs local repo (read-only)
  ./install.sh --no-pull                 Skip git pull --ff-only during --update (offline or local/dirty clone)
  ./install.sh --no-agents               Install/update/uninstall skills only without touching agents/verifier.md
  ./install.sh --uninstall               Remove installed neon-* skills, verifier.md, and .neonskill.json from target(s)
  ./install.sh --dry-run                 Preview actions without writing or deleting files
  ./install.sh --symlink                 Symlink instead of copy (for local development)
  ./install.sh --copy                    Force copy even when updating a symlinked target
EOF
}

ACTION="install"
MODE=""
TARGET="antigravity"
TARGET_REPO=""
HAS_EXPLICIT_TARGET=0
USE_SYMLINK=0
FORCE_COPY=0
NO_AGENTS=0
NO_PULL=0
DRY_RUN=0

normalize_target() {
  case "$(printf '%s' "$1" | tr '[:upper:]' '[:lower:]')" in
    antigravity|t3|t3-code) echo "antigravity" ;;
    orca|universal) echo "orca" ;;
    all) echo "all" ;;
    *)
      echo "Unknown target: $1 (use antigravity, orca, universal, or all)" >&2
      exit 1
      ;;
  esac
}

has_neon_skills() {
  local dir="$1"
  [[ -d "$dir" ]] || return 1
  local entry
  for entry in "$dir"/neon-*; do
    if [[ -e "$entry" || -L "$entry" ]]; then
      return 0
    fi
  done
  return 1
}

target_uses_symlinks() {
  local dir="$1"
  [[ -d "$dir" ]] || return 1
  local entry
  for entry in "$dir"/neon-*; do
    if [[ -L "$entry" ]]; then
      return 0
    fi
  done
  return 1
}

count_neon_skills() {
  local dir="$1"
  local count=0
  if [[ -d "$dir" ]]; then
    local entry
    for entry in "$dir"/neon-*; do
      if [[ -e "$entry" || -L "$entry" ]]; then
        count=$((count + 1))
      fi
    done
  fi
  echo "$count"
}

read_meta_field() {
  local meta_file="$1"
  local field="$2"
  [[ -f "$meta_file" ]] || return 1
  sed -n "s/.*\"${field}\"[[:space:]]*:[[:space:]]*\"\([^\"]*\)\".*/\1/p" "$meta_file" | head -n 1
}

write_meta() {
  local skill_dest="$1"
  local agent_dest="$2"
  local version="$3"
  local meta_file="$skill_dest/$META_FILENAME"
  local updated_at
  updated_at="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"

  local skills_json=""
  local entry name
  for entry in "$skill_dest"/neon-*; do
    if [[ -e "$entry" || -L "$entry" ]]; then
      name="$(basename "$entry")"
      if [[ -n "$skills_json" ]]; then
        skills_json="${skills_json},
    \"${name}\""
      else
        skills_json="    \"${name}\""
      fi
    fi
  done

  local agents_json=""
  if [[ -d "$AGENTS_SRC" ]]; then
    for entry in "$AGENTS_SRC"/*.md; do
      [[ -e "$entry" ]] || continue
      name="$(basename "$entry")"
      if [[ -e "$agent_dest/$name" || -L "$agent_dest/$name" ]]; then
        if [[ -n "$agents_json" ]]; then
          agents_json="${agents_json},
    \"${name}\""
        else
          agents_json="    \"${name}\""
        fi
      fi
    done
  fi

  {
    printf '{\n'
    printf '  "version": "%s",\n' "$version"
    if [[ -n "$skills_json" ]]; then
      printf '  "skills": [\n%s\n  ],\n' "$skills_json"
    else
      printf '  "skills": [],\n'
    fi
    if [[ -n "$agents_json" ]]; then
      printf '  "agents": [\n%s\n  ],\n' "$agents_json"
    else
      printf '  "agents": [],\n'
    fi
    printf '  "updatedAt": "%s"\n' "$updated_at"
    printf '}\n'
  } > "$meta_file"
}

add_unique_target() {
  local s_dir="$1"
  local a_dir="$2"
  local m_mode="$3"
  local existing
  for existing in "${SKILL_DESTS[@]+"${SKILL_DESTS[@]}"}"; do
    if [[ "$existing" == "$s_dir" ]]; then
      return 0
    fi
  done
  SKILL_DESTS+=("$s_dir")
  AGENT_DESTS+=("$a_dir")
  TARGET_MODES+=("$m_mode")
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    install)
      ACTION="install"
      shift
      ;;
    --update|update)
      ACTION="update"
      shift
      ;;
    --check|check)
      ACTION="check"
      shift
      ;;
    --uninstall|uninstall)
      ACTION="uninstall"
      shift
      ;;
    --global|-g)
      MODE="global"
      HAS_EXPLICIT_TARGET=1
      shift
      ;;
    --orca)
      MODE="global"
      TARGET="orca"
      HAS_EXPLICIT_TARGET=1
      shift
      ;;
    --target|-t)
      [[ $# -ge 2 ]] || { echo "Error: --target requires a value" >&2; exit 1; }
      MODE="${MODE:-global}"
      TARGET="$(normalize_target "$2")"
      HAS_EXPLICIT_TARGET=1
      shift 2
      ;;
    --target=*)
      MODE="${MODE:-global}"
      TARGET="$(normalize_target "${1#--target=}")"
      HAS_EXPLICIT_TARGET=1
      shift
      ;;
    --project|-p)
      MODE="project"
      HAS_EXPLICIT_TARGET=1
      if [[ $# -ge 2 && "${2:-}" != -* && "$2" != "install" && "$2" != "update" && "$2" != "check" && "$2" != "uninstall" ]]; then
        TARGET_REPO="$2"
        shift 2
      else
        TARGET_REPO="."
        shift 1
      fi
      ;;
    --project=*)
      MODE="project"
      HAS_EXPLICIT_TARGET=1
      TARGET_REPO="${1#--project=}"
      TARGET_REPO="${TARGET_REPO:-.}"
      shift
      ;;
    --no-agents)
      NO_AGENTS=1
      shift
      ;;
    --no-pull)
      NO_PULL=1
      shift
      ;;
    --dry-run)
      DRY_RUN=1
      shift
      ;;
    --symlink)
      USE_SYMLINK=1
      FORCE_COPY=0
      shift
      ;;
    --copy)
      FORCE_COPY=1
      USE_SYMLINK=0
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      usage
      exit 1
      ;;
  esac
done

PREFIX=""
if [[ "$DRY_RUN" -eq 1 ]]; then
  PREFIX="[dry-run] "
fi

if [[ "$ACTION" == "update" ]]; then
  if [[ "$NO_PULL" -eq 1 ]]; then
    echo "${PREFIX}Skipping git pull (--no-pull)."
  elif [[ "$DRY_RUN" -eq 1 ]]; then
    echo "${PREFIX}Skipping git pull (--dry-run)."
  elif [[ -e "$SCRIPT_DIR/.git" ]]; then
    if [[ -n "$(git -C "$SCRIPT_DIR" status --porcelain 2>/dev/null || true)" ]]; then
      echo "Warning: local clone ($SCRIPT_DIR) has uncommitted changes; skipping git pull --ff-only." >&2
    else
      echo "Pulling latest updates in $SCRIPT_DIR..."
      if ! git -C "$SCRIPT_DIR" pull --ff-only; then
        echo "Warning: git pull --ff-only failed; continuing with local repository files (use --no-pull to skip)." >&2
      fi
    fi
  fi
fi

REPO_VERSION="$(get_repo_version)"

SKILL_DESTS=()
AGENT_DESTS=()
TARGET_MODES=()

resolve_explicit_targets() {
  if [[ "$MODE" == "global" ]]; then
    case "$TARGET" in
      antigravity)
        add_unique_target "$HOME/.gemini/config/skills" "$HOME/.gemini/config/agents" "global"
        ;;
      orca)
        add_unique_target "$HOME/.agents/skills" "$HOME/.agents/agents" "global"
        ;;
      all)
        add_unique_target "$HOME/.gemini/config/skills" "$HOME/.gemini/config/agents" "global"
        add_unique_target "$HOME/.agents/skills" "$HOME/.agents/agents" "global"
        ;;
    esac
  elif [[ "$MODE" == "project" ]]; then
    if [[ ! -d "$TARGET_REPO" ]]; then
      echo "Error: Target project directory does not exist: $TARGET_REPO" >&2
      exit 1
    fi
    ABS_REPO="$(cd "$TARGET_REPO" && pwd)"
    add_unique_target "$ABS_REPO/.agents/skills" "$ABS_REPO/.agents/agents" "project"
  fi
}

if [[ "$ACTION" == "check" ]]; then
  if [[ "$HAS_EXPLICIT_TARGET" -eq 1 ]]; then
    resolve_explicit_targets
  else
    add_unique_target "$HOME/.gemini/config/skills" "$HOME/.gemini/config/agents" "global"
    add_unique_target "$HOME/.agents/skills" "$HOME/.agents/agents" "global"
    add_unique_target "$(pwd)/.agents/skills" "$(pwd)/.agents/agents" "project"
  fi

  bundled_count="$(count_neon_skills "$SKILLS_SRC")"
  echo "neonskill local repo version: v$REPO_VERSION ($bundled_count bundled skills)"
  echo ""

  any_installed=0
  needs_update=0
  for idx in "${!SKILL_DESTS[@]}"; do
    SKILL_DEST="${SKILL_DESTS[$idx]}"
    AGENT_DEST="${AGENT_DESTS[$idx]}"
    count="$(count_neon_skills "$SKILL_DEST")"
    echo "Target: $SKILL_DEST"
    if [[ "$count" -eq 0 ]]; then
      echo "  status:    not installed"
      continue
    fi
    any_installed=1
    meta_file="$SKILL_DEST/$META_FILENAME"
    installed_ver="$(read_meta_field "$meta_file" "version" || true)"
    updated_at="$(read_meta_field "$meta_file" "updatedAt" || true)"
    link_mode="copy"
    if target_uses_symlinks "$SKILL_DEST"; then
      link_mode="symlink"
    fi

    if [[ -z "$installed_ver" ]]; then
      echo "  version:   unknown (legacy — no $META_FILENAME) [outdated -> v$REPO_VERSION]"
      needs_update=1
    elif [[ "$installed_ver" != "$REPO_VERSION" ]]; then
      echo "  version:   v$installed_ver (local repo is v$REPO_VERSION)"
      needs_update=1
    else
      echo "  version:   v$installed_ver (matches local repo v$REPO_VERSION)"
    fi
    echo "  installed: $count/$bundled_count skills ($link_mode)"
    if [[ -e "$AGENT_DEST/verifier.md" || -L "$AGENT_DEST/verifier.md" ]]; then
      echo "  agent:     verifier.md present"
    else
      echo "  agent:     verifier.md not installed"
    fi
    if [[ -n "$updated_at" ]]; then
      echo "  updatedAt: $updated_at"
    fi
  done

  echo ""
  if [[ "$any_installed" -eq 0 ]]; then
    echo "No neonskill installations found. Install with --global, --orca, --target all, or --project."
  elif [[ "$needs_update" -eq 1 ]]; then
    echo "Update available. Run: ./install.sh --update"
  else
    echo "All installed targets match v$REPO_VERSION."
  fi
  exit 0
fi

if [[ "$ACTION" == "update" && "$HAS_EXPLICIT_TARGET" -eq 0 ]]; then
  if has_neon_skills "$HOME/.gemini/config/skills"; then
    add_unique_target "$HOME/.gemini/config/skills" "$HOME/.gemini/config/agents" "global"
  fi
  if has_neon_skills "$HOME/.agents/skills"; then
    add_unique_target "$HOME/.agents/skills" "$HOME/.agents/agents" "global"
  fi
  if has_neon_skills "$(pwd)/.agents/skills"; then
    add_unique_target "$(pwd)/.agents/skills" "$(pwd)/.agents/agents" "project"
  fi
  if [[ "${#SKILL_DESTS[@]}" -eq 0 ]]; then
    echo "No existing neonskill installations found in ~/.gemini/config/skills, ~/.agents/skills, or $(pwd)/.agents/skills."
    echo "Install first with --global, --orca, --target all, or --project."
    exit 0
  fi
else
  if [[ -z "$MODE" ]]; then
    usage
    exit 1
  fi
  resolve_explicit_targets
fi

for idx in "${!SKILL_DESTS[@]}"; do
  SKILL_DEST="${SKILL_DESTS[$idx]}"
  AGENT_DEST="${AGENT_DESTS[$idx]}"
  TARGET_MODE="${TARGET_MODES[$idx]}"

  if [[ "$ACTION" == "uninstall" ]]; then
    echo "${PREFIX}Removing skills ($TARGET_MODE) from $SKILL_DEST"
    for skill_dir in "$SKILLS_SRC"/neon-*; do
      name="$(basename "$skill_dir")"
      dst="$SKILL_DEST/$name"
      if [[ ! -e "$dst" && ! -L "$dst" ]]; then
        echo "  skip (not installed) $name"
      elif [[ "$DRY_RUN" -eq 1 ]]; then
        echo "  would remove $name -> $dst"
      else
        rm -rf "$dst"
        echo "  removed $name -> $dst"
      fi
    done

    if [[ "$NO_AGENTS" -eq 0 && -d "$AGENTS_SRC" ]]; then
      echo "${PREFIX}Removing agents ($TARGET_MODE) from $AGENT_DEST"
      for agent_file in "$AGENTS_SRC"/*.md; do
        [[ -e "$agent_file" ]] || continue
        name="$(basename "$agent_file")"
        dst="$AGENT_DEST/$name"
        if [[ ! -e "$dst" && ! -L "$dst" ]]; then
          echo "  skip (not installed) $name"
        elif [[ "$DRY_RUN" -eq 1 ]]; then
          echo "  would remove $name -> $dst"
        else
          rm -f "$dst"
          echo "  removed $name -> $dst"
        fi
      done
    fi

    meta_file="$SKILL_DEST/$META_FILENAME"
    if [[ -e "$meta_file" || -L "$meta_file" ]]; then
      if [[ "$DRY_RUN" -eq 1 ]]; then
        echo "  would remove $META_FILENAME -> $meta_file"
      else
        rm -f "$meta_file"
        echo "  removed $META_FILENAME -> $meta_file"
      fi
    fi
  else
    target_symlink="$USE_SYMLINK"
    if [[ "$ACTION" == "update" && "$USE_SYMLINK" -eq 0 && "$FORCE_COPY" -eq 0 ]]; then
      if target_uses_symlinks "$SKILL_DEST"; then
        target_symlink=1
      fi
    fi

    if [[ "$ACTION" == "update" ]]; then
      verb="Updating"
      done_verb="updated"
      would_verb="would update"
    else
      verb="Installing"
      done_verb="installed"
      would_verb="would install"
    fi

    echo "${PREFIX}${verb} skills (v${REPO_VERSION}, $TARGET_MODE) -> $SKILL_DEST"
    if [[ "$DRY_RUN" -eq 0 ]]; then
      mkdir -p "$SKILL_DEST"
    fi
    for skill_dir in "$SKILLS_SRC"/neon-*; do
      name="$(basename "$skill_dir")"
      dst="$SKILL_DEST/$name"
      if [[ "$DRY_RUN" -eq 1 ]]; then
        if [[ "$target_symlink" -eq 1 ]]; then
          echo "  would link $name -> $dst"
        else
          echo "  ${would_verb} $name -> $dst"
        fi
      else
        rm -rf "$dst"
        if [[ "$target_symlink" -eq 1 ]]; then
          ln -s "$skill_dir" "$dst"
          echo "  linked $name -> $dst"
        else
          cp -Rp "$skill_dir" "$dst"
          echo "  ${done_verb} $name -> $dst"
        fi
      fi
    done

    if [[ "$NO_AGENTS" -eq 0 && -d "$AGENTS_SRC" ]]; then
      echo "${PREFIX}${verb} agents ($TARGET_MODE) -> $AGENT_DEST"
      if [[ "$DRY_RUN" -eq 0 ]]; then
        mkdir -p "$AGENT_DEST"
      fi
      for agent_file in "$AGENTS_SRC"/*.md; do
        [[ -e "$agent_file" ]] || continue
        name="$(basename "$agent_file")"
        dst="$AGENT_DEST/$name"
        if [[ "$DRY_RUN" -eq 1 ]]; then
          if [[ "$target_symlink" -eq 1 ]]; then
            echo "  would link $name -> $dst"
          else
            echo "  ${would_verb} $name -> $dst"
          fi
        else
          rm -rf "$dst"
          if [[ "$target_symlink" -eq 1 ]]; then
            ln -s "$agent_file" "$dst"
            echo "  linked $name -> $dst"
          else
            cp "$agent_file" "$dst"
            echo "  ${done_verb} $name -> $dst"
          fi
        fi
      done
    fi

    meta_file="$SKILL_DEST/$META_FILENAME"
    if [[ "$DRY_RUN" -eq 1 ]]; then
      echo "  would write $META_FILENAME (v${REPO_VERSION}) -> $meta_file"
    else
      write_meta "$SKILL_DEST" "$AGENT_DEST" "$REPO_VERSION"
      echo "  wrote $META_FILENAME (v${REPO_VERSION}) -> $meta_file"
    fi
  fi
done

if [[ "$NO_AGENTS" -eq 1 ]]; then
  echo "${PREFIX}Skipped agents (--no-agents)."
fi

if [[ "$DRY_RUN" -eq 1 ]]; then
  echo "Dry-run complete. No files were written or deleted."
elif [[ "$ACTION" == "uninstall" ]]; then
  echo "Uninstall complete."
else
  echo "Done (v${REPO_VERSION}). Open a new thread/session in Antigravity, T3 Code, or Orca to load the updated skills & @verifier agent."
fi
