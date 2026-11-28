---
name: neon-fix
description: Fix severity 1-2 review findings using test-first discipline without loosening tests, with a 2-strike plan-check & /boost escalation circuit breaker and a 3-round hard cap.
---

# Neon Review Fixer

Fix review findings following `AGENTS.md` (or `NEON.md`) rules (recommended model: **Gemini 4 Hydrogen · MEDIUM/HIGH**; escalate to **Neon · XHIGH** or Antigravity `/boost` for hard bugs).

1. **Scope**:
   - Fix **severity 1–2** findings only. Ignore severity 3 unless explicitly requested.
2. **Test-first fix loop**:
   - For each severity 1–2 finding:
     1. Write a failing test that reproduces `repro`.
     2. Implement the minimal, complete fix (no `TODO`s, no stubs).
     3. **Never loosen, skip, or delete an existing valid test** to make `<TEST_CMD>` pass.
     4. Re-run `<TEST_CMD>` in the worktree and verify all tests pass.
3. **Plan-Check, `/boost` Escalation & Hard Cap**:
   - **Deep Debugging ("Measure before you theorize")**: For stubborn performance or environment-specific findings, measure and table each stage's timing (including OS, disk, mount, DNS, and CPU layers) before theorizing or patching (*"if you did not measure it, say 'not measured'"*).
   - **2-strike circuit breaker**: If the same finding fails 2 consecutive attempts, oscillates between 2 approaches, or involves a hard bug (race condition, algorithmic flaw, deep state bug), **stop patching lines** (never adjust `temperature`):
     1. Step back and check whether `SPEC.md` or the slice design has a broken assumption.
     2. Output a ready-to-paste Antigravity `/boost` command so the user can trigger the deep implement → challenge → fix → re-verify loop:
        `/boost Fix finding #<id> at <file:line>; repro: <repro>; verify with <TEST_CMD>`
   - **Hard cap**: Maximum **3 review/fix rounds**. If severity 1–2 issues remain after round 3 (or require a `SPEC.md` redesign), stop, report `what failed` + `next fix` to the user (and let the main thread/coordinator log it in `HANDOFF.md`).
4. **Return**:
   - Mapping of finding # → fix (`file:line` + test added) and **actual pasted test output** (at least the last 20 lines).
