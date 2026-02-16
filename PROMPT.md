# LeetViz — AI Prompt Template for Visualizer Contributors

Use this prompt with any LLM (ChatGPT, Claude, Gemini, etc.) or AI-powered IDE (Antigravity, Cursor, Windsurf, GitHub Copilot, etc.) to generate a complete visualizer for a LeetCode problem. Copy the entire prompt below — including the format specs — and fill in the problem details.

---

## The Prompt

> You are building an interactive visualizer for the LeetCode problem described below.
> The visualizer is part of the **LeetViz** project — a community-driven Chrome extension
> that helps people understand algorithms through step-by-step animations.
>
> ### Problem Details
> - **Problem Number:** [FILL IN, e.g. 799]
> - **Problem Title:** [FILL IN, e.g. Champagne Tower]
> - **Problem URL:** https://leetcode.com/problems/[FILL IN SLUG]/
> - **Difficulty:** [easy/medium/hard]
> - **Core Algorithm:** [FILL IN, e.g. Dynamic Programming, BFS, Two Pointers, etc.]
>
> ### OUTPUT FORMAT
> Generate exactly 4 files:
>
> #### 1. `index.html`
> - Standard HTML5 document
> - **Must import** the shared theme: `<link rel="stylesheet" href="../../shared/theme.css" />`
> - Then import the local: `<link rel="stylesheet" href="style.css" />`
> - Load `<script src="app.js"></script>` before closing `</body>`
> - Structure:
>   ```
>   <div class="app">
>     <header class="header"> ... </header>
>     <main class="main"> ... </main>
>   </div>
>   ```
>
> #### Header (REQUIRED):
> ```html
> <header class="header">
>   <div class="header__brand">
>     <span class="header__icon">[EMOJI]</span>
>     <h1 class="header__title">[Problem Title]</h1>
>     <span class="header__badge">LeetCode #[NUMBER]</span>
>   </div>
>   <p class="header__subtitle">[One-line description of the visualization]</p>
> </header>
> ```
>
> #### Main Layout:
> The `<main>` should have:
> 1. **Controls panel** (`.panel` class) — sliders, inputs, preset examples, Play/Step/Reset buttons
> 2. **Visualization area** — the core animation (Canvas, SVG, or DOM-based)
> 3. **Hints panel** (`.panel` class) — progressive, problem-specific hints (NOT algorithm steps)
>
> #### Hints Panel (REQUIRED):
> - Title: "Hints" (not "Algorithm")
> - Include a **progress indicator** showing "X / N revealed"
> - Provide **5 hints** in increasing order of specificity:
>   - Hint 1: A gentle observation or analogy ("Think about what happens when...")
>   - Hint 2: A key insight about the problem structure
>   - Hint 3: A specific technique or data structure to consider
>   - Hint 4: The approach broken down into sub-steps
>   - Hint 5: The implementation-level detail (pseudocode or formula)
> - Each hint must be **blurred by default** and revealed on click
> - Hints unlock **sequentially** — hint N must be revealed before hint N+1 becomes clickable
> - Use the theme's `.hint`, `.hint__num`, `.hint__text`, `.hint__blur` classes
> - **DO NOT** show the full algorithm — this is a learning tool, not a cheat sheet
>
> #### 2. `style.css`
> - **DO NOT** redefine variables already in `theme.css` (fonts, colors, radii, etc.)
> - **DO** override the accent colors at the top:
>   ```css
>   :root {
>     --accent: #[YOUR COLOR];
>     --accent-dark: #[DARKER];
>     --accent-light: #[LIGHTER];
>     --accent-glow: rgba(..., 0.25);
>     --accent-bg: rgba(..., 0.06);
>   }
>   ```
> - **DO** use the BEM-style class names from the theme for panels, buttons, controls.
> - Only add custom styles for your problem-specific elements.
>
> #### 3. `app.js`
> - Wrap everything in an IIFE: `(() => { 'use strict'; ... })()`
> - No external libraries — vanilla JS only
> - **Required features:**
>   - **Play button**: Auto-advance through all visualization steps with animation
>   - **Step button**: Manually advance one step at a time
>   - **Reset button**: Return to initial state
>   - **Speed control**: Slider to adjust animation speed (1× to 5×)
>   - **Input controls**: Let users change inputs and see different cases
>   - **Preset examples**: LeetCode example test cases as one-click buttons
>
> #### 4. `meta.json`
> ```json
> {
>   "id": [NUMBER],
>   "title": "[Problem Title]",
>   "difficulty": "[easy/medium/hard]",
>   "tags": ["tag1", "tag2"],
>   "author": "[YOUR GITHUB USERNAME]",
>   "description": "[One sentence describing what the visualizer shows]"
> }
> ```
>
> ### DESIGN GUIDELINES
> - Use the theme classes: `.panel`, `.btn`, `.btn--primary`, `.btn--secondary`, `.btn--ghost`,
>   `.slider`, `.control-group`, `.control-label`, `.hint`, `.result-card`, etc.
> - Dark theme with your chosen accent color
> - Smooth animations with CSS transitions and `requestAnimationFrame`
> - Responsive — should work in a Chrome side panel (320px wide) and full screen
> - Make the visualization **genuinely educational** — show intermediate state, highlight
>   what's being compared/moved/computed at each step
>
> ### QUALITY CHECKLIST
> - [ ] Correct implementation (verify with LeetCode examples)
> - [ ] All three buttons (Play/Step/Reset) work correctly
> - [ ] Speed slider affects animation speed
> - [ ] At least 2 preset examples from LeetCode
> - [ ] Hints panel with 5 progressive, problem-specific hints
> - [ ] Smooth animations, no jank
> - [ ] No console errors
> - [ ] Works in a narrow side panel view

---

## After Generating

1. Create the folder `problems/[NUMBER]/` in your fork
2. Place all 4 files inside
3. Update `problems/registry.json` to add your problem
4. Test locally by opening `index.html` in a browser
5. Submit a PR — see [CONTRIBUTING.md](CONTRIBUTING.md) for details
