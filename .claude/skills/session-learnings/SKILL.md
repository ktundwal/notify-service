---
name: session-learnings
description: "Capture learnings from any AI coding session as portable, searchable artifacts: investigation log, README summary, chat transcript, Marp presentation deck (PPTX + HTML), and MEMORY.md update. Use at the end of a productive session."
argument-hint: "[topic-name]"
allowed-tools: Bash Read Write Edit Glob Grep AskUserQuestion Skill
---

# Session Learnings — End-of-Session Knowledge Capture

Capture the knowledge, decisions, dead ends, and breakthroughs from the current AI session as portable, searchable artifacts. Designed to ensure valuable debugging strategies, failed approaches, and reusable patterns survive beyond the ephemeral chat session.

The user invokes this skill as `/session-learnings [topic-name]`. The topic name is available as `$ARGUMENTS`.

## Workflow

### 1. Gather session context

If `$ARGUMENTS` is empty, ask the user:
- What was the **topic or goal** of this session? (used for folder naming, e.g. "mem-leak-fix", "auth-refactor")

Then scan the current conversation to identify:
- **Key findings and decisions** — What was discovered, what approach was chosen and why
- **Dead ends** — What was tried and didn't work (these are valuable for future sessions)
- **Tools and techniques used** — Which agents, repos, commands, workflows were employed
- **Breakthroughs** — The moment(s) that cracked the problem
- **Open questions** — What remains unresolved or needs follow-up

### 2. Determine output directory

First, check the project's MEMORY.md for a saved session-learnings output path. Look for a line like:
```
- **Session artifacts go to `<path>`**
```
or a key like `session-learnings-output-dir` in MEMORY.md.

**If a saved path is found:** Use it as the default. Confirm with the user:
> "Previous sessions saved learnings to `<saved-path>`. Use the same location?"
> - **Yes** (Recommended)
> - **Choose a different location**

**If no saved path is found:** Ask the user:
> "Where should I write the session artifacts? (Tip: choose a cloud-synced folder like OneDrive so learnings are available across machines.)"
> - **Central directory** (Recommended) — e.g. `~/ai-session-learnings/{date}-{topic}/`
> - **Subfolder in current workspace** — `./session-learnings/{date}-{topic}/`

After the user chooses, **save their choice to MEMORY.md** so future sessions remember it automatically. Add a line like:
```
- **Session artifacts go to `<chosen-path>\{date}-{topic}/`**
```

This ensures the preference survives `git pull` updates to this skill — it lives in MEMORY.md, not SKILL.md.

Use the date format `YYYY-MM-DD` and the topic name from step 1 (kebab-case, lowercase).

Create the output directory.

### 3. Generate README.md

Create `README.md` in the output directory with this structure:

```markdown
# Session: {Topic Title}

**Date:** {YYYY-MM-DD}
**Status:** {Completed | In Progress | Blocked}
**Tags:** {comma-separated tags, e.g. memory-leak, react, teams, multi-agent}

## Summary

{2-3 sentence summary of what the session accomplished}

## Key Outcome

{The main result: a fix, a finding, a PR, a decision, etc.}

## Artifacts

- `investigation-log.md` — Step-by-step investigation with decisions and dead ends
- `chat-transcript.md` — Full session conversation
- `deck.md` / `deck.pptx` / `deck.html` — Presentation summarizing the session
- MEMORY.md — Updated with new learnings

## Repos Involved

{List of repos touched, with branches}

## Follow-up Items

{Bulleted list of open items, if any}
```

### 4. Generate investigation-log.md

Create `investigation-log.md` in the output directory. This is the most important artifact — it captures the *process*, not just the result.

Structure it as phases with numbered steps:

```markdown
# Investigation Log: {Topic}

## Context
- **Problem:** {What was the starting point}
- **Goal:** {What we set out to achieve}
- **Repos:** {Which codebases were involved}

## Phase 1: {Phase Name}

### What We Did
1. {Step with specifics — file paths, commands, search queries}
2. {Step}

### What We Found
- {Finding with evidence}

### Decisions Made
- {Decision and reasoning}

## Phase 2: {Phase Name}
...

## What Worked
- {Technique, approach, or tool that was effective and why}

## What Didn't Work
- {Approach that failed and WHY it failed — this saves future time}

## Dead Ends
- {Path explored that turned out to be irrelevant, with enough context to avoid repeating}

## Reusable Patterns
- {Any pattern, checklist, or technique worth extracting for future sessions}
```

Fill this from the actual session conversation. Be specific — include file paths, line numbers, command outputs, error messages. The goal is that someone (or a future AI session) can follow this log and understand every decision.

### 5. Generate chat-transcript.md

Create `chat-transcript.md` in the output directory.

Summarize the session conversation as a readable markdown document. Do NOT dump raw JSON. Structure it as:

```markdown
# Chat Transcript: {Topic}

**Session Date:** {YYYY-MM-DD}
**Model:** {model used}
**Duration:** {approximate}

## Conversation

### User
{user message, paraphrased or quoted}

### Assistant
{key actions taken and findings, summarized — not full tool call dumps}

### User
{next user message}

...
```

Focus on the **substance** — user instructions, key decisions, findings, course corrections. Omit repetitive tool call details but preserve the narrative flow.

### 6. Nudge for cross-model review

Before generating the deck, check if the cross-model review skill is available:

Tell the user:

> "The `/crossmodel-review` skill is available and can improve the quality of your investigation log and hypothesis by getting independent review from GPT and Gemini. **Recommended** for sessions involving root cause analysis, architectural decisions, or any hypothesis that will drive code changes."
>
> - **Run cross-model review** (Recommended) — Reviews the investigation-log.md
> - **Skip** — Proceed directly to deck generation

If the user chooses to run it, invoke `/crossmodel-review` on the `investigation-log.md` file. Save the synthesis output as `crossmodel-review-synthesis.md` in the output directory.

If the user skips, proceed to the next step.

### 7. Generate presentation deck

Check if the `presentation-skills` repo is available:

```bash
ls "$HOME/presentation-skills" 2>nul 2>/dev/null || ls /c/github/presentation-skills 2>nul 2>/dev/null
```

If not found, clone it:

```bash
git clone https://github.com/ktundwal/presentation-skills "$HOME/presentation-skills"
```

Read the starter template and Marp reference from the repo:
- `skills/marp-deck/examples/starter-deck.md` — Use as base template for styling
- `skills/marp-deck/marp-reference.md` — Reference for Marp syntax

Create `deck.md` in the output directory. The deck should tell the story of the session:

**Slide structure:**
1. **Title slide** (dark) — Topic, author name (ask user), date. Include note: "Deck created using [presentation-skills](https://github.com/ktundwal/presentation-skills)"
2. **Agenda** — Overview of what will be covered
3. **The Problem** — What was the starting point / bug / task
4. **Approach** — How the investigation was structured (single agent? team? tools used?)
5. **Data Sources** — What inputs were analyzed (repos, diagnostic dumps, logs, etc.)
6. **Key Findings** — The important discoveries, with evidence (code snippets, retention chains, error messages)
7. **The Breakthrough** — The moment that cracked it (the "smoking gun")
8. **Cross-Model Review** (if done) — What GPT and Gemini said, agreements/disagreements
9. **The Fix / Outcome** — What was implemented, PR link, before/after
10. **Learnings** — What worked, what didn't, reusable patterns
11. **Key Takeaways** (dark) — 3-5 bullet points

Use the dark-light sandwich pattern: dark title → light content → dark closing.

Add speaker notes as HTML comments where helpful.

### 8. Export deck to PPTX and HTML

Ensure marp-cli is available:

```bash
npm list @marp-team/marp-cli 2>/dev/null || npm install --save-dev @marp-team/marp-cli
```

Export to all formats:

```bash
npx @marp-team/marp-cli deck.md --html --allow-local-files --bespoke.progress true -o deck.html
npx @marp-team/marp-cli deck.md --pptx --allow-local-files -o deck.pptx
```

Report the exported file paths to the user.

### 9. Update MEMORY.md

Find the project's MEMORY.md. Check these locations in order:
1. The Claude auto-memory directory (look in `~/.claude/projects/*/memory/MEMORY.md`)
2. The current project's `.claude/memory/MEMORY.md`

If found, read it and **append** new learnings extracted from this session under appropriate topic headings. Follow the existing structure and style of the MEMORY.md file.

New learnings to extract:
- **Reusable patterns** discovered during the session
- **Tool-specific notes** (commands that worked, gotchas encountered)
- **Domain-specific knowledge** (codebase structure, API patterns, configuration)
- **Investigation techniques** that proved effective
- **Dead ends** worth remembering to avoid in future

Do NOT overwrite existing content. Merge new learnings into existing sections where appropriate, or create new sections if the topic is new.

Keep MEMORY.md concise — link to the full investigation-log.md for details rather than duplicating content.

### 10. Summary

Print a summary of everything generated:

```
Session learnings captured!

  {output-dir}/
    README.md              — Session summary and metadata
    investigation-log.md   — Detailed investigation steps and decisions
    chat-transcript.md     — Session conversation narrative
    deck.md                — Marp presentation source
    deck.pptx              — PowerPoint export
    deck.html              — HTML export (open locally for slide controls)
    crossmodel-review-synthesis.md  — (if cross-model review was run)

  MEMORY.md updated with {N} new learnings.

Tip: Open deck.html locally in a browser for full slide navigation.
     All artifacts are plain text — back up to any cloud provider, push to GitHub, or simply copy the folder. No vendor lock-in.
```

## Notes

- This skill works best at the **end** of a productive session when the conversation contains substantial findings
- The investigation-log.md is the most valuable artifact — optimize for future searchability
- Dead ends and failed approaches are explicitly captured because they save the most time in future sessions
- The deck is designed to be presentation-ready for team standups, bug reviews, or knowledge sharing
- All artifacts are plain markdown — portable across tools, machines, and AI assistants
- Use `2>nul 2>/dev/null` for cross-platform stderr suppression (Windows + Unix)
