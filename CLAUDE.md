@AGENTS.md

# TrackMyself — Project Reference

Job application tracker. Next.js 16.3 (App Router), React 19, TypeScript, MongoDB/Mongoose 9,
NextAuth 4, Tailwind CSS 4, Zod 4, SWR, Recharts, pdf-lib, docx, @react-pdf/renderer, Resend,
@sentry/nextjs, vitest.

Path alias: `@/` → `src/`. Theme: CSS custom properties via `data-theme` on `<html>`. Fonts: Geist
Sans + Geist Mono, Josefin (display), Atkinson Hyperlegible (dyslexia mode, lazy).

## Route Zones

| Zone | Path | Guard |
|---|---|---|
| Public | `/`, `/tools/*`, `/faq`, `/terms`, `/privacy`, `/pricing`, `/verify-email` | None |
| Auth | `/(auth)/login`, `/register`, `/forgot-password`, `/reset-password`, `/redirect` | `(auth)/layout.tsx` redirects signed-in users to `/me` |
| Portal | `/(portal)/me`, `/me/applications`, `/me/settings`, `/me/my-cv`, `/me/cv`, `/me/todos`, `/me/issues`, `/me/notifications`, `/me/ai-key` | Any session → layout redirects to `/login` |
| Job hunt | `/me/jobs`, `/me/jobs/[id]`, `/me/jobs/searches`, `/me/jobs/report` | `me/jobs/layout.tsx`: `jobHuntAllowed()` (superadmin, or premium when `AppSettings.features.jobHunt`) |
| Dashboard | `/(dashboard)/dashboard`, `/applications`, `/analytics`, `/dashboard/cv`, `/dashboard/issues`, `/dashboard/users`, `/dashboard/audit`, `/profile` (redirect), `/users` (redirect) | editor+ → layout redirects to `/me` |
| Dashboard (admin) | `/settings`, `/dashboard/rbac` | admin+ → page redirects to `/dashboard` |
| Legacy | `/admin/*` | `redirects()` in `next.config.ts` → `/dashboard` |

Route protection is in **layout.tsx files**. `src/proxy.ts` is the active Next 16 proxy (the
file convention that replaced middleware) and covers the legacy `withAuth` paths.
`src/middleware.ts` does not exist — do not create it.

## Role System (`src/lib/permissions.ts`)

```
superadmin > admin > editor > paid > free
```

- `isEditor` / `isAdmin` / `isSuperAdmin`, `roleRank()`, `canManageRole(actor, target)` and
  `canAssignRole(actor, next)` (strictly lower rank for non-superadmin)
- `canDo(role, action)` → static ACTION_ROLES defaults (client fallback only)
- Superadmin emails are hardcoded in `SUPERADMIN_EMAILS`; `effectiveRole(email, dbRole, verified)`
  in `auth.ts` grants superadmin **only when the email is verified**

### Plans (premium)

`superadmin` and `paid` are always premium. `admin`, `editor` and `free` follow `User.plan`, which
admins set from `/dashboard/users` (writes go through `applyBillingEvent()` in
`src/lib/billing/apply.ts`). `isPremiumUser(role, plan)` is the single predicate. Claims refresh
from the DB at most every 5 minutes (`CLAIMS_TTL_MS`); `invalidateClaims(email)` forces it.

### RBAC (`src/lib/rbac.ts`)

Matrix in the `AccessControl` collection, edited at `/dashboard/rbac` (superadmin + admin,
hardcoded). Superadmin always holds every permission; `assign:superadmin` is locked. Actions
include `view:audit`. Server: `requireAction(action)` (60 s cache). Client: `usePermissions()`
(SWR) with `canDo()` as the pre-load fallback; pages wrap content in `<PermissionGate>`.

## Auth (`src/lib/serverAuth.ts`)

Always use these in API routes — never `getServerSession()` directly:

- `requireAuth()` → any session (paused accounts included)
- `requireActiveAuth()` → not paused (application writes, AI spend, interviews, key changes)
- `requirePremiumAuth()` → premium (non-AI perks only; AI entitlement is `aiEntitlement()`)
- `requireAction(action)` → live RBAC matrix (dashboard APIs)
- `requireAdminAuth()` / `requireActiveAdminAuth()`, `requireSuperAdminAuth()` /
  `requireActiveSuperAdminAuth()`

The one sanctioned exception is `/api/billing/webhook`, which has no session and authenticates by
provider signature. `/api/cron/maintenance` authenticates with `CRON_SECRET`.

`SessionUser`: `{ id, role, plan, status, email }`. Augmentation: `src/types/next-auth.d.ts`.

Accounts: email verification (`EmailVerificationToken`, `src/lib/emailVerification.ts`,
`src/lib/verified.ts` — an absent `emailVerifiedAt` means a pre-feature account and counts as
verified); Google sign-in replaces an unverified password row; password reset also serves as
"set a password" for Google-only accounts; sessions can be revoked everywhere
(`POST /api/user/account/sessions/revoke`).

## API Route Pattern

```ts
export const dynamic = "force-dynamic"; // must be first export

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireActiveAuth();
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;
  if (!parseObjectId(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await dbConnect();
  // portal routes: always scope to { userId: auth.id }
}
```

Helpers: `parseObjectId` (`src/lib/objectId.ts`), `tooMany/badRequest/notFound/forbidden`
(`src/lib/api/respond.ts`), `checkRateLimitDb` (`src/lib/rateLimitStore.ts` — every limiter is
DB-backed; there is no in-memory limiter), `clientIp` (`src/lib/rateLimit.ts`),
`recordAdminAction` (`src/lib/audit.ts`) beside every `/api/admin/*` mutation,
`adminUserRow` / `profileView` (`src/lib/serialisers/user.ts`) for anything that returns a User.

List endpoints return a bare array without `?page` and `{ items, total, page, limit, hasMore }`
with it (`src/lib/pagination.ts`).

## Database (`src/lib/db.ts`)

`dbConnect()` singleton. Pool: 10. Call before every Mongoose query. Models in `src/models/`:

`AccessControl`, `AdminAction`, `AiBudget`, `AiCallLog`, `AiDraft`, `AiUsageCounter`,
`AppSettings`, `Application`, `CVFile`, `CVProfile`, `Document`, `EmailVerificationToken`,
`Interview`, `IssueReport`, `Notification`, `PasswordResetToken`, `RateBucket`, `Todo`, `User`,
`JobSearch`, `JobLead`, `ApiToken`.

- `JobSearch` — saved search (keywords, location, radius, sources `ba|adzuna|extension`, maxAgeDays)
- `JobLead` — a found job: source/externalId (unique per user), platform (from the apply link),
  identity + matchKey for dedupe, fitScore/fitGaps, status `new → shortlisted → preparing → ready →
  applying → submitted` (or dismissed/expired/failed), applicationId, cvFileIds, prepared.letter
- `ApiToken` — personal access token: sha256 hash only, scopes, expiry, revokedAt
- `User.jobHunt` is Mixed, always read through `normaliseJobHunt()` (`src/lib/jobs/settings.ts`);
  the webhook secret is sealed with `secretBox` and never returned

- `User` — name, email (lowercase), password?, googleId, role, plan, status, `emailVerifiedAt`,
  `lastLoginAt`, `deletingAt`, bio, image, aiKey (encrypted), aiUsage/aiSharedUsage, a11y,
  notifSeen/notifDismissed (bounded), notifPrefs, billing
- `Application` — userId-scoped (`src/types/application.ts`); `statusHistory`; posting
  observation fields; **soft delete** (`deletedAt`; query/aggregate hooks hide deleted rows unless
  the filter names `deletedAt` or `{ withDeleted: true }`); 30-day trash
  (`src/lib/applicationTrash.ts`), purged by the maintenance job. Indexes on `userId`.
- `Interview` — applicationId, **userId**, stageName, status, scheduledDate, feedback, notes;
  CRUD at `/api/applications/[id]/interviews`
- `Document` — attachments: userId, **applicationId**, base64 `data`; served by
  `/api/attachments/[...parts]`; cascades on forever-delete
- `AiDraft` — cached AI outputs (cv-preview, cover-letter, interview-questions), 24 h TTL
- `AiCallLog` / `AiUsageCounter` / `AiBudget` — the AI ledger (see AI)
- `AdminAction` — audit log, 400-day TTL
- All userId-scoped collections are purged by `purgeUserData()` (`src/lib/accountDeletion.ts`),
  ordered, per-step isolated, `User` last; stale `deletingAt` rows are retried by maintenance.
- `CVProfile.userId` and `CVFile.userId` are `String`; other models use `ObjectId`.

Migrations are idempotent entries in `src/lib/migrations/index.ts`, run by a superadmin via
`POST /api/admin/migrations/<name>` (Settings → Maintenance). Nothing runs on deploy.

## CV System

One engine, server-side, real `.docx` via `docx` and PDF via `@react-pdf/renderer`.

- `src/types/cv.ts`, `src/lib/cv/content.ts`, `src/lib/cv/docx/`, `src/lib/cv/pdf/`,
  `src/lib/cv/coverLetter.ts`, `src/lib/cv/draftCache.ts` (AiDraft-backed),
  `src/lib/cvFileTypes.ts` (caps: documents 3 MB, photo 2 MB — Vercel body limit), `src/lib/cvFiles.ts`
- **Lebenslauf is superadmin-only** — `canUseLebenslauf(role)`.

Endpoints: `GET/PUT /api/user/cv`, `/api/user/cv/files[...]`, `POST /api/user/cv/generate`,
`POST /api/user/cv/generate/preview`, `/api/user/cv/import`, `POST /api/cv/sample` (public,
rate-limited), `POST /api/cv/adapt`.

## AI (`src/lib/ai/`)

Every provider call goes through **`runAiTask()` / `runAiJsonTask()` in `gateway.ts`** (ESLint
forbids importing `callProvider` elsewhere). Order: entitlement → DB rate limit → atomic
reservation (`budget.ts`: per-user monthly attempt counter + global money ceiling) → dispatch →
settle → ledger. `runAiJsonTask` validates with a zod schema from `schemas.ts` and makes exactly
one repair call. Prompts wrap untrusted text in `fence()` under `SYSTEM_PROMPT` (`prompt.ts`).

**Entitlement** (`aiEntitlement(actor, task, userKey)`): a user's own key → every task, any
plan, never counted; premium → shared model; free → `freeMonthlyAttempts` (10) shared uses a
month, then the feature's non-AI mode. Paused accounts are denied.

Tasks (`config.ts`): `cv.adapt`, `cv.preview`, `interview.questions`, `tools.banner-brief`,
`cv.gap-analysis`, `cover-letter.write`, `salary.estimate`, `applications.triage`.

Models (`models.ts`): shared default `anthropic:claude-haiku-4-5`; `anthropic:claude-sonnet-5`
and `openai:gpt-6-luna` (needs `OPENAI_API_KEY`) toggled by admins; `gemini:superadmin` is a
superadmin-only retry after a failed shared call. BYOK defaults: Sonnet 5 / gemini-3.6-flash /
gpt-4o-mini (`src/lib/cv/ai/provider.ts`). `src/lib/ai/shared.ts` holds only the BYOK UI options.

Money ceiling: **hard-capped at USD 10** (`MAX_CEILING_USD`), default 9, superadmin-only.
BYOK keys: AES-256-GCM under `AI_KEY_SECRET`; OpenAI-compatible base URLs pass
`assertSafeBaseUrl()` (`src/lib/net/safeUrl.ts`).

## Job hunt (`src/lib/jobs/`)

Gate: `requireJobHuntAuth()` (`access.ts`) = `requireActiveAuth` + `canUseJobHunt(role, plan, features.jobHunt)`.

- Sources: `sources/ba.ts` (Bundesagentur Jobsuche, v6 search + v4 detail, public client id),
  `sources/adzuna.ts` (needs `ADZUNA_APP_ID/KEY`). `normalise.ts` → `LeadDraft`, `ingest.ts` is the
  single dedupe/score/upsert path for the cron, extension harvest and `/api/v1/leads`.
- `hunt.ts` `runHuntForUser`, `daily.ts` `runDailyJobHunt` (cron), `autoPrepare.ts`, `prepare.ts`
  `prepareLead` (application + tailored CV + letter + gap check, all through the AI gateway),
  `leads.ts` (list/summary/actions), `report.ts` (`computeReport` pure + `buildDailyReport`),
  `upkeep.ts` (follow-up to-dos, missed deadlines, report delivery), `kit.ts` (extension fill kit),
  `webhooks.ts` + `events.ts` (signed outbound events), `insights.ts`.
- Routes: `/api/user/job-hunt` (+`/refresh`, `/report`, `/webhook`), `/api/user/job-searches`,
  `/api/user/leads` (+`/summary`, `/bulk`, `/[id]`, `/[id]/prepare`), `/api/user/api-tokens`,
  `/api/extension/leads` (+`/[id]/kit`, `/[id]/submitted`), `/api/cron/job-hunt`.
- Automation API `/api/v1/*`: Bearer personal access token (`authenticateToken(req, scope)` in
  `src/lib/apiTokens.ts`), re-checks status and entitlement per call. **Never add approve or
  submit to it, and nothing may click Submit on a job site.**
- `mcp-server/` (own package, stdio, `@modelcontextprotocol/sdk`) and `notebooks/` call `/api/v1` only.

## Billing (`src/lib/billing/`)

Provider-agnostic: `BillingProvider` interface, `manual` provider, `applyBillingEvent()` writes
`User.plan` + `User.billing`. `/api/billing/checkout` returns 501 until an adapter is configured
(`BILLING_PROVIDER`); the UI then files an "Upgrade request" issue. See `docs/ROADMAP.md`.

## Application Status Values (`src/constants/applicationStatus.ts`)

```
"Wishlist" | "Not Completed" | "Submitted" | "No Response" | "Interview Scheduled" |
"Active - Written" | "Active - HR" | "Active - Technical" | "Active - Cultural Fit" |
"Offer Received" | "Rejected"
```

Ghost job = 45+ days in Wishlist/Not Completed/Submitted/No Response (`src/lib/applicationFlags.ts`).

## CSS (`src/app/globals.css`)

Dark mode via `[data-theme="dark"]` — never Tailwind `dark:`. Raw palette classes
(`text-red-600`, `bg-gray-100`…) are lint-flagged. Use:

- `.surface` / `.surface-muted`, `.text-muted` / `.text-primary`
- `.text-danger|success|warning|info`, `.alert` + `.alert-danger|success|warning|info`
- `.btn-primary` / `.btn-secondary` / `.btn-danger`, `.icon-chip`
- `.role-*`, `.plan-*`, `.priority-*`, `.status-*`, `.ghost-*`, `.badge-dup`, `.diff-*`
- `.dropzone` (via `<DropZone>`), tokens `--danger/--success/--warning/--info` (+`-bg`, `-border`)

## Client data

SWR everywhere (`src/providers/AppProviders.tsx` sets the fetcher). `src/lib/api/client.ts`:
`fetcher`, `apiFetch`, `ApiError`, `downloadFile`. Hooks: `useApi`, `useProfile`/`useAccount`,
`usePermissions`, `useAdminAnalytics`, `useNotifications`, `useAiKeyState`, `useTourState`,
`useA11y`, `useCVProfile` (with `dirty` + per-user autosave), `useApplicationsPage`,
`useApplicationStats`, `useInterviews`, `useTriage`. Overlays: `Modal` (focus trap, scroll lock,
`onRequestClose` veto), `useEscapeToClose`, `useUnsavedChanges`, `useConfirm()` + sonner `toast`.

## Key File Map

```
src/
  lib/
    permissions.ts      roles, ranks, actions, CV entitlements
    auth.ts             NextAuth config, effectiveRole(), claims cache
    serverAuth.ts       require* helpers
    verified.ts         isVerified()
    emailVerification.ts, tokens.ts, passwordReset.ts
    safeReturnTo.ts, extensionCors.ts, extensionToken.ts
    db.ts, objectId.ts, pagination.ts, api/respond.ts, api/client.ts
    rateLimit.ts        clientIp() only; rateLimitStore.ts is the limiter
    rbac.ts, audit.ts, serialisers/user.ts
    applicationFlags.ts, applicationHistory.ts (updateApplication, linkAttachments), applicationTrash.ts
    accountDeletion.ts, maintenance.ts, migrations/
    ai/                 gateway.ts, budget.ts, config.ts, models.ts, meter.ts, schemas.ts, prompt.ts, jobFit.ts, triage.ts, userKey.ts, shared.ts
    net/safeUrl.ts, fileSniff.ts, attachments.ts
    cv/                 content.ts, docx/, pdf/, ai/, import/, diff/, coverLetter.ts, draftCache.ts, generatePipeline.ts
    mail/               index.ts, resend.ts, web3forms.ts, templates.ts
    notifications/      derive.ts (deriveItems pure + deriveNotifications), create.ts, types.ts
    billing/            types.ts, manual.ts, plan.ts, apply.ts, index.ts
    jobs/               settings, access, constants, sources/, normalise, ingest, score, hunt, daily, prepare, autoPrepare, leads, report, upkeep, kit, insights, webhooks, events, ingestApi
    apiTokens.ts, extensionAuth.ts, cronAuth.ts
    observability/scrub.ts
  models/               (22, listed above)
  schemas/              authSchema, passwordResetSchema, profileSchema, interviewSchema
  hooks/                see Client data
  components/
    shared/     Modal, DropZone, ConfirmDialog, ErrorPanel, A11ySync, A11ySettingsModal/Body, QuickBubble, …
    applications/ ApplicationTable, ApplicationCard, ApplicationFormModal, ViewApplicationModal, InterviewRounds, …
    portal/     PortalSidebar, PausedBanner, StatsGrid, GettingStarted, TriagePanel, PlanBadge, VerifyEmailBanner, AccountControls
    settings/   SettingsTabs + tabs
    pricing/    PlanComparison, UpgradeCta, RequestUpgradeModal
    dashboard/  StatCard, charts, UserStatsSection, SettingsPanel, AiBudgetPanel, AccessControlPanel, IssueReportsPanel, PermissionGate
    layout/     AppSidebar, Sidebar, ThemeToggle
  app/
    layout.tsx  SessionProvider → AppProviders (SWR + Confirm), A11ySync, theme boot script
    error.tsx, global-error.tsx, (zone)/error.tsx
    api/health, api/cron/maintenance, api/admin/audit, api/admin/migrations/[name], api/billing/*
  instrumentation.ts, instrumentation-client.ts   Sentry (DSN optional; scrubbed)
sentry.server.config.ts, sentry.edge.config.ts, vercel.json (daily cron), vitest.config.ts
```

## Build, test, verify

```
npm run verify   # typecheck + lint + check:env + vitest
npm run build    # cross-env NODE_OPTIONS=--max-old-space-size=4096 next build
npm run typecheck:ext
```

Tests are colocated `*.test.ts` (pure modules, `vi.mock` for models); DB-backed `*.dbtest.ts`
run only with `MONGODB_TEST_URI` (CI service container). `next.config.ts`:
`typescript.ignoreBuildErrors: true` (CI is the type gate), `withSentryConfig`, CSP without
`'unsafe-eval'` in production (`'wasm-unsafe-eval'` only under `/tools`), TLS verification is
disabled only when `NODE_ENV !== "production"` **and** `DEV_INSECURE_TLS=1`.

## What Does Not Exist

- `src/middleware.ts` — do not create (`src/proxy.ts` is the proxy)
- A payment provider — the billing abstraction exists; checkout returns 501 (`docs/ROADMAP.md`)
- Component tests (`@testing-library/react`, `jsdom`) and `mongodb-memory-server`
- Email digests beyond the job-hunt daily report
- Automatic job-site submission (deliberately absent)
- 2FA, email change, teams, i18n, the A/B/C pack workflow
