"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { updateFieldAction } from "@/lib/world/actions";

export function MapBaseImageUpload({ mapId, hasImage }: { mapId: number; hasImage: boolean }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("alt", file.name.replace(/\.[^.]+$/, ""));

      const res = await fetch("/api/media", { method: "POST", body: formData });
      if (!res.ok) throw new Error((await res.text()) || "Upload failed");
      const media = await res.json() as { id: number; width?: number; height?: number };

      await updateFieldAction("maps", mapId, "baseImageId", media.id);
      if (media.width) await updateFieldAction("maps", mapId, "imageWidth", media.width);
      if (media.height) await updateFieldAction("maps", mapId, "imageHeight", media.height);
      router.refresh();
    } catch (err) {
      setError(String(err));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        disabled={uploading}
        className="rounded border px-2 py-1 text-xs hover:bg-accent disabled:opacity-50"
      >
        {uploading ? "Uploading..." : hasImage ? "Replace base image" : "Upload base image"}
      </button>
      <input ref={fileRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
      {error && <span className="text-xs text-destructive">{error}</span>}
    </div>
  );
}
