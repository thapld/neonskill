#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILLS_SRC="$SCRIPT_DIR/skills"

usage() {
  cat <<'EOF'
Usage:
  ./install.sh --global                  Install into ~/.gemini/config/skills (all projects)
  ./install.sh --project [repo-path]     Install into <repo-path>/.agents/skills (default: .)
  ./install.sh --symlink --global        Symlink instead of copy (for local development)
EOF
}

MODE=""
TARGET_REPO=""
USE_SYMLINK=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --global|-g)
      MODE="global"
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

if [[ "$MODE" == "global" ]]; then
  DEST="$HOME/.gemini/config/skills"
elif [[ "$MODE" == "project" ]]; then
  if [[ ! -d "$TARGET_REPO" ]]; then
    echo "Error: Target project directory does not exist: $TARGET_REPO" >&2
    exit 1
  fi
  DEST="$(cd "$TARGET_REPO" && pwd)/.agents/skills"
else
  usage
  exit 1
fi

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

echo "Done. Open a new thread in Antigravity / T3 Code to load the updated skills."
