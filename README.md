# JavaScript Gallery Project

An image gallery built with [Eleventy](https://www.11ty.dev/) and [Tailwind CSS](https://tailwindcss.com/).

The JavaScript gallery loads images dynamically from a JSON manifest and displays them as an infinite looping slider. Three images are visible at once on desktop (one on mobile), with the center slide highlighted at full scale and saturation while side slides are dimmed. The slider advances automatically every 5 seconds and pauses on user interaction.

Navigation supports arrow buttons, click-and-drag, and touch swipe. Clicking the  slide opens a fullscreen modal with a blurred backdrop, caption, and its own arrow/swipe/keyboard navigation. The modal and slider stay in sync — navigating in one updates the other.

---

## Live Demo

Click on the preview to access a live demo.

<a href="https://dismaze.github.io/javascript-gallery/" target="_blank">
  <img src="./preview.png" alt="Gallery Preview">
</a>

---

## Stack

| Tool | Role |
|---|---|
| Eleventy 3 | Static site generator — turns `_src/` into `_site/` |
| Tailwind CSS v4 | Utility-first CSS, compiled via its own CLI |
| npm-run-all | Runs Tailwind and Eleventy in parallel with one command |

---

## Project Structure
```
/
├── _src/                       # All source files (Eleventy input) — edit files here only
│   ├── img/                    # Image files
│   ├── index.html              # Gallery page
│   ├── gallery-modal.js        # Slider + modal logic
│   ├── manifest.json           # Lists all gallery images (see below)
│   └── styles.css              # Gallery styles (Tailwind entry point)
│
├── _site/                      # Build output — auto-generated, do not edit or commit
│
├── .github/
│   └── workflows/
│       └── deploy.yml          # GitHub Actions workflow — builds and deploys on every push to main
│
├── eleventy.config.js          # Eleventy configuration (passthrough, input/output dirs)
├── package.json                # Dependencies and build scripts
└── .gitignore
```

---

## How the Build Works

Two processes run in parallel when you start the dev server:

1. **Tailwind CLI** watches `_src/styles.css`, compiles it (resolving `@import "tailwindcss"` and scanning all `_src/*.{html,js}` files for utility classes), and outputs the result to `_site/styles.css`.

2. **Eleventy** watches `_src/`, processes templates, and copies passthrough files to `_site/`.

---

## Passthrough Files

These are copied as-is from `_src/` to `_site/` by Eleventy:

```js
eleventyConfig.addPassthroughCopy("./_src/img");
eleventyConfig.addPassthroughCopy("./_src/*.js");
eleventyConfig.addPassthroughCopy("./_src/*.json");
```

CSS and HTML are **not** in passthrough — Tailwind and Eleventy handle those.

---

## manifest.json

The gallery reads this file at runtime to know which images to load. It must follow this shape:

```json
{
  "images": [
    {
      "caption": "Caption A",
      "path": "img/A.png"
    },
    {
      "caption": "Caption B",
      "path": "img/B.png"
    }
  ]
}
```

The `caption` field is used as the caption in the fullscreen modal.

---

## Getting Started

**Prerequisites:**
- [Node.js](https://nodejs.org/) v18 or higher

**Install dependencies:**
```bash
npm install
```

**Start the dev server** (Tailwind + Eleventy in parallel):
```bash
npm start
```

**Production build:**
```bash
npm run build
```

The compiled site will be in `_site/`.