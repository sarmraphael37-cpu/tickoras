"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  CalendarRange,
  Home,
  LayoutDashboard,
  LogOut,
  Menu,
  Search,
  Ticket,
  X,
} from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { Avatar } from "@/components/ui/avatar";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Viewer } from "@/lib/domain";

const NAV = [
  { href: "/", label: "Home", icon: Home, exact: true },
  { href: "/events", label: "Discover Events", icon: Search },
  { href: "/categories", label: "Categories", icon: CalendarRange },
  { href: "/how-it-works", label: "How It Works", icon: Ticket },
  { href: "/about", label: "About Us", icon: Home },
  { href: "/contact", label: "Contact", icon: Home },
] as const;

export function SiteHeaderClient({
  viewer,
  dashboardPath,
}: {
  viewer: Pick<Viewer, "fullName" | "avatarUrl" | "roles"> | null;
  dashboardPath: string;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const isOrganizer = Boolean(
    viewer?.roles.includes("organizer") || viewer?.roles.includes("admin"),
  );

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function isActive(href: string, exact?: boolean) {
    return exact
      ? pathname === href
      : pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <>
      <div className="hidden bg-forest text-white sm:block">
        <div className="container-page flex h-8 items-center justify-between text-[10px] uppercase tracking-[0.16em]">
          <p className="text-white/70">Discover. Book. Experience.</p>
          <div className="flex items-center gap-6 text-white/60">
            <span>Buea · Douala · Yaoundé · Limbe</span>
            <Link href="/help" className="transition hover:text-white">
              Support
            </Link>
          </div>
        </div>
      </div>

      <header className="sticky top-0 z-40 border-b border-line/80 glass-strong">
        <div className="container-page flex h-[68px] items-center justify-between gap-5">
          <Logo />

          <nav
            className="hidden items-center gap-0.5 xl:flex"
            aria-label="Main navigation"
          >
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive(item.href, "exact" in item ? item.exact : false) ? "page" : undefined}
                className={cn(
                  "rounded-full px-3 py-2 text-[12.5px] font-medium text-muted transition-colors hover:bg-card hover:text-ink",
                  isActive(item.href, "exact" in item ? item.exact : false) &&
                    "bg-card text-ink shadow-ring",
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <Link
              href="/events"
              className="hidden h-9 w-9 items-center justify-center rounded-full text-muted transition hover:bg-card hover:text-ink md:inline-flex"
              aria-label="Search events"
            >
              <Search className="h-4 w-4" />
            </Link>

            {viewer ? (
              <>
                <Link
                  href={dashboardPath}
                  className={cn(
                    buttonVariants({ variant: "primary", size: "sm" }),
                    "hidden lg:inline-flex",
                  )}
                >
                  <LayoutDashboard className="h-3.5 w-3.5" />
                  My dashboard
                </Link>
                <Link
                  href={dashboardPath}
                  className="lg:hidden"
                  aria-label="Go to your dashboard"
                >
                  <Avatar name={viewer.fullName} src={viewer.avatarUrl} size="sm" />
                </Link>
                <form action="/auth/signout" className="hidden lg:block">
                  <button
                    type="submit"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-line bg-card text-muted transition hover:bg-danger/15 hover:text-danger"
                    aria-label="Sign out"
                  >
                    <LogOut className="h-4 w-4" />
                  </button>
                </form>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="hidden rounded-full px-3 py-2 text-[12.5px] font-medium text-ink transition hover:bg-card lg:inline-flex"
                >
                  Login
                </Link>
                <Link
                  href="/register"
                  className={cn(
                    buttonVariants({ variant: "primary", size: "sm" }),
                    "hidden lg:inline-flex",
                  )}
                >
                  Get Started
                </Link>
              </>
            )}

            {!isOrganizer ? (
              <Link
                href="/register?type=organizer"
                className={cn(
                  buttonVariants({ variant: "outline", size: "sm" }),
                  "hidden xl:inline-flex",
                )}
              >
                Become an Organizer
              </Link>
            ) : null}

            <ThemeToggle />

            <button
              type="button"
              onClick={() => setOpen((value) => !value)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-line bg-card text-ink lg:hidden"
              aria-expanded={open}
              aria-controls="mobile-menu"
              aria-label={open ? "Close menu" : "Open menu"}
            >
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </header>

      {open ? (
        <div className="fixed inset-0 z-30 lg:hidden" id="mobile-menu">
          <button
            type="button"
            className="absolute inset-0 bg-forest/25 backdrop-blur-sm"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
          />
          <div className="glass-strong absolute inset-x-0 top-[68px] max-h-[calc(100vh-68px)] overflow-y-auto border-b px-5 pb-8 pt-4 sm:top-[100px] sm:max-h-[calc(100vh-100px)]">
            <nav className="flex flex-col" aria-label="Mobile navigation">
              {NAV.map((item, index) => (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={
                    isActive(item.href, "exact" in item ? item.exact : false)
                      ? "page"
                      : undefined
                  }
                  className={cn(
                    "flex items-center justify-between border-b border-line/70 py-3.5 text-[15px] font-medium text-ink",
                    isActive(item.href, "exact" in item ? item.exact : false) &&
                      "text-accent-200",
                  )}
                  style={{ animationDelay: `${index * 30}ms` }}
                >
                  <span className="flex items-center gap-3">
                    <item.icon className="h-4 w-4 text-accent-300" strokeWidth={1.8} />
                    {item.label}
                  </span>
                  <span className="text-muted">↗</span>
                </Link>
              ))}
            </nav>

            <div className="mt-5 grid grid-cols-2 gap-3">
              {viewer ? (
                <>
                  <Link
                    href={dashboardPath}
                    className={cn(buttonVariants({ variant: "primary" }), "col-span-2")}
                  >
                    Go to dashboard
                  </Link>
                  {!isOrganizer ? (
                    <Link
                      href="/register?type=organizer"
                      className={cn(
                        buttonVariants({ variant: "outline" }),
                        "col-span-2",
                      )}
                    >
                      Become an Organizer
                    </Link>
                  ) : null}
                  <form action="/auth/signout" className="col-span-2">
                    <button
                      type="submit"
                      className={cn(buttonVariants({ variant: "ghost" }), "w-full")}
                    >
                      <LogOut className="h-4 w-4" />
                      Sign out
                    </button>
                  </form>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    className={buttonVariants({ variant: "outline" })}
                  >
                    Login
                  </Link>
                  <Link
                    href="/register"
                    className={buttonVariants({ variant: "primary" })}
                  >
                    Get Started
                  </Link>
                  <Link
                    href="/register?type=organizer"
                    className={cn(
                      buttonVariants({ variant: "subtle" }),
                      "col-span-2",
                    )}
                  >
                    Become an Organizer
                  </Link>
                </>
              )}
            </div>

            <p className="mt-6 flex items-center gap-2 text-[11px] uppercase tracking-[0.14em] text-muted">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
              Buea · Douala · Yaoundé · Limbe
            </p>
          </div>
        </div>
      ) : null}
    </>
  );
}
