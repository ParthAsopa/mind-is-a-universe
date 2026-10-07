# Mind is a Universe

A clean, fast, and minimal personal site built with [Astro](https://astro.build) and plain CSS. It features a paper-studio editorial interface, long-form posts, short sticky-note memos, an RSS feed, automated sitemap, and Shiki syntax highlighting.

---

## Features

- **Minimal JavaScript Runtime:** Shipped as lightweight static HTML & CSS with no client framework overhead. Article pages use a small scroll-progress script.
- **Design Tokens:** All colors, fonts, line-heights, and spacing are centralized in `src/styles/tokens.css` for effortless re-theming.
- **Content Collections:** Strict frontmatter schema validation for Markdown posts and short notes.
- **Sticky Notes:** The home feed shows the latest note and links to the full `/notes/` memo archive.
- **Blog Archive:** Full-length posts have their own archive at `/blog/`; the home page remains the studio feed.
- **Tag Archives:** Every post tag links to a filtered archive of matching posts.
- **RSS:** `/rss/` is the reader-facing subscription page; `/rss.xml` remains the machine-readable feed endpoint.
- **Reading Time:** Automatic estimation based on word count.
- **Reading Progress:** Article pages track scroll position in the sticky folio index.
- **Syntax Highlighting:** Integrated code block formatting powered by Shiki.
- **RSS & Sitemap:** Validated RSS 2.0 feed at `/rss.xml` and automated XML sitemap via `@astrojs/sitemap`.
- **Optimal Typography:** Constrained reading measure (~65ch) for maximum legibility.

## Feature Ledger

### Currently Available

- Full-length Markdown blog posts with dates, descriptions, tags, drafts, reading time, and syntax highlighting.
- Short Markdown notes with a title, date, and text limited to 400 characters.
- Latest-note sticky memo on the home feed.
- Notes archive at `/notes/`.
- Filtered tag archives at `/tags/<tag>/`.
- Live reading-progress percentage on article pages.
- RSS feed, sitemap, responsive layouts, and paper-studio design tokens.

### Removed From The Interface

- **Colophon spec card:** Removed from article pages. It was a decorative publication note describing the site typography and paper metaphor, rather than reader-facing article content.
- **Dark-mode switcher:** Removed because the Paper & Ephemera system is intentionally a single light paper theme. The unused theme component and theme-flash script were removed as well.

### Planned Features

- Persisted “pin to folio” bookmarks for articles.
- A real scroll-aware table of contents generated from Markdown headings.
- Author/profile metadata in content configuration instead of template text.
- Optional note categories or moods while preserving the short-form format.
- Search across posts and notes.

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

## Adding a Note

Short notes live in `src/content/notes/`. Keep them brief: the schema accepts a maximum of 400 characters.

```markdown
---
title: "A small observation"
date: 2026-10-06
text: "One to four lines of thought, published without becoming a full essay."
draft: false
---
```

---

## Re-theming the Site

All design tokens are isolated inside `src/styles/tokens.css`. To re-skin the website, modify the CSS custom properties in that file:

- **Colors:** `--color-bg`, `--color-surface`, `--color-text`, `--color-accent`, etc.
- **Typography:** Change `--font-sans` or `--font-mono`.
- **Max Width:** Adjust `--content-max-width` (default: `68ch`).

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
