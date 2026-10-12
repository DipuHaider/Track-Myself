"use client";

import { useId, useRef, useState, type DragEvent, type KeyboardEvent, type ReactNode } from "react";

export type DropZoneProps = {
  accept?: string;
  multiple?: boolean;
  disabled?: boolean;
  busy?: boolean;
  label: string;
  hint?: string;
  className?: string;
  children?: ReactNode;
  onFiles: (files: File[]) => void;
};

/* One drop target for every upload in the app. It is a real button for the
   keyboard (Enter and Space open the picker) and a drop surface for the
   mouse; the hidden input is the only thing that ever holds a file. */
export default function DropZone({
  accept,
  multiple = false,
  disabled = false,
  busy = false,
  label,
  hint,
  className = "",
  children,
  onFiles,
}: DropZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const hintId = useId();
  const inert = disabled || busy;

  const pick = () => {
    if (inert) return;
    inputRef.current?.click();
  };

  const emit = (list: FileList | null) => {
    if (!list || inert) return;
    const files = Array.from(list);
    if (files.length) onFiles(multiple ? files : files.slice(0, 1));
  };

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      pick();
    }
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    emit(e.dataTransfer.files);
  };

  return (
    <div
      role="button"
      tabIndex={inert ? -1 : 0}
      aria-label={label}
      aria-describedby={hint ? hintId : undefined}
      aria-disabled={inert || undefined}
      aria-busy={busy || undefined}
      data-dragging={dragging || undefined}
      className={`dropzone ${className}`}
      onClick={pick}
      onKeyDown={onKey}
      onDragOver={(e) => {
        e.preventDefault();
        if (!inert) setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        className="hidden"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(e) => {
          emit(e.target.files);
          e.target.value = "";
        }}
      />
      {children}
      {hint && (
        <p id={hintId} className="text-muted mt-1 text-xs">
          {hint}
        </p>
      )}
    </div>
  );
}
