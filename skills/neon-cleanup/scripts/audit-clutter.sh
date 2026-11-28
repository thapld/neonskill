#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Usage:
  audit-clutter.sh [repo-path]

Read-only workspace clutter audit. Makes zero file modifications.
Summarizes git status, root files & scattered plans/docs, agent steering files,
suspect probe/debug/QA/stray test files, and stray logs/media/HTML reports.
EOF
}

if [[ $# -gt 1 ]]; then
  usage >&2
  exit 1
fi

if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
  usage
  exit 0
fi

TARGET_RAW="${1:-.}"
if [[ ! -d "$TARGET_RAW" ]]; then
  echo "Error: Target directory does not exist: $TARGET_RAW" >&2
  exit 1
fi

TARGET_DIR="$(cd "$TARGET_RAW" && pwd)"
cd "$TARGET_DIR"

print_list() {
  local count=0
  local line=""
  while IFS= read -r line; do
    [[ -z "$line" ]] && continue
    printf '  %s\n' "$line"
    count=$((count + 1))
  done
  if [[ "$count" -eq 0 ]]; then
    printf '  (none)\n'
  fi
}

echo "=== Neon Cleanup Read-Only Audit: $TARGET_DIR ==="

echo ""
echo "1. Git status (untracked & modified):"
if command -v git >/dev/null 2>&1 && git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  { git status --untracked-files=all --short -- . 2>/dev/null || true; } | print_list
else
  echo "  (not a git repository)"
fi

echo ""
echo "2. Root-level files & scattered Markdown docs/plans:"
echo "  [root-level files]"
{
  find . -maxdepth 1 -type f ! -name '.git' 2>/dev/null \
    | sed 's|^\./||' \
    | LC_ALL=C sort -u || true
} | print_list
echo "  [scattered *.md outside docs/ matching PLAN|SPEC|TODO|NOTES|SUMMARY|REPORT|HANDOFF|SCRATCH|PROPOSAL|DESIGN]"
{
  find . \
    \( -name '.git' -o -name 'node_modules' -o -name 'dist' -o -name 'build' -o -name '.next' -o -name 'target' -o -name 'vendor' -o -name '.venv' -o \( -type d -name 'docs' \) \) -prune \
    -o -type f -iname '*.md' -print 2>/dev/null \
    | sed 's|^\./||' \
    | grep -iE '(^|/)[^/]*(PLAN|SPEC|TODO|NOTES|SUMMARY|REPORT|HANDOFF|SCRATCH|PROPOSAL|DESIGN)[^/]*\.md$' \
    | LC_ALL=C sort -u || true
} | print_list

echo ""
echo "3. Agent steering/config files:"
{
  find . \
    \( -name '.git' -o -name 'node_modules' -o -name 'dist' -o -name 'build' -o -name '.next' -o -name 'target' -o -name 'vendor' -o -name '.venv' \) -prune \
    -o \( \
      \( -type f \( -name 'AGENTS.md' -o -name 'GEMINI.md' -o -name 'NEON.md' -o -name 'CLAUDE.md' -o -name '.cursorrules' \) -print \) \
      -o \( -type d \( -name '.agents' -o -name '.claude' -o -name '.cursor' -o -name '.windsurf' \) -exec sh -c 'for d; do printf "%s/\n" "$d"; done' _ {} + -prune \) \
    \) 2>/dev/null \
    | sed 's|^\./||' \
    | LC_ALL=C sort -u || true
} | print_list

echo ""
echo "4. Suspect probe/debug/QA/scratch/repro items & *test* outside canonical top-level test dirs:"
{
  {
    find . \
      \( -name '.git' -o -name 'node_modules' -o -name 'dist' -o -name 'build' -o -name '.next' -o -name 'target' -o -name 'vendor' -o -name '.venv' -o -name '.cache' -o -name '__pycache__' -o -name '.turbo' -o -name '.pytest_cache' \) -prune \
      -o \( -iname '*probe*' -o -iname '*qa_*' -o -iname '*tmp_*' -o -iname '*debug*' -o -iname '*repro*' -o -iname '*scratch*' \) -print 2>/dev/null || true
    find . \
      \( -name '.git' -o -name 'node_modules' -o -name 'dist' -o -name 'build' -o -name '.next' -o -name 'target' -o -name 'vendor' -o -name '.venv' -o -name '.cache' -o -name '__pycache__' -o -name '.turbo' -o -name '.pytest_cache' -o \( -type d \( -path './test' -o -path './tests' -o -path './__tests__' -o -path './spec' -o -path './specs' -o -path './e2e' \) \) \) -prune \
      -o -iname '*test*' -print 2>/dev/null || true
  } | sed 's|^\./||' | LC_ALL=C sort -u || true
} | print_list

echo ""
echo "5. Stray logs, screenshots, or standalone HTML reports (outside public/, assets/, docs/, src/):"
{
  find . \
    \( -name '.git' -o -name 'node_modules' -o -name 'dist' -o -name 'build' -o -name '.next' -o -name 'target' -o -name 'vendor' -o -name '.venv' -o -name '.cache' -o -name '__pycache__' -o \( -type d \( -name 'public' -o -name 'assets' -o -name 'docs' -o -name 'src' \) \) \) -prune \
    -o -type f \( -iname '*.log' -o -iname '*.png' -o -iname '*.jpg' -o -iname '*.jpeg' -o -iname '*.html' \) -print 2>/dev/null \
    | sed 's|^\./||' \
    | LC_ALL=C sort -u || true
} | print_list
