"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

type Theme = "dark" | "light" | "system";

function resolveTheme(pref: Theme): "dark" | "light" {
  if (pref !== "system") return pref;
  return window.matchMedia("(prefers-color-scheme: light)").matches
    ? "light"
    : "dark";
}

function applyTheme(pref: Theme) {
  document.documentElement.dataset.theme = resolveTheme(pref);
}

/** Dark / light / system theme switcher persisted in localStorage. */
export function ThemeToggle({ className }: { className?: string }) {
  const [mounted, setMounted] = useState(false);
  const [pref, setPref] = useState<Theme>("dark");
  const [effective, setEffective] = useState<"dark" | "light">("dark");

  useEffect(() => {
    const stored = (localStorage.getItem("tickora-theme") ??
      "system") as Theme;
    setPref(stored);
    applyTheme(stored);
    setEffective(resolveTheme(stored));
    setMounted(true);

    const media = window.matchMedia("(prefers-color-scheme: light)");
    const onChange = () => {
      setPref((current) => {
        if (current === "system") {
          applyTheme("system");
          setEffective(resolveTheme("system"));
        }
        return current;
      });
    };
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  function choose(next: Theme) {
    setPref(next);
    localStorage.setItem("tickora-theme", next);
    applyTheme(next);
    setEffective(resolveTheme(next));
  }

  if (!mounted) {
    return (
      <span
        className={cn("inline-block h-9 w-9", className)}
        aria-hidden="true"
      />
    );
  }

  return (
    <div
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full border border-line bg-surface p-1",
        className,
      )}
      role="group"
      aria-label="Theme"
    >
      {(
        [
          { value: "light", label: "Light", Icon: Sun },
          { value: "dark", label: "Dark", Icon: Moon },
          { value: "system", label: "System", Icon: null },
        ] as const
      ).map(({ value, label, Icon }) => (
        <button
          key={value}
          type="button"
          onClick={() => choose(value)}
          aria-pressed={pref === value}
          title={`${label} theme`}
          className={cn(
            "flex h-7 items-center gap-1.5 rounded-full px-2.5 text-[10.5px] font-semibold transition",
            pref === value
              ? "bg-brand-600 text-white"
              : "text-muted hover:text-ink",
          )}
        >
          {Icon ? <Icon className="h-3.5 w-3.5" /> : null}
          <span className="hidden sm:inline">{label}</span>
        </button>
      ))}
      <span className="sr-only">Current theme: {effective}</span>
    </div>
  );
}
