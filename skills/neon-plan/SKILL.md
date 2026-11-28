---
name: neon-plan
description: Explore the repo, run an Adaptive Grill interview to lock design decisions into DECISIONS.md, pick the right execution mode, and write SPEC.md before any implementation code. Use at the start of any new feature or complex task.
---

# Neon Plan (`Grill` → `SPEC.md`)

Plan before coding following `AGENTS.md` (or `NEON.md`) rules (recommended model: **Gemini 4 Neon · HIGH**).

1. **Check mode**:
   - If file-edit or terminal tools are unavailable, state `CHAT MODE` and deliver the plan in chat.
2. **Explore & map first** (never ask what the repo already answers):
   - Read `AGENTS.md` (and `NEON.md` if present), `DECISIONS.md`, relevant source files, and test config.
   - On large or unfamiliar repos, run a read-only `/swarm` audit (or read-only `research` subagents) first to map boundaries and risks before granting any write ownership.
   - Draft a **10-line Codebase Map** and **Top 3 Riskiest Files** (`path:line`, 1-based).
3. **Adaptive Grill Gate (BEFORE writing `SPEC.md`)**:
   - Skip **only** if the user explicitly opted out (*"decide everything, don't ask"*) or all key decisions are already unambiguous from the prompt and repo.
   - Otherwise, interview the user on unresolved decisions across 5 axes:
     1. Architecture / UX tradeoffs
     2. Day-1 scope & non-goals (*what to cut for v1*)
     3. Edge cases & failure behavior
     4. `MUST NOT TOUCH` boundaries
     5. Acceptance criteria (`DONE WHEN` — for UI features, explicitly ask whether live browser verification is required)
   - Use `ask_question` with `(Recommended)` first (1–4 sharp questions per round; fall back to concise numbered questions in plain text if `ask_question` is unavailable).
   - **Quick Grill**: 1 round (3–5 sharp questions) for well-scoped features.
   - **Deep Grill**: multiple decision-tree rounds for large/ambiguous work (or recommend `/grill-me` when deep interactive alignment is needed).
4. **Lock decisions & pick execution mode**:
   - After user answers arrive, append locked decisions to `DECISIONS.md` (create if missing; in `CHAT MODE`, output the entries in chat instead of writing files).
   - **Thinking-level cost curve**: `low` 1x · `medium` 2.5x · `high` 5x · `xhigh` 8.6x (~72% more than `high` for marginal gain on most tasks). Default planner/reviewer to **HIGH** and reserve **XHIGH** strictly for genuinely stuck or high-risk work.
   - Match the mode to the problem shape (note: agent cannot execute slash commands directly — recommend them for the user to invoke):
     - *One focused side task* (research, test run) → `invoke_subagent`.
     - *Single cohesive feature / sequential work* → `neon-slice`.
     - *One hard bug, race condition, or deep refactor* → recommend `/boost <task>`.
     - *Wide work across disjoint files (same repo)* → recommend `/swarm <task>`, or run `neon-teamwork` when isolated worktrees/ports/DBs are needed (via T3 Code `delegate_task` or Orca `orchestration`).
     - *Multi-milestone project (hours–days)* → recommend `/teamwork <goal>` (in Antigravity) or `neon-teamwork` Orca Orchestration mode (in Orca).
5. **Write `SPEC.md`** at the repo root (or feature folder if the repo uses one; in `CHAT MODE`, output `SPEC.md` in chat) containing:
   - **Goal**: 1–2 sentences describing the exact outcome.
   - **Codebase Map (≤10 lines) & Top 3 Riskiest Files (`path:line`)**.
   - **Files Touched**: explicit create/modify list.
   - **Risks Ranked**: ordered high → low with mitigation.
   - **Test Plan**: exact `<TEST_CMD>`, new tests to add, and explicit opt-in if live browser/E2E verification is approved for UI work.
   - **What We Will NOT Do**: explicit out-of-scope boundaries.
   - **Execution Mode & Slices/Phases**: disjoint files per parallel slice, dependencies, port/DB isolation if needed, and `DONE WHEN` per slice.
6. **Stop for approval**:
   - Present `SPEC.md` and wait for explicit user OK before writing any implementation code.
