# Contributing to LeetViz

Thanks for wanting to contribute a visualizer! 🎉 Here's how to add one for a new LeetCode problem.

## Quick Start

1. **Fork** this repo
2. **Generate** visualizer files using [PROMPT.md](PROMPT.md) with any LLM or AI-powered IDE
3. **Place** files in `problems/<number>/`
4. **Update** `problems/registry.json`
5. **Test** locally, then submit a **PR**

## Folder Structure

```
problems/<number>/
├── meta.json      # Problem metadata
├── index.html     # Main HTML (imports shared theme)
├── style.css      # Problem-specific styles
└── app.js         # Visualization logic
```

## Requirements

### Must Have
- ✅ Import shared theme: `<link rel="stylesheet" href="../../shared/theme.css" />`
- ✅ Play / Step / Reset buttons
- ✅ Speed control slider (1× to 5×)
- ✅ Progressive hints panel (5 hints, blurred, sequential reveal)
- ✅ At least 2 preset examples from LeetCode
- ✅ Correct algorithm output (verified against LeetCode)
- ✅ `meta.json` with all fields filled

### Must Not
- ❌ No external libraries (vanilla JS only)
- ❌ No inline font imports (theme.css handles fonts)
- ❌ No hardcoded dark/light colors (use CSS variables from theme)

## Style Guide

- Override `--accent` color in your `style.css` `:root` block
- Use BEM class names from the shared theme (`.panel`, `.btn`, `.hint`, etc.)
- Wrap JS in an IIFE: `(() => { 'use strict'; ... })()`
- Use `const`/`let`, no `var`

## Testing

1. Open `problems/<number>/index.html` in a browser
2. Verify Play/Step/Reset all work
3. Check LeetCode examples produce correct output
4. Test in a narrow window (side panel is ~320px wide)
5. Open DevTools → Console → check for errors

## Submitting a PR

1. Title: `Add visualizer for #<number> — <Problem Title>`
2. Description: Include a screenshot or GIF of the visualizer
3. Update `problems/registry.json` with your problem entry
4. I'll review and merge — thank you! 🙌

## Using the LLM Prompt

See [PROMPT.md](PROMPT.md) for a ready-to-use prompt. Just fill in the problem details and paste it into any LLM (ChatGPT, Claude, Gemini) or use it with an AI-powered IDE like Cursor, Windsurf, or GitHub Copilot.
