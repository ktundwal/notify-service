---
name: crossmodel-review
description: "Get a second opinion on your work from other AI models via GitHub Copilot CLI. Reviews code, PRDs, architecture docs, or any artifact using frontier models from Google and OpenAI."
argument-hint: "[file-path]"
disable-model-invocation: true
allowed-tools: Bash Read Glob Grep AskUserQuestion
---

# Cross-Model Review Skill

Get a critical review of any artifact from frontier AI models via GitHub Copilot CLI, then synthesize the results into actionable feedback.

The user invokes this skill as `/crossmodel-review path/to/file`. The file path is available as `$ARGUMENTS`.

## Workflow

### 1. Pre-flight check

Verify that GitHub Copilot CLI is installed and authenticated. Run:

```bash
copilot --version 2>nul 2>/dev/null
```

If this fails, stop and tell the user:
> GitHub Copilot CLI is not installed or not on PATH. Install it with `npm install -g @github/copilot`, then run `copilot` and use `/login` to authenticate.

If the command succeeds, proceed.

### 2. Discover available models

Ask Copilot CLI what models are available:

```bash
copilot list-models 2>nul 2>/dev/null
```

Parse the output to get the full list of available model IDs. From this list:
- Identify the latest/most capable **Google** model (e.g. Gemini family)
- Identify the latest/most capable **OpenAI** model (e.g. GPT/o-series family)

These are your two recommended models.

### 3. Confirm model selection with the user

Present the two recommended models to the user using AskUserQuestion. For each model slot (Google and OpenAI), show the recommended pick as the first option and list other available models from the same provider as alternatives. Example:

> "Which Google model should review your work?"
> - gemini-3-pro (Recommended)
> - gemini-2.5-pro
> - ...

> "Which OpenAI model should review your work?"
> - gpt-5.2-codex (Recommended)
> - o3
> - ...

Use the actual model IDs from the `list-models` output. Wait for the user to confirm before proceeding.

### 4. Identify the artifact and select review prompt

The file to review is `$ARGUMENTS`. Read it to understand the content.

Detect the artifact type and select the matching review prompt:

**Code files** (by extension: `.py`, `.js`, `.ts`, `.java`, `.go`, `.rs`, `.c`, `.cpp`, `.rb`, `.cs`, `.swift`, `.kt`, etc.):
```
You are a senior engineer doing a code review. Check for: correctness, error handling, security issues, performance concerns, code style consistency, and test coverage gaps. Suggest specific improvements with code examples. Read and evaluate @<relative-path-to-file>
```

**PRDs / Design Docs** (`.md`, `.txt`, `.docx` files with product/requirements/design language in the content):
```
You are a senior product manager and architect reviewing a PRD. Evaluate: completeness of requirements, technical feasibility, risk identification, clarity of success metrics, and whether the phased approach makes sense. Flag any assumptions that need validation. Read and evaluate @<relative-path-to-file>
```

**Architecture Docs** (`.md`, `.txt` files with architecture/system design language in the content):
```
You are a principal architect reviewing a system design. Evaluate: scalability, fault tolerance, operational complexity, security posture, and alignment with stated requirements. Identify single points of failure and missing non-functional requirements. Read and evaluate @<relative-path-to-file>
```

**Fallback** (anything else or ambiguous):
```
You are a senior technical reviewer. Review the following document critically. Identify: (1) gaps or missing requirements, (2) architectural concerns, (3) unclear or ambiguous sections, (4) feasibility risks, (5) things done well. Be specific and constructive. Read and evaluate @<relative-path-to-file>
```

For file type detection: check the extension first, then scan the content for keywords. If still unclear, use the fallback prompt.

### 5. Run both reviews in parallel

Determine the repo root:

```bash
git rev-parse --show-toplevel 2>nul 2>/dev/null
```

If not a git repo, use the current working directory as root.

Run both reviews as **background tasks simultaneously** — they are independent. Use the confirmed model IDs from step 3 and the selected review prompt from step 4.

**IMPORTANT:**
- Use `@path/to/file` syntax for file references. Do NOT use `$(cat file)` — it fails on Windows.
- Always `cd` to the repo root first so `@relative/path` resolves correctly.
- If the file is very large (>50KB), warn the user and ask how to proceed rather than silently truncating.

```bash
cd <repo-root> && copilot --model <google-model> -p "<selected-review-prompt>" -s --no-color 2>nul 2>/dev/null
```

```bash
cd <repo-root> && copilot --model <openai-model> -p "<selected-review-prompt>" -s --no-color 2>nul 2>/dev/null
```

### 6. Synthesize feedback

After both reviews complete, present a unified review:

- **Agreement** — Points where both models agree. These are high-confidence findings.
- **Disagreements** — Points where they diverge. Flag these for human judgment.
- **Actionable changes** — A prioritized list of concrete next steps.

Attribute each point to its source model so the user knows which model said what.

## Notes

- Use `-s` (silent) flag for clean output without usage stats
- Use `--no-color` to strip ANSI codes for readable output
- Use `2>nul 2>/dev/null` to suppress stderr on both Windows and Unix
- **Always use `@file` syntax** — `$(cat file)` and piping do NOT work with copilot-cli on Windows
- Both models should review independently before synthesis
