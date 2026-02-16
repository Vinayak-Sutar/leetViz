# 🔬 LeetViz

**Interactive visualizers for LeetCode problems — powered by the community.**

LeetViz is a Chrome extension that detects the LeetCode problem you're viewing,
fetches a matching interactive visualizer, and renders it in a side panel.
Each visualizer is a standalone HTML/CSS/JS app built by contributors.

## 📺 Available Visualizers

| # | Problem | Difficulty | Tags |
|---|---------|-----------|------|
| 190 | [Reverse Bits](problems/190/) | Easy | Bit Manipulation |
| 799 | [Champagne Tower](problems/799/) | Medium | DP, Simulation |

> More coming soon — [contribute one!](#-contributing)

## 🚀 Install the Extension

1. Clone this repo:
   ```bash
   git clone https://github.com/Vinayak-Sutar/leetViz.git
   ```
2. Open Chrome → `chrome://extensions/`
3. Enable **Developer mode** (top-right toggle)
4. Click **Load unpacked** → select the `extension/` folder
5. Navigate to any LeetCode problem — click the **LeetViz** button!

## 🎯 How It Works

```
LeetCode Problem Page
        │
        ▼
  Content Script detects problem #
        │
        ▼
  Background fetches registry.json from GitHub Pages
        │
        ├── Found → Load visualizer in side panel iframe
        │
        └── Not found → Show "Contribute" CTA
```

1. The content script scrapes the problem number from the page title
2. The background service worker checks `problems/registry.json`
3. If a visualizer exists, it loads via iframe from GitHub Pages
4. If not, it shows a prompt to contribute one

## 🤝 Contributing

We want visualizers for **every** LeetCode problem! Here's how:

1. **Use the AI prompt** — Copy [PROMPT.md](PROMPT.md) and paste it into any LLM to generate a complete visualizer
2. **Follow the format** — See [CONTRIBUTING.md](CONTRIBUTING.md) for requirements
3. **Submit a PR** — Add your `problems/<number>/` folder and update `registry.json`

### Quick Contribution Steps

```bash
# Fork and clone
git clone https://github.com/YOUR-USERNAME/leetViz.git

# Create your visualizer folder
mkdir problems/42  # Replace with problem number

# Generate files using PROMPT.md with any LLM
# Place: index.html, style.css, app.js, meta.json

# Update registry
# Add your entry to problems/registry.json

# Test locally
open problems/42/index.html

# Submit PR!
```

## 📁 Project Structure

```
leetViz/
├── extension/           # Chrome extension (Manifest V3)
│   ├── manifest.json
│   ├── content.js       # Runs on LeetCode pages
│   ├── background.js    # Service worker
│   ├── sidepanel.*      # Side panel UI
│   └── icons/
├── problems/            # Community visualizers
│   ├── registry.json    # Index of available visualizers
│   ├── 190/             # Reverse Bits
│   └── 799/             # Champagne Tower
├── shared/
│   └── theme.css        # Shared design system
├── PROMPT.md            # LLM prompt for generating visualizers
├── CONTRIBUTING.md      # How to contribute
└── README.md
```

## 🎨 Design System

All visualizers share a common dark theme via `shared/theme.css`:
- **Fonts:** Inter + JetBrains Mono
- **Theme:** Deep dark backgrounds with customizable accent colors
- **Components:** Panels, buttons, sliders, algorithm steps, result cards

Each visualizer overrides `--accent` to get its own identity while maintaining visual consistency.

## 📄 License

MIT — build, share, visualize!
