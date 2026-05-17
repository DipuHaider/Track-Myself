# TrackMyself — Project Goals

## What This Is
Multi-user job application tracker. Portal users (paid/free) track their own applications at /me. Staff (editor/admin/superadmin) manage all users and see aggregate analytics at /dashboard.

## Primary User Flows
1. Register / login (Google or credentials) → portal at /me
2. Add applications via modal → stored per userId in MongoDB
3. View status board, detect ghost jobs (45+ days stale), spot duplicates
4. Staff: /dashboard → platform stats, user management, all applications

## Active Features (as of May 2026)
- Application tracking with status board, filters, interview stages
- Ghost job detection (45d) and duplicate detection
- Analytics dashboard with charts (Recharts)
- Admin user management with RBAC
- Public tools: /tools/image-optimizer, /tools/pdf-splitter
- Google OAuth + credentials auth

## Deferred / Not Started
- Email/reminder notifications (Reminder model exists, no trigger)
- Payment integration (plan field exists, no billing logic)
- Test suite
- Cloud file storage (uploads are local filesystem at public/uploads/)
- src/middleware.ts fine-grained route control

## Architecture Constraints
- NextAuth v4 — do not migrate to v5 without explicit request
- No Redis, no background jobs, no queue
- Single MongoDB instance, no replica set required at current scale
- Self-hosted: no cloud storage yet
