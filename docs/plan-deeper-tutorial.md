# Plan: Deeper Tutorial — Specialized Agent Roles

> Approved order: 2b → 1 → 2c → 2a
> Each layer is additive — lands independently without breaking the existing exercise.

---

## Layer 1: On-Call Dev Agent (2b)

**Teaching point:** Operational readiness is part of development, not an afterthought.

**What changes:**
- Add a 4th agent role to the team prompt (`demo/prompt.txt`)
- The on-call agent runs in parallel with the 3 feature agents
- Creates `docs/oncall-playbook.md` with runbook entries for each new endpoint (auth, rate limiter, stats)
  - Each entry: what the endpoint does, expected error codes, how to diagnose failures, rollback steps
- Verifies feature code emits structured log lines (or adds them)
- Runs acceptance tests as a smoke check from an ops perspective
- Add acceptance tests for the playbook artifact (file exists, has entries for each endpoint)

**Files to create/modify:**
- `demo/prompt.txt` — add on-call agent to the prompt
- `tests/acceptance.test.ts` — add playbook validation tests
- `README.md` — mention the on-call role in "What to Notice"
- `demo/README.md` — presenter notes for the on-call agent phase

**New prerequisites:** None

---

## Layer 2: Cross-Model Review (1)

**Teaching point:** Peer review from a different model catches blind spots — same reason you get a second opinion.

**Dependency:** https://github.com/ktundwal/crossmodel-review (Claude Code skill)

**What changes:**
- Install crossmodel-review as a project skill (`.claude/skills/crossmodel-review/`)
- After features are built and wired, the lead (or a dedicated reviewer agent) runs `/crossmodel-review` on key files
- Review targets: `src/middleware/auth.ts`, `src/services/rate-limiter.ts`, `src/routes/stats.ts`
- Lead reasons over the synthesized feedback — fixes issues or documents why it disagrees
- Add as an optional step in the prompt (so attendees without Copilot CLI aren't blocked)

**Files to create/modify:**
- `.claude/skills/crossmodel-review/` — install the skill
- `demo/prompt.txt` — add optional review step after wiring
- `README.md` — document the cross-model review step, mark as optional
- `demo/README.md` — presenter notes on what to say during the review phase

**New prerequisites:** Copilot CLI (optional — exercise works without it)

---

## Layer 3: Librarian Agent (2c)

**Teaching point:** Docs are part of "done." If the API changed and the docs didn't, the work isn't finished.

**What changes:**
- Add a librarian agent role that runs after features are wired (blocked by the wiring task)
- Updates `CLAUDE.md` — adds new endpoints to the API section
- Updates `README.md` project structure if new directories were created
- Could generate an `API.md` or update inline docs
- Add acceptance tests: CLAUDE.md contains the new endpoints, API section is current

**Files to create/modify:**
- `demo/prompt.txt` — add librarian agent as post-wiring task
- `tests/acceptance.test.ts` — add docs-updated validation tests
- `README.md` — mention librarian role
- `demo/README.md` — presenter notes

**New prerequisites:** None

---

## Layer 4: Product Owner + Flywheel (2a)

**Teaching point:** Agents aren't just coders — they're teammates across roles. And learnings compound when shared.

**Dependencies:**
- https://github.com/ktundwal/session-learnings (Claude Code skill)
- https://github.com/ktundwal/presentation-skills (Claude Code skill, marp-deck)

**What changes — Part A (Frontend + PO agent):**
- Add a minimal frontend to notify-service (notification dashboard — single page showing recent notifications, stats, subscription status)
- Could be a simple HTML + vanilla JS page served by Express, or a lightweight React app
- Add a PO agent role that reviews the UI after features are built
  - Checks UX: are error states visible? Is the stats view useful? Are notifications readable?
  - Writes UX feedback as comments or creates follow-up tasks
  - Could write acceptance criteria for visual behavior
- Add acceptance tests for the frontend (page loads, shows notifications, reflects stats)

**What changes — Part B (Flywheel):**
- Install session-learnings as a project skill
- Install presentation-skills (marp-deck) as a project skill
- After the exercise, students run `/session-learnings agent-teams-exercise`
  - Captures: what they learned, what surprised them, what failed, what they'd do differently
  - Produces: README, investigation log, transcript, Marp deck
- The deck becomes shareable — students present to their teams, next cohort benefits
- README instructions: "After you finish, capture what you learned" section

**Files to create/modify:**
- `src/public/` or `src/frontend/` — minimal dashboard
- `src/server.ts` — serve static files
- `demo/prompt.txt` — add PO agent role
- `.claude/skills/session-learnings/` — install skill
- `.claude/skills/presentation-skills/` — install skill (marp-deck)
- `tests/acceptance.test.ts` — frontend acceptance tests
- `README.md` — "Capture & Share" section at the end
- `demo/README.md` — presenter notes on the flywheel

**New prerequisites:** session-learnings repo, presentation-skills repo, marp-cli (for deck rendering)

---

## Summary

| Layer | Role | Effort | Prerequisites | Additive? |
|-------|------|--------|---------------|-----------|
| 2b | On-call dev | Small | None | Yes — adds agent to existing prompt |
| 1 | Cross-model reviewer | Small | Copilot CLI (optional) | Yes — optional post-build step |
| 2c | Librarian | Small | None | Yes — post-wiring task |
| 2a | Product owner + flywheel | Large | Frontend, session-learnings, presentation-skills | Reshapes exercise |
