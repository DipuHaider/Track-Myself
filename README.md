# TrackMyself

A job application tracker. Record the roles you apply for, move them through ten pipeline
stages, keep every CV and cover letter in one library, and generate tailored Word documents
per application. Eight browser-side tools handle the fiddly parts of applying — headshots,
banners, PDFs, job-ad analysis — without uploading anything.

Around that sit a notifications centre that surfaces ghost listings and upcoming interviews,
a per-application interview-prep generator, a to-do list, in-app issue reporting that emails
the maintainer, guided product tours, and accessibility controls. AI features run on a
shared key or on a key the user brings themselves.

Built with Next.js 16 (App Router), React 19, TypeScript, MongoDB/Mongoose, NextAuth 4 and
Tailwind CSS 4.

**Live at <https://trackmyself.webarden.tech>.** The older `track-myself.vercel.app` host still
resolves and serves the same deployment, but canonical URLs, sitemap entries, OAuth redirects
and transactional email all point at the `webarden.tech` subdomain.

---

## Getting started

Requires Node 20+ (developed on 22) and a MongoDB database — Atlas or local.

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
| `GOOGLE_CLIENT_ID` | no | Enables "Sign in with Google". Omit both and only email/password works. |
| `GOOGLE_CLIENT_SECRET` | no | Paired with the above. |
| `NEXT_PUBLIC_SITE_URL` | recommended | Canonical origin for sitemap, robots, Open Graph tags and password-reset links. Falsy in production means wrong canonical URLs and reset links pointing at the wrong host. |
| `ANTHROPIC_API_KEY` | no | Shared key for AI CV tailoring, interview questions and banner briefs. Without it those features fall back to a heuristic, or to a user's own key. |
| `GEMINI_API_KEY` | no | Superadmin-only fallback — it spends one person's quota, so it is never offered to other accounts. |
| `GEMINI_MODEL` | no | Overrides the default `gemini-3.6-flash`. |
| `AI_KEY_SECRET` | no | Encrypts each user's own AI key (BYOK) at rest with AES-256-GCM. 16+ characters; `openssl rand -base64 32`. Without it users cannot save a key and the form says so. |
| `RESEND_API_KEY` | recommended | Sends issue-report email and password-reset links. Required for `/forgot-password` — Web3Forms can only mail the inbox that owns its key. |
| `ISSUE_MAIL_TO` | with Resend | Inbox that receives reports; comma-separate for several. |
| `ISSUE_MAIL_FROM` | no | Sender for reports and reset links, e.g. `TrackMyself <alerts@yourdomain>`. Needs a domain verified in Resend. Blank uses `onboarding@resend.dev`, which only delivers to your own Resend account address — so password resets fail for everyone else. |
| `WEB3FORMS_ACCESS_KEY` | no | Fallback when Resend is unset. The key *is* the destination inbox. Web3Forms throttles server-side senders for an hour at a time, so it drops reports under load — prefer Resend. |
| `EXTENSION_ORIGIN` | no | Locks the extension CORS allowlist to one origin. Defaults to `*`. |

### Scripts

```bash
npm run dev        # dev server
npm run build      # production build (raises the Node heap to 4 GB)
npm start          # serve the build
npm run verify     # typecheck + lint + env check — what CI runs
npm run typecheck  # tsc --noEmit
npm run lint       # eslint src
npm run check:env  # every process.env read is documented in .env.example
```

Run `npm run verify` before pushing. `next build` checks neither types nor lint — see
[CI/CD](#cicd). There is no test suite.

---

## How the app is laid out

Route groups, each with its own guard in `layout.tsx`. There is no `src/middleware.ts` and
none should be added; `src/proxy.ts` covers the legacy `withAuth` paths.

| Zone | Paths | Who gets in |
|---|---|---|
| Public | `/`, `/tools/*`, `/faq`, `/terms`, `/privacy` | anyone |
| Auth | `/login`, `/register` | signed out |
| Portal | `/me`, `/me/applications`, `/me/my-cv`, `/me/cv`, `/me/todos`, `/me/notifications`, `/me/issues`, `/me/ai-key` | any signed-in user |
| Dashboard | `/dashboard`, `/applications`, `/analytics`, `/dashboard/cv`, `/dashboard/users`, `/dashboard/issues` | editor and above |
| Dashboard (admin) | `/settings`, `/dashboard/rbac` | admin and above |

`/profile` and `/users` are redirect-only aliases for `/me` and `/dashboard/users`.

The portal is the product. The dashboard exists to run the platform — it reads across all
users, so ordinary accounts are redirected away from it. `/settings` and `/dashboard/rbac`
guard at the page rather than the layout, since they sit inside the editor-level group.

### Roles and plans

```
superadmin > admin > editor > paid > free
```

`superadmin` and `paid` are always Premium. Everyone else follows the `User.plan` field,
which admins set from `/dashboard/users`. `isPremiumUser(role, plan)` is the single
predicate used by both the UI and `requirePremiumAuth()`. Role, plan and status claims
refresh from the database at most every five minutes, so an upgrade applies without a
re-login. Superadmin emails are hard-coded in `src/lib/permissions.ts`.

Beyond those tiers, the permission matrix lives in the `AccessControl` collection and is
edited at `/dashboard/rbac`. Access to that page is hard-coded to superadmin and admin
rather than being part of the matrix, so nobody can lock themselves out. Server checks go
through `requireAction(action)`; the client mirrors them with `usePermissions()` and
`<PermissionGate>`.

### Account status

Every account is `active` or `paused`.

**Pause** freezes application tracking — writes return **423 Locked**, from the site and the
browser extension alike — while leaving reads, the CV builder, My Documents and every tool
working. It is self-serve from `/me`, reversible in one click, and deletes nothing. Admins
can pause an account from `/dashboard/users`. A paused staff account keeps dashboard read
access but loses every dashboard write.

**Delete** is also self-serve from `/me`. Confirm by typing `DELETE`, plus your password if
the account has one, and `purgeUserData()` erases the user together with every application,
interview, reminder, CV file, CV profile and document in one operation. The response expires
the session cookies, and any other session for that account dies on its next request.
Superadmin accounts cannot self-delete.

---

## CV system

One engine, server-side, producing real `.docx` files via the `docx` package — there is no
HTML-renamed-to-`.doc` path.

| Format | Notes |
|---|---|
| `ats` | Parser-optimised, no photo. `full` (3 pages) and `compact` (2 pages) variants. |
| `europass` | EU standard with the CEFR language grid, no photo. |
| `designer` | Dark header band, photo embedded. |
| `lebenslauf` | German format. **Superadmin only** — enforced in the UI and in the generate endpoint. |

The compact variant swaps in `summaryShort` + `skillsCompact` and drops projects. Per-format
bullet-count arrays control page length. Builders live in `src/lib/cv/docx/`; the content
model and the importer for old free-text profiles are in `src/lib/cv/content.ts`.

`My Documents` (`/me/my-cv`) is the file library — CVs, resumes, cover letters, certificates,
a profile picture, a cover image. Starring an item marks it as the one used when generating
documents for a job.

---

## Browser tools

`/tools/bg-remover` · `/tools/profile-image` · `/tools/banner-generator` ·
`/tools/jd-analyzer` · `/tools/image-optimizer` · `/tools/pdf-splitter` ·
`/tools/pdf-editor` · `/tools/docx-editor`

Every image and PDF is processed in the browser with Canvas — none is uploaded. The one
call any tool makes to the server is the banner generator's optional AI brief
(`/api/tools/banner-brief`), which sends the text you typed, never the artwork. No sign-in
is needed for any of them.

Background removal uses MODNet through Transformers.js — roughly 25 MB, downloaded once and
cached by the browser. It was chosen over better-known models because it is Apache-2.0.

---

## Browser extension

`browser-extension/` holds a Manifest V3 extension that adds a one-click "save this job"
button on LinkedIn and Indeed job pages.

```bash
cd browser-extension
npm install
npm run build        # or: npm run watch
```

Load **`browser-extension/`** as the unpacked extension — not `dist/`. `manifest.json` lives
at that root and points at `dist/*.js` and `icons/*`, and `build.js` does not copy it, so
`dist/` on its own is not loadable.

It authenticates against `/api/extension/auth` and posts to `/api/extension/jobs`, which
honours the pause state and returns 423 with a readable message. The API host is hard-coded
to `https://trackmyself.webarden.tech` in `src/background.ts:1` and `src/content.ts:3`;
change it there to point a local build at `localhost:3000`. `manifest.json` grants host
permissions for both that domain and the older `track-myself.vercel.app`, so an installed
copy keeps working instead of being disabled pending a permission re-prompt.

**These changes only reach users after `npm run build` in `browser-extension/` and a Chrome
Web Store re-submission** — `dist/` is not committed, so the source change alone ships
nothing.

The toolbar icon opens `popup.html`, which reports sign-in status and points at the job page
— the saving UI itself is a floating button the content script injects on LinkedIn and Indeed
job pages, not a browser popup.

The content script is injected across both domains rather than only `/jobs/*`, because
LinkedIn never reloads the document when you move from a feed or a search result into a
posting. `isJobPage()` decides whether the button is shown, and re-runs on every SPA
navigation.

CI builds the extension on every push and uploads a `trackmyself-extension` artifact
containing `manifest.json`, `popup.html`, `dist/` and `icons/` — that folder is what you
upload to the Chrome Web Store. A packaging step asserts every file the manifest references
is actually present, since a missing one installs fine and fails at the first click.

---

## CI/CD

### What runs, and where

Pushes and pull requests trigger `.github/workflows/ci.yml`, which has three jobs:

| Job | Does | Blocks on |
|---|---|---|
| `verify` | `npm ci` → typecheck → lint → env check → build | any failure |
| `extension` | builds the browser extension, checks manifest/package versions agree, uploads the loadable folder as an artifact | build or version mismatch |
| `audit` | `npm audit` | **critical** only |

Deployment is separate: Vercel builds and deploys from the GitHub integration. **CI does not
gate the deploy** — a red CI run does not stop Vercel from shipping. Turn on branch
protection for `main` (require the `verify` job, disallow direct pushes) if you want the
check to actually mean something.

### Why CI is the only type check

`next.config.ts` sets `typescript.ignoreBuildErrors: true`, so `next build` prints
*"Skipping validation of types"* and ships regardless. Next 16 also removed the built-in
ESLint integration, so the build lints nothing either. That is a deliberate split — the
Vercel build stays fast, and correctness is gated in CI — but it only holds while CI runs.
Never rely on a green `next build` as evidence the types are sound.

Locally, `npm run verify` runs the same typecheck, lint and env check that CI does.

### Builds need no secrets

`src/lib/db.ts` throws at import time when `MONGODB_URI` is unset, and Next imports every
API route while collecting page data — so a build with no env vars fails. It never opens a
connection though, so placeholders are enough, which is what CI uses. Nothing in the build
touches the database, and `sitemap.ts`, `robots.ts` and the OG image are all static.

### Vercel environment variables

Set these per environment (Production, Preview, Development) in the Vercel dashboard —
there is no `vercel.json`, so everything comes from project settings:

- `MONGODB_URI` — **point Preview at a separate database.** Preview deployments run the same
  destructive code paths as production, including account deletion.
- `NEXTAUTH_URL` — must match the deployment origin, so Preview needs its own value.
- `NEXTAUTH_SECRET`, `NEXT_PUBLIC_SITE_URL`, and optionally `GOOGLE_CLIENT_ID` /
  `GOOGLE_CLIENT_SECRET`, `ANTHROPIC_API_KEY`, `EXTENSION_ORIGIN`.

Node is pinned to 22 by `.nvmrc` and the `engines` field; Vercel reads `.nvmrc`.

### Database migrations

There is no migration framework. The two migrations that exist are HTTP endpoints an admin
calls by hand — `POST /api/migrate-roles` and `POST /api/admin/migrate-cv-files` (also
reachable from Settings → Maintenance). They are idempotent, but nothing records that they
ran, and nothing runs them on deploy. Schema changes are additive-only in practice.

### Known gaps

- **No tests.** Nothing verifies behaviour; CI proves the project compiles, lints and builds.
- **The extension source is never type-checked** — `browser-extension/tsconfig.json` declares
  `types: ["chrome"]` but `@types/chrome` is not installed, and esbuild strips types without
  checking them.
- **Rate limits are per-process.** `src/lib/rateLimit.ts` keeps counters in a module-level
  `Map`, so on Vercel each serverless instance has its own. The login throttle and the
  account-deletion limit are weaker in production than the numbers suggest; a shared store
  is needed for them to hold.
- **`/dashboard` hits the database at build time.** It is a server component that calls
  `dbConnect()` with no `export const dynamic = "force-dynamic"`, so Next tries to prerender
  it and the build fails if the database is unreachable. Present since the first commit. Add
  `force-dynamic` to that page to decouple builds from database availability.
- **No preview-environment isolation is enforced** — it depends entirely on the Vercel env
  vars being set correctly.

---

## AI features and BYOK

Five surfaces use a model: CV tailoring (`/api/cv/adapt`), the generate-preview review step,
banner briefs, interview-question top-up, and the interview-questions route. All of them go
through one layer, `src/lib/cv/ai/provider.ts`.

`resolveCredentials()` returns an ordered chain; the first that can run, runs, and a later
entry is tried only on failure:

1. **The user's own key** — whatever provider they added
2. **Shared `ANTHROPIC_API_KEY`** — the deployment's key, for every entitled user
3. **Shared `GEMINI_API_KEY`** — superadmin only

With none of the three, tailoring degrades to the reorder-only heuristic and says so on
screen, and interview questions fall back to the curated bank.

### Bring your own key

Any signed-in user can add a key at `/me/ai-key` and unlock every AI surface on their own
quota — no plan required. Three provider shapes are supported:

| Provider | Default model | Notes |
|---|---|---|
| Google Gemini | `gemini-3.6-flash` | Free tier available; rate-limits under bursts. |
| Anthropic | `claude-sonnet-5` | Pay as you go; Haiku 4.5 is the cheapest current model. |
| OpenAI-compatible | `gpt-4o-mini` | One `/chat/completions` shape covers OpenRouter, Groq, Together, DeepSeek and Ollama. Takes a base URL. |

Keys are probed before they are stored, so a bad one is rejected on the form rather than
failing later inside a generation. Storage is AES-256-GCM (`src/lib/crypto/secretBox.ts`)
under `AI_KEY_SECRET`, deliberately separate from `NEXTAUTH_SECRET` so rotating session
signing does not make every stored key undecryptable. No endpoint ever returns the key —
only provider, model, last four characters and status.

**On token counts:** the header pill and the `/me/ai-key` page report tokens spent *through
TrackMyself*, accumulated from what each response reports. They are not a provider balance.
No provider exposes remaining credit to an ordinary API key — Anthropic's spend figures need
a separate Admin key, and Gemini has no balance endpoint at all. Do not relabel these as
"remaining".

Failure classification is by status **and** response body: Gemini answers a bad key with
HTTP 400 rather than 401, so status alone misreports it as a generic upstream error.

---

## Notifications, to-dos and issue reports

### Notifications

Hybrid by design. State-based items are **derived live** on every read from data that
already exists, so they clear themselves the moment the underlying thing is resolved and
nothing can go stale:

| Derived (`src/lib/notifications/derive.ts`) | Stored (`Notification` model) |
|---|---|
| Ghost listings — `isPossibleGhost()`, 45 quiet days | Issue report triaged or replied to |
| Duplicate applications — `computeDuplicateIds()` | New report → the whole backend team |
| Interviews within 7 days | Plan, role or pause changes |
| To-dos due or overdue | AI key failures |

Derived items carry a stable synthetic id (`ghost:<appId>`), and read state for them lives in
`User.notifSeen`. Bell and dropdown sit in the header, the full list is at
`/me/notifications`, and new arrivals raise a toast. Liveness is a 60s visibility-aware poll
plus a `BroadcastChannel` so tabs stay in step.

### To-dos and issue reports

`/me/todos` is a per-user list with optional due dates, which feed the notification above.
It is also reachable as a modal from the quick bubble on any page.

Submitting an issue stores it and emails it via Web3Forms in the same request, saving first
so a mail failure never loses the report. Users see their own at `/me/issues`; editors triage
everything at `/dashboard/issues`, where each row carries a **Mail Sent** badge and a
**Resend** action.

Two things worth knowing about the mail path: Web3Forms sits behind Cloudflare and
**403s any request without a browser-like `User-Agent`**, and it intermittently challenges
the first request on a fresh connection — so the sender retries up to four times with
backoff. Without that, isolated reports were silently dropped.

---

## Quick bubble, tours and accessibility

A draggable floating bubble appears on every page. It snaps to whichever side wall you drop
it against, remembers its position, and holds To-Do, My Applications, Report an issue, Take
the tour and Accessibility. Click to open — it deliberately does not expand on hover. A
separate scroll-to-top control is pinned bottom-right and fills like water as you scroll.

**Tours** come in three scopes, chosen by the page you are on: `home`, `portal` and
`dashboard` (`scopeForPath()` in `src/lib/tour.ts`). Each auto-runs once for the audience it
targets — free users on the homepage, premium on `/me`, editors and admins on the dashboard —
and anyone can replay the one for their current page from the bubble. Each is individually
switchable from `/settings`.

**Accessibility** preferences — text scale, colour scheme, high contrast, reduce motion,
dyslexia-friendly font, reading spacing, underlined links — are saved to the user account and
mirrored to `localStorage`. A boot script in the root layout stamps them onto `<html>` before
paint, so a reload never flashes the default.


---

## Conventions

These are enforced by review, not by tooling. `AGENTS.md` holds the full list.

- **API routes** export `export const dynamic = "force-dynamic";` first, then call an auth
  helper from `src/lib/serverAuth.ts` — never `getServerSession()` directly — and check
  `if (auth instanceof NextResponse) return auth;` immediately.
- **Writes that a paused account should not make** use `requireActiveAuth()` (or
  `requireActiveAdminAuth()` / `requireActiveSuperAdminAuth()`), not `requireAuth()`.
- **`await dbConnect()`** before every Mongoose query. Every model file guards with
  `mongoose.models.X || mongoose.model("X", Schema)`.
- **Portal routes** scope every query to `{ userId: auth.id }`. Admin routes query across
  users and require at least editor.
- **Dynamic params are a Promise** in Next 16: `{ params }: { params: Promise<{ id: string }> }`,
  and must be awaited.
- **Dark mode** is `[data-theme="dark"]` in `globals.css`. Do not use Tailwind `dark:`
  variants.
- **Prefer the semantic classes** in `globals.css` — `.surface`, `.text-muted`, `.btn-primary`,
  `.glass`, the status/priority/role badges — over inline Tailwind.
- **Statuses** come from `APPLICATION_STATUSES`; never hard-code the strings.
- **No inline comments or JSDoc.** The codebase is uncommented by convention.
- **Ask before adding a dependency.**

### Rate limits

In-memory, per process (`src/lib/rateLimit.ts`) — fine for a single instance, but a shared
store is needed if this is ever scaled horizontally.

| Action | Limit |
|---|---|
| Login | 8 per 15 min per email, then a 15 min block |
| Register | 5 per hour per IP |
| Account deletion | 10 per hour per account |
| Public CV sample | 10 per 10 min per IP |

---

## Data model

`User` · `Application` · `Interview` · `Reminder` · `Document` · `CVProfile` · `CVFile` ·
`AccessControl` · `Todo` · `IssueReport` · `Notification` · `AppSettings`

`Todo` and `IssueReport` are userId-scoped. `Notification` stores only event-driven items —
ghost listings, duplicates, interviews and due to-dos are derived live instead (see
Notifications below). `AppSettings` is a single `key: "default"` document holding feature
flags, cached for 60s, mirroring how `AccessControl` works.

`Reminder` is legacy and effectively dead: `reminderService.getReminders()` returns `[]` and
rows are only ever deleted on cascade. Use `Todo` instead.

A note that has caused real bugs: `Application.userId` and `Document.userId` are
`ObjectId`, while `CVProfile.userId` and `CVFile.userId` are `String`. Mongoose casts
correctly when you query through the models — raw driver queries need the right type.

Deleting an application cascades to its interviews and reminders. Deleting a user cascades
to everything, through `purgeUserData()` in `src/lib/accountDeletion.ts`; both the self-serve
and admin delete paths use it.

---

## Not implemented

- Test suite (CI checks types, lint and build only)
- Reminder notifications — the `Reminder` model exists but nothing reads it
- Payments. `User.plan` is a manual admin toggle; a webhook would only need to write that field
- CSV import

PDF export **is** implemented (`src/lib/cv/pdf/`, `@react-pdf/renderer`, gated by
`canExportPdf`); an earlier version of this file said otherwise.
