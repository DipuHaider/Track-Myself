const APP_URL = "https://trackmyself.webarden.tech";

type AuthReply = { ok?: boolean; user?: { name?: string; email?: string } };

const dot = document.getElementById("dot");
const status = document.getElementById("status");
const open = document.getElementById("open") as HTMLAnchorElement | null;

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
  })
  .catch(() => {
    if (status) status.textContent = "Not connected";
  });
