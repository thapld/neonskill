#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILLS_SRC="$SCRIPT_DIR/skills"

usage() {
  cat <<'EOF'
Usage:
  ./install.sh --global                 Install into ~/.gemini/config/skills (all projects)
  ./install.sh --project <repo-path>    Install into <repo-path>/.agents/skills (project-local)
  ./install.sh --symlink --global       Symlink instead of copy (for local development)
EOF
}

MODE=""
TARGET_REPO=""
USE_SYMLINK=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --global)
      MODE="global"
      shift
      ;;
    --project)
      MODE="project"
      TARGET_REPO="${2:-}"
      shift 2
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
elif [[ "$MODE" == "project" && -n "$TARGET_REPO" ]]; then
  DEST="$TARGET_REPO/.agents/skills"
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

echo "Done. Restart or open a new thread in Antigravity / T3 Code to load the updated skills."
