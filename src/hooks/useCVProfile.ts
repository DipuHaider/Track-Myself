"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
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

const LEGACY_DRAFT_KEY = "trackmyself-cv";
const AUTOSAVE_MS = 1000;

function autosaveKey(userId: string) {
  return `trackmyself-cv-draft:${userId}`;
}

export type Autosave = { content: CVContent; at: string };

export function readAutosave(userId: string): Autosave | null {
  try {
    const raw = localStorage.getItem(autosaveKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Autosave;
    const content = normaliseContent(parsed.content);
    return isContentEmpty(content) ? null : { content, at: parsed.at };
  } catch {
    return null;
  }
}

export function clearAutosave(userId: string) {
  try { localStorage.removeItem(autosaveKey(userId)); } catch {}
}

let cache: CVProfile | null = null;
let inflight: Promise<CVProfile> | null = null;

/* Only the file library is broadcast. Content is edited in place in the CV
   builder, so pushing a whole profile from here would discard unsaved typing. */
const fileListeners = new Set<(files: CVFileMeta[]) => void>();

function emitFiles(files: CVFileMeta[]) {
  fileListeners.forEach((fn) => fn(files));
}

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
  if (patch.uploadedFiles) emitFiles(patch.uploadedFiles);
}

export function subscribeCVFiles(fn: (files: CVFileMeta[]) => void) {
  fileListeners.add(fn);
  return () => { fileListeners.delete(fn); };
}

export async function refreshCVFiles(): Promise<CVFileMeta[]> {
  const res = await fetch("/api/user/cv/files");
  if (!res.ok) throw new Error("Could not refresh your documents.");
  const files = (await res.json()) as CVFileMeta[];
  if (cache) cache = { ...cache, uploadedFiles: files };
  emitFiles(files);
  return files;
}

function readLocalDraft(): CVContent | null {
  try {
    const raw = localStorage.getItem(LEGACY_DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Record<string, string>;
    const content = importFromLegacy(parsed);
    return isContentEmpty(content) ? null : content;
  } catch {
    return null;
  }
}

function clearLocalDraft() {
  try { localStorage.removeItem(LEGACY_DRAFT_KEY); } catch {}
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
  output?: "docx" | "pdf";
  docType?: "cv" | "resume" | "cover-letter";
  appInfo?: {
    companyName: string; jobTitle: string; location?: string; notes?: string;
    jobPostUrl?: string; platform?: string; jobDescription?: string; contactName?: string;
  };
  content?: CVContent;
  letter?: { greeting: string; paragraphs: string[]; closing: string };
  useSources?: boolean;
  /* Set by the review modal: the content was already tailored, so the server must
     not reorder it again or the download stops matching the approved diff. */
  pretailored?: boolean;
  save?: boolean;
  genTailor?: string;
  genNote?: string;
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

  /* The file is already downloaded, so a failed list refresh must not surface
     as a failed generation — My Documents catches up on its next load. */
  await refreshCVFiles().catch(() => {});

  return filename;
}

export function useCVProfile() {
  const { data: session } = useSession();
  const userId = (session?.user as { id?: string } | undefined)?.id ?? "";
  const [profile, setProfile] = useState<CVProfile>(cache ?? DEFAULT_CV_PROFILE);
  const [loading, setLoading] = useState(!cache);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState("");
  const autosaveTimer = useRef<number | null>(null);

  /* While the builder is dirty, a copy of the content lands in localStorage
     under the user's own key once a second, so a crash or an accidental
     reload loses at most that much. Cleared on save. */
  useEffect(() => {
    if (!dirty || !userId) return;
    if (autosaveTimer.current) window.clearTimeout(autosaveTimer.current);
    autosaveTimer.current = window.setTimeout(() => {
      try {
        localStorage.setItem(autosaveKey(userId), JSON.stringify({ content: profile.content, at: new Date().toISOString() }));
      } catch {}
    }, AUTOSAVE_MS);
    return () => { if (autosaveTimer.current) window.clearTimeout(autosaveTimer.current); };
  }, [dirty, profile.content, userId]);

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

  useEffect(
    () =>
      subscribeCVFiles((files) =>
        setProfile((prev) =>
          prev.uploadedFiles === files ? prev : { ...prev, uploadedFiles: files },
        ),
      ),
    [],
  );

  const setContent = useCallback((updater: (prev: CVContent) => CVContent) => {
    setProfile((prev) => ({ ...prev, content: updater(prev.content) }));
    setSaved(false);
    setDirty(true);
  }, []);

  const restoreAutosave = useCallback(() => {
    if (!userId) return false;
    const draft = readAutosave(userId);
    if (!draft) return false;
    setProfile((prev) => ({ ...prev, content: draft.content }));
    setDirty(true);
    return true;
  }, [userId]);

  const discardAutosave = useCallback(() => {
    if (userId) clearAutosave(userId);
  }, [userId]);

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
      setDirty(false);
      if (userId) clearAutosave(userId);
      setTimeout(() => setSaved(false), 3000);
      return next;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save your CV.");
      return null;
    } finally {
      setSaving(false);
    }
  }, [profile.content, userId]);

  const reload = useCallback(async () => {
    const next = await fetchCVProfile(true);
    setProfile(next);
    return next;
  }, []);

  return {
    profile, setProfile, setContent, applyPatch,
    save, reload, loading, saving, saved, error,
    dirty, userId, restoreAutosave, discardAutosave,
    pendingAutosave: userId ? readAutosave(userId) : null,
  };
}
