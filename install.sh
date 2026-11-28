#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILLS_SRC="$SCRIPT_DIR/skills"
AGENTS_SRC="$SCRIPT_DIR/agents"

usage() {
  cat <<'EOF'
Usage:
  ./install.sh --global                  Install into ~/.gemini/config/{skills,agents} (Antigravity / T3 Code)
  ./install.sh --orca                    Install into ~/.agents/{skills,agents} (Orca shared universal folder)
  ./install.sh --target <t>              Target for global install: antigravity | orca | universal | all
  ./install.sh --project [repo-path]     Install into <repo-path>/.agents/{skills,agents} (default: .)
  ./install.sh --no-agents               Install/uninstall skills only without touching agents/verifier.md
  ./install.sh --uninstall               Remove installed neon-* skills and verifier.md from target(s)
  ./install.sh --dry-run                 Preview actions without writing or deleting files
  ./install.sh --symlink --global        Symlink instead of copy (for local development)
EOF
}

MODE=""
TARGET="antigravity"
TARGET_REPO=""
USE_SYMLINK=0
NO_AGENTS=0
UNINSTALL=0
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

while [[ $# -gt 0 ]]; do
  case "$1" in
    --global|-g)
      MODE="global"
      shift
      ;;
    --orca)
      MODE="global"
      TARGET="orca"
      shift
      ;;
    --target|-t)
      [[ $# -ge 2 ]] || { echo "Error: --target requires a value" >&2; exit 1; }
      MODE="${MODE:-global}"
      TARGET="$(normalize_target "$2")"
      shift 2
      ;;
    --target=*)
      MODE="${MODE:-global}"
      TARGET="$(normalize_target "${1#--target=}")"
      shift
      ;;
    --project|-p)
      MODE="project"
      if [[ $# -ge 2 && "${2:-}" != -* ]]; then
        TARGET_REPO="$2"
        shift 2
      else
        TARGET_REPO="."
        shift 1
      fi
      ;;
    --project=*)
      MODE="project"
      TARGET_REPO="${1#--project=}"
      TARGET_REPO="${TARGET_REPO:-.}"
      shift
      ;;
    --no-agents)
      NO_AGENTS=1
      shift
      ;;
    --uninstall)
      UNINSTALL=1
      shift
      ;;
    --dry-run)
      DRY_RUN=1
      shift
      ;;
    --symlink)
      USE_SYMLINK=1
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

SKILL_DESTS=()
AGENT_DESTS=()
if [[ "$MODE" == "global" ]]; then
  case "$TARGET" in
    antigravity)
      SKILL_DESTS=("$HOME/.gemini/config/skills")
      AGENT_DESTS=("$HOME/.gemini/config/agents")
      ;;
    orca)
      SKILL_DESTS=("$HOME/.agents/skills")
      AGENT_DESTS=("$HOME/.agents/agents")
      ;;
    all)
      SKILL_DESTS=("$HOME/.gemini/config/skills" "$HOME/.agents/skills")
      AGENT_DESTS=("$HOME/.gemini/config/agents" "$HOME/.agents/agents")
      ;;
  esac
elif [[ "$MODE" == "project" ]]; then
  if [[ ! -d "$TARGET_REPO" ]]; then
    echo "Error: Target project directory does not exist: $TARGET_REPO" >&2
    exit 1
  fi
  ABS_REPO="$(cd "$TARGET_REPO" && pwd)"
  SKILL_DESTS=("$ABS_REPO/.agents/skills")
  AGENT_DESTS=("$ABS_REPO/.agents/agents")
else
  usage
  exit 1
fi

PREFIX=""
if [[ "$DRY_RUN" -eq 1 ]]; then
  PREFIX="[dry-run] "
fi

for idx in "${!SKILL_DESTS[@]}"; do
  SKILL_DEST="${SKILL_DESTS[$idx]}"
  AGENT_DEST="${AGENT_DESTS[$idx]}"

  if [[ "$UNINSTALL" -eq 1 ]]; then
    echo "${PREFIX}Removing skills ($MODE) from $SKILL_DEST"
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
      echo "${PREFIX}Removing agents ($MODE) from $AGENT_DEST"
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
  else
    echo "${PREFIX}Installing skills ($MODE) -> $SKILL_DEST"
    if [[ "$DRY_RUN" -eq 0 ]]; then
      mkdir -p "$SKILL_DEST"
    fi
    for skill_dir in "$SKILLS_SRC"/neon-*; do
      name="$(basename "$skill_dir")"
      dst="$SKILL_DEST/$name"
      if [[ "$DRY_RUN" -eq 1 ]]; then
        if [[ "$USE_SYMLINK" -eq 1 ]]; then
          echo "  would link $name -> $dst"
        else
          echo "  would install $name -> $dst"
        fi
      else
        rm -rf "$dst"
        if [[ "$USE_SYMLINK" -eq 1 ]]; then
          ln -s "$skill_dir" "$dst"
          echo "  linked $name -> $dst"
        else
          cp -Rp "$skill_dir" "$dst"
          echo "  installed $name -> $dst"
        fi
      fi
    done

    if [[ "$NO_AGENTS" -eq 0 && -d "$AGENTS_SRC" ]]; then
      echo "${PREFIX}Installing agents ($MODE) -> $AGENT_DEST"
      if [[ "$DRY_RUN" -eq 0 ]]; then
        mkdir -p "$AGENT_DEST"
      fi
      for agent_file in "$AGENTS_SRC"/*.md; do
        [[ -e "$agent_file" ]] || continue
        name="$(basename "$agent_file")"
        dst="$AGENT_DEST/$name"
        if [[ "$DRY_RUN" -eq 1 ]]; then
          if [[ "$USE_SYMLINK" -eq 1 ]]; then
            echo "  would link $name -> $dst"
          else
            echo "  would install $name -> $dst"
          fi
        else
          rm -rf "$dst"
          if [[ "$USE_SYMLINK" -eq 1 ]]; then
            ln -s "$agent_file" "$dst"
            echo "  linked $name -> $dst"
          else
            cp "$agent_file" "$dst"
            echo "  installed $name -> $dst"
          fi
        fi
      done
    fi
  fi
done

if [[ "$NO_AGENTS" -eq 1 ]]; then
  echo "${PREFIX}Skipped agents (--no-agents)."
fi

if [[ "$DRY_RUN" -eq 1 ]]; then
  echo "Dry-run complete. No files were written or deleted."
elif [[ "$UNINSTALL" -eq 1 ]]; then
  echo "Uninstall complete."
else
  echo "Done. Open a new thread/session in Antigravity, T3 Code, or Orca to load the updated skills & @verifier agent."
fi
