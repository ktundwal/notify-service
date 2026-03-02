---
name: marp-deck
description: Create and iterate on presentation decks using Marp CLI. Exports slides as images, visually inspects each one using vision, identifies issues (text cutoff, image sizing, color contrast, layout), fixes them, and re-exports — a self-correcting feedback loop. Use when creating or improving Marp presentations.
---

# Marp Deck — Visual QA Workflow

Create polished Marp presentations through an iterative visual QA loop. Marp CLI exports slides as PNG images that Claude can inspect using its **vision capability**, enabling a self-correcting feedback loop: generate markdown, render to images, see the result, fix issues, repeat.

## Prerequisites

Ensure `@marp-team/marp-cli` is installed:

```bash
npm list @marp-team/marp-cli 2>/dev/null || npm install --save-dev @marp-team/marp-cli
```

Marp CLI uses Puppeteer for PNG/PDF export, which requires Chrome or Chromium. If you hit a browser launch error, install Chromium:

```bash
npx puppeteer browsers install chrome
```

## Core Workflow

### 0. Gather requirements

Ask the user:
- What is the **topic or content** for the presentation?
- Any specific points, data, or structure they want included?

### 1. Load reference files

Before writing or editing a deck, load these files for syntax and structure guidance:

- Read [marp-reference.md](marp-reference.md) for the full Marp syntax reference
- Use [examples/starter-deck.md](examples/starter-deck.md) as the starting template for new decks

### 2. Create or edit the Marp markdown deck

Write the deck as a single `.md` file with Marp frontmatter, following the patterns in the reference and starter template.

### 3. Export each slide as a PNG image

```bash
npx @marp-team/marp-cli <deck>.md --images png --allow-local-files -o <output-dir>/slide.png
```

This produces `slide.001.png`, `slide.002.png`, etc. at 1280x720 (native slide resolution). The `--allow-local-files` flag is required for any local images referenced in the deck. Do NOT use `--image-scale 2` — retina output exceeds the 2000px multi-image limit and breaks visual QA.

### 4. Visually inspect every slide

**Batch processing**: Read slides in batches of **2-3 at a time**. After each batch, write findings to a `qa-issues.md` file in the output directory, then run `/compact` to flush images from context before reading the next batch. This prevents context overflow on large decks.

For each slide, check:

- [ ] **Text overflow**: Is any text cut off at edges or bottom?
- [ ] **Image sizing**: Are images readable or too small/too large?
- [ ] **Color contrast**: Can all text be read against its background?
- [ ] **Link visibility**: Are hyperlinks distinguishable on dark slides?
- [ ] **Table readability**: Are table contents legible at slide resolution?
- [ ] **Code blocks**: Is code font large enough to read?
- [ ] **Whitespace balance**: Is the slide cramped or too empty?
- [ ] **Consistency**: Does the slide match the deck's visual theme?

### 5. Fix issues found

Edit the markdown to address problems. Common fixes:

| Problem | Fix |
|---------|-----|
| Text cut off | Reduce content, increase font size, or use split layout |
| Image too small | Use `![bg right:XX% contain]` split or `![bg contain]` fullscreen |
| Low contrast text | Add CSS rule for that element on dark backgrounds |
| Link invisible on dark | Add `section.dark a { color: #00c9a7; }` or similar |
| Table too small | Add `<style scoped>table { font-size: 22px; }</style>` |
| Code too small | Add `<style scoped>pre { font-size: 20px; }</style>` |

### 6. Re-export and re-inspect

Repeat steps 3-5. Do **up to 3 iterations** total. Stop early if all slides pass QA.

If issues remain after 3 iterations, **report the remaining issues to the user** with specific slide numbers and descriptions so they can decide how to proceed.

### 7. Final export

Once visual QA passes, ask the user which output format they want:

```bash
npx @marp-team/marp-cli <deck>.md --allow-local-files -o deck.pptx   # PowerPoint
npx @marp-team/marp-cli <deck>.md --allow-local-files -o deck.pdf     # PDF
npx @marp-team/marp-cli <deck>.md --allow-local-files -o deck.html    # HTML
```

## Slide Structure Principles

- **Dark-light sandwich**: Open and close with dark slides, keep middle slides light
- **One idea per slide**: If you need to scroll, split into two slides
- **Speaker notes in comments**: `<!-- SPEAKER NOTES: "..." -->`
- **Progressive reveal**: Build complexity across slides, not within one

## Image Handling Tips

Marp renders slides at 1280x720. Retina screenshots (2x-3x resolution) will appear dense.

- For screenshots of UI: crop to the relevant area before including
- Prefer `![bg right:XX% contain]` for side-by-side layouts
- Use `![bg contain]` only when the image IS the slide
