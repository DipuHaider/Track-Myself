# TrackMyself — Product goals (October 2026)

## What this is

A job-application tracker for individuals, with the documents and preparation around each
application in the same place. Portal users (free or premium) work at `/me`. Staff (editor,
admin, superadmin) run the platform from `/dashboard`.

## Who it is for

People applying for jobs in Germany, the UK, Bangladesh and remote roles, who want one record per
application, tailored documents without a design tool, and a nudge when something needs chasing.

## Current capabilities

- Applications with eleven pipeline statuses, status history, contacts, salary and expectation,
  rejection feedback and warm leads, offer outcomes, follow-up dates, attachments, soft delete
  with a 30-day trash.
- Interview rounds per application, feeding notifications and triage.
- CV builder with ATS, Europass, Designer and (superadmin) Lebenslauf formats as real `.docx` and
  PDF; My Documents library; cover letters written per job; interview questions; job-fit gap
  analysis; salary estimate; application triage.
- AI through one gateway: a user's own key unlocks everything and is never charged to the
  operator; premium runs on the shared model; free accounts get a metered monthly allowance and
  then the non-AI mode of each feature. A hard USD 10 monthly ceiling protects the operator.
- Eight browser-side tools (background removal, profile image, banner, JD analyser, image
  optimiser, PDF split/edit, DOCX edit) that never upload the file.
- Chrome extension that saves LinkedIn and Indeed jobs in one click.
- In-app notifications (derived + stored, per-type mute), to-dos, issue reports, tours,
  accessibility preferences synced to the account.
- Email verification, password reset, sign-out-everywhere, data export, pause and delete.
- Admin: users (search, roles, plans, pause), RBAC matrix, AI budget, settings, issues, audit log,
  maintenance and migrations.

## Principles

- Local-first for files: images and PDFs are processed in the browser.
- Metered, honest AI: every model call is counted once, labelled with its mode, and has a
  non-AI fallback.
- No dark patterns: pausing and deleting are self-serve; upsells link to a real pricing page.
- Conventions over tooling: see `AGENTS.md`; CI gates types, lint, env docs and tests.

## Out of scope for now

Payments provider (abstraction only — see `docs/ROADMAP.md`), teams, i18n, email digests, 2FA,
MCP.

## Architecture constraints

- NextAuth v4 — do not migrate to v5 without an explicit request.
- No Redis, no queue; MongoDB-backed rate limits and counters; one daily Vercel cron.
- Single MongoDB instance; migrations are idempotent and run by hand from Settings.
- Vercel Hobby limits: ~4.5 MB request bodies, no long-running jobs.
