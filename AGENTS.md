<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

<!-- BEGIN:trackmyself-agent-rules -->
# TrackMyself Agent Rules

## Auth in API routes
Always use requireAuth() / requireEditorAuth() / requireAdminAuth() / requireSuperAdminAuth() from @/lib/serverAuth. Never call getServerSession() directly in API routes. Always check `if (auth instanceof NextResponse) return auth;` immediately after.

## Database
Always call `await dbConnect()` before any Mongoose query. Import models from src/models/ — do not create new Mongoose models without asking. Every model file must use `mongoose.models.X || mongoose.model("X", Schema)` guard.

## Portal vs admin scoping
Portal routes (/api/applications, /api/analytics, /api/user/*) must scope all queries to { userId: auth.id }. Admin routes (/api/admin/*) query across all users and require at minimum requireEditorAuth().

## Dark mode
Do not use Tailwind `dark:` variants. Dark mode is handled via `[data-theme="dark"]` in globals.css. Add dark overrides there, not inline.

## CSS classes
Use semantic utility classes from globals.css before reaching for inline Tailwind: .surface, .surface-muted, .text-muted, .text-primary, .btn-primary, .role-badge, status/priority/ghost badge classes.

## Comments
Do not add inline comments or JSDoc. The codebase is uncommented by convention.

## Route protection
Guards live in layout.tsx files. Do not create src/middleware.ts — src/proxy.ts covers withAuth. If protecting a new route, use layout, not middleware, unless explicitly asked.

## force-dynamic
Every API route file must export `export const dynamic = "force-dynamic";` as its first export.

## Params in Next.js 16
Dynamic route params are a Promise: `{ params }: { params: Promise<{ id: string }> }`. Always `await params` before destructuring.

## Application statuses
Use the exact strings from APPLICATION_STATUSES in src/constants/applicationStatus.ts. Never hard-code status strings.

## No new packages without asking
Suggest the package and wait for confirmation before running npm install.

## TypeScript
typescript.ignoreBuildErrors: true is set only because of Windows memory pressure during build, not because types are optional. Keep types correct.
<!-- END:trackmyself-agent-rules -->
