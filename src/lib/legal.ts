export const LEGAL = {
  service: "TrackMyself",
  site: "trackmyself.webarden.tech",
  operator: "TrackMyself",
  contactEmail: "hello@trackmyself.app",
  privacyEmail: "privacy@trackmyself.app",
  jurisdiction: "Bangladesh",
  effectiveDate: "8 September 2026",
  lastUpdated: "13 October 2026",
};

export const SUBPROCESSORS = [
  { name: "Vercel Inc.", role: "Application hosting and content delivery", data: "Request logs, IP address" },
  { name: "MongoDB Atlas", role: "Database hosting", data: "All account and application records" },
  { name: "Resend (Plus Five Five, Inc.)", role: "Sends transactional email — email verification, welcome, password-reset links and issue-report notifications", data: "Your name and email address, and the contents of an issue report you submit" },
  { name: "Web3Forms", role: "Fallback delivery of issue reports to the maintainer when Resend is not configured", data: "The contents of an issue report you submit, with your name and email" },
  { name: "Google LLC", role: "Optional sign-in with Google", data: "Name, email address, profile picture" },
  { name: "Anthropic PBC", role: "AI features you trigger — CV tailoring, cover letters, interview questions, job-fit analysis, salary estimates, triage, job-hunt preparation and report wording, and banner briefs — within the free monthly allowance, on Premium, or with your own key", data: "The CV text, job description and application notes you submit for that request" },
  { name: "OpenAI", role: "Alternative AI model for the same features, only when the operator has enabled it", data: "The same text as above, for that request" },
  { name: "Google LLC (Gemini API)", role: "Superadmin-only fallback model when the primary provider fails (never used for other accounts)", data: "The CV text and job description submitted for that request" },
  { name: "Sentry (Functional Software, Inc.)", role: "Error reporting", data: "Stack traces, the request path and an anonymous user id — never request bodies, cookies, email addresses or CV text" },
  { name: "Bundesagentur für Arbeit (Jobsuche API)", role: "Job hunt: searches its public job board for your saved searches", data: "The search keywords, place and radius you saved — no account or CV data" },
  { name: "Adzuna Ltd", role: "Job hunt: searches its job index for your saved searches, when the operator has enabled it", data: "The search keywords, place and radius you saved — no account or CV data" },
  { name: "Your own webhook receiver (for example n8n)", role: "Only if you set a webhook URL: receives event notifications you chose", data: "Job titles, companies, links and counts — never CV text or letters" },
  { name: "Hugging Face", role: "Delivers the background-removal model file to your browser", data: "None — the model is downloaded to you; your images are never sent" },
];
