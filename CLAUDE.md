@AGENTS.md

# TrackMyself — Project Reference

Job application tracker. Next.js 16.2.5, React 19, TypeScript, MongoDB/Mongoose, NextAuth 4, Tailwind CSS 4, Zod 4, React Hook Form, TanStack Table, Recharts, Three.js, pdf-lib.

Path alias: `@/` → `src/`. Theme: CSS custom properties via `data-theme` on `<html>`. Fonts: Geist Sans + Geist Mono.

## Route Zones

| Zone | Path | Guard |
|---|---|---|
| Public | `/`, `/tools/*` | None |
| Auth | `/(auth)/login`, `/register`, `/redirect` | Redirect if already authed |
| Portal | `/(portal)/me`, `/me/applications` | Any session → layout redirects to `/login` |
| Dashboard | `/(dashboard)/dashboard`, `/applications`, `/analytics`, `/users`, `/settings`, `/profile` | editor+ → layout redirects to `/me` |
| Admin | `/admin/*` | Superadmin only (legacy, kept for compatibility) |

Route protection is in **layout.tsx files**, not middleware. `src/proxy.ts` exists (withAuth for legacy paths). `src/middleware.ts` does not exist — do not create it.

## Role System (`src/lib/permissions.ts`)

```
superadmin > admin > editor > paid > free
```

- `isEditor(role)` → superadmin | admin | editor
- `isAdmin(role)` → superadmin | admin
- `isSuperAdmin(role)` → exact match
- `canDo(role, action)` → checks ACTION_ROLES map
- Superadmin emails hardcoded in SUPERADMIN_EMAILS; effectiveRole() in auth.ts applies at JWT creation

## Auth (`src/lib/serverAuth.ts`)

Always use these helpers in API routes — never call getServerSession() directly:

- `requireAuth()` → any session
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
    utils.ts            cn() className helper
  models/               User, Application, Interview, Document, Reminder
  types/
    application.ts      Application interface
    analytics.ts        AnalyticsSummary interface
    interview.ts        Interview interface
    next-auth.d.ts      Session/User/JWT augmentation
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
    useFilters.ts         generic filter state
  services/
    applicationService.ts  getApplications()
    analyticsService.ts    getAnalyticsSummary()
    reminderService.ts
  components/
    dashboard/    StatCard, ApplicationsChart, StatusDistribution, RecentApplications, UserStatsSection
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
- Email/reminder notifications
- Payment/Stripe integration (plan field exists, no billing logic)
- Test suite
