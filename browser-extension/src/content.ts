import PANEL_CSS from "./styles.css";

const APP_URL = "https://track-myself.vercel.app";

// ── types ─────────────────────────────────────────────────────────────────

interface JobData {
  companyName: string;
  jobTitle:    string;
  location:    string;
  jobPostUrl:  string;
  notes:       string;
}

interface UserInfo { name: string; email: string }

type Screen =
  | "loading"
  | "login"
  | "add"
  | "success"
  | "duplicate";

interface State {
  screen:        Screen;
  user:          UserInfo | null;
  job:           JobData;
  loginEmail:    string;
  loginPassword: string;
  loginError:    string;
  loginBusy:     boolean;
  addBusy:       boolean;
  addError:      string;
  addedId:       string;
  dupCompany:    string;
  dupTitle:      string;
  panelOpen:     boolean;
  btnY:          number;
  btnDragging:   boolean;
  site:          "linkedin" | "indeed" | "other";
}

// ── helpers ───────────────────────────────────────────────────────────────

function send(msg: object): Promise<Record<string, unknown>> {
  return new Promise((resolve) =>
    chrome.runtime.sendMessage(msg, (r) => resolve(r as Record<string, unknown>))
  );
}

function qs(...sels: string[]): string {
  for (const sel of sels) {
    const el = document.querySelector(sel);
    const t = el?.textContent?.trim();
    if (t) return t;
  }
  return "";
}

function detectSite(): State["site"] {
  const h = location.hostname.replace("www.", "");
  if (h === "linkedin.com") return "linkedin";
  if (h === "indeed.com")   return "indeed";
  return "other";
}

// ── scrapers ──────────────────────────────────────────────────────────────

// Strategy 1: JSON-LD structured data (most reliable — sites include this for SEO)
function parseJobLd(): Partial<JobData> {
  try {
    const scripts = document.querySelectorAll('script[type="application/ld+json"]');
    for (const s of scripts) {
      const raw = JSON.parse(s.textContent ?? "{}");
      const items: unknown[] = Array.isArray(raw) ? raw : [raw];
      for (const item of items) {
        const d = item as Record<string, unknown>;
        if (d["@type"] !== "JobPosting") continue;
        const org     = d.hiringOrganization as Record<string, unknown> | undefined;
        const locArr  = (Array.isArray(d.jobLocation) ? d.jobLocation : [d.jobLocation]) as Array<Record<string, unknown>>;
        const addr    = (locArr[0]?.address ?? {}) as Record<string, unknown>;
        const locParts = [addr.addressLocality, addr.addressRegion, addr.addressCountry].filter(Boolean);
        const rawDesc  = (typeof d.description === "string" ? d.description : "") as string;
        const notes    = rawDesc.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 600);
        return {
          jobTitle:    typeof d.title       === "string" ? d.title.trim()    : "",
          companyName: typeof org?.name     === "string" ? org.name.trim()   : "",
          location:    locParts.join(", "),
          notes,
        };
      }
    }
  } catch { /* ignore parse errors */ }
  return {};
}

// Strategy 2: page <title> tag pattern matching
function parseTitleTag(site: State["site"]): Partial<JobData> {
  const raw = document.title;
  if (site === "linkedin") {
    const clean = raw.replace(/\s*\|\s*LinkedIn.*$/i, "").trim();
    // "Senior Engineer at Google" or "Senior Engineer - Google"
    const m = clean.match(/^(.+?)\s+(?:at|-|–)\s+(.+)$/i);
    if (m) return { jobTitle: m[1].trim(), companyName: m[2].trim() };
  }
  if (site === "indeed") {
    const clean = raw.replace(/\s*\|\s*Indeed.*$/i, "").trim();
    // "Software Engineer job in London at Google"
    const m = clean.match(/^(.+?)\s+job(?:\s+in\s+(.+?))?\s+at\s+(.+)$/i);
    if (m) return { jobTitle: m[1].trim(), location: (m[2] ?? "").trim(), companyName: m[3].trim() };
    // "Software Engineer - Google"
    const m2 = clean.match(/^(.+?)\s*[-–]\s*(.+)$/);
    if (m2) return { jobTitle: m2[1].trim(), companyName: m2[2].trim() };
  }
  return {};
}

// Strategy 3: meta tag helper
function metaAttr(names: string[]): string {
  for (const n of names) {
    const v = document.querySelector(`meta[name="${n}"], meta[property="${n}"]`)?.getAttribute("content")?.trim();
    if (v) return v;
  }
  return "";
}

// Strategy 4: CSS selectors with many fallbacks
function scrapeLinkedIn(): JobData {
  const ld    = parseJobLd();
  const title = parseTitleTag("linkedin");

  const jobTitle = qs(
    ".job-details-jobs-unified-top-card__job-title h1",
    "h1.t-24.t-bold.inline",
    "h1.t-24.t-bold",
    "h1.t-24",
    ".jobs-unified-top-card__job-title h1",
    "h1[class*='job-title']",
    ".job-details-jobs-unified-top-card__job-title",
  ) || ld.jobTitle || title.jobTitle || "";

  const companyName = qs(
    ".job-details-jobs-unified-top-card__company-name a",
    ".job-details-jobs-unified-top-card__company-name",
    ".jobs-unified-top-card__company-name a",
    ".jobs-unified-top-card__company-name",
    ".job-details-jobs-unified-top-card__primary-description-without-tagline a:first-of-type",
    "[data-test-id*='company-name'] a",
    "[data-tracking-will-navigate] a[href*='/company/']",
  ) || ld.companyName || title.companyName || "";

  const jobLocation = qs(
    ".tvm__text.tvm__text--positive.tvm__text--low-emphasis",
    ".job-details-jobs-unified-top-card__workplace-type",
    ".job-details-jobs-unified-top-card__bullet",
    ".jobs-unified-top-card__bullet",
    "[class*='jobs-unified-top-card__workplace']",
    ".tvm__text--low-emphasis",
  ) || ld.location || title.location || "";

  const notes = qs(
    "#job-details",
    ".jobs-description-content__text--stretch",
    ".jobs-description-content__text",
    ".jobs-description__content",
    ".jobs-box__html-content",
    "[class*='description__text']",
  ).slice(0, 600) || ld.notes || "";

  return { jobTitle, companyName, location: jobLocation, jobPostUrl: location.href, notes };
}

function scrapeIndeed(): JobData {
  const ld    = parseJobLd();
  const title = parseTitleTag("indeed");

  const jobTitle = qs(
    "h1[data-testid='jobTitle']",
    "[data-testid='jobTitle'] span",
    "h1[class*='jobsearch-JobInfoHeader-title']",
    ".jobsearch-JobInfoHeader-title > span:first-child",
    ".jobsearch-JobInfoHeader-title",
    "h1.icl-u-xs-mb--xs",
  ) || ld.jobTitle || title.jobTitle || "";

  const companyName = qs(
    "[data-testid='inlineHeader-companyName'] a",
    "[data-testid='inlineHeader-companyName']",
    "[data-testid='companyInfo-name']",
    "[data-company-name='true']",
    ".jobsearch-InlineCompanyRating-companyName",
    ".jobsearch-CompanyInfoContainer a",
  ) || ld.companyName || title.companyName
    || metaAttr(["indeed:employer"]) || "";

  const jobLocation = qs(
    "[data-testid='job-location']",
    "[data-testid='inlineHeader-companyLocation']",
    "[data-testid='companyInfo-location']",
    ".jobsearch-JobInfoHeader-subtitle [data-testid]",
    "[class*='companyLocation']",
  ) || ld.location || title.location || "";

  const notes = qs(
    "#jobDescriptionText",
    "[data-testid='jobsearch-JobComponent-description']",
    ".jobsearch-jobDescriptionText",
    "#jobDetails",
  ).slice(0, 600) || ld.notes || "";

  return { jobTitle, companyName, location: jobLocation, jobPostUrl: location.href, notes };
}

function scrapeJob(site: State["site"]): JobData {
  if (site === "linkedin") return scrapeLinkedIn();
  if (site === "indeed")   return scrapeIndeed();
  // Generic: try JSON-LD first, then title tag
  const ld = parseJobLd();
  return {
    companyName: ld.companyName ?? "",
    jobTitle:    ld.jobTitle    ?? document.title.split(/\s*[|\-–]\s*/)[0].trim(),
    location:    ld.location    ?? "",
    jobPostUrl:  location.href,
    notes:       ld.notes       ?? metaAttr(["description", "og:description"]).slice(0, 600),
  };
}

// Retry scraping until title+company are found (LinkedIn/Indeed are SPAs — content loads after DOMContentLoaded)
async function waitAndScrape(site: State["site"]): Promise<JobData> {
  for (let i = 0; i < 10; i++) {
    const job = scrapeJob(site);
    if (job.jobTitle && job.companyName) return job;
    await new Promise<void>(r => setTimeout(r, 400));
  }
  return scrapeJob(site);
}

// ── icon SVGs (inline, no external file needed) ───────────────────────────

const ICON_BRIEFCASE = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/><line x1="12" y1="12" x2="12" y2="12"/></svg>`;
const ICON_X          = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
const ICON_CHECK      = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;
const ICON_PLUS       = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`;

// ── state & shadow root ───────────────────────────────────────────────────

const site = detectSite();

const state: State = {
  screen:        "loading",
  user:          null,
  job:           scrapeJob(site),
  loginEmail:    "",
  loginPassword: "",
  loginError:    "",
  loginBusy:     false,
  addBusy:       false,
  addError:      "",
  addedId:       "",
  dupCompany:    "",
  dupTitle:      "",
  panelOpen:     false,
  btnY:          50,
  btnDragging:   false,
  site,
};

const host = document.createElement("div");
host.style.cssText = "position:fixed;top:0;left:0;width:0;height:0;z-index:2147483646;pointer-events:none;";
document.body.appendChild(host);
const shadow = host.attachShadow({ mode: "open" });

const styleEl = document.createElement("style");
styleEl.textContent = PANEL_CSS;
shadow.appendChild(styleEl);

const toggleBtn = document.createElement("button");
toggleBtn.id = "tm-toggle";
toggleBtn.title = "TrackMyself";
toggleBtn.innerHTML = ICON_BRIEFCASE;
toggleBtn.style.top = `${state.btnY}%`;
toggleBtn.style.transform = "translateY(-50%)";
toggleBtn.style.pointerEvents = "auto";
shadow.appendChild(toggleBtn);

const panelEl = document.createElement("div");
panelEl.id = "tm-panel";
panelEl.style.pointerEvents = "auto";
shadow.appendChild(panelEl);

// ── render ────────────────────────────────────────────────────────────────

function siteLabel() {
  if (state.site === "linkedin") return "LinkedIn";
  if (state.site === "indeed")   return "Indeed";
  return "Web";
}

function initials(name: string) {
  return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2) || "?";
}

function renderPanel() {
  const { screen, user, job, loginEmail, loginPassword, loginError, loginBusy, addBusy, addError, addedId, dupCompany, dupTitle } = state;

  let body = "";

  if (screen === "loading") {
    body = `<div style="display:flex;align-items:center;justify-content:center;height:120px;"><span class="tm-spinner"></span></div>`;
  }

  else if (screen === "login") {
    body = `
      <p class="tm-info" style="margin-bottom:14px;">Sign in to your TrackMyself account to save jobs directly from your browser.</p>
      <div class="tm-field">
        <label class="tm-label" for="tm-email">Email</label>
        <input id="tm-email" class="tm-input" type="email" placeholder="you@example.com" value="${escHtml(loginEmail)}" autocomplete="email">
      </div>
      <div class="tm-field">
        <label class="tm-label" for="tm-password">Password</label>
        <input id="tm-password" class="tm-input" type="password" placeholder="••••••••" autocomplete="current-password">
      </div>
      ${loginError ? `<p class="tm-error">${escHtml(loginError)}</p>` : ""}
      <button id="tm-login-btn" class="tm-btn-primary" style="margin-top:12px;" ${loginBusy ? "disabled" : ""}>
        ${loginBusy ? `<span class="tm-spinner"></span> Signing in…` : "Sign In"}
      </button>
      <a href="${APP_URL}/login" target="_blank" class="tm-btn-ghost" id="tm-open-web" style="text-decoration:none;margin-top:8px;">Open TrackMyself</a>
    `;
  }

  else if (screen === "add") {
    body = `
      <div class="tm-user-bar">
        <div class="tm-avatar">${escHtml(initials(user?.name ?? ""))}</div>
        <div class="tm-user-info">
          <div class="tm-user-name">${escHtml(user?.name ?? "")}</div>
          <div class="tm-user-email">${escHtml(user?.email ?? "")}</div>
        </div>
        <button id="tm-signout" class="tm-signout">Sign out</button>
      </div>
      <span class="tm-site-chip">${escHtml(siteLabel())}</span>
      <p class="tm-section-title">Job Details</p>
      <div class="tm-field">
        <label class="tm-label" for="tm-company">Company *</label>
        <input id="tm-company" class="tm-input" type="text" placeholder="Company name" value="${escHtml(job.companyName)}">
      </div>
      <div class="tm-field">
        <label class="tm-label" for="tm-title">Job Title *</label>
        <input id="tm-title" class="tm-input" type="text" placeholder="Job title" value="${escHtml(job.jobTitle)}">
      </div>
      <div class="tm-field">
        <label class="tm-label" for="tm-location">Location</label>
        <input id="tm-location" class="tm-input" type="text" placeholder="City / Remote" value="${escHtml(job.location)}">
      </div>
      <div class="tm-field">
        <label class="tm-label" for="tm-url">Job Post URL</label>
        <input id="tm-url" class="tm-input" type="url" placeholder="https://…" value="${escHtml(job.jobPostUrl)}">
      </div>
      <div class="tm-field">
        <label class="tm-label" for="tm-notes">Notes</label>
        <textarea id="tm-notes" class="tm-textarea" placeholder="Key requirements, salary, etc.">${escHtml(job.notes)}</textarea>
      </div>
      ${addError ? `<p class="tm-error">${escHtml(addError)}</p>` : ""}
      <button id="tm-add-btn" class="tm-btn-primary" style="margin-top:4px;" ${addBusy ? "disabled" : ""}>
        ${addBusy ? `<span class="tm-spinner"></span> Saving…` : `${ICON_PLUS} Add to Wishlist`}
      </button>
    `;
  }

  else if (screen === "success") {
    body = `
      <div class="tm-success">
        <div class="tm-success-icon">${ICON_CHECK}</div>
        <h3>Added to Wishlist!</h3>
        <p>${escHtml(state.job.jobTitle)} at ${escHtml(state.job.companyName)}</p>
        <a href="${APP_URL}/me/applications" target="_blank">View in TrackMyself →</a>
        <button id="tm-add-another" class="tm-btn-ghost" style="margin-top:4px;">Add another job</button>
      </div>
    `;
  }

  else if (screen === "duplicate") {
    body = `
      <div class="tm-success" style="gap:8px;">
        <div class="tm-success-icon" style="background:rgba(234,179,8,0.15);">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#eab308" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
        </div>
        <h3>Already in Tracker</h3>
        <p>${escHtml(dupTitle)} at ${escHtml(dupCompany)}</p>
        <a href="${APP_URL}/me/applications" target="_blank">View in TrackMyself →</a>
        <button id="tm-add-anyway" class="tm-btn-ghost">Add anyway</button>
      </div>
    `;
  }

  panelEl.innerHTML = `
    <div class="tm-header">
      <div class="tm-logo">${ICON_BRIEFCASE} TrackMyself</div>
      <button class="tm-close" id="tm-close" title="Close">${ICON_X}</button>
    </div>
    <div class="tm-body">${body}</div>
  `;

  bindEvents();
}

// ── event binding ─────────────────────────────────────────────────────────

function bindEvents() {
  shadow.getElementById("tm-close")?.addEventListener("click", () => {
    state.panelOpen = false;
    panelEl.classList.remove("open");
  });

  shadow.getElementById("tm-signout")?.addEventListener("click", async () => {
    await send({ type: "LOGOUT" });
    state.user   = null;
    state.screen = "login";
    renderPanel();
  });

  // Login form
  const emailIn    = shadow.getElementById("tm-email")    as HTMLInputElement | null;
  const passwordIn = shadow.getElementById("tm-password") as HTMLInputElement | null;

  emailIn?.addEventListener("input", (e) => {
    state.loginEmail = (e.target as HTMLInputElement).value;
  });
  passwordIn?.addEventListener("input", (e) => {
    state.loginPassword = (e.target as HTMLInputElement).value;
  });
  passwordIn?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") shadow.getElementById("tm-login-btn")?.click();
  });

  shadow.getElementById("tm-login-btn")?.addEventListener("click", async () => {
    if (state.loginBusy) return;
    if (!state.loginEmail || !state.loginPassword) {
      state.loginError = "Please enter your email and password.";
      renderPanel();
      return;
    }
    state.loginBusy  = true;
    state.loginError = "";
    renderPanel();

    const res = await send({ type: "LOGIN", email: state.loginEmail, password: state.loginPassword }) as { ok: boolean; user?: UserInfo; error?: string };
    state.loginBusy = false;

    if (!res.ok) {
      state.loginError = res.error ?? "Login failed.";
      renderPanel();
      return;
    }
    state.user          = res.user ?? null;
    state.loginPassword = "";
    state.loginError    = "";
    state.screen        = "add";
    state.job           = scrapeJob(state.site);
    renderPanel();
  });

  // Job form fields
  (["tm-company","tm-title","tm-location","tm-url","tm-notes"] as const).forEach(id => {
    const el = shadow.getElementById(id) as HTMLInputElement | HTMLTextAreaElement | null;
    if (!el) return;
    el.addEventListener("input", () => {
      const map: Record<string, keyof JobData> = {
        "tm-company":  "companyName",
        "tm-title":    "jobTitle",
        "tm-location": "location",
        "tm-url":      "jobPostUrl",
        "tm-notes":    "notes",
      };
      (state.job[map[id]] as string) = el.value;
    });
  });

  shadow.getElementById("tm-add-btn")?.addEventListener("click", () => doAddJob());

  shadow.getElementById("tm-add-another")?.addEventListener("click", () => {
    state.screen   = "add";
    state.addError = "";
    state.addedId  = "";
    state.job      = scrapeJob(state.site);
    renderPanel();
  });

  shadow.getElementById("tm-add-anyway")?.addEventListener("click", () => doAddJob(true));
}

async function doAddJob(force = false) {
  if (state.addBusy) return;
  if (!state.job.companyName || !state.job.jobTitle) {
    state.addError = "Company name and job title are required.";
    renderPanel();
    return;
  }
  state.addBusy  = true;
  state.addError = "";
  renderPanel();

  const payload = force
    ? { ...state.job, force: true }
    : state.job;

  const res = await send({ type: "ADD_JOB", job: payload }) as {
    ok: boolean; id?: string; error?: string; authExpired?: boolean;
    existing?: { companyName?: string; jobTitle?: string };
  };
  state.addBusy = false;

  if (res.authExpired) {
    state.user   = null;
    state.screen = "login";
    renderPanel();
    return;
  }
  if (!res.ok && res.error === "duplicate") {
    state.screen     = "duplicate";
    state.dupCompany = res.existing?.companyName ?? state.job.companyName;
    state.dupTitle   = res.existing?.jobTitle    ?? state.job.jobTitle;
    renderPanel();
    return;
  }
  if (!res.ok) {
    state.addError = res.error ?? "Failed to save job.";
    renderPanel();
    return;
  }

  state.screen  = "success";
  state.addedId = res.id ?? "";
  renderPanel();
}

// ── panel toggle ──────────────────────────────────────────────────────────

toggleBtn.addEventListener("click", (e) => {
  if (state.btnDragging) return;
  e.stopPropagation();
  state.panelOpen = !state.panelOpen;
  if (state.panelOpen) {
    panelEl.classList.add("open");
    if (state.screen === "loading") initAuth();
    else renderPanel();
  } else {
    panelEl.classList.remove("open");
  }
});

async function initAuth() {
  const res = await send({ type: "GET_AUTH" }) as { ok: boolean; user?: UserInfo };
  if (res.ok && res.user) {
    state.user   = res.user;
    state.screen = "add";
    // Show panel immediately with whatever data we have, then update once scraping settles
    state.job = scrapeJob(state.site);
    renderPanel();
    const scraped = await waitAndScrape(state.site);
    state.job = scraped;
    renderPanel();
  } else {
    state.screen = "login";
    renderPanel();
  }
}

// ── draggable toggle button ───────────────────────────────────────────────

let dragStartY   = 0;
let dragBtnStart = 0;

toggleBtn.addEventListener("pointerdown", (e) => {
  if (e.button !== 0) return;
  dragStartY   = e.clientY;
  dragBtnStart = state.btnY;
  toggleBtn.setPointerCapture(e.pointerId);
});

toggleBtn.addEventListener("pointermove", (e) => {
  if (!toggleBtn.hasPointerCapture(e.pointerId)) return;
  const delta = ((e.clientY - dragStartY) / window.innerHeight) * 100;
  if (Math.abs(delta) > 3) state.btnDragging = true;
  const next = Math.max(5, Math.min(95, dragBtnStart + delta));
  state.btnY = next;
  toggleBtn.style.top      = `${next}%`;
  toggleBtn.style.transform = "translateY(-50%)";
});

toggleBtn.addEventListener("pointerup", () => {
  if (state.btnDragging) {
    chrome.storage.local.set({ tm_btn_y: state.btnY });
    setTimeout(() => { state.btnDragging = false; }, 50);
  }
});

// ── restore saved button position ────────────────────────────────────────

chrome.storage.local.get("tm_btn_y").then((r) => {
  if (typeof r.tm_btn_y === "number") {
    state.btnY = r.tm_btn_y;
    toggleBtn.style.top = `${state.btnY}%`;
  }
});

// ── SPA URL change detection (LinkedIn) ──────────────────────────────────

let lastUrl = location.href;
const urlObserver = new MutationObserver(() => {
  if (location.href !== lastUrl) {
    lastUrl = location.href;
    state.job = scrapeJob(state.site);
    if (state.screen === "add" || state.screen === "success" || state.screen === "duplicate") {
      state.screen   = "add";
      state.addError = "";
      state.addedId  = "";
      state.job      = { companyName: "", jobTitle: "", location: "", jobPostUrl: location.href, notes: "" };
      if (state.panelOpen) renderPanel();
      waitAndScrape(state.site).then(job => {
        state.job = job;
        if (state.panelOpen && state.screen === "add") renderPanel();
      });
    }
  }
});
urlObserver.observe(document.body, { childList: true, subtree: true });

// ── escaping helper ───────────────────────────────────────────────────────

function escHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
