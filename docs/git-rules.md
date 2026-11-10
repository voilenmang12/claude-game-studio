# Git and GitHub rules

Rules for every repo in the workspace. Claude follows them; the user decides anything marked **(user)**.

## 1. Repos

| Repo | Where | Remote | Visibility | Created by |
|---|---|---|---|---|
| Workspace | the workspace root (this repo) | `origin` = the workspace repo | public | the user |
| Concept | `concepts/<slug>/` | **none** | local only | `new-concept.sh` |
| Game | `<Code>-<Name>/` | `origin` = the game's own GitHub repo | **private** | `new-game.sh`, then `publish-game.sh` |

- One game = one folder = one repo. A game repo never contains another game, and the workspace repo never contains
  a game, a concept or game content (its `.gitignore` tracks only the workspace files).
- A game repo gets its GitHub remote only after the name is locked and the first commit exists
  (`docs/game-lifecycle.md`, stages 5 to 7). Never create a GitHub repo for a concept.
- A game repo that holds paid Asset Store plugins stays **private**. Making any repo public is **(user)**.
- Never add the CCGS upstream as a remote of a game. Upstream releases come in through the workspace (`FORK.md`) and
  reach games as template versions.

## 2. Branches and history

- Trunk-based: `main` is the only long-lived branch. Short branches (`story/<story-id>`, `fix/<what>`) are fine for
  work that takes more than one sitting; merge them back fast-forward or with a merge commit, then delete them.
- Never rewrite pushed history: no `push --force` on `main`, no rebase of pushed commits, no amend of a pushed commit.
- Never commit with `--no-verify`: the CCGS hooks are the safety net. Fix what a hook reports.
- Commit and push only when the user asks **(user)**. Pushing is publishing.

## 3. Commit messages

Conventional Commits (`feat:`, `fix:`, `docs:`, `chore:`, `test:`, `refactor:`), English, imperative, the subject
under about 70 characters; the body says why, and names the story or task ID (`Story: EPIC-001-S02`).

Fixed messages, so history can be searched:

| When | Message | Repo |
|---|---|---|
| Concept created | `chore: start concept <slug> from template vX.YY` | concept |
| Playtest change accepted | `iteration N: <what>` (written by `/prototype`) | concept |
| GDD version approved | `docs: production GDD vX.Y` | concept, game |
| Name locked | `docs: lock name <Product Name>` | concept |
| Game created | `chore: start <Game> from template vX.YY` | game |
| Template port | `chore: sync template vX.YY` | game |
| Template request | `docs: template request TR-<code>-<NNN>` | game |
| Template release | `release: template vX.YY` | workspace |

## 4. Tags

| Tag | Meaning | Repo |
|---|---|---|
| `vX.YY` (two-digit minor) | template release | workspace |
| `one-shot/<name>`, `baseline/<name>` | first playtest build, imported game (written by `/prototype`) | concept |
| `gdd-v1.0` | the approved production GDD | concept |
| `vMAJOR.MINOR.PATCH` | a game build sent to a store or portal | game |

Tags are annotated (`git tag -a`), and pushed on purpose (`git push origin <tag>`), never with `--tags` by habit.

## 5. What never goes into a repo

- Unity's generated folders (`Library/`, `Temp/`, `Logs/`, `obj/`, `UserSettings/`), builds, IDE state: the
  template's `.gitignore` covers them. It is the standard file for every game; change it in `template/` first.
- Secrets: API keys, tokens, `.env`, keystores, signing certificates, `project.local.yaml` values.
- Paid plugins in a public repo; personal data or machine paths in the workspace repo.
- Vercel state: `.vercel/` (ignored). `deploy-test.sh` deploys from a temporary copy, so it never writes one;
  a test deploy is not a git step (`docs/test-deploys.md`).
- Files over 50 MB. If a game needs them, decide on Git LFS first **(user)**.

Before each commit, read `git status` and `git diff --cached`: only the files of this change, nothing generated,
nothing secret.

## 6. Game repo checklist (stage 7)

- [ ] `design/name-lock.md` is `locked`; the repo name is the one in its Locked block.
- [ ] `git status` is clean and `main` has the first commit and the product identity commit.
- [ ] `gh auth status` is signed in to the account that owns the repo.
- [ ] `bash publish-game.sh <Game>` created the repo **private** and pushed `main`.
- [ ] `git remote -v` shows only `origin`.
