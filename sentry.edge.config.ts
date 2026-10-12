import * as Sentry from "@sentry/nextjs";
import { scrubEvent, sentryEnabled } from "@/lib/observability/scrub";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: sentryEnabled(),
  environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
  tracesSampleRate: 0,
  beforeSend: scrubEvent,
});
