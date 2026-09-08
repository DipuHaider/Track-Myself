# TrackMyself

A job application tracker. Record the roles you apply for, move them through ten pipeline
stages, keep every CV and cover letter in one library, and generate tailored Word documents
per application. Six browser-side tools handle the fiddly parts of applying — headshots,
banners, PDFs, job-ad analysis — without uploading anything.

Built with Next.js 16 (App Router), React 19, TypeScript, MongoDB/Mongoose, NextAuth 4 and
Tailwind CSS 4.

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
| `NEXT_PUBLIC_SITE_URL` | recommended | Canonical origin for sitemap, robots and Open Graph tags. Falsy in production means wrong canonical URLs. |
| `ANTHROPIC_API_KEY` | no | Powers AI CV tailoring and banner briefs. Without it those endpoints return 503; nothing else is affected. |
| `EXTENSION_ORIGIN` | no | Locks the extension CORS allowlist to one origin. Defaults to `*`. |

### Scripts

```bash
npm run dev     # dev server
npm run build   # production build (raises the Node heap to 4 GB)
npm start       # serve the build
npm run lint    # eslint
```

There is no test suite. `typescript.ignoreBuildErrors` is set in `next.config.ts` only to
keep Windows builds inside memory limits — types are still expected to be correct, so run
`npx tsc --noEmit` before committing.

---

## How the app is laid out

Route groups, each with its own guard in `layout.tsx`. There is no `src/middleware.ts` and
none should be added; `src/proxy.ts` covers the legacy `withAuth` paths.

| Zone | Paths | Who gets in |
|---|---|---|
| Public | `/`, `/tools/*`, `/faq`, `/terms`, `/privacy` | anyone |
| Auth | `/login`, `/register` | signed out |
| Portal | `/me`, `/me/applications`, `/me/my-cv`, `/me/cv` | any signed-in user |
| Dashboard | `/dashboard`, `/applications`, `/analytics`, `/dashboard/cv`, `/dashboard/users` | editor and above |
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
`/tools/jd-analyzer` · `/tools/image-optimizer` · `/tools/pdf-splitter`

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

Load `browser-extension/dist` as an unpacked extension. It authenticates against
`/api/extension/auth` and posts to `/api/extension/jobs`, which honours the pause state and
returns 423 with a readable message.

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
`AccessControl`

A note that has caused real bugs: `Application.userId` and `Document.userId` are
`ObjectId`, while `CVProfile.userId` and `CVFile.userId` are `String`. Mongoose casts
correctly when you query through the models — raw driver queries need the right type.

Deleting an application cascades to its interviews and reminders. Deleting a user cascades
to everything, through `purgeUserData()` in `src/lib/accountDeletion.ts`; both the self-serve
and admin delete paths use it.

---

## Not implemented

- Test suite
- PDF export — documents are `.docx`; convert in Word or LibreOffice
- Email and reminder notifications
- Payments. `User.plan` is a manual admin toggle; a webhook would only need to write that field
- CSV import
