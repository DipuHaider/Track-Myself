const API_BASE = "https://track-myself.vercel.app";

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
}

type InMsg =
  | { type: "GET_AUTH" }
  | { type: "LOGIN";   email: string; password: string }
  | { type: "LOGOUT" }
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
