---
name: neon-cleanup
description: Read-only audit of repo clutter (agent debris, scattered plans/docs, overlapping steering files, misplaced tests, stray logs/reports), 3-bucket cleanup plan with approval gate, safe checkpointed execution + verification, and handoff to neon-init.
---

# Neon Cleanup (Audit → Plan → Safe Clean → Standardize)

Declutter an existing or messy repository before standardizing it with `neon-init` (recommended model: **Gemini 4 Neon · HIGH**).

1. **Read-only Audit — touch nothing first**:
   - Run this skill's bundled read-only script `scripts/audit-clutter.sh` against the repo root (if the script is unavailable in the current environment, run equivalent read-only `git status --untracked-files=all --short` and `find` scans). Make **zero** file edits or deletions during this step.
   - Cross-check every candidate against `package.json` scripts/config, CI workflows (`.github/workflows/`), `Makefile`, and codebase imports/references (`rg` or `grep`) before recommending deletion.
   - Identify the repo's canonical test directory (e.g., `tests/`, `test/`, `__tests__/`, `spec/`, `e2e/`, or configured test root) and exact `<TEST_CMD>`.
2. **3-Bucket Cleanup Plan & Approval Gate**:
   - Present a concise table with columns **`path` | `tracked/untracked` | `reference check` | `action`** organized into 3 buckets (plus an explicit **Ask / Keep** bucket for anything ambiguous, referenced by CI/scripts, or intentionally kept):
     - **Delete**: unreferenced debris (one-off `*probe*`, `*qa_*`, `*tmp_*`, `*debug*`, `*repro*`, `*scratch*` files, stray `*.log`, screenshots, or standalone HTML reports outside `public/`/`assets/`/`docs/`/`src/`).
     - **Consolidate / Archive**: scattered docs/plans (`PLAN*.md`, `SPEC*.md`, `TODO*.md`, `NOTES*.md`, `SUMMARY*.md`, `REPORT*.md`, `HANDOFF*.md`, etc.) → distill durable architectural decisions into `DECISIONS.md` and archive stale docs to `docs/archive/` (or delete if obsolete); merge overlapping agent steering files (`GEMINI.md`, `NEON.md`, `CLAUDE.md`, `.cursorrules`, `.claude/`, `.cursor/`, `.windsurf/`) into a single concise static `AGENTS.md` (no YAML frontmatter).
     - **Move & Re-verify**: misplaced legitimate tests found outside the canonical test root → move into the canonical test directory and update imports/test config if needed.
   - **Approval Gate**: Stop and wait for explicit user approval before editing, moving, or deleting any file.
3. **Execute Safely & Verify**:
   - Create a safety checkpoint first: a dedicated cleanup branch/worktree, or a clean baseline commit/stash for tracked state. **Never touch `.env*` or secrets.**
   - Apply **only** the user-approved actions (delete, consolidate/archive, move + update imports).
   - Run `<TEST_CMD>` (plus lint, typecheck, and build if configured) and paste **actual output (≥ 20 lines, or full output with explicit note if shorter)** — never claim a pass without pasted command proof.
4. **Standardize & Lock Hygiene**:
   - Hand off to `neon-init` to finalize a concise static `AGENTS.md` (including **Test & Scratch Hygiene**), `DECISIONS.md`, `.gitignore` (`HANDOFF.md`, `SPEC.md` if unversioned, log/scratch patterns), and a deterministic pre-commit or CI directory-allowlist check so clutter does not return.
   - Optionally note `improve-codebase-architecture` if deeper code/module refactoring beyond workspace, doc, and steering hygiene is also desired.
