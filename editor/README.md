# Private publishing editor

The editor is a private writing desk for the Astro site. It edits the same
Markdown files consumed by the public site's content collections:

- Posts: `src/content/posts/`
- Notes: `src/content/notes/`

It has two runtime modes:

- **Local**: `server.mjs` serves `public/` and reads/writes the local checkout.
- **Production**: Cloudflare Pages serves `public/` and runs `functions/`.
  Functions use GitHub's Contents API because Pages has no writable repository
  checkout.

See the repository's [architecture guide](../docs/ARCHITECTURE.md),
[deployment guide](../docs/DEPLOYMENT.md), and
[publishing workflow](../docs/PUBLISHING-WORKFLOW.md) for the full system.

## Frontend

`public/index.html` loads the bundled `public/editor.js`. The source entry point
is `src/editor.js`; run `npm run editor:build` from the repository root after
changing it. Tiptap provides the post editor and Markdown conversion. CodeMirror
provides the Markdown source view. The UI supports title/date/metadata editing,
draft state, outlines, rich-text actions, code blocks, tables, links, images,
split preview, refresh, and unsaved-change warnings.

At startup the frontend calls `GET /api/session`, then authenticated
`GET /api/content`. It calls `POST /api/login`, `POST /api/content`, and
`POST /api/logout` for login, saves, and locking.

## API endpoints

| Method and path | Authentication | Result |
| --- | --- | --- |
| `POST /api/login` | None | Validates `{ password }`; sets a 24-hour session cookie. |
| `GET /api/session` | None | Reports whether the cookie is valid. |
| `POST /api/logout` | None | Expires the session cookie. |
| `GET /api/content` | Session required | Reads every post and note from GitHub. |
| `POST /api/content` | Session required | Writes one Markdown file and handles slug renames. |

There is no browser delete endpoint. A slug rename can delete the previous
GitHub path as part of a successful save.

## Authentication

Production `functions/_lib/auth.js` derives an HMAC-SHA-256 signing key from
`EDITOR_PASSWORD`. Successful login creates an expiry/nonce payload and signs
it. The `editor_session` cookie is HttpOnly, SameSite Strict, path-wide, and
Secure on HTTPS. Protected content routes call `requireEditor`.

Local `server.mjs` instead stores random session tokens in memory. It requires
`EDITOR_PASSWORD` at startup and invalidates all sessions on restart.

## GitHub integration

`functions/_lib/github.js` calls `https://api.github.com` with:

- `Accept: application/vnd.github+json`
- `Authorization: Bearer <GITHUB_TOKEN>`
- `X-GitHub-Api-Version: 2022-11-28`
- `User-Agent: MindIsAUniverseEditor/1.0`

Reads first list `src/content/posts` or `src/content/notes`, then GET each file
from the configured branch. GitHub returns base64 content and a SHA. Saves PUT
base64 Markdown to the Contents API with a commit message, branch, and SHA for
existing files. If the slug changed, the old path is deleted after the write.

The content helper parses the simple frontmatter shape used by this project and
serializes the editor model back to Markdown. The Astro schema remains the
authoritative validation at public build time.

## Local setup

From the repository root:

```powershell
npm install
$env:EDITOR_PASSWORD = "choose-a-long-local-password"
npm run editor
```

Open `http://localhost:4322/`. Use `EDITOR_PORT` to select another port. Run
`npm run dev` in a second terminal for the public site. Local saves modify the
checked-out Markdown files; they do not create GitHub commits.

When the source bundle changes:

```powershell
npm run editor:build
```

## Production setup

Create a separate Cloudflare Pages project connected to this repository with:

- Root directory: `editor/`
- Build command: none
- Output directory: `public`
- Functions directory: `functions/`

The production branch and hostname are dashboard settings; verify them
manually. Configure:

| Variable | Purpose | Secret? |
| --- | --- | --- |
| `EDITOR_PASSWORD` | Login password and session signing key | Yes |
| `GITHUB_TOKEN` | Fine-grained GitHub API token | Yes |
| `GITHUB_OWNER` | `ParthAsopa` | No |
| `GITHUB_REPO` | `mind-is-a-universe` | No |
| `GITHUB_BRANCH` | Content branch, currently `master` in this checkout | No |

Use a fine-grained token limited to this repository with Contents read/write
and Metadata read-only. Set Production and Preview values intentionally. Never
commit secrets or use a production token for unrestricted local experiments.

An editor save commits to GitHub. The separate public Pages project must then
detect that branch commit, run `npm run build` from the repository root, and
publish `dist`. Add Cloudflare Access before the editor hostname as an optional
additional protection layer.

## Error behavior

Unauthenticated requests return 401. Content-load failures return 502. Save
failures return 400 with a JSON error. GitHub diagnostics are logged with
credential-like fields redacted. The frontend displays returned error messages
in the login or save status area.

## Security and operations

Use a long unique password, least-privilege token, protected production branch,
and Cloudflare Access where possible. Rotate secrets in Pages rather than in
source. Inspect GitHub commit history and Pages deployment logs when a save is
successful but the public site has not changed. For common failures see
[`docs/TROUBLESHOOTING.md`](../docs/TROUBLESHOOTING.md).
