# Name lock

The final name is chosen after the playtest verdict is PROCEED and before the game project exists. Every name the
project uses comes from the **Locked** block below. `new-game.sh --concept` refuses a concept whose status is not
`locked`.

- Status: open
- Working title:

## Candidates

At least three. Short (two or three words), easy to say and spell, no numbers or symbols, not a name of an existing
game or brand.

| Candidate | Store and portal search | Trademark search | Repo name free | Notes |
|---|---|---|---|---|
| | | | | |
| | | | | |
| | | | | |

How to check:
- **Store and portal search:** search the exact name on every store or portal the game targets, plus itch.io,
  Steam, Google Play and the App Store. Write what you found (none, a different kind of product, a game: reject).
- **Trademark search:** a quick search on WIPO Global Brand Database, USPTO and EUIPO for the exact words in class 9
  (software) and 41 (entertainment). This is a quick screen, not legal clearance.
- **Repo name free:** `gh repo view <owner>/<repo-name>` answers "not found".

## Locked

Filled when the user picks a candidate. Then set `Status: locked` at the top.

- Product name: (shown to players, for example `Star Farm`)
- Game code: (portfolio prefix + number, for example `CG03`)
- Folder: `<Code>-<PascalName>`, for example `CG03-StarFarm`
- Repo: `<owner>/<kebab-name>`, for example `my-account/star-farm`, private
- Application identifier: `com.<company>.<lowercasename>`
- Save key: `<lowercasename>` (or the game's own save prefix)
- Approved by: the user, YYYY-MM-DD
