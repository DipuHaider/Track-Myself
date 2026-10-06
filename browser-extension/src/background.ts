const API_BASE = "https://trackmyself.webarden.tech";
const TRUSTED_ORIGINS = [API_BASE, "https://track-myself.vercel.app"];

interface AuthState {
  token: string;
  name:  string;
  email: string;
}

interface JobPayload {
  companyName: string;
  jobTitle:    string;
  location:    string;
  jobPostUrl:  string;
  notes:       string;
  platform?:       string;
  jobType?:        string;
  workplaceType?:  string;
  salary?:         string;
  jobDescription?: string;
  postedAt?:          string;
  postedAgeText?:     string;
  postingPrecision?:  "exact" | "approximate";
}

type InMsg =
  | { type: "GET_AUTH" }
  | { type: "LOGIN";   email: string; password: string }
  | { type: "LOGOUT" }
  | { type: "OPEN_CONNECT" }
  | { type: "ADD_JOB"; job: JobPayload };

// ── storage helpers ──────────────────────────────────────────────────────────

async function getAuth(): Promise<AuthState | null> {
  const r = await chrome.storage.local.get("tm_auth");
  return (r.tm_auth as AuthState) ?? null;
}

async function setAuth(a: AuthState) {
  await chrome.storage.local.set({ tm_auth: a });
}

async function clearAuth() {
  await chrome.storage.local.remove("tm_auth");
}

// ── sign-in handed over by the website (Google and other web logins) ─────────

chrome.runtime.onMessageExternal.addListener((message, sender, sendResponse) => {
  const msg = message as { type?: string; token?: unknown; name?: unknown; email?: unknown };
  if (!sender.origin || !TRUSTED_ORIGINS.includes(sender.origin)) return;
  if (msg?.type !== "TM_CONNECT" || typeof msg.token !== "string" || !msg.token) {
    sendResponse({ ok: false });
    return;
  }
  setAuth({
    token: msg.token,
    name:  typeof msg.name  === "string" ? msg.name  : "",
    email: typeof msg.email === "string" ? msg.email : "",
  })
    .then(() => sendResponse({ ok: true }))
    .catch(() => sendResponse({ ok: false }));
  return true;
});

// ── message handler ──────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener(
  (message: InMsg, _sender, sendResponse) => {
    handle(message)
      .then(sendResponse)
      .catch((e: unknown) =>
        sendResponse({ ok: false, error: (e as Error).message ?? "Unknown error" })
      );
    return true;
  }
);

async function handle(msg: InMsg): Promise<unknown> {
  switch (msg.type) {
    case "GET_AUTH": {
      const auth = await getAuth();
      if (!auth) return { ok: false, error: "Not signed in" };
      return { ok: true, user: { name: auth.name, email: auth.email } };
    }

    case "LOGIN": {
      const res  = await fetch(`${API_BASE}/api/extension/auth`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ email: msg.email, password: msg.password }),
      });
      const data = await res.json() as Record<string, unknown>;
      if (!res.ok) return { ok: false, error: (data.error as string) ?? "Login failed" };
      await setAuth({
        token: data.token as string,
        name:  (data.name  as string) ?? "",
        email: (data.email as string) ?? msg.email,
      });
      return { ok: true, user: { name: data.name, email: data.email } };
    }

    case "OPEN_CONNECT": {
      await chrome.tabs.create({ url: `${API_BASE}/extension/connect?ext=${chrome.runtime.id}` });
      return { ok: true };
    }

    case "LOGOUT": {
      await clearAuth();
      return { ok: true };
    }

    case "ADD_JOB": {
      const auth = await getAuth();
      if (!auth) return { ok: false, error: "Not signed in" };

      const res = await fetch(`${API_BASE}/api/extension/jobs`, {
        method:  "POST",
        headers: {
          "Content-Type":  "application/json",
          "Authorization": `Bearer ${auth.token}`,
        },
        body: JSON.stringify(msg.job),
      });
      const data = await res.json() as Record<string, unknown>;

      if (res.status === 401) {
        await clearAuth();
        return { ok: false, error: "Session expired — please sign in again", authExpired: true };
      }
      if (res.status === 409) {
        return { ok: false, error: "duplicate", existing: data.existing };
      }
      if (!res.ok) return { ok: false, error: (data.error as string) ?? "Failed to save" };

      return { ok: true, id: (data._id as string) ?? "" };
    }
  }
}
