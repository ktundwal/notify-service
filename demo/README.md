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

## Six Concepts Beyond "Give It a Prompt"

### 1. Acceptance Tests = External Quality Gate

The agents write their own unit tests — but they're grading their own homework. `tests/acceptance.test.ts` is written by the human before the agents start. It validates the exact behavior specified in the prompt. Agents cannot modify it — they can only make it pass.

**Human parallel:** Your team has a QA spec or acceptance criteria in the ticket. Devs don't write those — they write code that satisfies them.

### 2. Git Worktrees = Each Dev Gets Their Own Branch

Without worktrees, all agents edit the same working directory. That works when they touch different files, but if two agents edit the same file, they clobber each other.

With worktrees (`isolation: "worktree"` on the Agent tool), each agent gets a **full isolated copy of the repo** on its own branch. They work independently, then their changes get merged back.

**Human parallel:** Three devs working on three feature branches, not one shared desktop.

### 3. Hooks = Observability

Hooks log every tool call to `agent-activity.log`. You see task creation, file edits, agent messages — all timestamped. It's the "CI dashboard" view into the team's work.

**Human parallel:** Your team's Slack channel + CI pipeline + Jira board, combined into one stream.

### 4. Operational Artifacts = On-Call Readiness

The on-call agent reads the acceptance tests — the spec — and writes a runbook (`docs/oncall-playbook.md`) from the contract. It doesn't wait for the feature code. Same as your on-call engineer reading the Jira ticket and updating the playbook before the feature even ships.

**Human parallel:** Your on-call writes runbook entries from acceptance criteria, not from implementation details.

### 5. Docs Are Part of "Done"

The librarian task runs after features are wired and updates CLAUDE.md with new endpoints and architecture. If the API changed and the docs didn't, the work isn't finished. The acceptance tests verify this — they check that CLAUDE.md mentions the new endpoints.

**Human parallel:** Your team's definition of done includes updating the wiki. If the docs are stale, the PR isn't mergeable.

### 6. Non-Coding Agent Roles = Product Review

The PO agent reviews the dashboard (`src/public/index.html`) from a user's perspective after features are wired. It writes `docs/ux-review.md` covering error states, layout, and feature representation. Agents aren't just coders — they fill any team role that works from text artifacts.

**Human parallel:** Your PO reviews the feature after it ships and files UX feedback. Same role, same timing, same artifact.

---

## What the Audience Sees

Three terminals side-by-side:

```
┌───────────────────────┐  ┌───────────────────────┐  ┌───────────────────────┐
│ Terminal 1:            │  │ Terminal 2:            │  │ Terminal 3:            │
│ Claude Code            │  │ Activity Log           │  │ Worktrees & Files      │
│                        │  │                        │  │                        │
│ The "standup" — what   │  │ The "CI dashboard" —   │  │ The "branch view" —    │
│ the team is doing now  │  │ what's happening under │  │ watch worktrees appear │
│                        │  │ the hood               │  │ as agents spawn        │
│ Shows: agent spawns,   │  │ Shows: task lifecycle,  │  │                        │
│ messages, task status  │  │ file edits, timestamps │  │ Shows: git worktree    │
│                        │  │                        │  │ list refreshing live   │
└───────────────────────┘  └───────────────────────┘  └───────────────────────┘
```

---

## Setup (2 min before demo)

### Prerequisites

- Claude Code installed and authenticated
- `jq` installed (`jq --version`)
- `notify-service` project cloned with `npm install` done
- Repo is clean (`git status` shows nothing)

> Agent teams is experimental. The project's `.claude/settings.json` sets `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` automatically. If attendees clone the repo, it just works — no manual env var needed.

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

### Terminal 3: Worktree Watcher

```bash
cd C:/github/notify-service
watch -n 2 git worktree list
```

Shows worktrees appearing as agents spawn and disappearing as they complete. Visual proof of "each dev gets their own branch."

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

### Show acceptance tests before pasting the prompt

Before you paste the prompt, show the audience the acceptance test file:

```
> Read tests/acceptance.test.ts and tell me what it expects
```

Claude will summarize: "27 acceptance tests that check auth middleware rejects bad keys, rate limiter returns 429, stats endpoint groups by channel/priority, and on-call playbook documents all three features."

**Say:** "These tests were written by me, not the agents. This is the spec — same as acceptance criteria in a Jira ticket. The agents can't modify this file. They have to write code that makes it pass."

Then run the acceptance tests to show they fail:

```
> Run npx vitest run tests/acceptance.test.ts
```

**Say:** "27 failures. The code doesn't exist yet. The agents' job is to make these pass."

---

## The Prompt

Now paste this into Claude Code. Full text in `demo/prompt.txt`.

Full text in `demo/prompt.txt`. It asks for 4 agents (3 features + on-call playbook), wiring, optional cross-model review, and `npm run verify` as definition of done.

---

## What Happens (and What to Say)

### Phase 1: Understanding (0:00 – 0:30)

**What Claude does:** Reads CLAUDE.md, explores the codebase, reads the acceptance tests to understand what it needs to build.

**Activity log shows:** Nothing yet — Read/Glob aren't logged (they're reconnaissance, not action).

**Say:** "Watch — same thing a new dev does on day one. Reads the project docs, browses the code. And notice — it's reading the acceptance tests. It's reading the spec before writing code. That's the behavior you want."

---

### Phase 2: Task Breakdown (0:30 – 1:00)

**What Claude does:** Creates a team, creates tasks with dependencies, assigns agents.

**Activity log shows:**
```
17:44:01  TASK+    Add auth middleware with API key validation
17:44:01  TASK+    Add rate limiter — sliding window per sourceId
17:44:01  TASK+    Add stats endpoint — counts by channel and priority
17:44:02  TASK+    Wire auth + rate limiter into server.ts
17:44:02  TASK+    Write on-call playbook from acceptance test spec
17:44:02  TASK+    Librarian — update CLAUDE.md with new endpoints
17:44:02  TASK+    Product review — UX review of notification dashboard
17:44:02  TASK→    #1 in_progress → agent-auth
17:44:02  TASK→    #2 in_progress → agent-ratelimit
17:44:02  TASK→    #3 in_progress → agent-stats
17:44:02  TASK→    #5 in_progress → agent-oncall
```

**Say:** "It broke the work into 7 tasks. Three features in parallel, an on-call playbook in parallel, wiring blocked until features are done, then a librarian and PO review both blocked until wiring is done. That's a dependency graph — same as your sprint board."

**Teaching point:** The lead doesn't start coding — it plans first, creates the task board, then delegates. Notice the dependency chain: features → wiring → librarian + PO review. The on-call task has no dependencies — it reads the spec, not the implementation.

---

### Phase 3: Agent Spawn + Worktrees (1:00 – 1:15)

**What Claude does:** Spawns 4 agents, each in their own git worktree.

**Activity log shows:**
```
17:44:03  SPAWN    general-purpose ...a1b2c3d4
17:44:03  SPAWN    general-purpose ...e5f6g7h8
17:44:04  SPAWN    general-purpose ...i9j0k1l2
17:44:04  SPAWN    general-purpose ...m3n4o5p6
```

**Say:** "Four agents spawned, each in its own git worktree. Three for features, one for the on-call playbook. Same as your team — three devs on features and an on-call engineer writing the runbook."

**Terminal 3:** Point to the worktree watcher — it now shows 5 entries (main + 4 agent worktrees). "See — four new worktrees just appeared. Each agent has its own copy of the repo."

**Teaching point:** Worktrees = feature branches. Each agent gets a full, independent working directory. When they're done, changes merge back. The on-call agent is already reading the acceptance tests — the spec — and writing the runbook from the contract.

---

### Phase 4: Parallel Work (1:15 – 3:00)

**What Claude does:** Agents read existing files, create new modules, write implementations and tests. The on-call agent reads `tests/acceptance.test.ts` and writes `docs/oncall-playbook.md`.

**Activity log shows:**
```
17:44:10  WRITE    src/middleware/auth.ts
17:44:11  WRITE    docs/oncall-playbook.md
17:44:12  WRITE    src/services/rate-limiter.ts
17:44:13  EDIT     src/storage/sqlite.ts
17:44:15  WRITE    src/routes/stats.ts
17:44:20  WRITE    tests/auth.test.ts
17:44:22  WRITE    tests/rate-limiter.test.ts
17:44:25  WRITE    tests/stats.test.ts
```

**Say:** "All four working simultaneously. Look at the log — different files, same timestamps. auth.ts, rate-limiter.ts, stats.ts, and the on-call playbook written in parallel. The on-call agent is reading the acceptance tests — the spec — and writing the runbook from the contract. Same as your on-call engineer reading the Jira ticket and updating the playbook before the feature even ships."

**If agents communicate:**
```
17:44:18  MSG      → lead: Auth middleware done, tests passing
```

**Say:** "The auth agent just told the lead it's done. Same as posting in your team channel: 'PR ready for review.'"

---

### Phase 5: Completion + Wiring (3:00 – 4:00)

**What Claude does:** Tasks marked complete, blocked task unblocks, lead integrates changes and wires everything into server.ts.

**Activity log shows:**
```
17:44:28  TASK✓    #5 completed
17:44:30  TASK✓    #1 completed
17:44:32  TASK✓    #2 completed
17:44:35  TASK✓    #3 completed
17:44:36  TASK→    #4 in_progress
17:44:40  EDIT     src/server.ts
17:44:42  TASK✓    #4 completed
17:44:43  TASK→    #6 in_progress
17:44:43  TASK→    #7 in_progress
17:44:45  EDIT     CLAUDE.md
17:44:47  WRITE    docs/ux-review.md
```

**Say:** "Notice the on-call playbook finished first — it had no dependencies, just reading the spec and writing docs. All three features done. The wiring task just unblocked. Now it's integrating into server.ts — importing the middleware, mounting the routes. And watch — after wiring completes, TWO tasks unblock: the librarian updates CLAUDE.md, and the PO agent reviews the dashboard. Different roles, same team, same workflow."

---

### Phase 6: Verification (4:00 – 5:00)

**What Claude does:** Runs `npm run verify` — type check + ALL tests including acceptance.

**Activity log shows:**
```
17:44:45  BASH     Run verification: tsc + vitest
```

**Say:** "Definition of done. Type check passes, their unit tests pass, AND the acceptance tests I wrote pass. 27 acceptance tests that I wrote before the agents started — 5 for the on-call playbook, 4 that verify the librarian updated CLAUDE.md, and 4 that verify the PO wrote a UX review. They didn't modify the spec — they wrote code, docs, and reviews that satisfy it. Same as your QA team signing off."

---

### Phase 7: Cross-Model Review *(optional)* (5:00 – 7:00)

> **Skip this phase if Copilot CLI isn't installed.** The exercise is complete after Phase 6.

**What Claude does:** Runs `/crossmodel-review` on each of the three feature files. Google and OpenAI models review the code independently, then the lead synthesizes the feedback.

**What the audience sees:**
```
17:44:50  BASH     copilot --model gemini-3-pro -p "..." -s --no-color
17:44:50  BASH     copilot --model gpt-5.2-codex -p "..." -s --no-color
17:45:10  BASH     copilot --model gemini-3-pro -p "..." -s --no-color
17:45:10  BASH     copilot --model gpt-5.2-codex -p "..." -s --no-color
```

**Say:** "Now it's getting a second opinion. Two different AI models — one from Google, one from OpenAI — are reviewing the code the Claude agents just wrote. Same reason you get a peer review from someone outside your team. Where they agree, high confidence. Where they disagree, that's for you to judge."

**Teaching point:** Cross-model review catches blind spots. A model reviewing its own output is like grading your own homework. Different models have different strengths and failure modes. This is the AI equivalent of "get a second pair of eyes."

**If the review finds real issues:** "The review caught something. Watch — the lead is fixing it and re-running verification. Same as addressing PR comments."

**If the review is clean:** "Clean review. The agents wrote solid code. But the value is in the *process* — you now have evidence that two independent models agree. That's stronger than one model saying 'looks good to me.'"

---

## The 1:1 Mapping (Recap Slide)

| Human Team | What You Just Saw |
|---|---|
| New dev reads the wiki | Lead read CLAUDE.md |
| Lead creates Jira tickets | TaskCreate → task list |
| Lead assigns parallel work | TaskUpdate with owner → agents |
| Each dev gets a feature branch | Each agent gets a git worktree |
| 3 devs + 1 on-call work simultaneously | 4 agents editing different files |
| On-call writes runbook from ticket | On-call agent writes playbook from acceptance tests |
| Docs updated after feature ships | Librarian updates CLAUDE.md after wiring |
| PO reviews the UX | PO agent writes docs/ux-review.md |
| Dev posts in team channel | SendMessage → lead |
| Acceptance criteria in ticket | tests/acceptance.test.ts (human-written) |
| Ticket closed, PR merged | TaskUpdate → completed, worktree merged |
| Blocked tickets unblock | blockedBy dependencies resolve |
| CI pipeline runs green | `npm run verify` passes (including acceptance) |
| Peer review from another team | Cross-model review via Copilot CLI *(optional)* |

---

## Tutor Agent

The repo ships with a read-only tutor agent (`.claude/agents/tutor.md`) that attendees can run in a 4th terminal:

```bash
claude --agent tutor
```

It knows the tutorial structure, the 3 features, the acceptance test spec, the activity log format, and common failure modes. It guides without writing code — explains concepts, interprets log entries, and suggests what to check.

**When to mention it:** After the demo starts, if attendees look stuck or confused. Say: "If you're stuck, open a 4th terminal and run `claude --agent tutor`. It's a read-only helper that can answer questions about what's happening."

The tutor uses Sonnet (fast, cheap) and has no write/edit/bash access — it can only read the codebase and answer questions.

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
- The prompt explicitly says "Create a team of 4 agents." If Claude solves it alone, re-prompt: "Use a team of 4 agents to parallelize this — one per feature plus one for the on-call playbook."
- Check you're on a model that supports teams (Opus or Sonnet)

**Worktrees not created:**
- Worktrees require git to be initialized (`git init` or cloned repo)
- Claude may choose not to use worktrees if the files are independent enough — this is fine, it just means the agents don't need isolation for this particular task

**Takes too long (> 5 min):**
- Live AI — say "This is real-time. In practice, you start the agents and go get coffee."
- If truly stuck > 3 min on one phase, `/exit` and show the activity log you already captured. The log tells the story even without the live terminal.

**Agent hits an error:**
- Say "One agent hit an issue — that happens. In a human team, a dev would ping the lead. Watch what happens next." (Usually the lead or agent self-corrects.)
- If it doesn't recover: "This is why you review output. Trust but verify."

**verify fails after wiring:**
- Expected sometimes — integration isn't trivial. Say "The integration step found a type error. Watch — it'll fix it and re-run. Same as your CI catching a merge conflict."

**Acceptance tests fail but unit tests pass:**
- Great teaching moment: "The agents' own tests pass, but the acceptance tests I wrote caught a behavioral issue. This is exactly why you have external quality gates."

---

## Timing

| Phase | Duration | Cumulative |
|---|---|---|
| Setup (before demo) | 2 min | — |
| Show acceptance tests | 1:00 | 1:00 |
| Paste prompt | — | 1:00 |
| Understanding | 0:30 | 1:30 |
| Task breakdown | 0:30 | 2:00 |
| Agent spawn | 0:15 | 2:15 |
| Parallel work | 1:45 | 4:00 |
| Completion + wiring | 1:00 | 5:00 |
| Verification | 1:00 | 6:00 |
| Cross-model review *(optional)* | 2:00 | 8:00 |

Total demo time: ~6 minutes without review, ~8 with. Budget 10 min to account for AI variability.
