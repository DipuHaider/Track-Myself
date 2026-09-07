@AGENTS.md

# TrackMyself — Project Reference

Job application tracker. Next.js 16.2.5, React 19, TypeScript, MongoDB/Mongoose, NextAuth 4, Tailwind CSS 4, Zod 4, React Hook Form, TanStack Table, Recharts, Three.js, pdf-lib, docx.

Path alias: `@/` → `src/`. Theme: CSS custom properties via `data-theme` on `<html>`. Fonts: Geist Sans + Geist Mono.

## Route Zones

| Zone | Path | Guard |
|---|---|---|
| Public | `/`, `/tools/*` | None |
| Auth | `/(auth)/login`, `/register`, `/redirect` | Redirect if already authed |
| Portal | `/(portal)/me`, `/me/applications`, `/me/my-cv`, `/me/cv` | Any session → layout redirects to `/login` |
| Dashboard | `/(dashboard)/dashboard`, `/applications`, `/analytics`, `/users`, `/dashboard/cv`, `/profile` | editor+ → layout redirects to `/me` |
| Dashboard (admin) | `/settings`, `/dashboard/rbac` | admin+ → page redirects to `/dashboard` |
| Admin | `/admin/*` | Superadmin only (legacy, kept for compatibility) |

Route protection is in **layout.tsx files**, not middleware. `src/proxy.ts` exists (withAuth for legacy paths). `src/middleware.ts` does not exist — do not create it.

## Role System (`src/lib/permissions.ts`)

```
superadmin > admin > editor > paid > free
```

- `isEditor(role)` → superadmin | admin | editor
- `isAdmin(role)` → superadmin | admin
- `isSuperAdmin(role)` → exact match
- `canDo(role, action)` → static ACTION_ROLES defaults (client fallback only)
- Superadmin emails hardcoded in SUPERADMIN_EMAILS; effectiveRole() in auth.ts applies at JWT creation

### Plans (premium)

`superadmin` and `paid` are always premium. `admin`, `editor` and `free` follow the `User.plan`
field, which admins set from `/dashboard/users`. `effectivePlan()` (auth.ts) writes it to the JWT;
`isPremiumUser(role, plan)` is the single predicate for UI and `requirePremiumAuth()`. Role and
plan claims refresh from the DB at most every 5 minutes (`CLAIMS_TTL_MS`, in-process cache) — no
re-login needed after an upgrade.

### RBAC (`src/lib/rbac.ts`)

The permission matrix is stored in the `AccessControl` collection and edited at `/dashboard/rbac`
(superadmin + admin only, hardcoded — not part of the matrix, so nobody can lock themselves out).
Superadmin always holds every permission; `assign:superadmin` is locked to superadmin.

- Server: `requireAction(action)` in serverAuth checks the live matrix (60s cache)
- Client: `usePermissions()` → `/api/user/permissions`, with `canDo()` as the pre-load fallback
- Pages wrap content in `<PermissionGate action="…">`

## Auth (`src/lib/serverAuth.ts`)

Always use these helpers in API routes — never call getServerSession() directly:

- `requireAuth()` → any session
- `requirePremiumAuth()` → premium plan (or superadmin/paid role)
- `requireAction(action)` → live RBAC matrix check (prefer this for dashboard APIs)
- `requireEditorAuth()` → editor+
- `requireAdminAuth()` → admin+
- `requireSuperAdminAuth()` → superadmin

Pattern:
```ts
const auth = await requireEditorAuth();
if (auth instanceof NextResponse) return auth;
await dbConnect();
```

SessionUser shape: `{ id: string; role: Role; email: string | null | undefined }`
Session augmentation: `src/types/next-auth.d.ts` — `session.user.id` and `session.user.role`

## API Route Pattern

```ts
export const dynamic = "force-dynamic"; // must be first export

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  await dbConnect();
  const { id } = await params; // Next.js 16: params is a Promise
  // portal routes: always scope to { userId: auth.id }
}
```

## Database (`src/lib/db.ts`)

`dbConnect()` singleton with global cache. Pool: 10. Call before every Mongoose query.

Models in `src/models/`:
- `User` — name, email, password?, googleId, role, plan, bio, image
- `Application` — full job record, userId-scoped (see `src/types/application.ts`)
- `Interview` — applicationId, stageName, status, scheduledDate, feedback, notes
- `Document` — userId, type, name, url
- `Reminder` — applicationId, title, remindAt, completed
- `CVProfile` — one per user: structured `content` (CVContent), `primary` file slots, legacy flat fields
- `CVFile` — one document per uploaded file (base64 `data`, `category`), userId-indexed
- `AccessControl` — single `key: "default"` doc holding the RBAC matrix

## CV System

One engine, server-side, real `.docx` via the `docx` package — ported from the reference build
scripts. There is no HTML-as-.doc path any more.

- `src/types/cv.ts` — CVContent, CVFormat (`ats | europass | designer | lebenslauf`), CVVariant, categories
- `src/lib/cv/content.ts` — defaults, `normaliseContent()`, `importFromLegacy()` (parses old free-text)
- `src/lib/cv/docx/` — `ats.ts`, `europass.ts`, `designer.ts`, `lebenslauf.ts`, `coverLetter.ts`, `index.ts`
- `src/lib/cvFiles.ts` — category mime/size rules, primary slots, lazy legacy-file migration

Rules baked into the builders: no photo on ATS or Europass; per-format bullet-count arrays control
page length; the compact ATS variant swaps in `summaryShort` + `skillsCompact` and drops projects.

**Lebenslauf is superadmin-only** — `canUseLebenslauf(role, email)`, enforced in the UI and in
`/api/user/cv/generate`.

Endpoints:
- `GET/PUT /api/user/cv` — profile + structured content + primary slots + file list
- `GET/POST /api/user/cv/files`, `GET/PATCH/DELETE /api/user/cv/files/[id]`,
  `PATCH …/[id]/main` (toggle primary for that file's category), `GET …/[id]/raw` (bytes, for `<img>`)
- `POST /api/user/cv/generate` — `{format, variant, docType, appInfo}` → `.docx` stream
- `POST /api/cv/sample` — public, rate-limited (10 / 10 min / IP), no Lebenslauf
- `POST /api/cv/adapt` — premium AI tailoring of summary / positioning / skill order

## Application Status Values (`src/constants/applicationStatus.ts`)

```
"Wishlist" | "Submitted" | "No Response" | "Interview Scheduled" |
"Active - Written" | "Active - HR" | "Active - Technical" | "Active - Cultural Fit" |
"Offer Received" | "Rejected"
```

Ghost job = 45+ days in Wishlist/Submitted/No Response. Logic: `src/lib/applicationFlags.ts`

## CSS (`src/app/globals.css`)

Dark mode via `[data-theme="dark"]` — do NOT use Tailwind `dark:` variants.

Semantic classes to prefer over inline Tailwind:
- `.surface` / `.surface-muted` — card backgrounds
- `.text-muted` / `.text-primary` — semantic text colors
- `.btn-primary` — gradient primary button
- `.role-badge` + `.role-{superadmin|admin|editor|paid|free}`
- `.plan-{free|premium}`
- `.priority-{high|medium|low}`
- `.status-{wishlist|submitted|no-resp|interview|active|offer|rejected}`
- `.ghost-auto` / `.ghost-manual` / `.badge-dup`

## Key File Map

```
src/
  lib/
    permissions.ts      ROLES, isAdmin/Editor/etc, canDo(), ACTION_ROLES
    auth.ts             NextAuth config, effectiveRole(), authOptions
    serverAuth.ts       requireAuth/Editor/Admin/SuperAdmin helpers
    db.ts               dbConnect() singleton
    applicationFlags.ts isPossibleGhost(), computeDuplicateIds()
    rbac.ts             access matrix load/save, canDoServer(), getAllowedActions()
    chartTheme.ts       useChartTheme() — validated light/dark chart palette
    cvFiles.ts          CV file categories, limits, primary slots, legacy migration
    cv/                 content.ts (model + legacy import) and docx/ builders
    utils.ts            cn() className helper
  models/               User, Application, Interview, Document, Reminder, CVProfile, CVFile, AccessControl
  types/
    application.ts      Application interface
    analytics.ts        AnalyticsSummary interface
    interview.ts        Interview interface
    cv.ts               CVContent, CVFormat, CVVariant, CV_FILE_CATEGORIES, CVPrimaryFiles
    next-auth.d.ts      Session/User/JWT augmentation (id, role, plan)
  schemas/
    applicationSchema.ts  Zod schema + ApplicationFormData type
    authSchema.ts         registerSchema + RegisterSchema type
  constants/
    applicationStatus.ts  APPLICATION_STATUSES
    platforms.ts          PLATFORMS
    documentTypes.ts      DOCUMENT_TYPES
  hooks/
    useApplications.ts    client-side state + CRUD
    useAnalytics.ts       fetches /api/analytics
    useAdminAnalytics.ts  fetches /api/admin/analytics (cached, dashboard-wide)
    useCVProfile.ts       shared CV cache, save, downloadCVDocx()
    usePermissions.ts     live RBAC actions for the current user
    useFilters.ts         generic filter state
  services/
    applicationService.ts  getApplications()
    analyticsService.ts    getAnalyticsSummary()
    reminderService.ts
  components/
    dashboard/    StatCard, ApplicationsChart, StatusDistribution, FunnelChart, TopBreakdown,
                  ChartFrame, RecentApplications, UserStatsSection, SettingsPanel,
                  AccessControlPanel, PermissionGate
    cv/           DocumentSection (My Documents), fields.tsx (builder inputs)
    applications/ ApplicationTable, ApplicationForm, ApplicationFormModal, AddApplicationModal,
                  ViewApplicationModal, StatsModal, ApplicationFilters, InterviewStages, StatusBadge
    site/         SiteHeader, HeroSection, TrendingSection, ToolsSection, CallToAction, SiteFooter,
                  SiteSearch, ThreeBanner
    portal/       PortalSidebar
    layout/       Sidebar, Header, MobileNav, ThemeToggle
    shared/       Modal, SearchBar, DateRangePicker
  providers/      SessionProvider.tsx
  proxy.ts        withAuth middleware (legacy)
  app/
    layout.tsx    Root: SessionProvider, theme hydration script, Geist fonts
    globals.css   CSS custom properties, all semantic utility classes

public/uploads/   Server filesystem uploads (organized by year/month)
```

## Build

```
cross-env NODE_OPTIONS=--max-old-space-size=4096 next build
```

`next.config.ts`: `serverExternalPackages: ["mongoose", "bcryptjs"]`, `typescript.ignoreBuildErrors: true`, `NODE_TLS_REJECT_UNAUTHORIZED=0`.

## What Does Not Exist

- `src/middleware.ts` — do not create
- `src/lib/cvDownload.ts` — deleted; the HTML-as-.doc generator is gone, use `src/lib/cv/docx/`
- Email/reminder notifications
- Payment/Stripe integration (plan is a manual admin toggle; a webhook only needs to write `User.plan`)
- PDF export (documents are `.docx`; convert in Word or LibreOffice)
- Test suite
