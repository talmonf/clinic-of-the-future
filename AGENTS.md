<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Database changes

- **Never run anything against the database yourself.** Only the user runs database scripts on Neon. This includes migration runners, `db:migrate`, `db:push`, seed scripts, and ad-hoc SQL. Write the script, then tell the user it is ready to run.
- Every new migration in `db/migrations/` must be added to `db/migrations/000_INDEX.md`, in both the checklist (left unchecked) and the scripts table (newest first).
- Do not edit a script the user has already run. Put new schema changes in the next numbered file only.
