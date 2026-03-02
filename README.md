# Learn Claude Code Agent Teams

A hands-on exercise that teaches how Claude Code agent teams work — by showing they work exactly like human engineering teams.

You'll give a team of 3 AI agents a real feature request, watch them break it down, work in parallel on isolated branches, communicate, and ship — while you observe every step through an activity log.

## Prerequisites

- **Claude Code** installed and authenticated (`claude --version`)
- **Node.js** 18+ (`node --version`)
- **jq** installed (`jq --version`) — used by the observability hooks
- **Git** initialized (this repo)

## Setup

```bash
git clone <repo-url>
cd notify-service
npm install
```

Verify the project works:

```bash
npm run verify
```

You should see 19 tests passing across 3 files. This is the starting state.

## The Exercise

### What you're building

notify-service is a Teams-style notification hub. Services push alerts (deploys, incidents, CI failures), engineers subscribe to channels, and it respects quiet hours.

Three features need to be added:
1. **Auth middleware** — API key validation on webhook routes
2. **Rate limiter** — 100 requests per minute per source, sliding window
3. **Stats endpoint** — notification counts by channel and priority

### What makes this interesting

You won't write the code. You'll direct a team of 3 agents to build it — using the same workflow your engineering team uses: task breakdown, parallel work, isolated branches, acceptance criteria, and CI verification.

## Step-by-Step

### Step 1: See the spec (2 min)

Before agents touch anything, look at the acceptance tests — the spec you're giving them.

```bash
# Read the acceptance test file
cat tests/acceptance.test.ts

# Run them — all 14 should fail (the code doesn't exist yet)
npx vitest run tests/acceptance.test.ts
```

You'll see 14 failures, all saying "module not found." That's the starting line.

### Step 2: Open two terminals side by side (1 min)

```
┌─────────────────────────────┐  ┌─────────────────────────────┐
│ Terminal 1: Claude Code     │  │ Terminal 2: Activity Log     │
│ (where agents work)        │  │ (observability into process) │
└─────────────────────────────┘  └─────────────────────────────┘
```

**Terminal 1:**
```bash
cd notify-service
> agent-activity.log       # clear any previous log
claude
```

**Terminal 2:**
```bash
cd notify-service
bash demo/observe.sh
```

Terminal 2 tails the activity log. You'll see task creation, agent spawns, file edits, and messages appear in real time — powered by hooks configured in `.claude/settings.json`.

### Step 3: Paste the prompt (1 min)

Copy the contents of `demo/prompt.txt` and paste it into Claude Code (Terminal 1).

The prompt asks Claude to:
- Create a team of 3 agents
- Each agent works in its own git worktree (isolated branch)
- Each builds one feature with unit tests
- After all three finish, wire everything into server.ts
- Definition of done: `npm run verify` passes, including the acceptance tests

### Step 4: Watch (5-8 min)

This is where you observe. Here's what happens and what to look for:

**Phase 1 — Lead plans (~30s)**
The lead agent reads CLAUDE.md, explores the codebase, then creates tasks.
- Terminal 2 shows: `TASK+` lines (tasks being created)
- Look for: 4 tasks, where task #4 is blocked by #1, #2, #3

**Phase 2 — Agents spawn (~15s)**
Three agents start, each in its own git worktree.
- Terminal 2 shows: `SPAWN` lines
- Look for: 3 separate agents, each assigned to a task

**Phase 3 — Parallel work (~2 min)**
All three agents work simultaneously on different files.
- Terminal 2 shows: `WRITE` and `EDIT` lines with close timestamps
- Look for: auth.ts, rate-limiter.ts, stats.ts being written at the same time

**Phase 4 — Agents report back (~30s)**
As each agent finishes, it messages the lead.
- Terminal 1 shows: completion messages with test results
- Terminal 2 shows: `MSG` and `TASK✓` lines

**Phase 5 — Integration (~1 min)**
Task #4 unblocks. The lead wires auth + rate limiter into server.ts.
- Terminal 2 shows: `TASK→ #4 in_progress`, then `EDIT server.ts`

**Phase 6 — Verification (~1 min)**
The lead runs `npm run verify`.
- Terminal 1 shows: 46/46 tests passing (including your 14 acceptance tests)
- Terminal 2 shows: `BASH` line for the verify command

### Step 5: Inspect the results

After Claude finishes, look at what was created:

```bash
# See all new and modified files
git status

# Check the acceptance tests pass
npx vitest run tests/acceptance.test.ts

# Look at what the agents wrote
cat src/middleware/auth.ts
cat src/services/rate-limiter.ts
cat src/routes/stats.ts
```

## Reset and Repeat

To go back to the starting state and run the exercise again:

```bash
# Exit Claude Code first
# Then:
bash demo/reset.sh
```

This reverts all file changes, removes files created by agents, and clears the activity log. You're back to 19 tests, 14 failing acceptance tests, ready to go again.

## What to Notice

### The 1:1 parallel with human teams

| How Your Team Works | How Agent Teams Work |
|---|---|
| New dev reads the wiki | Lead reads CLAUDE.md |
| Lead creates ADO items | TaskCreate → task list |
| Lead assigns to devs | TaskUpdate with owner |
| Each dev gets a feature branch | Each agent gets a git worktree |
| 3 devs work simultaneously | 3 agents write different files |
| Dev posts in team channel | SendMessage → lead |
| Acceptance criteria in ADO item | tests/acceptance.test.ts |
| Work item closed, PR merged | TaskUpdate → completed |
| Blocked items unblock | blockedBy dependencies resolve |
| CI pipeline runs green | `npm run verify` passes |

### Three concepts to take away

1. **Acceptance tests = external quality gate.** Agents write their own unit tests (grading their own homework). The acceptance tests are YOUR spec — agents can't modify them, only satisfy them.

2. **Git worktrees = feature branches for agents.** Each agent gets an isolated copy of the repo. No file conflicts during parallel work. Changes merge back on completion.

3. **Hooks = observability.** The activity log isn't magic — it's a shell script that runs on every tool call. You can customize what gets logged, add alerts, or pipe to any monitoring system.

## Project Structure

```
notify-service/
├── src/                        ← the application code
│   ├── server.ts
│   ├── types/index.ts
│   ├── routes/
│   ├── services/
│   └── storage/
├── tests/
│   ├── acceptance.test.ts      ← YOUR spec (14 tests, do not modify)
│   ├── templates.test.ts       ← existing unit tests
│   ├── dedup.test.ts
│   └── dispatcher.test.ts
├── demo/
│   ├── prompt.txt              ← the exact prompt to paste
│   ├── observe.sh              ← tails the activity log
│   ├── reset.sh                ← reverts everything for a fresh run
│   └── README.md               ← detailed playbook (presenter notes)
├── hooks/
│   └── activity-logger.sh      ← the observability hook
├── scripts/
│   └── seed.ts                 ← populate sample data
├── .claude/
│   └── settings.json           ← hook configuration (auto-enabled)
├── CLAUDE.md                   ← project context for Claude Code
├── deck.md                     ← Marp slide deck (tutorial)
└── package.json
```

## Troubleshooting

**`npm install` fails on better-sqlite3**
This package requires native compilation. Make sure you have build tools:
- Windows: `npm install --global windows-build-tools` or install Visual Studio Build Tools
- Mac: `xcode-select --install`

**Hooks not logging (Terminal 2 stays empty)**
1. Check jq is installed: `jq --version`
2. Check the settings file exists: `cat .claude/settings.json`
3. Check the hook script is readable: `cat hooks/activity-logger.sh`
4. Make sure you started Claude Code FROM the project root (`cd notify-service && claude`), not a parent directory

**Agents don't spawn / Claude does it alone**
The prompt says "Create a team of 3 agents." If Claude handles it without a team, add: "Use a team of 3 agents to parallelize this — one agent per feature."

**One agent stalls or errors**
Normal. Say "Continue" or let the lead reassign. Agents self-correct most of the time. If stuck, `/exit` and run `bash demo/reset.sh` to start fresh.

**`npm run verify` fails after agents finish**
Usually a wiring issue in server.ts. The lead should fix it automatically. If not, check:
- auth middleware imported and applied to `/webhooks` routes
- rate limiter imported and applied to `POST /webhooks/notify`
- stats route imported and registered at `/stats`

**Acceptance tests fail but unit tests pass**
The agents' code exists but doesn't match the spec. Check the error messages — they'll tell you exactly what's wrong (wrong status code, missing header, wrong response shape). The lead should iterate until acceptance tests pass.

**Want to see what the agents wrote?**
After the exercise, before resetting:
```bash
git diff                    # changes to existing files
git status                  # new files created
cat src/middleware/auth.ts   # read any specific file
```

**Want to try a different prompt?**
Edit `demo/prompt.txt` or type your own. The acceptance tests still define "done" regardless of how you phrase the request. Try being more or less specific and see how the output changes.
