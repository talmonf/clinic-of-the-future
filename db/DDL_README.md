# Database scripts

Schema changes are hand-written SQL files. The app does not apply them.

- **Location:** `db/migrations/`
- **Index:** `db/migrations/000_INDEX.md` — the checklist is at the top (newest first). Run scripts in numeric order, oldest first.
- **Who runs them:** only a founder, in the Neon SQL editor (or `psql`). Agents and the Next.js app must not execute these files.
- **After you run a script:** tick its checkbox in `000_INDEX.md` and replace the blank date with the day you applied it.
- **Do not edit a script you have already run.** Add the next number instead.

`001_initial_schema.sql` is idempotent. Before the first run, replace the two placeholder founder emails at the bottom of that file with the Google accounts that should be able to sign in.
