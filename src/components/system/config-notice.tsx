import { Info } from "lucide-react";
import { isSupabaseConfigured } from "@/lib/env";
import { cn } from "@/lib/utils";

export function ConfigNotice({ className }: { className?: string }) {
  if (isSupabaseConfigured) return null;
  return (
    <div
      className={cn(
        "flex items-start gap-2.5 rounded-xl border border-warning/30 bg-warning/10 px-4 py-3 text-[12px] leading-5 text-warning",
        className,
      )}
    >
      <Info className="mt-0.5 h-4 w-4 shrink-0" />
      <p>
        <span className="font-semibold">Preview catalogue.</span> Supabase is not
        connected, so live events, accounts, bookings and payments are disabled.
        Add your credentials to <span className="font-mono">.env.local</span> and
        run the migrations to activate the platform.
      </p>
    </div>
  );
}

export function DemoBadge({ className }: { className?: string }) {
  if (isSupabaseConfigured) return null;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-warning/30 bg-warning/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-warning",
        className,
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-warning" />
      Sample data
    </span>
  );
}
