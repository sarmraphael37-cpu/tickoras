"use client";

import { useId, useRef, useState } from "react";
import { ImagePlus, Loader2, Trash2, UploadCloud } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/env";
import { cn } from "@/lib/utils";

const MAX_BYTES = {
  "event-media": 5 * 1024 * 1024,
  "profile-avatars": 2 * 1024 * 1024,
  "category-media": 2 * 1024 * 1024,
} as const;

export function ImageUpload({
  bucket,
  folder,
  name,
  defaultValue = "",
  label = "Image",
  hint,
  className,
  previewClassName,
}: {
  bucket: "event-media" | "profile-avatars" | "category-media";
  folder: string;
  name: string;
  defaultValue?: string | null;
  label?: string;
  hint?: string;
  className?: string;
  previewClassName?: string;
}) {
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState(defaultValue ?? "");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setError(null);
    if (!file.type.startsWith("image/")) {
      setError("Choose a JPG, PNG, WebP or AVIF image.");
      return;
    }
    if (file.size > MAX_BYTES[bucket]) {
      setError(
        `This image is too large. Maximum ${Math.round(MAX_BYTES[bucket] / 1024 / 1024)} MB.`,
      );
      return;
    }

    setUploading(true);
    try {
      const supabase = createClient();
      const extension =
        file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") ||
        "jpg";
      const path = `${folder}/${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 8)}.${extension}`;
      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(path, file, {
          cacheControl: "3600",
          contentType: file.type,
          upsert: false,
        });
      if (uploadError) {
        setError(uploadError.message);
        return;
      }
      const { data } = supabase.storage.from(bucket).getPublicUrl(path);
      setValue(data.publicUrl);
    } catch {
      setError("Upload failed. Check your connection and try again.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className={className}>
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <label htmlFor={id} className="text-[13px] font-medium text-ink">
          {label}
        </label>
        {value ? (
          <button
            type="button"
            onClick={() => setValue("")}
            className="inline-flex items-center gap-1 text-[10.5px] font-medium text-danger hover:underline"
          >
            <Trash2 className="h-3 w-3" />
            Remove
          </button>
        ) : null}
      </div>

      <input type="hidden" name={name} value={value} />

      {value ? (
        <div
          className={cn(
            "relative overflow-hidden rounded-xl border border-line bg-surface",
            previewClassName,
          )}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="" className="h-full w-full object-cover" />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="absolute inset-x-3 bottom-3 rounded-full glass-strong px-3 py-1.5 text-[10.5px] font-semibold text-ink shadow-card backdrop-blur"
          >
            Replace image
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={!isSupabaseConfigured || uploading}
          className={cn(
            "flex w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-line bg-surface px-4 py-6 text-center transition hover:border-brand-300 hover:bg-brand-50/40 disabled:cursor-not-allowed disabled:opacity-60",
            previewClassName,
          )}
        >
          {uploading ? (
            <Loader2 className="h-5 w-5 animate-spin text-accent-300" />
          ) : (
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-card text-accent-300 shadow-card">
              <ImagePlus className="h-4 w-4" />
            </span>
          )}
          <span className="inline-flex items-center gap-1.5 text-[11.5px] font-semibold text-ink">
            <UploadCloud className="h-3.5 w-3.5" />
            {uploading ? "Uploading…" : "Upload image"}
          </span>
          <span className="text-[10.5px] leading-4 text-muted">
            {isSupabaseConfigured
              ? "JPG, PNG, WebP or AVIF"
              : "Connect Supabase to upload images"}
          </span>
        </button>
      )}

      <input
        ref={inputRef}
        id={id}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif"
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void handleFile(file);
        }}
      />

      {error ? <p className="mt-1.5 text-xs font-medium text-danger">{error}</p> : null}
      {hint && !error ? (
        <p className="mt-1.5 text-[10.5px] leading-4 text-muted">{hint}</p>
      ) : null}
    </div>
  );
}
