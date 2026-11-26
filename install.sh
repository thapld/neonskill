#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILLS_SRC="$SCRIPT_DIR/skills"

usage() {
  cat <<'EOF'
Usage:
  ./install.sh --global                  Install into ~/.gemini/config/skills (Antigravity / T3 Code)
  ./install.sh --orca                    Install into ~/.agents/skills (Orca shared universal folder)
  ./install.sh --target <t>              Target for global install: antigravity | orca | universal | all
  ./install.sh --project [repo-path]     Install into <repo-path>/.agents/skills (default: .)
  ./install.sh --symlink --global        Symlink instead of copy (for local development)
EOF
}

MODE=""
TARGET="antigravity"
TARGET_REPO=""
USE_SYMLINK=0

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

DESTS=()
if [[ "$MODE" == "global" ]]; then
  case "$TARGET" in
    antigravity) DESTS=("$HOME/.gemini/config/skills") ;;
    orca)        DESTS=("$HOME/.agents/skills") ;;
    all)         DESTS=("$HOME/.gemini/config/skills" "$HOME/.agents/skills") ;;
  esac
elif [[ "$MODE" == "project" ]]; then
  if [[ ! -d "$TARGET_REPO" ]]; then
    echo "Error: Target project directory does not exist: $TARGET_REPO" >&2
    exit 1
  fi
  DESTS=("$(cd "$TARGET_REPO" && pwd)/.agents/skills")
else
  usage
  exit 1
fi

for DEST in "${DESTS[@]}"; do
  mkdir -p "$DEST"
  for skill_dir in "$SKILLS_SRC"/neon-*; do
    name="$(basename "$skill_dir")"
    target="$DEST/$name"
    rm -rf "$target"
    if [[ "$USE_SYMLINK" -eq 1 ]]; then
      ln -s "$skill_dir" "$target"
      echo "Linked $name -> $target"
    else
      cp -R "$skill_dir" "$target"
      echo "Installed $name -> $target"
    fi
  done
done

echo "Done. Open a new thread/session in Antigravity, T3 Code, or Orca to load the updated skills."
