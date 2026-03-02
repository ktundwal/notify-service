# Demo Playbook: Agent Teams = Human Teams

> Demonstrates how Claude Code agent teams mirror human engineering teams.
> Audience: developers who already know Claude Code basics (show repo, give task, steer with prompts).

---

## The Teaching Point

Students know how human teams work:

1. Lead understands the task, asks clarifying questions
2. Lead breaks the task into subtasks
3. Assigns work that can start immediately — in parallel
4. Devs claim tasks and start working (1 dev per task)
5. Devs ask the lead questions, lead checks on progress, devs talk to each other
6. As tasks complete: definition of done, code committed, task marked done, next task picked up
7. Blocked tasks unblock as dependencies resolve

Claude Code agent teams do the exact same thing. This demo makes that visible.

---

## What the Audience Sees

Two terminals side-by-side:

```
┌─────────────────────────────┐  ┌─────────────────────────────┐
│ Terminal 1: Claude Code     │  │ Terminal 2: Activity Log     │
│                             │  │                              │
│ The "standup" — what the    │  │ The "CI dashboard" — what's  │
│ team is doing right now     │  │ happening under the hood     │
│                             │  │                              │
│ Shows: agent spawns,        │  │ Shows: task lifecycle,       │
│ messages, task status,      │  │ file edits, agent spawns,    │
│ Claude's thinking           │  │ messages — timestamped       │
└─────────────────────────────┘  └─────────────────────────────┘
```

Terminal 1 is what Claude Code normally shows. Terminal 2 is the transparency layer — powered by hooks that log every tool call to `agent-activity.log`.

---

## Setup (2 min before demo)

### Prerequisites

- Claude Code installed and authenticated
- `jq` installed (`jq --version`)
- `notify-service` project cloned with `npm install` done

### Terminal 1: Claude Code

```bash
cd C:/github/notify-service
> agent-activity.log          # clear any previous log
claude
```

### Terminal 2: Activity Observer

```bash
cd C:/github/notify-service
bash demo/observe.sh
```

### Verify hooks are active

The project ships with `.claude/settings.json` that configures three hooks:
- **PostToolUse** — logs TaskCreate, TaskUpdate, SendMessage, Edit, Write, Bash
- **SubagentStart** — logs when agents spawn
- **SubagentStop** — logs when agents finish

If the observer terminal stays empty after you start working in Claude Code, check:
1. `.claude/settings.json` exists in the project root
2. `jq` is installed
3. `hooks/activity-logger.sh` is readable
4. Claude Code was started FROM the project root (not a parent directory)

---

## The Prompt

Paste this into Claude Code (Terminal 1). The full text is in `demo/prompt.txt`.

```
Add three features to this notification service. Create a team of 3 agents
to work in parallel.

1. Auth middleware — Create src/middleware/auth.ts. Validate an X-API-Key
   header on all /webhooks routes. Valid keys: ["notify-dev-key",
   "notify-prod-key"]. Return 401 JSON error for missing or invalid keys.
   Write tests in tests/auth.test.ts.

2. Rate limiter — Create src/services/rate-limiter.ts. In-memory sliding
   window: max 100 requests per minute per sourceId. Apply to POST
   /webhooks/notify only. Return 429 with a Retry-After header when
   exceeded. Write tests in tests/rate-limiter.test.ts.

3. Stats endpoint — Create src/routes/stats.ts. GET /stats returns
   notification counts grouped by channel and priority for the last hour.
   Add the query to src/storage/sqlite.ts. Register the route in server.ts.
   Write tests in tests/stats.test.ts.

After all three features are implemented, wire the auth middleware and rate
limiter into server.ts. Run npm run verify to confirm everything passes.
```

---

## What Happens (and What to Say)

### Phase 1: Understanding (0:00 – 0:30)

**What Claude does:** Reads CLAUDE.md, explores the codebase, understands the architecture.

**Activity log shows:** Nothing yet — Read/Glob aren't logged (they're reconnaissance, not action).

**Say:** "Watch — same thing a new dev does on day one. Reads the project docs, browses the code. It's building a mental model before writing anything."

---

### Phase 2: Task Breakdown (0:30 – 1:00)

**What Claude does:** Creates a team, creates tasks with dependencies, assigns agents.

**Activity log shows:**
```
17:44:01  TASK+    Add auth middleware with API key validation
17:44:01  TASK+    Add rate limiter — sliding window per sourceId
17:44:01  TASK+    Add stats endpoint — counts by channel and priority
17:44:02  TASK+    Wire auth + rate limiter into server.ts
17:44:02  TASK→    #1 in_progress → agent-auth
17:44:02  TASK→    #2 in_progress → agent-ratelimit
17:44:02  TASK→    #3 in_progress → agent-stats
```

**Say:** "It just broke the work into tasks. Look at the log — three tasks created, each assigned to a different agent. And notice the fourth task, 'wire into server.ts.' That one is blocked until all three features are done. That's a dependency graph — same thing you'd put on your sprint board."

**Teaching point:** `TaskCreate` = creating Jira tickets. `blockedBy` = dependency links. The lead doesn't start coding — it plans first.

---

### Phase 3: Agent Spawn (1:00 – 1:15)

**What Claude does:** Spawns 2-3 agents, each in their own context window.

**Activity log shows:**
```
17:44:03  SPAWN    general-purpose ...a1b2c3d4
17:44:03  SPAWN    general-purpose ...e5f6g7h8
17:44:04  SPAWN    general-purpose ...i9j0k1l2
```

**Say:** "Three agents just spawned. Each has its own context window — they can't see each other's work unless they send a message. Same as three devs on your team working in three different VS Code windows."

**Teaching point:** Separate context windows = no interference. Agent A changing auth code doesn't confuse Agent B working on rate limiting.

---

### Phase 4: Parallel Work (1:15 – 3:00)

**What Claude does:** Agents read existing files, create new files, write implementations, write tests.

**Activity log shows:**
```
17:44:10  WRITE    src/middleware/auth.ts
17:44:12  WRITE    src/services/rate-limiter.ts
17:44:13  EDIT     src/storage/sqlite.ts
17:44:15  WRITE    src/routes/stats.ts
17:44:20  WRITE    tests/auth.test.ts
17:44:22  WRITE    tests/rate-limiter.test.ts
17:44:25  WRITE    tests/stats.test.ts
```

**Say:** "All three working simultaneously. Look at the log — different files being written by different agents. auth.ts, rate-limiter.ts, stats.ts — all in parallel. One dev per feature, no stepping on each other's toes."

**If agents communicate:**
```
17:44:18  MSG      → lead: Auth middleware done, tests passing
```

**Say:** "See that message? The auth agent just told the lead it's done. Same as posting in your team's channel: 'PR ready for review.'"

**Teaching point:** The EDIT/WRITE lines are the proof that parallel work is real. Different files, same timestamps.

---

### Phase 5: Completion + Wiring (3:00 – 4:00)

**What Claude does:** Tasks marked complete, blocked task unblocks, lead (or an agent) integrates.

**Activity log shows:**
```
17:44:30  TASK✓    #1 completed
17:44:32  TASK✓    #2 completed
17:44:35  TASK✓    #3 completed
17:44:36  TASK→    #4 in_progress
17:44:40  EDIT     src/server.ts
```

**Say:** "Tasks 1, 2, 3 done. The 'wire up' task just unblocked — now it's integrating everything into server.ts. This is the merge step. In your team, this would be the tech lead merging three PRs and resolving any integration issues."

**Teaching point:** Task #4 was blocked by tasks #1, #2, #3. It couldn't start until all dependencies resolved. Same as "don't merge the integration PR until all feature PRs are in."

---

### Phase 6: Verification (4:00 – 5:00)

**What Claude does:** Runs `npm run verify` (tsc --noEmit + vitest run).

**Activity log shows:**
```
17:44:45  BASH     Run verification: tsc + vitest
```

**Say:** "Definition of done: type check passes, all tests pass. Same as your CI pipeline. And it knew to run `npm run verify` because that's in CLAUDE.md — the project's 'how to contribute' doc."

---

## The 1:1 Mapping (Recap Slide)

| Human Team | What You Just Saw |
|---|---|
| New dev reads the wiki | Lead read CLAUDE.md |
| Lead creates Jira tickets | TaskCreate → task list |
| Lead assigns parallel work | TaskUpdate with owner → agents |
| 3 devs work simultaneously | 3 agents editing different files |
| Dev posts in team channel | SendMessage → lead |
| Ticket closed, PR merged | TaskUpdate → completed |
| Blocked tickets unblock | blockedBy dependencies resolve |
| CI pipeline runs green | `npm run verify` passes |

---

## After the Demo

```bash
# In Terminal 1, exit Claude Code
> /exit

# Reset everything
bash demo/reset.sh
```

This reverts all file changes, removes untracked files, and clears the activity log.

---

## Troubleshooting

**Hooks not logging:**
- Verify: `jq --version` (must be installed)
- Verify: `cat .claude/settings.json` (must exist and reference hooks/activity-logger.sh)
- Restart Claude Code from the project root

**Agents not spawning:**
- The prompt explicitly says "Create a team of 3 agents." If Claude solves it alone, re-prompt: "Use a team of 3 agents to parallelize this."
- Check you're on a model that supports teams (Opus or Sonnet)

**Takes too long (> 5 min):**
- Live AI — say "This is real-time. In practice, you start the agents and go get coffee."
- If truly stuck > 3 min on one phase, `/exit` and show the activity log you already captured. The log tells the story even without the live terminal.

**Agent hits an error:**
- Say "One agent hit an issue — that happens. In a human team, a dev would ping the lead. Watch what happens next." (Usually the lead or agent self-corrects.)
- If it doesn't recover, this is actually a good teaching moment: "This is why you review agent output. Trust but verify."

**verify fails after wiring:**
- Expected sometimes — integration isn't trivial. Say "The integration step found a type error. Watch — it'll fix it and re-run. Same as your CI catching a merge conflict."

---

## Timing

| Phase | Duration | Cumulative |
|---|---|---|
| Setup (before demo) | 2 min | — |
| Understanding | 0:30 | 0:30 |
| Task breakdown | 0:30 | 1:00 |
| Agent spawn | 0:15 | 1:15 |
| Parallel work | 1:45 | 3:00 |
| Completion + wiring | 1:00 | 4:00 |
| Verification | 1:00 | 5:00 |

Total demo time: ~5 minutes. Budget 7-8 min to account for AI variability.
