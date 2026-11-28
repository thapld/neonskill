---
name: neon-teamwork
description: Orchestrate parallel SPEC.md execution across 4 engines—Antigravity /teamwork (multi-milestone), native Antigravity swarm (shared board + @verifier), Orca orchestration (worker-start + worktree DAG), or T3 Code delegate_task worktrees—with dynamic capability/cost checks, cross-model review, dependency-ordered merges, and single-writer HANDOFF.md tracking.
---

# Neon Teamwork (Parallel & Multi-Milestone Orchestrator)

Coordinate parallel or large-scale `SPEC.md` execution (recommended coordinator: **Gemini 4 Neon · HIGH**).

## 1. Engine Selection, Pre-flight & Cost Guard
1. Read `AGENTS.md` (and `NEON.md` if present), `DECISIONS.md`, and `SPEC.md`.
   - If `SPEC.md` does not exist yet, run `neon-plan` first and stop for user OK.
2. Pick the right execution engine for your runtime and `SPEC.md` shape:
   - **Long multi-milestone project in Antigravity (hours–days)**: Do **not** force into manual `delegate_task` waves. Output a ready-to-paste `/teamwork` command so the user invokes Antigravity's sentinel + orchestrator + critic/challenger/auditor gates:
     `/teamwork <goal> — follow SPEC.md and AGENTS.md`
   - **Wide parallel work via Antigravity native `swarm`**: Only when the user asks for `/swarm` or swarm mode (or when running natively in Antigravity — never silently fall back from `delegate_task` in T3 Code), follow `native_swarm` rules:
     - Leave `model` unset so workers inherit your model unless the user explicitly requests another model (e.g., a different model for `@verifier`).
     - Give editing authors `workspace: "share"` and require them to commit before posting `[done]`; run the bundled read-only `@verifier` (`agents/verifier.md`) on `workspace: "inherit"` in a fresh context (ideally on a different model) to audit test files first and verify every `file:line` + `<TEST_CMD>` before posting `PASS`.
     - Coordinator never writes code; remember board tools arrive one turn after the first `swarm add`; **always land/merge a worker's commit BEFORE calling `kill`** (`kill` permanently deletes its workspace).
   - **Orca parallel worktrees & agents (`orca-cli` + `orchestration`)**: When running inside Orca (or the user asks to spawn Orca workers/worktrees), use **Section 2B (Orca Orchestration Mode)** below.
   - **Isolated parallel worktrees in T3 Code (separate branches/ports/DBs or cross-provider Claude/Codex)**: Use **Section 2A (T3 Code Worktree Mode)** below.
3. Check slice boundaries in `SPEC.md`:
   - Parallel slices **must** touch disjoint files (and use distinct ports/DBs when running services).
   - Serialize overlapping or schema/API-dependent slices into sequential waves.
4. **Phase 0 (Read-only Discovery, optional for large/unfamiliar repos)**:
   - Run a read-only audit `/swarm` (or dispatch read-only `research` subagents) first on unfamiliar repos to verify file boundaries and return a **ranked summary with `path:line` for every finding** before granting write ownership or spawning write workers.
5. **Capability & Cost Guard**:
   - In T3 Code: call `orchestrator_capabilities` once to read actual available providers, models, and option keys/values (never hardcode unavailable options or switch providers unasked).
   - In Orca: run `ORCA agent installed --json` to verify valid `--agent` IDs (use `--environment local` when running locally).
   - Warn the user before launching a wide parallel wave (4–5x quota burn) or `XHIGH` fan-out (cost curve: `low` 1x, `medium` 2.5x, `high` 5x, `xhigh` 8.6x — ~72% more than `high`; default coordinator/reviewer to **HIGH** and reserve **XHIGH** for stuck/high-risk gates), and suggest checking `/usage` before long runs.
   - Collect non-urgent items requiring user approval (paid installs, migrations, pushes, destructive actions) into **one batch list** instead of interrupting repeatedly.

## 2A. Spawn Parallel Workers — T3 Code Worktree Mode
For each independent slice in the current wave, launch `delegate_task` with:
- **Isolation**: `isolation: "worktree"` (each slice gets its own worktree and branch).
- **Target**: `providerInstanceId: "antigravity"`, `model: "gemini-4-hydrogen"`, using the verified thinking option from `orchestrator_capabilities` (default `medium`; use `high` or `gemini-4-neon` only for unusually complex slices).
- **Brief** (include all fields in `task`):
  - **GOAL**: one sentence for this slice (`<TEST_CMD>` passes + new test, matching `/goal` discipline).
  - **CONTEXT**: `AGENTS.md`/`NEON.md`, `DECISIONS.md`, `SPEC.md` section, exact files owned by this slice.
  - **DONE WHEN**: `<TEST_CMD>` passes and a new test covers the change.
  - **DO NOT**: explicitly list off-limits files/directories, plus: *"Do the work yourself; do not start subagents; do not edit `HANDOFF.md`; no TODOs/stubs; never loosen or skip tests."*
  - **RETURN**: changed files (`file:line`), **pasted test output** (at least last 20 lines, not summarized), branch/worktree info, and blockers/open doubts.

## 2B. Spawn Parallel Workers — Orca Orchestration Mode
Load Orca's `orchestration` guide (`ORCA skills get orchestration`) and resolve the CLI (`ORCA_CLI_COMMAND` / `orca-dev` / `orca-ide` / `orca` — never bare `orca` on Linux outside an Orca terminal):
- **Fire-and-forget handoff** (no result expected back): run `ORCA worktree create --name <slice> --no-parent --agent <id> --prompt "<brief>" --json` and stop (`task-create` is forbidden for full handoffs).
- **Supervised parallel slices**:
  1. Create a Run (`ORCA orchestration run-create --json`) and Tasks (`task-create`) if tracking a DAG, or launch up to ~4 independent workers in one shell command (`ORCA orchestration worker-start --environment local --spec "<brief>" --worktree new-child --name <slice> --agent <id> --json`; write multiline specs to a file and pass `--spec-file`, never heredocs `<<` / `<<<`; only pass `--model` if the user named one).
  2. Include the same `GOAL / CONTEXT / DONE WHEN / DO NOT / RETURN` brief in `--spec`.
  3. **End your turn** to wait — Orca wakes you on `worker_done` or `escalation`. **Never poll** (`check` loops) and never steer or read via `terminal send` (`orchestration send --to dispatch:<id>` and `worker-read` only).
  4. When settled, release finished worker terminals (`ORCA orchestration worker-release --dispatch <id>`) or `--keep-open` if the user wants to inspect them.

## 3. Verify Every Worker & Track State (Single-Writer `HANDOFF.md`)
- Wait for all workers in the wave to complete (follow `next`; never poll).
- Never trust an idle batch alone: inspect each worker's output individually (`worker-read` in Orca) for real passing `<TEST_CMD>`, new tests, and zero stub/test-loosening violations.
- **Single-writer rule**: only the coordinator updates `HANDOFF.md` (kept untracked) after each wave with completed slices and any blockers (`what failed` + `next fix`). In Orca, also update the parent worktree card (`ORCA worktree set --worktree active --comment "<wave status>" --json`).
- If a worker fails twice on the same assumption, step back and check whether `SPEC.md` is flawed (or escalate a hard isolated bug to `/boost`) before retrying.

## 4. Integration Merge (In Dependency Order)
1. Create or checkout the integration branch (e.g., `feat/<feature>` from default base).
2. Merge each slice branch one by one in dependency order.
3. Run the full `<TEST_CMD>` after **each** merge; resolve integration issues immediately before merging the next slice.

## 5. Combined Diff Review & Fix Gate
1. Run `neon-review` in a **fresh** reviewer/worker on the integration branch against `SPEC.md` (committed + uncommitted diff, never builder summaries).
   - **T3 Code cross-model default**: workers on `gemini-4-hydrogen`, reviewer on `antigravity` → `gemini-4-neon` (`high` by default; escalate to `xhigh` if `high` fails, on high-risk domains like auth/billing/migrations/concurrency, or final re-review). Use `claudeAgent` / `codex` only if requested by the user or configured in `AGENTS.md`.
   - **Orca**: start a fresh reviewer worker (`worker-start --worktree current --agent <id>`) leaving `--model` unset unless the user named one.
2. If `severity 1–2` findings exist:
   - Fix small ones directly or delegate `neon-fix`, always writing a failing test first without loosening existing tests.
   - Re-verify with a fresh review, capped at **3 rounds**. If the same issue recurs across 2+ rounds, re-check `SPEC.md` and consider recommending `/boost` for hard bugs. If severity 1–2 issues remain after round 3, log blockers in `HANDOFF.md`, stop, and report to the user.

## 6. Final Delivery
- Once `severity 1–2` count is `0`, run `neon-ship`.
