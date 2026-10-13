# TrackMyself

A job application tracker. Record the roles you apply for, move them through eleven pipeline
stages with a per-application timeline and interview rounds, keep every CV and cover letter in
one library, and generate tailored Word and PDF documents per application. Eight browser-side
tools handle the fiddly parts of applying — headshots, banners, PDFs, job-ad analysis — without
uploading anything.

Around that sit a notifications centre that surfaces ghost listings, upcoming interviews and
due follow-ups, an application triage, a per-application interview-prep generator, job-fit gap
analysis, a to-do list, in-app issue reporting that emails the maintainer, guided tours, a
settings page and accessibility controls. AI features run on a shared, metered key or on a key
the user brings themselves.

A job-hunt pipeline finds fresh jobs every morning, prepares a tailored CV and cover letter for
the ones you pick, helps fill the application in your browser and sends a daily report. You
always press Submit yourself. An API, webhooks, an MCP server and a notebook connect it to
Claude, n8n and Colab.

Built with Next.js 16 (App Router), React 19, TypeScript, MongoDB/Mongoose 9, NextAuth 4, SWR
and Tailwind CSS 4. Tests with vitest; errors to Sentry.

**Live at <https://trackmyself.webarden.tech>.** The older `track-myself.vercel.app` host still
resolves and serves the same deployment, but canonical URLs, sitemap entries, OAuth redirects
and transactional email all point at the `webarden.tech` subdomain.

---

## Getting started

Requires Node 22 and a MongoDB database — Atlas or local.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Then open <http://localhost:3000>.

### Environment

| Variable | Required | What it does |
|---|---|---|
| `MONGODB_URI` | yes | MongoDB connection string. |
| `NEXTAUTH_URL` | yes | Base URL of this deployment. |
| `NEXTAUTH_SECRET` | yes | Long random string; signs the session JWT. |
| `NEXT_PUBLIC_SITE_URL` | recommended | Canonical origin for sitemap, robots, Open Graph tags, verification and reset links. |
| `RESEND_API_KEY` | recommended | Sends email verification, welcome, password-reset and issue-report email. In production, registration refuses to create accounts without it. |
| `ISSUE_MAIL_TO` | with Resend | Inbox that receives issue reports; comma-separate for several. |
| `ISSUE_MAIL_FROM` | no | Sender for all mail, e.g. `TrackMyself <alerts@yourdomain>`. Needs a domain verified in Resend; blank uses `onboarding@resend.dev`, which only delivers to your own Resend address. |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | no | Enables "Sign in with Google". |
| `ANTHROPIC_API_KEY` | no | Shared key behind the metered AI allowance. Without it (or `OPENAI_API_KEY`) AI features fall back to their non-AI mode unless the user brings a key. |
| `OPENAI_API_KEY` | no | Second shared provider (GPT-6 Luna). Only used once an admin enables that model in `/settings`. |
| `GEMINI_API_KEY` / `GEMINI_MODEL` | no | Superadmin-only retry when a shared call fails. Never offered to other accounts. |
| `AI_KEY_SECRET` | no | Encrypts each user's own AI key (BYOK) at rest, AES-256-GCM. 16+ characters. Without it users cannot save a key. |
| `AI_BASEURL_ALLOWLIST` | no | Comma-separated hosts a user may point an OpenAI-compatible key at. Unset allows any public https host; private and cloud-metadata addresses are always refused. |
| `EXTENSION_IDS` | recommended | Chrome extension IDs allowed to receive a sign-in from `/extension/connect` and to call the extension API from their background worker. **Required in production** — with it unset, `/extension/connect` refuses every id and the API answers without CORS headers. |
| `EXTENSION_ORIGIN` | no | One extra explicit origin for the extension API. |
| `NEXT_PUBLIC_SENTRY_DSN` | no | Error reporting. Reports are scrubbed (`src/lib/observability/scrub.ts`): no bodies, cookies, emails or CV text. |
| `SENTRY_ORG` / `SENTRY_PROJECT` / `SENTRY_AUTH_TOKEN` | no | Build-time source-map upload. Set in Vercel, not CI. |
| `CRON_SECRET` | recommended | Authenticates the daily `/api/cron/maintenance` and `/api/cron/job-hunt` runs from `vercel.json`. |
| `ADZUNA_APP_ID` / `ADZUNA_APP_KEY` | no | Adzuna as a second job-hunt source (free developer key). Without them saved searches use the Bundesagentur source only. |
| `BA_API_KEY` | no | Overrides the public Bundesagentur Jobsuche client id. |
| `BILLING_PROVIDER` / `BILLING_WEBHOOK_SECRET` | no | `manual` (default) until a payment adapter exists. |
| `NEXT_PUBLIC_PREMIUM_PRICE`, `NEXT_PUBLIC_SUPPORT_EMAIL`, `NEXT_PUBLIC_UPGRADE_PAY_URL` | no | Pricing-page copy, support address, optional Payoneer payment link. |
| `DEV_INSECURE_TLS` | dev only | `1` disables TLS verification for corporate inspection proxies. Ignored in production. |
| `WEB3FORMS_ACCESS_KEY` | no | Fallback issue-report delivery when Resend is unset. `NEXT_PUBLIC_WEB3FORMS_KEY` is deprecated. |

`npm run check:env` fails when the code reads a variable `.env.example` does not document.

### Scripts

```bash
npm run dev            # dev server
npm run build          # production build (raises the Node heap to 4 GB)
npm start              # serve the build
npm run verify         # typecheck + lint + env check + unit tests — what CI runs
npm test               # vitest (pure modules)
npm run test:db        # *.dbtest.ts against MONGODB_TEST_URI
npm run typecheck:ext  # browser extension
npm run typecheck:mcp  # MCP server (after npm --prefix mcp-server install)
```

---

## How the app is laid out

Route groups, each with its own guard in `layout.tsx`. There is no `src/middleware.ts`;
`src/proxy.ts` is the Next 16 proxy covering the legacy `withAuth` paths.

| Zone | Paths | Who gets in |
|---|---|---|
| Public | `/`, `/tools/*`, `/faq`, `/terms`, `/privacy`, `/pricing`, `/verify-email` | anyone |
| Auth | `/login`, `/register`, `/forgot-password`, `/reset-password` | signed out (signed-in users are sent to `/me`) |
| Portal | `/me`, `/me/applications`, `/me/settings`, `/me/my-cv`, `/me/cv`, `/me/todos`, `/me/notifications`, `/me/issues`, `/me/ai-key` | any signed-in user |
| Job hunt | `/me/jobs`, `/me/jobs/[id]`, `/me/jobs/searches`, `/me/jobs/report` | `canUseJobHunt()`: superadmin, or Premium with the feature switched on |
| Dashboard | `/dashboard`, `/applications`, `/analytics`, `/dashboard/cv`, `/dashboard/users`, `/dashboard/issues`, `/dashboard/audit` | editor and above |
| Dashboard (admin) | `/settings`, `/dashboard/rbac` | admin and above |

`/profile` and `/users` are redirect-only aliases; `/admin/*` redirects to `/dashboard`.

### Roles and plans

```
superadmin > admin > editor > paid > free
```

`superadmin` and `paid` are always Premium; everyone else follows `User.plan`, which admins set
from `/dashboard/users`. A staff member can only manage accounts and assign roles strictly
below their own rank. Superadmin emails are hard-coded in `src/lib/permissions.ts` and only take
effect once that email is verified. The permission matrix lives in `AccessControl` and is edited
at `/dashboard/rbac`.

### Accounts

- **Email verification.** Registering sends a 24-hour link; credentials sign-in refuses until it
  is clicked. Google accounts are verified by Google. Accounts from before this feature are
  grandfathered. Resend from the login page or Settings → Security.
- **Pause** freezes application tracking and AI spend (writes return **423**) while the CV
  builder, My Documents, to-dos, settings and every tool keep working. Self-serve from
  Settings → Data; admins can pause from `/dashboard/users`.
- **Delete** (type `DELETE` plus your password) runs `purgeUserData()`, which removes every
  collection the account owns in order and the user row last; a partial failure is retried by the
  maintenance job. **Export** your data first as JSON from Settings → Data.
- **Sign out everywhere** and password changes revoke every other session.

---

## Applications

One form (`ApplicationFormModal`) creates and edits an application; `ViewApplicationModal` shows
it with interview rounds and a progress timeline.

| Area | Behaviour |
|---|---|
| Status | Eleven values in `APPLICATION_STATUSES`. Wishlist and Not Completed are *not applied*; both join Submitted and No Response in the 45-day ghost check. |
| Interviews | Any number of rounds (stage, date, status, feedback, notes) at `/api/applications/[id]/interviews`. Upcoming rounds feed notifications and triage. |
| Location, salary, expectation, contacts, applied-through, documents provided, job links | Unchanged from before: see `src/lib/applicationLocation.ts`, `src/lib/salary.ts`, `src/lib/salaryExpectation.ts`. |
| Rejection feedback / warm leads, offer outcome, follow-up date | Recorded on the application; warm leads get a filter and a hint on new applications to the same company. |
| Timeline | Built from `statusHistory`; every change records who made it. |
| List | Server-paginated (`?page&limit&q&status&favourite&flag&sort`), filters in the URL, mobile cards below `md`, skeleton while loading, optimistic quick updates with rollback. Deep link `?open=<id>`. |
| Attachments | PDF/DOC/DOCX/PNG/JPG/WebP up to **4 MB** (Vercel's body limit), content sniffed, 100 files / 100 MB per user, linked to the application and removed with it. |

Writes go through `updateApplication()` / `sanitizeUpdate()` (`src/lib/applicationHistory.ts`).
Deleting is soft with Undo and a 30-day trash; the daily maintenance job purges expired rows with
their interviews and attachments.

---

## CV system

One engine, server-side, producing real `.docx` (`docx`) and PDF (`@react-pdf/renderer`).

| Format | Notes |
|---|---|
| `ats` | Parser-optimised, no photo. `full` (3 pages) and `compact` (2 pages). |
| `europass` | EU standard with the CEFR language grid. |
| `designer` | Dark header band, photo embedded. |
| `lebenslauf` | German format. **Superadmin only.** |

Cover letters are written per job (`src/lib/cv/coverLetter.ts`); the review step shows editable
paragraphs. Generated drafts (CV previews, letters, interview questions) are cached for 24 hours
in `AiDraft`, so reopening a review or downloading what you previewed does not bill again.

`My Documents` (`/me/my-cv`) accepts documents up to 3 MB and photos up to 2 MB.

---

## AI features and BYOK

Every model call goes through one gateway (`src/lib/ai/gateway.ts`), which decides who may run a
task and on whose money, then rate-limits, reserves, dispatches, settles and logs it. Output is
validated against a schema with one repair attempt; job text and CVs are fenced as data under a
system prompt.

| Task | Where | Without AI |
|---|---|---|
| `cv.adapt` | CV Builder → AI Tailor | error |
| `cv.preview` | Application → Docs → Generate | reorder-only heuristic |
| `cover-letter.write` | Application → Docs → Cover letter | keyword draft |
| `interview.questions` | Application → Interview prep (preview open to everyone signed in; download is Premium) | curated bank |
| `cv.gap-analysis` | Application → Job fit | keyword gaps |
| `salary.estimate` | Salary expectation calculator | none |
| `applications.triage` | /me → Review my applications | rule-based list |
| `tools.banner-brief` | Banner generator | local brief |

**Entitlement**

- **Your own key** (`/me/ai-key`; Anthropic, Gemini or any OpenAI-compatible endpoint) unlocks
  every task on any plan and is never charged to the operator or counted against the allowance.
- **Premium** runs on the shared model.
- **Free** accounts get **10 shared uses a month** across all tasks, then the non-AI mode. The
  note on each result says which applied.
- Paused accounts and signed-out visitors never reach a model.

The shared default model is Claude Haiku 4.5; admins can enable Claude Sonnet 5 or GPT-6 Luna
(needs `OPENAI_API_KEY`) and pin a model per task from `/settings`. A global money ceiling (default
USD 9, **hard-capped at USD 10**, superadmin-only) and the per-user counters are reserved
atomically in MongoDB before any call; the superadmin's personal Gemini key is a last-resort retry
for that account alone. Keys are AES-256-GCM encrypted under `AI_KEY_SECRET`; OpenAI-compatible
base URLs must be public https hosts.

Token counts shown in the header pill are tokens spent *through TrackMyself*, not a provider balance.

---

## Pricing and billing

`/pricing` compares Free and Premium from the same entitlement table the server enforces. There
is **no payment provider yet**: `src/lib/billing/` defines a `BillingProvider` interface, a
`manual` provider and the webhook/checkout routes, and `/api/billing/checkout` answers 501 until
an adapter is configured. Until then "Upgrade" files an *Upgrade request* issue that an admin
resolves with one click in `/dashboard/issues`. Provider selection criteria (merchant of record,
Bangladesh onboarding, Payoneer payouts) are in `docs/ROADMAP.md`.

---

## Browser tools

`/tools/bg-remover` · `/tools/profile-image` · `/tools/banner-generator` · `/tools/jd-analyzer` ·
`/tools/image-optimizer` · `/tools/pdf-splitter` · `/tools/pdf-editor` · `/tools/docx-editor`

Every image and PDF is processed in the browser; nothing is uploaded. The banner generator's
optional AI brief sends the text you typed, never the artwork. Background removal uses MODNet via
Transformers.js (Apache-2.0, ~25 MB, cached by the browser). The CSP allows WebAssembly only under
`/tools`.

---

## Browser extension

`browser-extension/` holds a Manifest V3 extension. It adds a one-click "save this job" button on
LinkedIn, XING, StepStone and Indeed job pages, a "Send results to TrackMyself" button on their
search pages, and the job-hunt application helper (see Job hunt). Permissions: `storage`,
`activeTab` and `scripting` (the helper reaches company career sites only when the person opens
the popup on that tab), plus host access to the four boards and TrackMyself.

```bash
cd browser-extension
npm install
npm run typecheck    # @types/chrome is installed; CI runs this
npm run build        # or: npm run watch
```

Load `browser-extension/` as the unpacked extension. Sign in with email/password
(`/api/extension/auth`) or Google via `/extension/connect`; tokens carry `aud: "extension"` and are
rejected as website sessions and as Bearer tokens elsewhere. All API calls come from the
background worker, so CORS is keyed on `chrome-extension://<id>` for ids in `EXTENSION_IDS`.
Saving posts to `/api/extension/jobs` (honours pause, 60 saves/hour). The API host is hard-coded
in `src/background.ts`, `src/content.ts` and `src/popup.ts`.

Job-hunt calls use `/api/extension/leads` (ready list, harvest), `/leads/[id]/kit` and
`/leads/[id]/submitted`; they re-check the account's status and plan on every call.

Changes reach users only after `npm run build` and a Chrome Web Store resubmission. Current
version **1.2.0** (new permissions, so users re-approve); `manifest.json` and `package.json` must agree (CI checks). Country domains such
as `de.indeed.com` are not yet recognised (roadmap).

## Job hunt

A daily pipeline for finding fresh jobs and getting applications out, with the person in
control of every submission. Superadmin has it now; Premium accounts get it when an admin turns
on **Settings → Job hunt for premium accounts** (`canUseJobHunt()` in `src/lib/permissions.ts`).

1. **Saved searches** (`/me/jobs/searches`): keywords, place, radius, "posted within N days"
   (default 3), excluded companies, and optional LinkedIn / XING / StepStone saved-search links.
2. **Daily search** (`/api/cron/job-hunt`, 05:00 UTC): each active search queries the
   Bundesagentur für Arbeit Jobsuche API and Adzuna (`src/lib/jobs/sources/`). Results outside the
   age window are dropped, the platform is taken from the apply link (a BA hit that applies on
   stepstone.de counts as StepStone), the same job from several sources is merged, jobs already
   tracked as applications are skipped, and each new lead gets a fit score: word overlap between
   CV and posting, 0–100, not a judgement of ability (`src/lib/jobs/score.ts`).
3. **Inbox** (`/me/jobs`): leads by fit, newest or deadline, with progress toward each platform's
   daily target. Shortlist, dismiss, or prepare in bulk. "Search now" runs the searches on demand.
4. **Prepare** (`prepareLead()` in `src/lib/jobs/prepare.ts`): creates the tracked application
   (Wishlist, with posting date, deadline and link), tailors the CV, writes a cover letter, runs a
   gap check and saves both PDFs to My Documents linked to the application. AI goes through the
   gateway under the account's own entitlement and falls back to the non-AI versions. Optional
   auto-prepare does this each morning for the best new leads up to each platform's remaining
   target.
5. **Review** (`/me/jobs/[id]`): CV changes, editable letter, gap questions whose answers feed a
   re-tailor, then **Approve and apply with the extension**.
6. **Assisted apply** (browser extension 1.2): the posting opens with `#tm-lead=<id>`, or the popup
   injects the helper into any tab via `activeTab`. It fills matching fields, uses saved screening
   answers only on clear matches, attaches the prepared CV and letter, and highlights what needs
   the person. **It never presses Next or Submit.** When the site shows its confirmation, the
   application is marked Submitted.
7. **Daily report** (`/me/jobs/report`, email, bell, `report.daily` webhook): new jobs against
   targets, what is waiting, deadlines in three days, follow-ups, and feedback from the last 30
   days (reply rate per platform, fit band against replies, time to first reply). Overdue
   follow-ups become to-dos once; prepared applications whose deadline passed are closed with a
   note.

LinkedIn, XING and StepStone forbid automated applying, and LinkedIn restricts accounts that do
it. Nothing here submits on anyone's behalf, and the search-results harvest only runs when the
person presses "Send results to TrackMyself" on a page they opened.

### Automation API, webhooks, MCP and notebook

Personal access tokens (Settings → Integrations; hashed, scoped, expiring, revocable) unlock
`/api/v1`: leads, ingest, prepare, hunt, report, insights and application updates. Signed
webhooks (`X-TM-Signature`, HMAC-SHA256) announce `lead.created`, `lead.ready`,
`application.submitted` and `report.daily`. Approving and submitting are not in the API.

- `mcp-server/`: a stdio MCP server so Claude Desktop or Claude Code can work the pipeline in
  conversation. Setup in `mcp-server/README.md`.
- `notebooks/job_hunt_insights.ipynb`: read-only Google Colab notebook for funnels, fit against
  replies, response times and a suggested target mix.
- `docs/automation.md`: the API reference, webhook verification and n8n recipes (job-alert
  emails into the inbox, extra schedules, chat notifications).

---

## Notifications, to-dos and issue reports

Derived items (ghost listings, duplicates, interviews within 7 days, follow-ups due, to-dos due)
are recomputed on every read from a light projection; stored items (`Notification` model) cover
issue updates, account changes and AI-key failures. Each derived item deep-links to
`/me/applications?open=<id>`. Read state lives in `User.notifSeen` (bounded), dismissals in
`notifDismissed`, and per-type mutes in `notifPrefs` (Settings → Notifications). One SWR key
polls every 60 s per tab; tabs sync over a `BroadcastChannel`.

Issue reports are stored first and mailed via Resend (Web3Forms fallback). Editors triage them at
`/dashboard/issues`.

---

## Settings, tours and accessibility

`/me/settings` has tabs for Profile (name, bio, avatar), Security (password, Google link, sign
out everywhere, email verification), Accessibility, Notifications, Plan and Data (export, pause,
delete). The quick bubble still offers the accessibility modal everywhere.

Tours auto-run once per audience (`home` for free visitors, `portal` for free and premium,
`dashboard` for staff) and can be replayed from the bubble. Accessibility preferences are stored
on the account, mirrored to `localStorage`, applied before paint by the boot script, and synced on
sign-in.

---

## Admin

`/dashboard` (stats, charts), `/analytics`, `/applications` (every user's rows), `/dashboard/users`
(search, sort, last login, role/plan/pause with confirmation), `/dashboard/cv`, `/dashboard/issues`,
`/dashboard/audit` (every admin mutation: who, what, before/after), `/dashboard/rbac`, `/settings`
(tours, AI budget and models, maintenance tasks and migrations).

---

## Operations

### Health and errors

`GET /api/health` → `{ status, db, latencyMs, commit }` (200 or 503). Errors go to Sentry when
`NEXT_PUBLIC_SENTRY_DSN` is set, through a same-origin tunnel (`/monitoring`), with request bodies,
cookies, emails and CV text stripped. Every zone has an `error.tsx`; `global-error.tsx` covers
the root.

### Scheduled maintenance

`vercel.json` runs `/api/cron/maintenance` daily at 03:00 UTC (Hobby plan: once a day per job).
It purges expired trash, settles orphaned AI calls, removes used tokens and unattached uploads,
and retries half-finished account deletions. The same work also runs opportunistically on
normal traffic.

`/api/cron/job-hunt` runs at 05:00 UTC: search, auto-prepare, upkeep and the daily report for every
account with job hunt on, inside one 60-second invocation. Accounts that do not fit are reported
as left over and run next time; "Search now" and `POST /api/v1/hunt/run` cover the rest.

### Migrations

Idempotent entries in `src/lib/migrations/index.ts`, run by a superadmin from Settings →
Maintenance or `POST /api/admin/migrations/<name>`. After deploying this version run, in order:
`ensure-indexes`, `normalise-emails`, `backfill-email-verified`, `backfill-interview-user-id`,
`backfill-document-application-id`, `purge-preview-cvfiles`, `drop-reminders`. Run `ensure-indexes`
again after deploying job hunt so `JobSearch`, `JobLead` and `ApiToken` get their indexes.

### CI/CD

`.github/workflows/ci.yml`: **verify** (typecheck, lint, env check, unit tests, build with
placeholder env), **extension** (typecheck, build, manifest/package check, artifact), **test-db**
(vitest `*.dbtest.ts` against a MongoDB service container), **mcp** (builds the MCP server and
checks its stdio handshake), **audit** (`npm audit`, blocks on
critical). Vercel deploys from the GitHub integration; CI does not gate it until branch protection
requires the `verify` and `extension` checks on `main`:

```bash
gh api -X PUT repos/<owner>/<repo>/branches/main/protection \
  -f required_status_checks[strict]=true \
  -f required_status_checks[contexts][]="Types, lint, build" \
  -f required_status_checks[contexts][]="Browser extension" \
  -F enforce_admins=true -F required_pull_request_reviews=null -F restrictions=null
```

`next build` skips type checking (`typescript.ignoreBuildErrors`), so `npm run verify` is the
gate. Builds need no secrets. Set per-environment Vercel variables — **point Preview at a separate
database** — for everything in the table above.

### Rate limits

All shared in MongoDB (`RateBucket`): login 8/15 min per email + 30/15 min per IP; extension
login 8 + 30; register 5/h per IP; forgot/reset/verify/resend 5–20/h; account delete 10/h;
password change 5/15 min; CV import 40/h; uploads 30/h; CV generate 30/10 min; applications
60/h; extension saves 60/h; search 60/min; AI tasks 20/10 min per task (tighter on tailoring);
BYOK key checks 5/10 min; exports 3/h; job search refresh 4/h; lead preparation 20/h;
extension harvest 20 batches/h; API tokens 120 requests/min each.

---

## Conventions

Enforced by review and by lint. `AGENTS.md` holds the full list.

- API routes: `force-dynamic` first; `serverAuth` helpers; `parseObjectId()` on ids;
  `checkRateLimitDb` for limits; `recordAdminAction` beside admin writes; serialisers for users.
- Portal routes scope to `{ userId: auth.id }`; dynamic params are Promises.
- Dark mode is `[data-theme="dark"]` in `globals.css`; no `dark:` and no raw palette classes
  (ESLint warns). Use the semantic classes and tokens.
- Confirm with `useConfirm()`, report with `toast()`; SWR for client reads.
- Rationale block comments are allowed where a constraint is non-obvious; no JSDoc, no narration.
- Ask before adding a dependency.

---

## Data model

`User` · `Application` · `Interview` · `Document` · `CVProfile` · `CVFile` · `AiDraft` ·
`AccessControl` · `AppSettings` · `AdminAction` · `Todo` · `IssueReport` · `Notification` ·
`PasswordResetToken` · `EmailVerificationToken` · `RateBucket` · `AiBudget` · `AiCallLog` ·
`AiUsageCounter` · `JobSearch` · `JobLead` · `ApiToken`

`Application.userId`, `Document.userId` and `Interview.userId` are `ObjectId`; `CVProfile.userId`
and `CVFile.userId` are `String`. Mongoose casts through the models; raw driver queries need the
right type.

---

## Not implemented

- A payment provider (abstraction and request flow only)
- 2FA, email change, teams, i18n, the A/B/C generation workflow
- Automatic submission of applications (deliberately; see Job hunt)
- Per-ATS form adapters (Workday, Greenhouse, Personio) beyond the generic label matcher
- Component-level UI tests

See `docs/ROADMAP.md` and `docs/AUDIT-2026-10.md`.
