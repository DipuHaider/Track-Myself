"use client";

import { ISSUE_EVENT } from "@/constants/issues";

const CHANNEL = "tm-issues";

/* BroadcastChannel reaches other tabs in this browser; the window event reaches
   the tab that fired it, since a channel never delivers to its own poster. */
export function announceIssueChange() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(ISSUE_EVENT));

  try {
    const channel = new BroadcastChannel(CHANNEL);
    channel.postMessage(Date.now());
    channel.close();
  } catch {}
}

export function onIssueChange(handler: () => void) {
  if (typeof window === "undefined") return () => {};

  window.addEventListener(ISSUE_EVENT, handler);

  let channel: BroadcastChannel | null = null;
  try {
    channel = new BroadcastChannel(CHANNEL);
    channel.onmessage = () => handler();
  } catch {
    channel = null;
  }

  return () => {
    window.removeEventListener(ISSUE_EVENT, handler);
    channel?.close();
  };
}
