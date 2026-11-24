"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  History,
  LayoutGrid,
  ScanLine,
  Ticket,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/scanner", label: "Overview", icon: LayoutGrid, exact: true },
  { href: "/scanner/events", label: "Events", icon: Ticket },
  { href: "/scanner/scan", label: "Scan", icon: ScanLine },
  { href: "/scanner/history", label: "History", icon: History },
  { href: "/scanner/profile", label: "Profile", icon: User },
];

export function ScannerNav() {
  const pathname = usePathname();
  return (
    <nav
      className="no-scrollbar flex gap-1 overflow-x-auto px-4 sm:px-6 lg:px-8"
      aria-label="Scanner navigation"
    >
      {ITEMS.map((item) => {
        const active = item.exact
          ? pathname === item.href
          : pathname === item.href || pathname.startsWith(`${item.href}/`);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-[12px] font-semibold transition",
              active
                ? "bg-brand-600 text-white shadow-glow"
                : "text-muted hover:bg-surface hover:text-ink",
            )}
          >
            <Icon className="h-3.5 w-3.5" strokeWidth={2} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
