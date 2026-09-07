"use client";

import { useCallback, useEffect, useState } from "react";
import { DEFAULT_CV_CONTENT, importFromLegacy, isContentEmpty, normaliseContent } from "@/lib/cv/content";
import type { CVContent, CVFileMeta, CVFormat, CVPrimaryFiles, CVVariant } from "@/types/cv";

export type CVProfile = {
  content: CVContent;
  contentReady: boolean;
  primary: CVPrimaryFiles;
  uploadedFiles: CVFileMeta[];
};

export const DEFAULT_PRIMARY: CVPrimaryFiles = {
  cv: "", resume: "", coverLetter: "", profilePhoto: "", coverImage: "",
};

export const DEFAULT_CV_PROFILE: CVProfile = {
  content: DEFAULT_CV_CONTENT,
  contentReady: false,
  primary: DEFAULT_PRIMARY,
  uploadedFiles: [],
};

const DRAFT_KEY = "trackmyself-cv";

let cache: CVProfile | null = null;
let inflight: Promise<CVProfile> | null = null;

function normalise(raw: unknown): CVProfile {
  const d = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const primary = (d.primary ?? {}) as Partial<CVPrimaryFiles>;

  return {
    content: normaliseContent(d.content),
    contentReady: Boolean(d.contentReady),
    primary: { ...DEFAULT_PRIMARY, ...primary },
    uploadedFiles: Array.isArray(d.uploadedFiles) ? (d.uploadedFiles as CVFileMeta[]) : [],
  };
}

export function invalidateCVProfile() {
  cache = null;
  inflight = null;
}

export function getCachedCVProfile() {
  return cache;
}

export function patchCachedCVProfile(patch: Partial<CVProfile>) {
  if (cache) cache = { ...cache, ...patch };
}

function readLocalDraft(): CVContent | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Record<string, string>;
    const content = importFromLegacy(parsed);
    return isContentEmpty(content) ? null : content;
  } catch {
    return null;
  }
}

function clearLocalDraft() {
  try { localStorage.removeItem(DRAFT_KEY); } catch {}
}

export async function fetchCVProfile(force = false): Promise<CVProfile> {
  if (!force && cache) return cache;
  if (!force && inflight) return inflight;

  inflight = fetch("/api/user/cv")
    .then((r) => (r.ok ? r.json() : {}))
    .then((data) => {
      cache = normalise(data);
      return cache;
    })
    .catch(() => {
      cache = { ...DEFAULT_CV_PROFILE };
      return cache;
    })
    .finally(() => { inflight = null; });

  return inflight;
}

export async function saveCVProfile(patch: {
  content?: CVContent;
  primary?: Partial<CVPrimaryFiles>;
}): Promise<CVProfile> {
  const res = await fetch("/api/user/cv", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  if (!res.ok) throw new Error("Could not save your CV. Please try again.");
  cache = normalise(await res.json());
  return cache;
}

export async function downloadCVDocx(payload: {
  format?: CVFormat;
  variant?: CVVariant;
  docType?: "cv" | "resume" | "cover-letter";
  appInfo?: { companyName: string; jobTitle: string; location?: string; notes?: string };
  content?: CVContent;
}) {
  const res = await fetch("/api/user/cv/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error ?? "Could not generate the document.");
  }

  const disposition = res.headers.get("Content-Disposition") ?? "";
  const match = disposition.match(/filename="([^"]+)"/);
  const filename = match ? decodeURIComponent(match[1]) : "CV.docx";

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 60_000);

  return filename;
}

export function useCVProfile() {
  const [profile, setProfile] = useState<CVProfile>(cache ?? DEFAULT_CV_PROFILE);
  const [loading, setLoading] = useState(!cache);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;

    (async () => {
      let loaded = await fetchCVProfile();

      const draft = readLocalDraft();
      if (draft && isContentEmpty(loaded.content)) {
        try {
          loaded = await saveCVProfile({ content: draft });
        } catch {}
      }
      if (draft) clearLocalDraft();

      if (alive) {
        setProfile(loaded);
        setLoading(false);
      }
    })();

    return () => { alive = false; };
  }, []);

  const setContent = useCallback((updater: (prev: CVContent) => CVContent) => {
    setProfile((prev) => ({ ...prev, content: updater(prev.content) }));
    setSaved(false);
  }, []);

  const applyPatch = useCallback((patch: Partial<CVProfile>) => {
    setProfile((prev) => ({ ...prev, ...patch }));
    patchCachedCVProfile(patch);
  }, []);

  const save = useCallback(async (override?: { content?: CVContent; primary?: Partial<CVPrimaryFiles> }) => {
    setSaving(true);
    setError("");
    try {
      const next = await saveCVProfile({
        content: override?.content ?? profile.content,
        primary: override?.primary,
      });
      setProfile(next);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      return next;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save your CV.");
      return null;
    } finally {
      setSaving(false);
    }
  }, [profile.content]);

  const reload = useCallback(async () => {
    const next = await fetchCVProfile(true);
    setProfile(next);
    return next;
  }, []);

  return {
    profile, setProfile, setContent, applyPatch,
    save, reload, loading, saving, saved, error,
  };
}
