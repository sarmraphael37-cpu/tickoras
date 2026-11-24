"use client";

import { useState } from "react";
import { Check, Share2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function ShareButton({ title }: { title: string }) {
  const [copied, setCopied] = useState(false);

  async function share() {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // User cancelled or clipboard is unavailable — no false success shown.
    }
  }

  return (
    <button
      type="button"
      onClick={share}
      className="inline-flex h-9 items-center gap-1.5 rounded-full border border-line bg-card px-3 text-[11px] font-medium text-muted transition hover:border-brand-200 hover:text-ink"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-accent-300" /> : <Share2 className="h-3.5 w-3.5" />}
      {copied ? "Link copied" : "Share"}
    </button>
  );
}
