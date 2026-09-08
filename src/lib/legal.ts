export const LEGAL = {
  service: "TrackMyself",
  site: "track-myself.vercel.app",
  operator: "TrackMyself",
  contactEmail: "hello@trackmyself.app",
  privacyEmail: "privacy@trackmyself.app",
  jurisdiction: "Bangladesh",
  effectiveDate: "8 September 2026",
  lastUpdated: "8 September 2026",
};

export const SUBPROCESSORS = [
  { name: "Vercel Inc.", role: "Application hosting and content delivery", data: "Request logs, IP address" },
  { name: "MongoDB Atlas", role: "Database hosting", data: "All account and application records" },
  { name: "Google LLC", role: "Optional sign-in with Google", data: "Name, email address, profile picture" },
  { name: "Anthropic PBC", role: "AI CV tailoring and banner drafting (Premium, on request only)", data: "The CV text and job description you submit for that request" },
  { name: "Hugging Face", role: "Delivers the background-removal model file to your browser", data: "None — the model is downloaded to you; your images are never sent" },
];
