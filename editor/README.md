# Publishing desk

This folder contains the private editor for the Astro site. It is intentionally
separate from the public site's `src/` implementation. The editor writes the
same Markdown content files that Astro already publishes:

- blog posts → `src/content/posts/`
- notes → `src/content/notes/`

## Run locally

From the repository root in PowerShell:

```powershell
$env:EDITOR_PASSWORD = "choose-a-long-private-password"
npm run editor
```

Open `http://localhost:4322`. Run the public site separately with `npm run dev`
to see published changes after saving. Set `EDITOR_PORT` to use another port.
Keep the password in your shell environment or a local, ignored secret file;
never add it, a GitHub token, or Cloudflare credentials to the repository.

## Deploying the editor on Cloudflare Pages

The local `server.mjs` is not a production server for Cloudflare Pages. Pages
serves static files and does not keep a Node process or a writable copy of the
Git repository. The `functions/` directory provides the production API instead:
it reads and writes Markdown through the GitHub Contents API. A successful
save creates a commit, and the existing Pages Git integration rebuilds the
public site automatically.

Create a second Cloudflare Pages project using `editor/` as its root directory:

- build command: none
- output directory: `public`
- production URL: use a separate hostname such as `desk.example.com`

Add these Pages project environment variables/secrets:

- `EDITOR_PASSWORD`: a long random password for the editor login
- `GITHUB_TOKEN`: a fine-grained GitHub token with **Contents: Read and write**
  access to this repository only
- `GITHUB_OWNER`: `ParthAsopa`
- `GITHUB_REPO`: `mind-is-a-universe`
- `GITHUB_BRANCH`: `master`, the production branch used by this repository
Store `EDITOR_PASSWORD` and `GITHUB_TOKEN` as encrypted secrets, not normal
variables, and never commit them. Pages Functions issue a short-lived,
HttpOnly, Secure session cookie after a successful password login. The GitHub
token is only used by Pages Functions; it is never sent to the browser.

Keep Wrangler local secrets in `.dev.vars` (or `.dev.vars.*`), which are ignored
by Git. Do not use a production GitHub token for local experiments unless it is
limited to this repository and the minimum required Contents permission.

The public site remains a separate Pages project. The editor can therefore be
online at the same time as the public site, while publishing still follows the
same Git-backed Markdown and build pipeline. Keep the editor hostname private
or add an optional Cloudflare Access policy if desired; Access is not required
because the editor itself already requires the password.
