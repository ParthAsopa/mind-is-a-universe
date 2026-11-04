---
title: "Building Fast, Minimal Blogs with Astro"
date: "2026-03-15"
description: "Why static site generation, content collections, and zero client-side JavaScript create the best reading experience on the web."
tags: ["webdev","astro","minimalism"]
outline: [{"label":"Genesis of restraint","anchor":"top"},{"label":"The long read","anchor":"content"},{"label":"The quiet web posture","anchor":"colophon"}]
draft: false
---

Welcome to Mind is a Universe. Over the years, the web has grown complex, but reading a thoughtful essay shouldn't require megabytes of JavaScript, complex hydration steps, or intrusive analytics banners.

This site is built with **Astro**, focusing on speed, readability, and content longevity.

## Why Astro?

Astro's architecture is uniquely suited for content-driven sites:

- **Zero JavaScript by default:** Pages are compiled ahead of time into lean, static HTML and CSS. The browser doesn't execute a framework runtime to render words.
- **Content Collections:** Markdown files are strictly validated with a typed schema, preventing broken links or missing metadata during builds.
- **Markdown &amp; Code Highlighting:** Native support for GitHub-flavored markdown and syntax highlighting through Shiki.

Here is a quick look at an example script that powers reading-time calculation:

```typescript
function calculateReadingTime(text: string): number {
  const wordsPerMinute = 200;
  const wordCount = text.trim().split(/\s+/).length;
  return Math.ceil(wordCount / wordsPerMinute);
}

console.log(`Read time: ${calculateReadingTime("Hello world")} min`);
```

## The Joy of Plain CSS

Instead of bringing a massive CSS framework into the mix, this site relies entirely on native CSS custom properties defined in a single file (`tokens.css`).

> "Simplicity is prerequisite for reliability."  
> — Edsger W. Dijkstra

By restricting maximum content line width to roughly **65 characters**, reading remains effortless on desktop screens, tablets, and phones alike.

Stay tuned for more notes on software architecture, design, and ideas worth exploring.



this is  a harmless test to check if the code updates



and this is a harmless change made online after deployment, let's see if it reflects!
