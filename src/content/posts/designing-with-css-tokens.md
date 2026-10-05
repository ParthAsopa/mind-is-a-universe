---
title: "The Subtle Art of Plain CSS Design Tokens"
date: 2026-03-28
description: "How modern CSS variables and sensible typography constraints make heavy frameworks unnecessary for personal sites."
tags: ["css", "design", "minimalism"]
draft: false
---

For a long time, the default impulse when starting a new web project was to install a large utility or UI framework. But standard CSS has evolved dramatically. With modern CSS custom properties (variables), media queries, and semantic HTML, building a resilient design system is simpler than ever.

## Everything Lives in `tokens.css`

Centralizing design tokens in one file makes maintenance a breeze. Whether you want to alter the typography, adjust spacing intervals, or completely re-skin your site, you only ever touch one place:

```css
:root {
  --font-sans: system-ui, -apple-system, sans-serif;
  --content-max-width: 65ch;
  --color-bg: #fafaf9;
  --color-text: #1c1917;
  --color-accent: #2563eb;
}

@media (prefers-color-scheme: dark) {
  :root:not([data-theme='light']) {
    --color-bg: #111215;
    --color-text: #f3f4f6;
    --color-accent: #60a5fa;
  }
}
```

## Responsive Typography and Comfortable Line Lengths

Typography research has consistently shown that optimal line length for sustained reading falls between 50 and 75 characters per line:

1. **Focus:** Eyes don't get lost jumping from the end of one line back to the start of the next.
2. **Scanability:** Subheadings and bullet lists stand out naturally.
3. **Hierarchy:** Proportional headings ensure readers always know where they are within an article.

```bash
# Building the site for production
npm run build
```

When you keep dependencies to the bare essentials, your site stays blazing fast for years without constant maintenance churn.
