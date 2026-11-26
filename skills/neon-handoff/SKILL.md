---
name: neon-handoff
description: Save concise state, half-done work with file:line, blockers, and the exact next 3 commands into HANDOFF.md before /clear, near the 512K context ceiling, or when hitting 5-hour/weekly quota limits.
---

# Neon Handoff (`HANDOFF.md`)

Preserve momentum across context resets or quota limits following `AGENTS.md` (or `NEON.md`) rules.

1. **When to use & single-writer rule**:
   - Prefer `/compact` first when a thread grows long (note Antigravity app's **512K** context ceiling and 5-hour/weekly quota windows).
   - If `/compact` is unavailable, context remains crowded, or limits are imminent, run this skill from the **main thread / coordinator only** (parallel slice workers must never write `HANDOFF.md`).
2. **Inspect current state**:
   - Run `git status`, note current branch/worktree, active wave/slice progress, and the last actual test run result.
3. **Write `HANDOFF.md`** in the main/integration worktree root (keep untracked; never commit to PRs) containing:
   - **Done**: completed items/waves with brief verification status.
   - **Half-done**: in-progress items with exact `file:line` references and what remains.
   - **Blockers & Next Fix** *(if any)*: what failed (command/error summary) and the next concrete fix or `SPEC.md` assumption to revisit.
   - **Next 3 commands**: exact commands/prompts to resume after `/clear` or quota reset (starting from `AGENTS.md`/`NEON.md` + `DECISIONS.md` + `HANDOFF.md`).
4. **Keep it concise** so the next session resumes immediately without re-reading full history.
