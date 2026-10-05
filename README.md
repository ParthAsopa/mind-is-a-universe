# Mind is a Universe

A clean, fast, and minimal personal site built with [Astro](https://astro.build) and plain CSS. It features full dark/light mode support, an RSS feed, automated sitemap, Shiki syntax highlighting, and zero client-side JavaScript (except for the theme toggle).

---

## Features

- **Zero JavaScript Runtime:** Shipped as lightweight static HTML & CSS with no client framework overhead.
- **Design Tokens:** All colors, fonts, line-heights, and spacing are centralized in `src/styles/tokens.css` for effortless re-theming.
- **Dark & Light Mode:** Automatically respects system preferences (`prefers-color-scheme`) and provides a manual toggle preserved in `localStorage`.
- **Content Collections:** Strict frontmatter schema validation for Markdown posts.
- **Reading Time:** Automatic estimation based on word count.
- **Syntax Highlighting:** Integrated code block formatting powered by Shiki.
- **RSS & Sitemap:** Validated RSS 2.0 feed at `/rss.xml` and automated XML sitemap via `@astrojs/sitemap`.
- **Optimal Typography:** Constrained reading measure (~65ch) for maximum legibility.

---

## Getting Started

### Prerequisites

Ensure you have [Node.js](https://nodejs.org) v22 or higher installed.

### 1. Install Dependencies

```bash
npm install
```

### 2. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) (or the URL shown in your terminal) to view the site.

---

## Adding a New Post

All blog posts are Markdown (`.md`) files located in `src/content/posts/`.

Create a new file, for example `src/content/posts/my-new-post.md`:

```markdown
---
title: "My Journey into Minimalist Web Design"
date: 2026-04-01
description: "Reflections on simplifying tools, interfaces, and codebases."
tags: ["design", "minimalism", "webdev"]
draft: false
---

Write your Markdown post content here.

## Subheading

You can write standard Markdown, including lists, blockquotes, and code blocks with syntax highlighting:

\`\`\`typescript
const greeting = "Hello, world!";
console.log(greeting);
\`\`\`
```

### Frontmatter Schema

| Field         | Type                                  | Description                                                                         |
| ------------- | ------------------------------------- | ----------------------------------------------------------------------------------- |
| `title`       | `string`                              | Post headline                                                                       |
| `date`        | `Date` (YYYY-MM-DD)                   | Publication date                                                                    |
| `description` | `string`                              | Brief summary shown in cards and meta tags                                          |
| `tags`        | `string[]`                            | Array of tags for categorization                                                    |
| `draft`       | `boolean` (optional, default `false`) | If `true`, the post only appears in dev mode and is excluded from production builds |

---

## Re-theming the Site

All design tokens are isolated inside `src/styles/tokens.css`. To re-skin the website, modify the CSS custom properties in that file:

- **Colors:** `--color-bg`, `--color-surface`, `--color-text`, `--color-accent`, etc.
- **Dark Mode:** Edit the `@media (prefers-color-scheme: dark)` and `:root[data-theme='dark']` sections in `tokens.css`.
- **Typography:** Change `--font-sans` or `--font-mono`.
- **Max Width:** Adjust `--content-max-width` (default: `65ch`).

---

## Deploying to Cloudflare Pages

This site is statically pre-rendered and ready for deployment to Cloudflare Pages:

1. Push your repository to GitHub or GitLab.
2. In the [Cloudflare Dashboard](https://dash.cloudflare.com/), navigate to **Workers & Pages** > **Create application** > **Pages** > **Connect to Git**.
3. Select your repository.
4. In the build settings, configure:
   - **Framework preset:** `Astro` (or `None`)
   - **Build command:** `npm run build`
   - **Output directory:** `dist`
5. Click **Save and Deploy**.

Subsequent commits to your repository will automatically trigger fresh builds.

---

## Build Commands

| Command           | Action                                             |
| ----------------- | -------------------------------------------------- |
| `npm run dev`     | Starts local dev server at `http://localhost:3000` |
| `npm run build`   | Builds production-ready static site to `./dist`    |
| `npm run preview` | Previews the production build locally              |
