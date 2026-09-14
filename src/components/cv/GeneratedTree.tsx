"use client";

import { useMemo, useState } from "react";
import {
  ChevronRight, Download, Eye, FileText, Folder, FolderOpen, Loader2, Pencil, Trash2,
} from "lucide-react";
import { buildGeneratedTree, type TreeNode } from "@/lib/cv/generatedTree";
import { fileTypeLabel } from "@/lib/cvFileTypes";
import SavedCVModal from "./SavedCVModal";
import DocEditModal from "./DocEditModal";
import type { CVFileMeta } from "@/types/cv";

const FORMAT_NAME: Record<string, string> = {
  ats: "ATS", europass: "Europass", designer: "Designer", lebenslauf: "Lebenslauf",
};

function describe(file: CVFileMeta) {
  if (file.genDocType === "cover-letter") return "Cover letter";
  if (file.genDocType === "resume") return "Tailored resume";
  const base = FORMAT_NAME[file.genFormat ?? ""] ?? "CV";
  return file.genVariant === "compact" ? `${base} Compact` : base;
}

function kb(bytes: number) {
  return bytes < 1024 * 1024 ? `${Math.round(bytes / 1024)} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function Branch({
  node,
  depth,
  defaultOpen,
  onView,
  onEdit,
  onDelete,
  busyId,
}: {
  node: TreeNode;
  depth: number;
  defaultOpen: boolean;
  onView: (file: CVFileMeta) => void;
  onEdit: (file: CVFileMeta) => void;
  onDelete: (file: CVFileMeta) => void;
  busyId: string | null;
}) {
  const isLeaf = node.files.length > 0;

  return (
    <details open={defaultOpen} className="group">
      <summary
        className="flex cursor-pointer list-none items-center gap-2 rounded-md px-2 py-1.5 transition hover:bg-[var(--surface-2)]"
        style={{ paddingLeft: `${depth * 14 + 8}px` }}
      >
        <ChevronRight
          size={13}
          aria-hidden="true"
          className="text-muted shrink-0 transition-transform group-open:rotate-90"
        />
        <span className="shrink-0" style={{ color: depth === 0 ? "var(--primary)" : undefined }} aria-hidden="true">
          {depth === 0
            ? <span className="group-open:hidden"><Folder size={14} /></span>
            : null}
          {depth === 0
            ? <span className="hidden group-open:inline"><FolderOpen size={14} /></span>
            : <Folder size={13} className="text-muted" />}
        </span>
        <span className={depth === 0 ? "text-sm font-semibold" : "text-xs font-medium"}>{node.label}</span>
        <span
          className="text-muted rounded-full px-1.5 text-[10px] font-semibold"
          style={{ background: "var(--surface-2)" }}
        >
          {node.count}
        </span>
      </summary>

      {isLeaf ? (
        <ul className="space-y-1 py-1" role="list">
          {node.files.map((file) => (
            <li
              key={file._id}
              className="flex flex-wrap items-center gap-2 rounded-lg border px-3 py-2"
              style={{ marginLeft: `${(depth + 1) * 14 + 8}px` }}
            >
              <FileText size={15} className="text-muted shrink-0" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium">{file.name}</p>
                <p className="text-muted text-[11px]">
                  {[describe(file), file.genFor, fileTypeLabel(file.mimeType, file.name), kb(file.size)]
                    .filter(Boolean).join(" · ")}
                </p>
              </div>

              <div className="flex items-center gap-0.5">
                <button
                  type="button"
                  onClick={() => onView(file)}
                  title="View"
                  className="text-muted rounded-md p-1.5 transition hover:bg-[var(--surface-2)] hover:text-foreground"
                >
                  <Eye size={14} />
                </button>
                <a
                  href={`/api/user/cv/files/${file._id}/raw?download=1`}
                  title="Download"
                  className="text-muted rounded-md p-1.5 transition hover:bg-[var(--surface-2)] hover:text-foreground"
                >
                  <Download size={14} />
                </a>
                <button
                  type="button"
                  onClick={() => onEdit(file)}
                  title="Edit the text and re-render"
                  data-edit={file._id}
                  className="text-muted rounded-md p-1.5 transition hover:bg-[var(--surface-2)] hover:text-foreground"
                >
                  <Pencil size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(file)}
                  disabled={busyId === file._id}
                  title="Delete"
                  className="text-muted rounded-md p-1.5 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
                >
                  {busyId === file._id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div className="space-y-0.5">
          {/* Only the newest path opens, so the latest work is one glance away
              while the folder structure the user asked for stays intact. */}
          {node.children.map((child, i) => (
            <Branch
              key={child.key}
              node={child}
              depth={depth + 1}
              defaultOpen={i === 0}
              onView={onView}
              onEdit={onEdit}
              onDelete={onDelete}
              busyId={busyId}
            />
          ))}
        </div>
      )}
    </details>
  );
}

export default function GeneratedTree({
  files,
  onDeleted,
}: {
  files: CVFileMeta[];
  onDeleted: (id: string) => void;
}) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [viewing, setViewing] = useState<CVFileMeta | null>(null);
  const [editing, setEditing] = useState<CVFileMeta | null>(null);

  const tree = useMemo(() => buildGeneratedTree(files), [files]);

  async function remove(file: CVFileMeta) {
    if (!confirm(`Delete "${file.name}"?`)) return;
    setBusyId(file._id);
    setError("");
    try {
      const res = await fetch(`/api/user/cv/files/${file._id}`, { method: "DELETE" });
      if (!res.ok) {
        setError("Could not delete that document.");
        return;
      }
      onDeleted(file._id);
    } finally {
      setBusyId(null);
    }
  }

  if (!files.length) {
    return (
      <div className="glass rounded-xl px-6 py-10 text-center">
        <FileText size={22} className="text-muted mx-auto mb-2" aria-hidden="true" />
        <p className="text-sm font-medium">Nothing generated yet.</p>
        <p className="text-muted mt-1 text-xs">
          Documents you generate from the CV Builder or an application land here, filed by type and date.
        </p>
      </div>
    );
  }

  return (
    <div className="glass space-y-1 rounded-xl p-3">
      {error && <p className="px-2 text-xs text-red-600">{error}</p>}

      {tree.map((folder) => (
        <Branch
          key={folder.key}
          node={folder}
          depth={0}
          defaultOpen
          onView={setViewing}
          onEdit={setEditing}
          onDelete={remove}
          busyId={busyId}
        />
      ))}

      {viewing && (
        <SavedCVModal files={[viewing]} onClose={() => setViewing(null)} />
      )}

      {editing && (
        <DocEditModal
          file={editing}
          onClose={() => setEditing(null)}
          onSaved={() => setEditing(null)}
        />
      )}
    </div>
  );
}
