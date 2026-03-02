---
marp: true
theme: default
paginate: true
style: |
  /* ── Typography ─────────────────────────────── */
  section {
    font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
    font-size: 24px;
    padding: 50px 60px;
  }
  h1 { font-size: 40px; letter-spacing: -0.5px; }
  h2 { font-size: 34px; letter-spacing: -0.3px; }
  h3 { font-size: 26px; }
  table { font-size: 20px; }
  code { font-size: 18px; }
  pre { font-size: 16px; }
  blockquote { border-left: 4px solid #00c9a7; }
  strong { color: #1a1f36; }

  /* ── Dark slides ────────────────────────────── */
  section.dark {
    background: #1a1f36;
    color: #cdd6e4;
  }
  section.dark h1,
  section.dark h2,
  section.dark h3 {
    color: #ffffff;
  }
  section.dark strong {
    color: #00c9a7;
  }
  section.dark a {
    color: #00c9a7;
  }
  section.dark code {
    color: #cdd6e4;
  }
  section.dark::after {
    color: #4a5270;
  }

  /* ── Accent slides (centered, dramatic) ───── */
  section.accent {
    background: #1a1f36;
    color: #cdd6e4;
    text-align: center;
    display: flex;
    flex-direction: column;
    justify-content: center;
  }
  section.accent h2 {
    color: #ffffff;
    font-size: 38px;
  }
  section.accent h3 {
    color: #00c9a7;
    font-size: 30px;
  }
  section.accent strong {
    color: #00c9a7;
  }
  section.accent::after {
    color: #4a5270;
  }

  /* ── Code highlight ────────────────────────── */
  section.code-slide pre {
    font-size: 14px;
    line-height: 1.4;
  }
---

<!-- _class: dark -->
<!-- _paginate: false -->

# Agent Teams: A Hands-On Tutorial

<br>

**Kapil Tundwal** | DPG Growth | FHL March 2026

<!--
SPEAKER: "You've seen Claude Code answer questions and write code. Today I'll show you how agent TEAMS work — and why the mechanics map 1:1 to how your engineering team works."
Duration: 20 min total.
-->

---

## notify-service

An internal notification hub for engineering teams. Services push alerts — deploys, incidents, PR activity — and engineers subscribe to the channels they care about.

- **Webhooks** — any service can POST a notification with a priority level (P0–P3)
- **Subscriptions** — engineers pick channels, set quiet hours, set a minimum priority
- **Quiet hours** — P1–P3 notifications are held overnight. P0 always breaks through.
- **Adaptive cards** — notifications render as Teams-style cards

I built this for today's tutorial. a bit more than a hello world.

<!--
SPEAKER: "Imagine you're on an infra team. You've got 20 services pushing alerts — deploys, incidents, CI failures. Engineers are drowning in noise. So you build a notification hub. Services push to it, engineers subscribe to what they care about, and it respects quiet hours so on-call doesn't mean awake-all-night. That's notify-service."
-->

---

## Under the Hood

```
src/
├── server.ts              ← Express app on :3000
├── types/index.ts         ← Notification, Subscription, AdaptiveCard
├── routes/
│   ├── webhooks.ts        ← POST /webhooks/notify, GET /webhooks/history
│   └── subscriptions.ts   ← CRUD for notification preferences
├── services/
│   ├── dispatcher.ts      ← Routes notifications to subscribers
│   ├── templates.ts       ← Teams-style adaptive cards
│   └── dedup.ts           ← Content-hash deduplication
└── storage/
    └── sqlite.ts          ← SQLite persistence
```

Express + TypeScript strict + SQLite. 19 tests passing. ~600 lines of code.

<!--
SPEAKER: "Standard stack. Express, TypeScript strict, SQLite for persistence. The codebase has routes, services, storage — layering you are probably familiar with. 19 tests already passing."
-->

---

## The Customer Problem

Your PM just came back from customer interviews. Three things keep coming up:

**"We got hit by a rogue script that flooded us with duplicate alerts."**
→ We need **rate limiting** — cap how fast any single source can push.

**"Anyone can POST to the webhook. There's no auth."**
→ We need **API key validation** — reject calls without a valid key.

**"We have no visibility into what's flowing through the system."**
→ We need a **stats endpoint** — counts by channel and priority, last hour.

Three features. Independent. All needed before the next release.

<!--
SPEAKER: "Sound familiar? PM comes back with three customer pain points, each maps to a feature, each is independent, all need to ship together. This is a normal sprint planning conversation."
-->

---

<!-- _class: accent -->

## Think like a dev for a moment

### If your team had to build these three features, what would you do?

<!--
SPEAKER: Pause. Let them think. "You'd break it into three work items. Assign each to a dev. They'd work in parallel on feature branches. You'd have acceptance criteria in the ticket. And a CI pipeline to verify."
-->

---

## Step 1: Write the Spec First

Before any agent touches the code, I wrote **acceptance tests** — `tests/acceptance.test.ts`.

```typescript
// 3 feature groups — does the code work?
describe('Acceptance: Auth Middleware', () => { /* 5 tests */ });
describe('Acceptance: Rate Limiter', () => { /* 4 tests */ });
describe('Acceptance: Stats Endpoint', () => { /* 5 tests */ });

// 3 artifact groups — did the team do the operational work?
describe('Acceptance: On-Call Playbook', () => { /* 5 tests */ });
describe('Acceptance: Librarian (Docs Updated)', () => { /* 4 tests */ });
describe('Acceptance: Product Owner Spec', () => { /* 4 tests */ });
```

**27 tests. Written by me. Agents cannot modify this file.**

Not just code — the spec validates operational artifacts too: runbook, docs, UX spec.

<!--
SPEAKER: "27 acceptance tests across 6 groups. Three test the features — does auth reject bad keys, does rate limiting return 429, does stats group by channel. Three test the operational work — did the on-call agent write a playbook, did the librarian update the docs, did the PO write a UX spec. Same as your definition of done including docs and runbooks, not just code."
-->

---

## Before: 27 Failures

```
 ✕ Auth Middleware > module exists ... Does the file exist?     (5 tests)
 ✕ Rate Limiter > returns 429 with Retry-After header          (4 tests)
 ✕ Stats Endpoint > counts notifications grouped by channel    (5 tests)
 ✕ On-Call Playbook > docs/oncall-playbook.md exists
     → ENOENT: no such file or directory                       (5 tests)
 ✕ Librarian > CLAUDE.md documents the stats endpoint          (4 tests)
 ✕ Product Owner Spec > demo-artifacts/ux-spec.md exists
     → ENOENT: no such file or directory                       (4 tests)

 Tests  27 failed (27)
```

Code doesn't exist. Artifacts don't exist. The agents' job: make all 27 pass.

<!--
SPEAKER: "27 failures. The code modules don't exist, the playbook doesn't exist, the UX spec doesn't exist, CLAUDE.md hasn't been updated. This is the starting line — not just for features, but for the whole team's output."
-->

---

<!-- _class: accent -->

## Step 2: The Prompt

### This is the mindshift.

### You're not writing code. You're directing a team like a dev lead/architect

<!--
SPEAKER: "Everything up to now is familiar — write a spec, define acceptance criteria. What comes next is different. Instead of assigning this to your team, I'm assigning it to AI agents — devs, on-call, librarian, PO."
-->

---

<!-- _class: code-slide -->

## The Prompt (abridged)

```
Create a team of 4 agents to work in parallel on items 1-4.

1. Auth middleware — X-API-Key validation, 401 for bad keys
2. Rate limiter — 100 req/min per sourceId, 429 + Retry-After
3. Stats endpoint — GET /stats, counts by channel + priority
4. On-call playbook — runbook from the acceptance test spec

After wiring:
5. Librarian — update CLAUDE.md with new endpoints
6. Product owner — write demo-artifacts/ux-spec.md with wireframes
7. Dashboard dev — implement PO's spec in index.html

Optional: cross-model review via Copilot CLI (Google + OpenAI)

Definition of done: npm run verify — all tests pass, including
acceptance.test.ts. Do not modify acceptance.test.ts.
```

Full prompt in `demo/prompt.txt`.

<!--
SPEAKER: "Seven tasks. Four run in parallel — three features plus an on-call playbook. After wiring, the librarian updates docs, the PO writes a UX spec with wireframes, and a dev implements the PO's spec. Plus an optional cross-model review. This is a real team structure — not just three coders."
-->

---

## What Happens: The Lead Plans

The lead agent reads `CLAUDE.md`, explores the codebase, then creates a task board:

```
#1 [pending]  Auth middleware                          ← parallel
#2 [pending]  Rate limiter                             ← parallel
#3 [pending]  Stats endpoint                           ← parallel
#4 [pending]  On-call playbook                         ← parallel (no blockers)
#5 [pending]  Wire auth + rate limiter into server.ts  [blocked by #1, #2, #3]
#6 [pending]  Librarian — update CLAUDE.md             [blocked by #5]
#7 [pending]  Product owner — write UX spec            [blocked by #5]
#8 [pending]  Dashboard dev — implement UX spec        [blocked by #7]
```

Three dependency chains: features → wiring → librarian + PO → dashboard dev.

<!--
SPEAKER: "Eight tasks, not four. The lead planned the WHOLE team's work — feature devs, on-call, librarian, PO, dashboard dev. Notice the dependency chains: features must finish before wiring, wiring before docs and PO review, and the PO spec must exist before the dashboard dev starts. Same as your sprint board."
-->

---

## Four Agents Spawn

```
#1 [in_progress]  Auth middleware             (agent-auth)
#2 [in_progress]  Rate limiter               (agent-ratelimit)
#3 [in_progress]  Stats endpoint             (agent-stats)
#4 [in_progress]  On-call playbook           (agent-oncall)
#5 [pending]      Wire into server.ts        [blocked by #1, #2, #3]
```

Each agent:
- Has its **own context window** (can't see the other agents' work)
- Works in its **own git worktree** (isolated branch, no file conflicts)
- Knows its **specific task** (just like a dev with a Jira ticket)

The on-call agent reads the acceptance tests — the spec — and writes the runbook. It doesn't wait for the code.

<!--
SPEAKER: "Four agents in parallel. Three building features, one writing the on-call playbook. The on-call agent reads the acceptance tests — same as your on-call engineer reading the Jira ticket and writing the runbook before code even ships. Operational readiness is part of development."
-->

---

## Why Worktrees Matter

Without worktrees:
```
All 3 agents → same working directory → edit same files → conflicts
```

With worktrees:
```
agent-auth      → .claude/worktrees/abc/ → own branch → own files
agent-ratelimit → .claude/worktrees/def/ → own branch → own files
agent-stats     → .claude/worktrees/ghi/ → own branch → own files
```

**Same as your team using feature branches instead of sharing one desktop.**

Changes merge back when the agent completes. Conflicts resolved at integration time — just like PRs.

<!--
SPEAKER: "This is the same reason your team uses git branches. Isolation during development, integration at merge time. The agents are doing the same thing."
-->

---

## The 1:1 Parallel

| How Your Team Works | How Agent Teams Work |
|---|---|
| New dev ask other devs or better yet, reads the wiki | Lead reads CLAUDE.md |
| Lead creates ADO items | TaskCreate → task list |
| Lead assigns to devs | TaskUpdate with owner |
| Each dev gets a feature branch | Each agent gets a git worktree |
| 4 devs work simultaneously | 4 agents write different files |
| On-call writes runbook from ticket | On-call agent writes playbook from tests |
| Dev posts in team channel | SendMessage → lead |
| Docs updated after feature ships | Librarian updates CLAUDE.md |
| PO writes spec, dev implements | PO → demo-artifacts/ux-spec.md → dev |
| Acceptance criteria in ADO item | tests/acceptance.test.ts |
| Blocked tickets unblock | blockedBy dependencies resolve |
| Ticket closed, PR merged | TaskUpdate → completed |
| CI pipeline runs green | `npm run verify` passes |

<!--
SPEAKER: "Every row maps 1:1. Not just coding — on-call, docs, product review, and cross-role handoffs. The PO writes a spec, the dev implements it. Same workflow primitives your team uses."
-->

---

## Parallel Work (Activity Log)

While agents work, hooks log every action to `agent-activity.log`:

```
10:25:01  TASK+    Add auth middleware with API key validation
10:25:01  TASK+    Add rate limiter — sliding window per sourceId
10:25:01  TASK+    Add stats endpoint — counts by channel and priority
10:25:02  TASK+    Write on-call playbook from acceptance test spec
10:25:02  SPAWN    general-purpose ...a1b2c3d4
10:25:02  SPAWN    general-purpose ...e5f6g7h8
10:25:03  SPAWN    general-purpose ...i9j0k1l2
10:25:03  SPAWN    general-purpose ...m3n4o5p6
10:25:10  WRITE    src/middleware/auth.ts
10:25:11  WRITE    docs/oncall-playbook.md
10:25:12  WRITE    src/services/rate-limiter.ts
10:25:15  WRITE    src/routes/stats.ts
```

Different files, same timestamps. **Four agents, parallel work is real.**

<!--
SPEAKER: "Look at the timestamps — auth.ts, the playbook, rate-limiter.ts, stats.ts all written within seconds. Four agents, four files, simultaneously. The on-call agent is writing the runbook from the spec while the feature devs write code."
-->

---

## Completion → Wiring → Post-Wiring

```
10:26:28  TASK✓    #4 completed    ← on-call playbook done first (no deps)
10:26:30  TASK✓    #1 completed    ← auth
10:26:32  TASK✓    #2 completed    ← rate limiter
10:26:35  TASK✓    #3 completed    ← stats
10:26:36  TASK→    #5 in_progress  ← wiring unblocks!
10:26:40  EDIT     src/server.ts   ← auth + rate limiter wired in
10:26:42  TASK✓    #5 completed
10:26:43  TASK→    #6 in_progress  ← librarian unblocks
10:26:43  TASK→    #7 in_progress  ← PO unblocks
10:26:45  EDIT     CLAUDE.md       ← librarian updates docs
10:26:47  WRITE    demo-artifacts/ux-spec.md  ← PO writes spec with wireframes
10:26:50  TASK→    #8 in_progress  ← dashboard dev unblocks (PO done)
10:26:55  EDIT     src/public/index.html      ← dev implements PO's spec
```

The dependency chain resolves: features → wiring → docs + PO → dashboard dev.

<!--
SPEAKER: "Watch the cascade. The on-call playbook finishes first — it had no dependencies. Then the three features complete, wiring unblocks, and after wiring TWO tasks unblock: the librarian and the PO. Then the PO finishes and the dashboard dev starts — it reads the PO's spec and implements the changes. Same as your sprint board resolving dependencies."
-->

---

## The PO→Dev Handoff

The PO agent writes `demo-artifacts/ux-spec.md` — a real spec with ASCII wireframes:

```
### Auth Error State
Before:                           After:
┌──────────────────────┐          ┌──────────────────────┐
│ API Key: [________]  │          │ API Key: [________]  │
│                      │          │ ⚠ Invalid key — check │
│ [Send]               │          │   and try again       │
└──────────────────────┘          └──────────────────────┘
```

Then the dashboard dev reads the spec and implements the changes.

**PO defines. Dev builds. Spec is the contract.** Same as your team.

<!--
SPEAKER: "The PO didn't write code — it wrote a spec with wireframes. Then a different agent read that spec and implemented it. This is the same handoff you see between your PM and your dev team. The spec is the contract, not a Slack thread."
-->

---

## Cross-Model Review *(optional)*

If Copilot CLI is installed, the lead gets a **second opinion** from Google and OpenAI:

| Finding | Google | OpenAI | Confidence |
|---------|--------|--------|------------|
| Hardcoded API keys | Yes | Yes | **High** — both agree |
| Memory leak in rate limiter | Yes | Yes | **High** — both agree |
| Missing auth on /stats | Yes | Yes | **High** — both agree |
| Timing attack risk | — | Yes | Human judgment |
| No cross-process limiting | Yes | — | Human judgment |

The lead **reasons over the feedback** — fixes real issues, documents why it disagrees.

See `docs/examples/crossmodel-review-sample.md` for a real output.

<!--
SPEAKER: "Different models have different blind spots. Where both agree — hardcoded keys, memory leak — that's high confidence. Where they disagree, that's for you to judge. The lead doesn't blindly accept every suggestion. It reasons over them, same as you reading PR comments."
-->

---

## Hooks: Your Observability Layer

How does the activity log work? **Hooks** — shell scripts that fire on tool events.

```json
// .claude/settings.json (project-level)
{
  "hooks": {
    "PostToolUse": [{
      "matcher": "TaskCreate|TaskUpdate|SendMessage|Edit|Write|Bash",
      "hooks": [{ "type": "command", "command": "bash hooks/activity-logger.sh" }]
    }],
    "SubagentStart": [{
      "hooks": [{ "type": "command", "command": "bash hooks/activity-logger.sh" }]
    }]
  }
}
```

The hook script reads JSON from stdin (`tool_name`, `tool_input`) and appends a formatted line to the log. Ships with the project — you will get it on clone.

<!--
SPEAKER: "Hooks are how you get observability. Every tool call fires a hook. The script parses the JSON and logs it. Same concept as CI webhooks or Slack integrations — you're instrumenting the process."
-->

---

## The Verdict: All Green

```
> npm run verify

 ✓ tests/templates.test.ts      (7 tests)
 ✓ tests/dedup.test.ts          (5 tests)
 ✓ tests/dispatcher.test.ts     (7 tests)
 ✓ tests/auth.test.ts           (agent-written)
 ✓ tests/rate-limiter.test.ts   (agent-written)
 ✓ tests/stats.test.ts          (agent-written)
 ✓ tests/acceptance.test.ts     (27 tests)   ← the human-written spec

 Test Files  7 passed (7)
      Tests  all passed
```

**27 acceptance tests — written by me, untouched by agents — all green.**

Features work. Playbook written. Docs updated. UX spec delivered and implemented.

<!--
SPEAKER: "27 acceptance tests I wrote before the agents started. They didn't modify my spec — they wrote code, a runbook, updated docs, and delivered a UX spec that satisfies it. This is the quality gate."
-->

---

## Before → After

| | Before | After |
|---|---|---|
| **Acceptance tests** | 27 failing | 27 passing |
| **Source files** | 8 | 11 (+ auth, rate-limiter, stats) |
| **Artifacts created** | 0 | 3 (playbook, ux-spec, review) |
| **Docs updated** | — | CLAUDE.md, index.html |
| **Agent roles** | — | dev x3, on-call, librarian, PO, dashboard dev |
| **Time** | — | ~8 minutes |
| **What I wrote** | prompt + acceptance tests | — |
| **What agents wrote** | — | everything else |

Your role: **define the spec, direct the team, verify the output.**

<!--
SPEAKER: "I wrote the acceptance tests and the prompt. The agents wrote the features, the runbook, updated the docs, reviewed the UX, and improved the dashboard. Seven distinct roles, all coordinated through task dependencies."
-->

---

## What You Just Saw

1. **Acceptance tests first** — the spec, not the implementation
2. **One prompt** — the task brief, same as a Jira description
3. **Task breakdown** — lead plans before anyone codes
4. **Parallel agents in worktrees** — isolated, like feature branches
5. **Multiple roles** — devs, on-call, librarian, PO, dashboard dev
6. **PO→Dev handoff** — spec with wireframes → implementation
7. **Cross-model review** — second opinion from competing models
8. **Activity hooks** — full observability into the process
9. **Dependency resolution** — blocked tasks unblock automatically
10. **External verification** — agents pass tests they didn't write

**The workflow is the same. The speed is different.**

<!--
SPEAKER: "The process maps 1:1 to how your team works. Not just coding — operational readiness, documentation, product review, cross-role handoffs. The difference is time."
-->

---

<!-- _class: dark -->

## Try It Yourself

```bash
git clone https://github.com/ktundwal/notify-service.git
cd notify-service && npm install

# See the 27 failures (the "before")
npx vitest run tests/acceptance.test.ts

# See the dashboard (the "before" UI)
npm run dev    # open http://localhost:3000, then Ctrl+C

# Terminal 1: claude
# Terminal 2: bash demo/observe.sh
# Paste the prompt from demo/prompt.txt → watch the agents work

# After: check demo-artifacts/ for PO spec + review output
# Reset: bash demo/reset.sh
```

**https://github.com/ktundwal/notify-service**

<!--
SPEAKER: "The repo has everything. Clone it, see the 27 failures, look at the dashboard, paste the prompt, watch the agents. After they finish, check demo-artifacts/ for the PO's UX spec and cross-model review. Reset and try again anytime."
-->
