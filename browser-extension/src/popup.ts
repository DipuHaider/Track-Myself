const APP_URL = "https://trackmyself.webarden.tech";

/* A module, not a classic script: top-level names like `status` and `open`
   would otherwise collide with window globals. */
export {};

type AuthReply = { ok?: boolean; user?: { name?: string; email?: string } };

const dot = document.getElementById("dot");
const status = document.getElementById("status");
const open = document.getElementById("open") as HTMLAnchorElement | null;
const google = document.getElementById("google") as HTMLAnchorElement | null;
const assist = document.getElementById("assist") as HTMLAnchorElement | null;
const assistNote = document.getElementById("assist-note");

assist?.addEventListener("click", (e) => {
  e.preventDefault();
  chrome.runtime
    .sendMessage({ type: "INJECT_ASSIST" })
    .then((reply: { ok?: boolean; error?: string }) => {
      if (reply?.ok) window.close();
      else if (assistNote) assistNote.textContent = reply?.error ?? "Could not open the helper on this page.";
    })
    .catch(() => {
      if (assistNote) assistNote.textContent = "Could not open the helper on this page.";
    });
});

google?.addEventListener("click", (e) => {
  e.preventDefault();
  chrome.runtime.sendMessage({ type: "OPEN_CONNECT" }).finally(() => window.close());
});

if (open) open.href = `${APP_URL}/me/applications`;

/* The background worker owns the token; the popup only reports what it says.
   A rejected message means the worker is asleep or reloading, which is not
   the same as being signed out, so it is worded as unknown rather than off. */
chrome.runtime
  .sendMessage({ type: "GET_AUTH" })
  .then((reply: AuthReply) => {
    if (reply?.ok && reply.user) {
      if (dot) dot.className = "dot ok";
      if (status) {
        status.textContent = reply.user.name || reply.user.email || "Signed in";
        status.classList.remove("muted");
      }
      return;
    }
    if (status) status.textContent = "Not signed in";
    if (google) google.hidden = false;
  })
  .catch(() => {
    if (status) status.textContent = "Not connected";
  });
