# Database migration index

Run scripts **in numeric order** (001 → 002 → …), not in the order listed below. The checklist is **newest first** so the latest script is at the top.

**Do not edit scripts you have already run.** New schema changes belong in the **next numbered** script only.

Dates in brackets are the day you **applied** the script on Neon. Leave the box unchecked until then.

---

## Checklist (mark when run)

- [x] 001_initial_schema.sql

---

## Scripts (newest first)

| # | Script | Added | Summary |
|---|--------|-------|---------|
| 001 | `001_initial_schema.sql` | 2026-09-30 | Planning OS schema: users (Google allowlist), 14 master documents and derivatives, versions, decisions, assumptions, risks, meetings, appointments, contacts, notes, tasks, AI agents and runs, audit log. Seeds document shells, three Claude agents, and the English-language task. Replace the two founder emails before running. |
