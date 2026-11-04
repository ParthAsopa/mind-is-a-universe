# Troubleshooting

## Editor login and sessions

- **Incorrect password**: `/api/login` returns 401 and the UI displays “That
  password does not match.” Check the exact `EDITOR_PASSWORD` in the active
  Pages environment. Local and preview values may differ.
- **Missing environment variables**: the Functions return an explicit
  configuration error. Check `EDITOR_PASSWORD`, `GITHUB_TOKEN`, owner, repo, and
  branch in the correct Production/Preview environment, then redeploy.
- **Editor logged out unexpectedly**: production sessions expire after 24 hours.
  Local sessions disappear when `server.mjs` restarts.

## GitHub API errors

- **401**: the token is invalid, expired, or not being read from the intended
  environment. Replace the secret and retry.
- **403**: check fine-grained repository access and Contents read/write
  permission. Rate limits or branch protection can also reject writes.
- **Missing User-Agent**: GitHub API requests require an identifying User-Agent.
  The current production implementation sends
  `MindIsAUniverseEditor/1.0` from `editor/functions/_lib/github.js`. If an
  older deployment reports a missing User-Agent error, redeploy the current
  Functions bundle and verify the request headers in logs. Do not claim the
  deployed dashboard version is fixed until that deployment is confirmed.
- **Contents permission errors**: verify the token can read directory listings,
  read file contents, and write contents for the configured repository and
  branch. Metadata read-only is also required by the token configuration.
- **SHA/conflict errors**: reload the editor before saving if another commit
  changed the file. Existing-file updates include the SHA returned by GitHub.

## Pages and Functions

- **Function 404**: verify the editor Pages project root is `editor/` and its
  Functions directory is `functions/`. A project rooted at the repository root
  will not discover these routes as intended.
- **Function 502 on content load**: inspect the sanitized Function log and
  GitHub status. This route returns 502 when directory/file reads fail.
- **Function 400 on save**: inspect the returned error. Invalid slugs,
  serialization errors, missing configuration, and GitHub write failures are
  surfaced by the save route.
- **Failed Cloudflare deployment**: run the matching build locally
  (`npm run build` for the public project; no editor build is required unless
  the browser bundle changed), then check the project's root, branch, output
  directory, Node version, and deployment logs.

## Content and visibility

- **Content does not load**: first call `/api/session` in the browser's network
  panel. A 401 means authentication; a 502 means GitHub/configuration. Check the
  editor's configured branch and repository path.
- **Changes do not appear publicly**: verify the editor response contains a
  commit SHA, confirm that commit exists on `GITHUB_BRANCH`, and check that the
  public Pages project built from that same branch. Drafts are intentionally
  excluded from production.
- **Local editor differs from production editor**: local `server.mjs` reads and
  writes the checkout directly and uses in-memory sessions. Production uses
  Pages Functions, signed cookies, GitHub, and Cloudflare's deployment
  environment. They share the browser UI and content shape, but not the storage
  or authentication implementation.
- **Build validation failure after save**: inspect the committed Markdown
  frontmatter against `src/content.config.ts`. A note over 400 characters,
  missing post fields, invalid dates, or malformed arrays can prevent Astro
  from building.

## Security reminders

Never paste passwords, tokens, cookies, or full secret-bearing logs into an
issue or documentation. The production GitHub helper redacts authorization,
cookie, password, secret, and token fields before logging diagnostics.

