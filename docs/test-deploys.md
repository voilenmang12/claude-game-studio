# Test deploys on Vercel

`deploy-test.sh` (workspace root) puts a playable build on Vercel and prints its URL. Use it to play a build on a
phone, to check it on a real HTTPS host, or to hand it to a tester, including when the user drives Claude from
another device (Remote Control): Claude runs the script and posts the URL in the chat.

It is a test host only. Players get the game from its store or portal, never from Vercel.

## What it deploys

| Build | Folder | Kind |
|---|---|---|
| Concept HTML playtest (stage 3) | `concepts/<slug>/prototypes/<name>/` | html |
| Unity WebGL build (stage 8) | the build output folder, for example `<Code>-<Name>/Builds/WebGL/` | unity |

The script copies the folder to a temporary stage, adds a `vercel.json` there and deploys the stage, so nothing is
written into the concept or the game: no `vercel.json`, no `.vercel/` link folder. For a Unity build it adds the
headers a compressed build needs (`Content-Encoding: br` or `gzip`, plus the right `Content-Type` for `.wasm`,
`.js` and `.data`), so Brotli builds load without the decompression fallback. Every file gets `Cache-Control:
no-cache`, so a new deploy is never hidden by an old cached one.

## Commands

Git Bash, workspace root:

```bash
bash deploy-test.sh concepts/star-farm/prototypes/star-farm                  # concept playtest, preview
bash deploy-test.sh CG03-StarFarm/Builds/WebGL                               # game build, preview
bash deploy-test.sh CG03-StarFarm/Builds/WebGL --prod                        # stable public URL (user asks)
bash deploy-test.sh CG03-StarFarm/Builds/WebGL --dry-run                     # show files and headers only
```

The last line of the output is `TEST_URL=<url>`.

- **Project name.** `<slug>-playtest` for a concept, the game folder in lowercase plus `-test` for a game
  (`cg03-starfarm-test`). `--project <name>` overrides it. The project is created on the first deploy. Use the
  slug or the working title before the name is locked; never put a final product name on Vercel before stage 5.
- **Preview (default).** Each deploy gets its own URL, which Vercel's default Deployment Protection shows only to
  people signed in to the Vercel account. The user's phone works once it is signed in to Vercel in its browser.
  A new project's first deploy is kept off the public domain too.
- **Production (`--prod`).** The project's stable domain (usually `https://<project>.vercel.app`; Vercel adds a
  suffix when the name is taken), public to anyone who has the URL. Only when the user asks, for testers outside the
  account. A public test build of an unreleased game can be found and copied: keep it for short tests.

## Setup, once per machine

1. `npm i -g vercel` (tested with Vercel CLI 65.14.0).
2. The user signs in: `vercel login` in a terminal, and approves the device in the browser. For a machine without a
   browser, a token from Vercel → Account Settings → Tokens in `VERCEL_TOKEN` works too. `VERCEL_SCOPE` picks a team.

The script checks the sign-in first and stops with a message when it is missing. It never starts a sign-in itself:
from a chat, nobody would see the device code. Signing in is the user's step, never Claude's.

## Rules

- A test deploy is not a release and not a git step: no commit, tag or changelog entry for it. Note the URL in
  `design/playtest-record.md` when a play session used it.
- Deploy only what the user asked to test. `--prod` only when the user asks for it.
- Never put secrets in a deployed folder: everything in it is downloadable by whoever opens the URL.
- Clean up old test projects with `vercel project ls` and `vercel project delete <name> --confirm-name <name>` when the user agrees.

## Remote Control

When the user drives the session from a phone: build if needed, run `deploy-test.sh`, and reply
with the `TEST_URL`. A preview URL opens on the phone if its browser is signed in to Vercel; otherwise ask whether to
deploy with `--prod`.
