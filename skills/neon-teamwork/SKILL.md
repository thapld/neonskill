---
name: neon-teamwork
description: Orchestrate parallel SPEC.md execution by choosing the right engine—Antigravity /teamwork (multi-milestone), native Antigravity swarm (shared board + @verifier), or T3 Code delegate_task worktrees—with dynamic capability/cost checks, cross-model review, dependency-ordered merges, and single-writer HANDOFF.md tracking.
---

# Neon Teamwork (Parallel & Multi-Milestone Orchestrator)

Coordinate parallel or large-scale `SPEC.md` execution (recommended coordinator: **Gemini 4 Neon · HIGH**).

## 1. Engine Selection, Pre-flight & Cost Guard
1. Read `AGENTS.md` (and `NEON.md` if present), `DECISIONS.md`, and `SPEC.md`.
   - If `SPEC.md` does not exist yet, run `neon-plan` first and stop for user OK.
2. Pick the right execution engine for the shape of `SPEC.md`:
   - **Long multi-milestone project (hours–days, multiple milestones/phases)**: Do **not** force into manual `delegate_task` waves. Output a ready-to-paste Antigravity `/teamwork` command so the user invokes Antigravity's sentinel + orchestrator + critic/challenger/auditor gates:
     `/teamwork <goal> — follow SPEC.md and AGENTS.md`
   - **Wide parallel work inside Antigravity (shared board, same provider)**: When the user requests swarm mode or `delegate_task` is unavailable, use Antigravity's native `swarm` tool (`workspace: "share"` when edits may overlap, named workers on `gemini-4-hydrogen`, plus a read-only `@verifier` on `gemini-4-neon`), or suggest `/swarm <task>`.
   - **Isolated parallel worktrees in T3 Code (separate branches/ports/DBs or cross-provider Claude/Codex)**: Continue with the `delegate_task` (`isolation: "worktree"`) workflow below.
3. Check slice boundaries in `SPEC.md`:
   - Parallel slices **must** touch disjoint files (and use distinct ports/DBs when running services).
   - Serialize overlapping or schema/API-dependent slices into sequential waves.
4. **Phase 0 (Read-only Discovery, optional for large/unfamiliar repos)**:
   - Dispatch read-only `research` subagents to verify file boundaries and `path:line` assumptions before spawning write workers.
5. Call `orchestrator_capabilities` once to read actual available providers, models, and option keys/values (never hardcode unavailable options or switch providers unasked).
6. **Cost Guard**:
   - Warn the user before launching a wide parallel wave (4–5x quota burn) or `XHIGH` fan-out, and suggest checking `/usage` before long runs.

## 2. Spawn Parallel Slice Workers (T3 Code Worktree Mode)
For each independent slice in the current wave, launch `delegate_task` with:
- **Isolation**: `isolation: "worktree"` (each slice gets its own worktree and branch).
- **Target**: `providerInstanceId: "antigravity"`, `model: "gemini-4-hydrogen"`, using the verified thinking option from `orchestrator_capabilities` (default `medium`; use `high` or `gemini-4-neon` only for unusually complex slices).
- **Brief** (include all fields in `task`):
  - **GOAL**: one sentence for this slice (strict proof-driven completion: `<TEST_CMD>` passes + new test, matching `/goal` discipline).
  - **CONTEXT**: `AGENTS.md`/`NEON.md`, `DECISIONS.md`, `SPEC.md` section, exact files owned by this slice.
  - **DONE WHEN**: `<TEST_CMD>` passes and a new test covers the change.
  - **DO NOT**: explicitly list off-limits files/directories, plus: *"Do the work yourself; do not start subagents; do not edit `HANDOFF.md`; no TODOs/stubs; never loosen or skip tests."*
  - **RETURN**: changed files (`file:line`), **pasted test output** (at least last 20 lines, not summarized), branch/worktree info, and blockers/open doubts.

## 3. Verify Every Worker & Track State (Single-Writer `HANDOFF.md`)
- Wait for all workers in the wave to complete (follow `next`; never poll).
- Never trust an idle batch alone: inspect each worker's output individually for real passing `<TEST_CMD>`, new tests, and zero stub/test-loosening violations.
- **Single-writer rule**: only the coordinator updates `HANDOFF.md` (kept untracked) after each wave with completed slices and any blockers (`what failed` + `next fix`).
- If a worker fails twice on the same assumption, step back and check whether `SPEC.md` is flawed (or escalate a hard isolated bug to `/boost`) before retrying.

## 4. Integration Merge (In Dependency Order)
1. Create or checkout the integration branch (e.g., `feat/<feature>` from default base).
2. Merge each slice branch one by one in dependency order.
3. Run the full `<TEST_CMD>` after **each** merge; resolve integration issues immediately before merging the next slice.

## 5. Combined Diff Review & Fix Gate
1. Spawn a **fresh** `delegate_task` reviewer running `neon-review` on the integration branch against `SPEC.md` (`git diff <base>...HEAD`, not builder summaries).
   - **Cross-model verifier default**: workers on `gemini-4-hydrogen`, reviewer on `antigravity` → `gemini-4-neon` (`high` by default; escalate to `xhigh` if `high` fails, on high-risk domains like auth/billing/migrations/concurrency, or final re-review).
   - Use a cross-provider verifier (`claudeAgent` / `codex`) **only** if explicitly requested by the user or configured in `AGENTS.md`.
2. If `severity 1–2` findings exist:
   - Fix small ones directly or delegate `neon-fix` (`gemini-4-hydrogen` · `medium`/`high`), always writing a failing test first without loosening existing tests.
   - Re-verify with a fresh review delegate, capped at **3 rounds**. If the same issue recurs across 2+ rounds, re-check `SPEC.md` and consider recommending `/boost` for hard bugs. If severity 1–2 issues remain after round 3, log blockers in `HANDOFF.md`, stop, and report to the user.

## 6. Final Delivery
- Once `severity 1–2` count is `0`, run `neon-ship`.
