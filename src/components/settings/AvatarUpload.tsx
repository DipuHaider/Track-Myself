"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Camera, Loader2, Trash2 } from "lucide-react";
import DropZone from "@/components/shared/DropZone";
import RoleAvatar from "@/components/shared/RoleAvatar";
import { apiFetch, ApiError } from "@/lib/api/client";
import { CATEGORY_MAX_BYTES, IMAGE_MIME_TYPES } from "@/lib/cvFileTypes";
import { refreshProfile } from "@/hooks/useProfile";

type FileRow = { _id: string; category: string; uploadedAt?: string; createdAt?: string };

function toBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => {
      const result = String(reader.result ?? "");
      resolve(result.slice(result.indexOf(",") + 1));
    };
    reader.readAsDataURL(file);
  });
}

export default function AvatarUpload({
  name, image, role, plan,
}: { name: string; image: string; role: string; plan: string }) {
  const { update } = useSession();
  const [busy, setBusy] = useState(false);
  const maxBytes = CATEGORY_MAX_BYTES["profile-photo"];

  const setImage = async (value: string) => {
    await apiFetch("/api/user/profile", { method: "PATCH", json: { image: value } });
    await refreshProfile();
    await update();
  };

  const upload = async (files: File[]) => {
    const file = files[0];
    if (!file) return;
    if (!(IMAGE_MIME_TYPES as readonly string[]).includes(file.type)) {
      toast.error("Use a PNG, JPEG or WebP image.");
      return;
    }
    if (file.size > maxBytes) {
      toast.error(`Images must be under ${Math.round(maxBytes / (1024 * 1024))} MB.`);
      return;
    }
    setBusy(true);
    try {
      const data = await toBase64(file);
      const rows = await apiFetch<FileRow[]>("/api/user/cv/files", {
        method: "POST",
        json: { name: file.name, mimeType: file.type, data, category: "profile-photo" },
      });
      const photo = [...rows].reverse().find((r) => r.category === "profile-photo");
      if (!photo) throw new Error("The upload did not come back.");
      await setImage(`/api/user/cv/files/${photo._id}/raw`);
      toast.success("Profile photo updated.");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not upload that photo.");
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      await setImage("");
      toast.success("Profile photo removed.");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not remove the photo.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-4">
      <RoleAvatar name={name} image={image} role={role} plan={plan} size={72} />
      <div className="min-w-0 flex-1">
        <DropZone
          accept={IMAGE_MIME_TYPES.join(",")}
          busy={busy}
          label="Upload a profile photo"
          hint={`PNG, JPEG or WebP, up to ${Math.round(maxBytes / (1024 * 1024))} MB. It is also used as the photo on your Designer CV.`}
          className="px-4 py-3"
          onFiles={upload}
        >
          <span className="flex items-center gap-2 text-sm font-medium">
            {busy ? <Loader2 size={15} className="animate-spin" aria-hidden="true" /> : <Camera size={15} aria-hidden="true" />}
            {busy ? "Uploading…" : "Drop a photo here or press to choose one"}
          </span>
        </DropZone>
        {image && (
          <button
            type="button"
            onClick={remove}
            disabled={busy}
            className="text-muted mt-2 inline-flex items-center gap-1.5 text-xs hover:text-[var(--danger)] disabled:opacity-60"
          >
            <Trash2 size={12} aria-hidden="true" />
            Remove photo
          </button>
        )}
      </div>
    </div>
  );
}
