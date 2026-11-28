---
name: neon-ship
description: Filter temporary working files, finalize docs (README, 3-line CHANGELOG, UI strings) on the final diff, commit, push, open a draft PR with pasted test output, and optionally suggest v2 ideas and one workflow improvement.
---

# Neon Ship (Docs + Draft PR)

Deliver a verified diff following `AGENTS.md` (or `NEON.md`) rules (recommended model: **Gemini 4 Hydrogen · LOW/MEDIUM**, or **Neon · LOW**).

1. **Pre-flight & clean staging**:
   - Inspect `git status` and `git diff <base>...HEAD`.
   - Exclude temporary working files (`HANDOFF.md`, and `SPEC.md` unless `AGENTS.md` or the user explicitly keeps specs in git). Never commit secrets or `.env*`.
   - Run `<TEST_CMD>` one final time on the clean diff and capture actual output (at least the last 20 lines).
2. **Final docs on final diff**:
   - Update `README.md` if user-facing setup, usage, or API changed.
   - Add a **3-line changelog entry** in `CHANGELOG.md` (create if appropriate, or include in the PR body if the repo has no changelog).
   - Check new/changed UI strings for consistency.
3. **Commit, push & open Draft PR**:
   - Stage **explicit file paths** (never blind `git add .` / `git add -A`) and commit cleanly.
   - For multiline commit messages or PR bodies (especially in **Orca**), write to a file and pass `git commit -F <file>` / `gh pr create --body-file <file>` — never use heredocs (`<<`) or here-strings (`<<<`).
   - Push the branch and open a **draft PR** (`pull_request_create` with `draft: true`, or `gh pr create --draft`) including a **Merge-Danger Call** (`One-way door` e.g. DB migration / breaking API vs `Two-way door` / easily reversible, plus blast radius), the pasted test output, and the 3-line changelog summary.
   - Link the PR to your harness: in **T3 Code**, call `link_pull_request` right away if created via `gh` (`pull_request_create` links automatically); in **Orca**, attach it to the worktree (`orca worktree set --worktree active --pr <number> --workspace-status completed --json` or `orca reference add <pr-url> --worktree active --json`).
   - Never merge or push directly to `main` unless explicitly asked.
4. **Post-PR optional follow-ups** (non-blocking — output after the Draft PR is opened; never modify files or reopen scope without approval):
   - **`IMPROVE`**: name the single step that caused the most friction/retries in this run and classify it first — if **mechanical** (banned API, fixed pattern, import/file-location rule), propose **1 deterministic check** (lint rule, pre-commit hook, or CI check) instead of bloating `AGENTS.md`; reserve **`AGENTS.md`** tweaks strictly for judgment calls (apply only if the user says yes).
   - **`ITERATE`** *(for new features)*: briefly list up to **3 high-impact ideas for v2** from a first-time user's perspective, ready if the user chooses to iterate next.
