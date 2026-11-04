# Development guide

## Prerequisites

Install Git and Node.js 22 or newer. The root `package.json` declares the
Node engine as `>=22`; npm is bundled with Node. A GitHub account is not needed
to run the public Astro site locally, but production editor work requires a
fine-grained token.

## First checkout

```powershell
git clone https://github.com/ParthAsopa/mind-is-a-universe.git
Set-Location .\mind-is-a-universe
npm install
```

`npm install` reads the root manifest and creates `node_modules/`, which is
ignored by Git. There is no separate `editor/package.json`; the editor uses the
root dependencies and root npm scripts.

## Run and build

```powershell
npm run dev
npm run build
npm run preview
```

Astro normally uses `http://localhost:4321/` for development and preview; always
use the URL printed by the command if the port is occupied. `npm run build`
writes `dist/`.

Start the local editor in another terminal:

```powershell
$env:EDITOR_PASSWORD = "choose-a-long-local-password"
npm run editor
```

It serves `editor/public/` at `http://localhost:4322/` and reads/writes the
checked-out files directly. This local server does not emulate Cloudflare
Pages Functions or GitHub commits. `EDITOR_PORT` changes its port.

If `editor/src/editor.js` changes, rebuild the browser bundle:

```powershell
npm run editor:build
```

## Content conventions

Posts use quoted or YAML-compatible frontmatter for `title`, `date`,
`description`, `tags`, `outline`, and `draft`. Notes use `title`, `date`,
`text`, and `draft`; `text` is limited to 400 characters. Dates are coerced by
Astro, and tags are trimmed and lowercased by the schema. Drafts are visible
during development but excluded from production builds.

The editor serializes frontmatter with JSON-compatible scalar/array values, so
manually created files should remain compatible with that shape. A post's
filename is its route slug (`src/content/posts/<slug>.md`); a note uses the
same pattern under `src/content/notes/`.

## Troubleshooting local setup

- If Astro or the editor will not start, check `node --version` is 22 or newer
  and rerun `npm install`.
- If port 4321 or 4322 is busy, use the URL/port reported by the process or set
  `EDITOR_PORT` for the editor.
- If the editor exits immediately, set `EDITOR_PASSWORD` in the same PowerShell
  process that runs `npm run editor`.
- If a changed editor source is not visible, run `npm run editor:build`; the
  browser loads the committed bundle in `editor/public/editor.js`.
- If a Markdown file fails the Astro build, compare its frontmatter with
  `src/content.config.ts` and check dates, required fields, tag arrays, and the
  note character limit.

