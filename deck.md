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
describe('Acceptance: Auth Middleware', () => {
  it('rejects requests without X-API-Key header with 401', ...);
  it('rejects requests with an invalid API key with 401', ...);
  it('allows requests with valid dev API key', ...);
  it('allows requests with valid prod API key', ...);
});

describe('Acceptance: Rate Limiter', () => {
  it('returns 429 with Retry-After header when limit exceeded', ...);
  it('tracks limits independently per sourceId', ...);
});

describe('Acceptance: Stats Endpoint', () => {
  it('counts notifications grouped by channel and priority', ...);
  it('does not count notifications older than 1 hour', ...);
});
```

**14 tests. Written by me. Agents cannot modify this file.**

<!--
SPEAKER: "This is the spec. The agents will write their own unit tests — but those are them grading their own homework. THIS file is the external quality gate. They have to make it pass, not change it."
-->

---

## Before: 14 Failures

```
 ✕ Acceptance: Auth Middleware > module exists ... and exports authMiddleware
     → Failed to load url ../src/middleware/auth ... Does the file exist?
 ✕ Acceptance: Auth Middleware > rejects requests without X-API-Key header
 ✕ Acceptance: Auth Middleware > rejects requests with an invalid API key
 ✕ Acceptance: Auth Middleware > allows requests with valid dev API key
 ✕ Acceptance: Auth Middleware > allows requests with valid prod API key
 ✕ Acceptance: Rate Limiter > module exists ... and exports createRateLimiter
 ✕ Acceptance: Rate Limiter > allows requests under the rate limit
 ✕ Acceptance: Rate Limiter > returns 429 with Retry-After header
 ✕ Acceptance: Rate Limiter > tracks limits independently per sourceId
 ✕ Acceptance: Stats Endpoint > module exists ... and exports a router
 ✕ Acceptance: Stats Endpoint > storage exports getNotificationStats function
 ✕ Acceptance: Stats Endpoint > GET /stats returns JSON with channels and total
 ✕ Acceptance: Stats Endpoint > counts notifications grouped by channel
 ✕ Acceptance: Stats Endpoint > does not count notifications older than 1 hour

 Test Files  1 failed (1)
      Tests  14 failed (14)
```

The code doesn't exist yet. The agents' job: make these pass.

<!--
SPEAKER: "14 failures. Every single one says 'module not found.' The code doesn't exist. This is the starting line."
-->

---

<!-- _class: accent -->

## Step 2: The Prompt

### This is the mindshift.

### You're not writing code. You're directing a team like an dev lead/architect

<!--
SPEAKER: "Everything up to now is familiar — write a spec, define acceptance criteria. What comes next is different. Instead of assigning this to three devs, I'm assigning it to three AI agents."
-->

---

<!-- _class: code-slide -->

## The Prompt

```
Add three features to this notification service. Create a team of 3 agents
to work in parallel. Each agent should work in its own git worktree to
avoid conflicts.

1. Auth middleware — Create src/middleware/auth.ts. Validate an X-API-Key
   header on all /webhooks routes. Valid keys: ["notify-dev-key",
   "notify-prod-key"]. Return 401 JSON error for missing or invalid keys.
   Write unit tests in tests/auth.test.ts.

2. Rate limiter — Create src/services/rate-limiter.ts. In-memory sliding
   window: max 100 requests per minute per sourceId. Export
   createRateLimiter(maxRequests, windowMs) that returns Express middleware.
   Return 429 with a Retry-After header when exceeded.
   Write unit tests in tests/rate-limiter.test.ts.

3. Stats endpoint — Create src/routes/stats.ts. GET /stats returns counts
   grouped by channel and priority for the last hour. Add query to
   src/storage/sqlite.ts. Write unit tests in tests/stats.test.ts.

After all three features are implemented, wire auth middleware and rate
limiter into server.ts.

Definition of done: run npm run verify — type check AND all tests must
pass, including tests/acceptance.test.ts. Do not modify acceptance.test.ts.
```

<!--
SPEAKER: "Notice what's in here. Three features, each with specific files and behavior. A team of 3 agents. Git worktrees for isolation. And a definition of done — the acceptance tests I wrote. This is likely what you would hold in your head or write down before you fire up your IDE"
-->

---

## What Happens: The Lead Plans

The lead agent reads `CLAUDE.md`, explores the codebase, then creates a task board:

```
#1 [pending]  Add auth middleware with API key validation
#2 [pending]  Add rate limiter — sliding window per sourceId
#3 [pending]  Add stats endpoint — counts by channel and priority
#4 [pending]  Wire auth + rate limiter into server.ts  [blocked by #1, #2, #3]
```

Task #4 is **blocked** — it can't start until all three features land.

Same as your sprint board: three feature tickets, one integration ticket with dependencies.

<!--
SPEAKER: "The lead didn't start coding. It planned. Four tasks, three parallel, one blocked. Notice task #4 — it has dependency links. Same thing you'd hold in your head or paper"
-->

---

## Three Agents Spawn

```
#1 [in_progress]  Auth middleware             (agent-auth)
#2 [in_progress]  Rate limiter               (agent-ratelimit)
#3 [in_progress]  Stats endpoint             (agent-stats)
#4 [pending]      Wire into server.ts        [blocked by #1]
```

Each agent:
- Has its **own context window** (can't see the other agents' work)
- Works in its **own git worktree** (isolated branch, no file conflicts)
- Knows its **specific task** (just like a dev with a Jira ticket)

<!--
SPEAKER: "Three agents, three worktrees, three context windows. Same as three devs, three feature branches, three VS Code windows. They can't step on each other."
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
| 3 devs work simultaneously | 3 agents write different files |
| Dev posts in team channel | SendMessage → lead |
| Acceptance criteria in ADO item | tests/acceptance.test.ts |
| Ticket closed, PR merged | TaskUpdate → completed |
| Blocked tickets unblock | blockedBy dependencies resolve |
| CI pipeline runs green | `npm run verify` passes |

<!--
SPEAKER: "Every row maps 1:1. This isn't a metaphor — the agent team literally uses the same workflow primitives. Task creation, assignment, parallel work, communication, dependencies, verification."
-->

---

## Parallel Work (Activity Log)

While agents work, hooks log every action to `agent-activity.log`:

```
21:26:01  TASK+    Add auth middleware with API key validation
21:26:01  TASK+    Add rate limiter — sliding window per sourceId
21:26:01  TASK+    Add stats endpoint — counts by channel and priority
21:26:02  SPAWN    general-purpose ...a1b2c3d4
21:26:02  SPAWN    general-purpose ...e5f6g7h8
21:26:03  SPAWN    general-purpose ...i9j0k1l2
21:26:10  WRITE    src/middleware/auth.ts
21:26:12  WRITE    src/services/rate-limiter.ts
21:26:13  EDIT     src/storage/sqlite.ts
21:26:15  WRITE    src/routes/stats.ts
21:26:20  WRITE    tests/auth.test.ts
21:26:22  WRITE    tests/rate-limiter.test.ts
21:26:25  WRITE    tests/stats.test.ts
```

Different files, same timestamps. **Parallel work is real.**

<!--
SPEAKER: "This is the activity log, powered by hooks. Look at the timestamps — auth.ts, rate-limiter.ts, stats.ts all being written within seconds of each other. Three agents, three files, simultaneously."
-->

---

## Agents Report Back

As each agent finishes, it messages the lead:

> **agent-ratelimit:** Task #2 done. Created rate-limiter.ts — sliding window per sourceId. 5 tests passing. Did not touch server.ts.

> **agent-stats:** Task #3 done. Added getNotificationStats to sqlite.ts, created stats route, registered in server.ts. 4 tests passing.

> **agent-auth:** Task #1 done. Created auth middleware. 4 unit tests + all 5 acceptance tests passing. Did not touch server.ts.

```
21:26:30  TASK✓    #1 completed
21:26:32  TASK✓    #2 completed
21:26:35  TASK✓    #3 completed
21:26:36  TASK→    #4 in_progress          ← unblocked!
21:26:40  EDIT     src/server.ts           ← wiring the pieces together
```

Task #4 was blocked. All three dependencies resolved. Now it starts.

<!--
SPEAKER: "Same as three PRs landing. Each dev says 'done, tests pass.' The integration ticket unblocks. The lead wires everything into server.ts — same as merging three PRs and resolving imports."
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

## The Verdict: 46/46

```
> npm run verify

 ✓ tests/templates.test.ts      (7 tests)
 ✓ tests/dedup.test.ts          (5 tests)
 ✓ tests/stats.test.ts          (4 tests)
 ✓ tests/dispatcher.test.ts     (7 tests)
 ✓ tests/acceptance.test.ts     (14 tests)    ← the human-written spec
 ✓ tests/auth.test.ts           (4 tests)
 ✓ tests/rate-limiter.test.ts   (5 tests)

 Test Files  7 passed (7)
      Tests  46 passed (46)
```

**14 acceptance tests — written by me, untouched by agents — all green.**

<!--
SPEAKER: "46 tests. 14 of those are the acceptance tests I wrote before the agents started. They didn't modify my spec — they wrote code that satisfies it. This is the quality gate. Same as your QA team signing off."
-->

---

## Before → After

| | Before | After |
|---|---|---|
| **Test files** | 3 | 7 |
| **Total tests** | 19 | 46 |
| **Source files** | 8 | 11 (+ auth.ts, rate-limiter.ts, stats.ts) |
| **Acceptance tests** | 14 failing | 14 passing |
| **Time** | — | ~5 minutes |
| **Lines I wrote** | the prompt + acceptance tests | — |
| **Lines agents wrote** | — | everything else |

The dev's role: **define the spec, write the prompt, steer as your team works, verify the output.**

<!--
SPEAKER: "I wrote the acceptance tests and the prompt. That's it. The agents wrote the middleware, the rate limiter, the stats endpoint, the storage query, the unit tests, the wiring. My job was to define what 'done' looks like and verify they got there."
-->

---

## What You Just Saw

1. **Acceptance tests first** — the spec, not the implementation
2. **One prompt** — the task brief, same as a Jira description
3. **Task breakdown** — lead plans before anyone codes
4. **Parallel agents in worktrees** — isolated, like feature branches
5. **Activity hooks** — full observability into the process
6. **Dependency resolution** — blocked tasks unblock automatically
7. **External verification** — agents pass tests they didn't write

**The workflow is the same. The speed is different.**

<!--
SPEAKER: "The process maps 1:1 to how your team works. The difference is time — three agents in 5 minutes instead of three devs in a sprint."
-->

---

<!-- _class: dark -->

## Try It Yourself

```bash
# Clone and install
git clone <notify-service-repo-url>
cd notify-service
npm install

# Run the failing acceptance tests (the "before")
npx vitest run tests/acceptance.test.ts

# Open two terminals side by side
# Terminal 1:
claude

# Terminal 2 (observability):
bash demo/observe.sh

# Paste the prompt from demo/prompt.txt
# Watch the agents work
```

Everything you need is in the repo: prompt, hooks, acceptance tests, reset script.

<!--
SPEAKER: "The repo has everything. Clone it, run the acceptance tests to see them fail, paste the prompt, watch the agents. The hooks are pre-configured — you'll see the activity log in real time. After the demo, run bash demo/reset.sh to start fresh."
-->
