# Roadmap

What is deliberately not in the codebase yet, with the criteria for adding it. Items are
ordered by expected value; nothing here is a commitment.

## 1. Billing provider

The billing layer exists (`src/lib/billing/`): a `BillingProvider` interface, a `manual`
provider (the admin plan toggle), `User.billing`, `/api/billing/checkout` (501 until a provider
is configured), `/api/billing/portal` and `/api/billing/webhook`. Adding a vendor means one
adapter file plus env vars; nothing else changes.

Selection criteria for a Bangladesh-registered operator:

- **Stripe is not available** to entities in Bangladesh, and Lemon Squeezy now runs on Stripe.
- **Payoneer is a payout rail**, not a subscription processor. Payoneer Checkout is an
  e-commerce card checkout (WooCommerce-style) and we found no evidence it supports recurring
  billing. It is the right place for *receiving* money from a merchant of record.
- Prefer a **merchant of record** (Paddle-style): it handles VAT/GST and invoicing, offers a hosted
  checkout and a customer portal, signs webhooks, and pays out to a bank or Payoneer account. Ask
  the vendor in writing whether they onboard Bangladeshi entities before building the adapter.
- Display in BDT where possible; settlement will be in USD.

Adapter checklist: implement `createCheckout`, `createPortal`, `verifyWebhook`, `parseEvent`;
map the vendor's subscription statuses to `BillingStatus`; add the env vars to `.env.example`;
add the vendor to `src/lib/legal.ts`; write `src/lib/billing/<id>.test.ts` for `parseEvent`
against recorded webhook payloads; document the webhook URL in the README.

Until then the Upgrade flow files an "Upgrade request" issue that an admin resolves with one
click, and an optional `NEXT_PUBLIC_UPGRADE_PAY_URL` can point at a Payoneer payment request.

## 2. AI Phase 2 — application pack workflow (A/B/C)

From `docs/TrackMyself_AI_Work_Plan.md` §7: a bounded three-call pack (tailored CV + resume,
cover letter + questions, an evaluator that checks claims against the source) with persisted run
state. Gate: a measured quality gain over the single-call flow on the 20-case benchmark, and a
durable job runner, since a Vercel function cannot run a multi-minute workflow.

## 3. MCP server

Phase 3 of the AI plan: a thin, authenticated MCP adapter over the same domain services. Needs
remote authorization (token audience, scope, revocation) that NextAuth sessions do not provide.

## 4. Smarter duplicate detection

Normalisation and posting-id matching are in; fuzzy company/title matching and alias handling
come next, only after a labelled set shows real misses.

## 5. Email digests and reminders

Notifications are in-app only. A weekly digest and follow-up reminders need the cron job (now
present) plus a preference per user and a template. Resend is already wired.

## 6. Teams / organisations

Multi-tenancy (shared pipelines, coach view) would touch every userId-scoped query. Not started.

## 7. Internationalisation

Prompts already answer in the posting's language; the UI is English only.

## 8. CSV import and export

Export exists as JSON (`/api/user/account/export`). CSV import/export of applications is a small,
contained addition.

## 9. Progressive web app

Manifest + service worker for offline viewing of the application list.

## 10. Browser extension coverage

The scraper matches `linkedin.com` and `indeed.com` hosts only; country domains
(`de.indeed.com`, `indeed.co.uk`) and LinkedIn regional subdomains are not recognised. Any change
needs a Web Store resubmission.

## 11. Housekeeping

- Remove the deprecated `NEXT_PUBLIC_WEB3FORMS_KEY` fallback after one release.
- Decide on `mongodb-memory-server` vs the CI service container for DB tests (the container is
  in place).
- Upgrade `@huggingface/transformers` as a considered change (four standing advisories are
  transitive and browser-only).
- Add `@testing-library/react` + `jsdom` for component tests when the first behaviour worth
  pinning appears.
- Pin GitHub Actions by commit SHA.
