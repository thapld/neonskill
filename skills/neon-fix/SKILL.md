---
name: neon-fix
description: Fix severity 1-2 review findings using test-first discipline without loosening tests, with a plan-check circuit breaker after repeated failures and a 3-round hard cap.
---

# Neon Review Fixer

Fix review findings following `AGENTS.md` (or `NEON.md`) rules (recommended model: **Gemini 4 Hydrogen · MEDIUM/HIGH**; escalate to **Neon · XHIGH** only if a fix fails or loops).

1. **Scope**:
   - Fix **severity 1–2** findings only. Ignore severity 3 unless explicitly requested.
2. **Test-first fix loop**:
   - For each severity 1–2 finding:
     1. Write a failing test that reproduces `repro`.
     2. Implement the minimal, complete fix (no `TODO`s, no stubs).
     3. **Never loosen, skip, or delete an existing valid test** to make `<TEST_CMD>` pass.
     4. Re-run `<TEST_CMD>` in the worktree and verify all tests pass.
3. **Plan-Check Circuit Breaker & Hard Cap**:
   - **2-strike plan check**: if the same finding fails 2 consecutive attempts or fixes oscillate between 2 approaches, **stop patching lines** — step back and check whether `SPEC.md` or the slice design has a broken assumption (never adjust `temperature`).
   - **Hard cap**: maximum **3 review/fix rounds**. If severity 1–2 issues remain after round 3 (or require a `SPEC.md` redesign), stop, report `what failed` + `next fix` to the user (and let the main thread/coordinator log it in `HANDOFF.md`).
4. **Return**:
   - Mapping of finding # → fix (`file:line` + test added) and **actual pasted test output** (at least the last 20 lines).
