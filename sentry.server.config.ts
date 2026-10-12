import * as Sentry from "@sentry/nextjs";
import { scrubEvent, sentryEnabled } from "@/lib/observability/scrub";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: sentryEnabled(),
  environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 0,
  beforeSend: scrubEvent,
  tracesSampler: ({ name }) => (name?.includes("/api/health") ? 0 : 0.1),
});
