import { bestAnswer, fieldKey, leadIdFromHash, looksSubmitted, yesNo, type ApplicantKey } from "./fillRules";

type Kit = {
  lead: { id: string; company: string; title: string; platform: string; applyUrl: string };
  applicant: Record<Exclude<ApplicantKey, "coverLetter">, string>;
  screening: { question: string; answer: string }[];
  coverLetterText: string;
  files: { kind: "cv" | "cover-letter"; name: string; mimeType: string; base64: string }[];
};

type ReadyLead = { id: string; company: string; title: string; platform: string; applyUrl: string };

type Reply<T> = { ok: boolean; error?: string; authExpired?: boolean } & Partial<T>;

const STORE_KEY = "tm-lead";
const HIGHLIGHT = "2px solid #f59e0b";

declare global {
  interface Window { __tmAssist?: { open: () => void } }
}

function send<T>(msg: object): Promise<Reply<T>> {
  return new Promise((resolve) => {
    try {
      chrome.runtime.sendMessage(msg, (r) => {
        if (chrome.runtime.lastError) resolve({ ok: false, error: "The extension was updated. Reload this page." } as Reply<T>);
        else resolve((r ?? { ok: false, error: "No reply" }) as Reply<T>);
      });
    } catch {
      resolve({ ok: false, error: "The extension was updated. Reload this page." } as Reply<T>);
    }
  });
}

// ── reading the form ───────────────────────────────────────────────────────

function visible(el: HTMLElement): boolean {
  if (el.closest("[hidden],[aria-hidden='true']")) return false;
  const r = el.getBoundingClientRect();
  return (r.width > 0 && r.height > 0) || (el instanceof HTMLInputElement && el.type === "file");
}

function textById(ids: string): string {
  return ids.split(/\s+/).map((id) => document.getElementById(id)?.textContent ?? "").join(" ");
}

function labelFor(el: HTMLElement): string {
  const parts: string[] = [];
  const aria = el.getAttribute("aria-label");
  if (aria) parts.push(aria);
  const by = el.getAttribute("aria-labelledby");
  if (by) parts.push(textById(by));
  if (el.id) {
    const lab = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
    if (lab?.textContent) parts.push(lab.textContent);
  }
  const wrap = el.closest("label");
  if (wrap?.textContent) parts.push(wrap.textContent);
  const ph = el.getAttribute("placeholder");
  if (ph) parts.push(ph);
  if (!parts.length) {
    const group = el.closest("fieldset, [role='group'], .fb-dash-form-element, .jobs-easy-apply-form-element, div");
    const legend = group?.querySelector("legend, label, span[aria-hidden='true'], .fb-dash-form-element__label");
    if (legend?.textContent) parts.push(legend.textContent);
  }
  return parts.join(" ").replace(/\s+/g, " ").trim().slice(0, 300);
}

function isRequired(el: HTMLElement): boolean {
  return (el as HTMLInputElement).required || el.getAttribute("aria-required") === "true" || /\*\s*$/.test(labelFor(el));
}

function isEmpty(el: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement): boolean {
  if (el instanceof HTMLSelectElement) return el.selectedIndex <= 0 || !el.value || /select|bitte wählen|choose/i.test(el.options[el.selectedIndex]?.text ?? "");
  if (el instanceof HTMLInputElement && el.type === "file") return !el.files || el.files.length === 0;
  return !el.value.trim();
}

// ── writing the form ───────────────────────────────────────────────────────

/* Sites built on React or similar ignore a plain .value assignment; going
   through the prototype setter and firing input + change is what a user
   typing would have produced. */
function setValue(el: HTMLInputElement | HTMLTextAreaElement, value: string) {
  const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto, "value")?.set?.call(el, value);
  el.dispatchEvent(new Event("input", { bubbles: true }));
  el.dispatchEvent(new Event("change", { bubbles: true }));
  el.dispatchEvent(new Event("blur", { bubbles: true }));
}

function selectOption(el: HTMLSelectElement, answer: string): boolean {
  const want = answer.trim().toLowerCase();
  const yn = yesNo(answer);
  const opts = [...el.options].filter((o) => o.value);
  const match = opts.find((o) => o.text.trim().toLowerCase() === want)
    ?? opts.find((o) => want && o.text.toLowerCase().includes(want))
    ?? (yn ? opts.find((o) => (yn === "yes" ? /^(yes|ja)\b/i : /^(no|nein)\b/i).test(o.text.trim())) : undefined);
  if (!match) return false;
  el.value = match.value;
  el.dispatchEvent(new Event("change", { bubbles: true }));
  return true;
}

function chooseRadio(group: HTMLInputElement[], answer: string): boolean {
  const yn = yesNo(answer);
  const want = answer.trim().toLowerCase();
  const pick = group.find((r) => labelFor(r).toLowerCase() === want)
    ?? (yn ? group.find((r) => (yn === "yes" ? /^(yes|ja)\b/i : /^(no|nein)\b/i).test(labelFor(r) || r.value)) : undefined);
  if (!pick) return false;
  pick.click();
  return true;
}

function fileFrom(f: Kit["files"][number]): File {
  const bin = atob(f.base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new File([bytes], f.name, { type: f.mimeType });
}

function attach(input: HTMLInputElement, file: File): boolean {
  try {
    const dt = new DataTransfer();
    dt.items.add(file);
    input.files = dt.files;
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
    return true;
  } catch {
    return false;
  }
}

type FillReport = { filled: number; attached: number; needsYou: number };

const touched = new WeakSet<Element>();

function applicantValue(kit: Kit, key: ApplicantKey): string {
  if (key === "coverLetter") return kit.coverLetterText;
  return kit.applicant[key] ?? "";
}

/* Fills only empty fields it can match with confidence, attaches the
   prepared files, and outlines required fields it could not answer. It never
   presses Next, Review or Submit: every step forward is the owner's click. */
export function fillPage(kit: Kit, root: ParentNode = document): FillReport {
  const report: FillReport = { filled: 0, attached: 0, needsYou: 0 };

  const fields = [...root.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>("input, textarea, select")]
    .filter((el) => !el.disabled && !(el as HTMLInputElement).readOnly && visible(el));

  const radios = new Map<string, HTMLInputElement[]>();

  for (const el of fields) {
    if (el instanceof HTMLInputElement && ["hidden", "submit", "button", "image", "reset", "password", "search"].includes(el.type)) continue;
    if (el instanceof HTMLInputElement && el.type === "radio") {
      const list = radios.get(el.name) ?? [];
      list.push(el);
      radios.set(el.name, list);
      continue;
    }
    if (el instanceof HTMLInputElement && el.type === "checkbox") continue;

    if (el instanceof HTMLInputElement && el.type === "file") {
      if (!isEmpty(el) || touched.has(el)) continue;
      const label = labelFor(el).toLowerCase();
      const wantsLetter = /cover|anschreiben|motivation/.test(label);
      const doc = kit.files.find((f) => f.kind === (wantsLetter ? "cover-letter" : "cv"));
      if (doc && attach(el, fileFrom(doc))) {
        touched.add(el);
        report.attached++;
      } else if (isRequired(el)) {
        el.style.outline = HIGHLIGHT;
        report.needsYou++;
      }
      continue;
    }

    if (!isEmpty(el) || touched.has(el)) continue;
    const label = labelFor(el);
    const key = el instanceof HTMLSelectElement ? null : fieldKey(label, el.getAttribute("autocomplete") ?? "", el.getAttribute("name") ?? "", (el as HTMLInputElement).type ?? "");
    let done = false;

    if (key) {
      const value = applicantValue(kit, key);
      if (value && !(key === "coverLetter" && el instanceof HTMLInputElement)) {
        setValue(el as HTMLInputElement | HTMLTextAreaElement, value);
        done = true;
      }
    } else {
      const answer = bestAnswer(label, kit.screening);
      if (answer) {
        if (el instanceof HTMLSelectElement) done = selectOption(el, answer);
        else {
          setValue(el, answer);
          done = true;
        }
      }
    }

    if (done) {
      touched.add(el);
      el.style.outline = "";
      report.filled++;
    } else if (isRequired(el)) {
      el.style.outline = HIGHLIGHT;
      report.needsYou++;
    }
  }

  for (const group of radios.values()) {
    if (group.some((r) => r.checked) || group.some((r) => touched.has(r))) continue;
    const question = labelFor(group[0].closest("fieldset") as HTMLElement ?? group[0]);
    const answer = bestAnswer(question, kit.screening);
    if (answer && chooseRadio(group, answer)) {
      group.forEach((r) => touched.add(r));
      report.filled++;
    } else if (group.some(isRequired)) {
      group.forEach((r) => { r.style.outline = HIGHLIGHT; });
      report.needsYou++;
    }
  }

  return report;
}

function submissionMethod(): string {
  const h = location.hostname;
  if (/linkedin\.com$/.test(h)) return "LinkedIn Easy Apply";
  if (/xing\.com$/.test(h)) return "XING Apply";
  if (/indeed\./.test(h)) return "Indeed Apply";
  if (/stepstone\./.test(h)) return "Online / Job Portal";
  return "Company Application Form";
}

// ── the bar ────────────────────────────────────────────────────────────────

const BAR_CSS = `
:host { all: initial; }
.bar { position: fixed; left: 16px; bottom: 16px; z-index: 2147483646; width: 340px; max-width: calc(100vw - 32px);
  font: 13px/1.45 ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif; color: #0f172a;
  background: #fff; border: 1px solid #c7d2fe; border-radius: 12px; box-shadow: 0 10px 30px rgba(15,23,42,.18); padding: 12px; }
@media (prefers-color-scheme: dark) { .bar { background: #0f1424; color: #e2e8f0; border-color: #3730a3; } .muted { color: #94a3b8 !important; } }
.head { display: flex; justify-content: space-between; align-items: center; gap: 8px; margin-bottom: 6px; }
.head b { font-size: 13px; }
.muted { color: #64748b; }
.row { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
button { font: inherit; cursor: pointer; border-radius: 8px; padding: 6px 10px; border: 1px solid #cbd5e1; background: transparent; color: inherit; }
button.primary { background: #4f46e5; border-color: #4f46e5; color: #fff; font-weight: 600; }
button:disabled { opacity: .55; cursor: default; }
button.x { border: none; padding: 2px 6px; }
ul { list-style: none; margin: 6px 0 0; padding: 0; max-height: 180px; overflow: auto; }
li button { width: 100%; text-align: left; margin-bottom: 4px; }
.ok { color: #059669; } .warn { color: #b45309; }
`;

export function startAssist(opts: { autoOpen?: boolean } = {}) {
  if (window.top !== window) return;
  if (window.__tmAssist) {
    window.__tmAssist.open();
    return;
  }

  const host = document.createElement("div");
  host.id = "trackmyself-assist";
  const shadow = host.attachShadow({ mode: "open" });
  const style = document.createElement("style");
  style.textContent = BAR_CSS;
  const bar = document.createElement("div");
  bar.className = "bar";
  bar.setAttribute("role", "region");
  bar.setAttribute("aria-label", "TrackMyself application helper");
  shadow.append(style, bar);

  let kit: Kit | null = null;
  let message = "";
  let tone: "" | "ok" | "warn" = "";
  let observer: MutationObserver | null = null;
  let submitted = false;
  let debounce = 0;

  const fromHash = leadIdFromHash(location.hash);
  if (fromHash) {
    try { sessionStorage.setItem(STORE_KEY, fromHash); } catch { /* storage blocked */ }
  }
  let leadId = fromHash ?? (() => { try { return sessionStorage.getItem(STORE_KEY); } catch { return null; } })();

  const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

  function render(content: string) {
    bar.innerHTML = `<div class="head"><b>TrackMyself</b><button class="x" data-act="close" aria-label="Close">✕</button></div>${content}`;
  }

  function renderKit() {
    if (!kit) return;
    render(`
      <div><strong>${esc(kit.lead.title)}</strong><div class="muted">${esc(kit.lead.company)}</div></div>
      <p class="muted" style="margin:6px 0 0">Fills what it can and attaches your CV${kit.files.some((f) => f.kind === "cover-letter") ? " and cover letter" : ""}. You review and press Submit.</p>
      ${message ? `<p class="${tone}" style="margin:6px 0 0" role="status">${esc(message)}</p>` : ""}
      <div class="row">
        <button class="primary" data-act="fill"${submitted ? " disabled" : ""}>Fill this step</button>
        <button data-act="submitted"${submitted ? " disabled" : ""}>I submitted it</button>
        <button data-act="switch">Other job</button>
      </div>`);
  }

  async function loadKit(id: string) {
    render(`<p class="muted">Loading your prepared application…</p>`);
    const res = await send<{ kit: Kit }>({ type: "FETCH_KIT", leadId: id });
    if (!res.ok || !res.kit) {
      if (res.authExpired) {
        render(`<p class="warn">Sign in to the TrackMyself extension first, then try again.</p>`);
        return;
      }
      render(`<p class="warn">${esc(res.error ?? "Could not load this application.")}</p><div class="row"><button data-act="switch">Pick another job</button></div>`);
      return;
    }
    kit = res.kit;
    leadId = id;
    try { sessionStorage.setItem(STORE_KEY, id); } catch { /* storage blocked */ }
    message = "";
    renderKit();
  }

  async function showPicker() {
    render(`<p class="muted">Loading jobs ready to apply…</p>`);
    const res = await send<{ leads: ReadyLead[] }>({ type: "LIST_READY" });
    if (!res.ok) {
      render(`<p class="warn">${esc(res.error ?? "Could not reach TrackMyself.")}</p>`);
      return;
    }
    const leads = res.leads ?? [];
    if (!leads.length) {
      render(`<p class="muted">No prepared applications waiting. Prepare one in your TrackMyself job inbox first.</p>`);
      return;
    }
    render(`<p class="muted" style="margin:0">Which application is this page for?</p><ul>${leads
      .map((l) => `<li><button data-act="pick" data-id="${esc(l.id)}"><strong>${esc(l.title)}</strong><br><span class="muted">${esc(l.company)} · ${esc(l.platform)}</span></button></li>`)
      .join("")}</ul>`);
  }

  function runFill() {
    if (!kit) return;
    const r = fillPage(kit);
    const parts = [`Filled ${r.filled} field${r.filled === 1 ? "" : "s"}`];
    if (r.attached) parts.push(`attached ${r.attached} file${r.attached === 1 ? "" : "s"}`);
    message = `${parts.join(", ")}.${r.needsYou ? ` ${r.needsYou} highlighted field${r.needsYou === 1 ? " needs" : "s need"} you.` : ""} Check everything, then continue yourself.`;
    tone = r.needsYou ? "warn" : "ok";
    renderKit();
    watch();
  }

  /* Multi-step forms (Easy Apply, XING, most ATSs) swap fields in place. While
     the helper is open it fills new empty fields as they appear, and watches
     for the site's own confirmation to record the application as sent. */
  function watch() {
    if (observer) return;
    observer = new MutationObserver(() => {
      window.clearTimeout(debounce);
      debounce = window.setTimeout(() => {
        if (!kit || submitted) return;
        if (looksSubmitted(document.body.innerText.slice(0, 20000))) {
          void markSubmitted(true);
          return;
        }
        const r = fillPage(kit);
        if (r.filled || r.attached) {
          message = `Filled ${r.filled} more field${r.filled === 1 ? "" : "s"} on this step.${r.needsYou ? ` ${r.needsYou} need you.` : ""}`;
          tone = r.needsYou ? "warn" : "ok";
          renderKit();
        }
      }, 700);
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  async function markSubmitted(auto: boolean) {
    if (!leadId || submitted) return;
    submitted = true;
    const res = await send<{ applicationId: string }>({ type: "MARK_SUBMITTED", leadId, method: submissionMethod() });
    if (res.ok) {
      message = auto ? "The site confirmed your application. Recorded as submitted in TrackMyself." : "Recorded as submitted in TrackMyself.";
      tone = "ok";
      try { sessionStorage.removeItem(STORE_KEY); } catch { /* storage blocked */ }
      observer?.disconnect();
    } else {
      submitted = false;
      message = res.error ?? "Could not record it. Mark it in TrackMyself instead.";
      tone = "warn";
    }
    renderKit();
  }

  bar.addEventListener("click", (e) => {
    const btn = (e.target as HTMLElement).closest("button");
    if (!btn) return;
    const act = btn.dataset.act;
    if (act === "close") {
      observer?.disconnect();
      observer = null;
      host.remove();
      window.__tmAssist = undefined;
    }
    if (act === "fill") runFill();
    if (act === "submitted") void markSubmitted(false);
    if (act === "switch") void showPicker();
    if (act === "pick" && btn.dataset.id) void loadKit(btn.dataset.id);
  });

  window.__tmAssist = {
    open: () => {
      if (!host.isConnected) document.documentElement.append(host);
    },
  };

  if (opts.autoOpen !== false) document.documentElement.append(host);
  if (leadId) void loadKit(leadId);
  else void showPicker();
}
