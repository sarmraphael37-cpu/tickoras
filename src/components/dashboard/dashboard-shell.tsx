"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  BarChart3,
  Bell,
  CalendarDays,
  CalendarRange,
  ChevronDown,
  ChevronRight,
  ClipboardCheck,
  CreditCard,
  ExternalLink,
  FileText,
  Flag,
  Home,
  Inbox,
  LayoutDashboard,
  LifeBuoy,
  LogOut,
  Menu,
  MessageSquare,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  QrCode,
  ScanLine,
  Search,
  Settings,
  ShieldCheck,
  Store,
  Ticket,
  TrendingUp,
  User,
  Users,
  Wallet,
  X,
  type LucideIcon,
} from "lucide-react";
import { LogoMark } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

type Variant = "attendee" | "organizer" | "admin" | "provider";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const NAV: Record<Variant, NavGroup[]> = {
  attendee: [
    {
      label: "Your TICKORA",
      items: [
        { href: "/attendee", label: "Overview", icon: Home, exact: true },
        { href: "/attendee/bookings", label: "My Bookings", icon: CalendarDays },
        { href: "/attendee/tickets", label: "My Tickets", icon: Ticket },
        { href: "/attendee/payments", label: "Payments", icon: CreditCard },
      ],
    },
    {
      label: "Account",
      items: [
        { href: "/attendee/notifications", label: "Notifications", icon: Bell },
        { href: "/attendee/profile", label: "My Profile", icon: User },
        { href: "/attendee/settings", label: "Settings", icon: Settings },
      ],
    },
    {
      label: "Explore",
      items: [
        { href: "/events", label: "Discover Events", icon: CalendarRange },
        { href: "/help", label: "Help Centre", icon: LifeBuoy },
      ],
    },
  ],
  organizer: [
    {
      label: "Workspace",
      items: [
        { href: "/organizer", label: "Overview", icon: Home, exact: true },
        { href: "/organizer/events", label: "My Events", icon: CalendarDays },
        { href: "/organizer/events/create", label: "Create Event", icon: Plus },
        { href: "/organizer/bookings", label: "Bookings", icon: Ticket },
        { href: "/organizer/attendees", label: "Attendees", icon: Users },
        { href: "/organizer/tickets", label: "Ticket Management", icon: QrCode },
      ],
    },
    {
      label: "Operations",
      items: [
        { href: "/organizer/check-ins", label: "Check-ins", icon: ScanLine },
        { href: "/organizer/analytics", label: "Analytics", icon: BarChart3 },
        { href: "/organizer/revenue", label: "Revenue", icon: TrendingUp },
        { href: "/organizer/payouts", label: "Payouts", icon: Wallet },
        { href: "/organizer/scanners", label: "Scanner Management", icon: ShieldCheck },
        { href: "/organizer/services", label: "Service Marketplace", icon: Store },
      ],
    },
    {
      label: "Account",
      items: [
        { href: "/organizer/notifications", label: "Notifications", icon: Bell },
        { href: "/organizer/profile", label: "Organization Profile", icon: User },
        { href: "/organizer/settings", label: "Settings", icon: Settings },
      ],
    },
  ],
  provider: [
    {
      label: "Workspace",
      items: [
        { href: "/provider", label: "Overview", icon: Home, exact: true },
        { href: "/provider/bookings", label: "Booking Requests", icon: ClipboardCheck },
        { href: "/provider/profile", label: "Profile & Portfolio", icon: User },
      ],
    },
    {
      label: "Marketplace",
      items: [
        { href: "/services", label: "Browse Marketplace", icon: Search },
        { href: "/events", label: "Discover Events", icon: CalendarRange },
      ],
    },
  ],
  admin: [
    {
      label: "Platform",
      items: [
        { href: "/admin", label: "Overview", icon: LayoutDashboard, exact: true },
        { href: "/admin/users", label: "Users", icon: User },
        { href: "/admin/organizers", label: "Organizers", icon: Users },
        { href: "/admin/events/pending", label: "Event Approvals", icon: ClipboardCheck },
        { href: "/admin/events", label: "All Events", icon: CalendarDays },
        { href: "/admin/categories", label: "Categories", icon: CalendarRange },
      ],
    },
    {
      label: "Transactions",
      items: [
        { href: "/admin/bookings", label: "Bookings", icon: Ticket },
        { href: "/admin/payments", label: "Payments", icon: CreditCard },
        { href: "/admin/refunds", label: "Refunds", icon: Flag },
        { href: "/admin/tickets", label: "Tickets", icon: QrCode },
        { href: "/admin/check-ins", label: "Check-ins", icon: ScanLine },
        { href: "/admin/payouts", label: "Payouts", icon: Wallet },
      ],
    },
    {
      label: "Operations",
      items: [
        { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
        { href: "/admin/reports", label: "Reports", icon: FileText },
        { href: "/admin/notifications", label: "Notifications", icon: Bell },
        { href: "/admin/audit-logs", label: "Audit Logs", icon: MessageSquare },
        { href: "/admin/settings", label: "Platform Settings", icon: Settings },
      ],
    },
  ],
};

const NOTIFICATION_PATH: Record<Variant, string> = {
  attendee: "/attendee/notifications",
  organizer: "/organizer/notifications",
  admin: "/admin",
  provider: "/provider",
};

const PROFILE_PATH: Record<Variant, string> = {
  attendee: "/attendee/profile",
  organizer: "/organizer/profile",
  admin: "/admin",
  provider: "/provider/profile",
};

const SETTINGS_PATH: Record<Variant, string> = {
  attendee: "/attendee/settings",
  organizer: "/organizer/settings",
  admin: "/admin/settings",
  provider: "/provider/profile",
};

interface RecentNotification {
  id: string;
  title: string;
  body: string;
  created_at: string;
  href: string | null;
  read_at: string | null;
}

export function DashboardShell({
  variant,
  viewer,
  organizerStatus,
  organizerName,
  unreadCount = 0,
  recentNotifications = [],
  children,
}: {
  variant: Variant;
  viewer: { fullName: string; email: string; avatarUrl: string | null };
  organizerStatus?: string | null;
  organizerName?: string | null;
  unreadCount?: number;
  recentNotifications?: RecentNotification[];
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement | null>(null);
  const notificationsRef = useRef<HTMLDivElement | null>(null);
  const groups = NAV[variant];
  const visuallyCollapsed = collapsed && !open;

  useEffect(() => {
    const stored = window.localStorage.getItem("tickora.dashboard.collapsed");
    if (stored === "true") setCollapsed(true);
  }, []);

  function toggleCollapsed() {
    setCollapsed((value) => {
      window.localStorage.setItem(
        "tickora.dashboard.collapsed",
        value ? "false" : "true",
      );
      return !value;
    });
  }

  useEffect(() => {
    setOpen(false);
    setProfileOpen(false);
    setNotificationsOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setProfileOpen(false);
      }
      if (
        notificationsRef.current &&
        !notificationsRef.current.contains(event.target as Node)
      ) {
        setNotificationsOpen(false);
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setProfileOpen(false);
        setNotificationsOpen(false);
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  const activeItem = groups
    .flatMap((group) => group.items)
    .filter((item) =>
      item.exact ? pathname === item.href : pathname.startsWith(item.href),
    )
    .sort((a, b) => b.href.length - a.href.length)[0];

  const roleLabel =
    variant === "admin"
      ? "Administrator"
      : variant === "organizer"
        ? "Organizer"
        : variant === "provider"
          ? "Service Provider"
          : "Attendee";

  return (
    <div className="min-h-screen bg-surface">
      {/* Sidebar */}
      <aside
        className={cn(
          "glass-strong fixed inset-y-0 left-0 z-50 flex flex-col border-r transition-[width,transform] duration-300 print:hidden",
          open ? "w-[268px] translate-x-0" : "w-[268px] -translate-x-full",
          !open && collapsed && "lg:w-[76px]",
          !open && !collapsed && "lg:w-[268px]",
          !open && "lg:translate-x-0",
        )}
      >
        <div className="flex h-16 items-center justify-between border-b border-line px-4">
          <Link href="/" className="flex items-center gap-2.5" aria-label="TICKORA home">
            <LogoMark className="h-8 w-8 shrink-0" />
            {!visuallyCollapsed ? (
              <span className="text-[15px] font-semibold tracking-[0.14em] text-ice">
                TICKORA
              </span>
            ) : null}
          </Link>
          <button
            type="button"
            className="hidden h-8 w-8 items-center justify-center rounded-full text-muted hover:bg-brand-50 lg:inline-flex"
            onClick={toggleCollapsed}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? (
              <PanelLeftOpen className="h-4 w-4" />
            ) : (
              <PanelLeftClose className="h-4 w-4" />
            )}
          </button>
          <button
            type="button"
            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted hover:bg-brand-50 lg:hidden"
            onClick={() => setOpen(false)}
            aria-label="Close menu"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="border-b border-line px-3 py-4">
          <div
            className={cn(
              "flex items-center gap-3 rounded-xl bg-surface p-2.5",
              visuallyCollapsed && "justify-center px-0",
            )}
          >
            <Avatar name={viewer.fullName} src={viewer.avatarUrl} size="sm" />
            {!visuallyCollapsed ? (
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12.5px] font-semibold text-ink">
                  {organizerName || viewer.fullName}
                </p>
                <p className="truncate text-[10.5px] text-muted">
                  {organizerStatus
                    ? `${roleLabel} · ${organizerStatus.replace("_", " ")}`
                    : roleLabel}
                </p>
              </div>
            ) : null}
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Dashboard navigation">
          {groups.map((group) => (
            <div key={group.label} className="mb-5">
              {!visuallyCollapsed ? (
                <p className="px-2.5 pb-1.5 text-[9.5px] font-semibold uppercase tracking-[0.16em] text-muted">
                  {group.label}
                </p>
              ) : (
                <div className="mx-2 mb-2 h-px bg-line" />
              )}
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const active = item.exact
                    ? pathname === item.href
                    : pathname === item.href ||
                      pathname.startsWith(`${item.href}/`);
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      title={visuallyCollapsed ? item.label : undefined}
                      className={cn(
                        "group flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[12.5px] font-medium transition-colors",
                        visuallyCollapsed && "justify-center",
                        active
                          ? "bg-brand-600/15 text-ink shadow-[inset_3px_0_0_#3B82F6]"
                          : "text-muted hover:bg-surface hover:text-ink",
                      )}
                    >
                      <Icon
                        className={cn(
                          "h-4 w-4 shrink-0",
                          active ? "text-accent-300" : "text-muted",
                        )}
                        strokeWidth={1.8}
                      />
                      {!visuallyCollapsed ? (
                        <>
                          <span className="flex-1 truncate">{item.label}</span>
                          {active ? (
                            <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
                          ) : null}
                        </>
                      ) : null}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t border-line p-3">
          <Link
            href="/events"
            title={visuallyCollapsed ? "Discover events" : undefined}
            className={cn(
              "flex items-center gap-2 rounded-lg px-2.5 py-2 text-[12px] font-medium text-muted hover:bg-surface hover:text-ink",
              visuallyCollapsed && "justify-center",
            )}
          >
            <ExternalLink className="h-3.5 w-3.5 shrink-0" />
            {!visuallyCollapsed ? "Discover events" : null}
          </Link>
          <form action="/auth/signout">
            <button
              type="submit"
              title={visuallyCollapsed ? "Sign out" : undefined}
              className={cn(
                "flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[12px] font-medium text-muted hover:bg-danger/15 hover:text-danger",
                visuallyCollapsed && "justify-center",
              )}
            >
              <LogOut className="h-3.5 w-3.5 shrink-0" />
              {!visuallyCollapsed ? "Sign out" : null}
            </button>
          </form>
        </div>
      </aside>

      {open ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-forest/25 backdrop-blur-sm lg:hidden"
          onClick={() => setOpen(false)}
          aria-label="Close navigation"
        />
      ) : null}

      {/* Main */}
      <div
        className={cn(
          "transition-[padding] duration-300",
          collapsed ? "lg:pl-[76px]" : "lg:pl-[268px]",
        )}
      >
        <header className="glass-strong sticky top-0 z-30 border-b print:hidden">
          <div className="flex h-16 items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                onClick={() => setOpen(true)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-card text-ink lg:hidden"
                aria-label="Open menu"
              >
                <Menu className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={toggleCollapsed}
                className="hidden h-9 w-9 items-center justify-center rounded-lg border border-line bg-card text-ink lg:inline-flex"
                aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              >
                {collapsed ? (
                  <PanelLeftOpen className="h-4 w-4" />
                ) : (
                  <PanelLeftClose className="h-4 w-4" />
                )}
              </button>
              <div className="hidden items-center gap-1.5 text-[11px] text-muted sm:flex">
                <span className="uppercase tracking-[0.14em]">{roleLabel}</span>
                <ChevronRight className="h-3 w-3" />
                <span className="font-medium text-ink">
                  {activeItem?.label ?? "Dashboard"}
                </span>
              </div>
              <span className="truncate text-[13px] font-semibold text-ink sm:hidden">
                {activeItem?.label ?? "Dashboard"}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <form action="/events" method="get" role="search" className="hidden xl:block">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-faint" />
                  <input
                    name="q"
                    type="search"
                    placeholder="Search events"
                    aria-label="Search events"
                    className="h-9 w-52 rounded-full border border-line bg-base pl-8 pr-3 text-[12px] text-ink placeholder:text-faint focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/25"
                  />
                </div>
              </form>
              {variant === "organizer" ? (
                <Link
                  href="/organizer/events/create"
                  className="hidden items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-[11px] font-semibold text-white transition hover:bg-brand-700 md:inline-flex"
                >
                  <Plus className="h-3.5 w-3.5" />
                  New event
                </Link>
              ) : null}
              <Link
                href={variant === "admin" ? "/admin/approvals" : "/events"}
                className="hidden items-center gap-1.5 rounded-full border border-line bg-card px-3 py-1.5 text-[11px] font-medium text-muted transition hover:text-ink sm:flex"
              >
                <LifeBuoy className="h-3.5 w-3.5" />
                {variant === "admin" ? "Approval queue" : "Help"}
              </Link>
              <ThemeToggle />
              <div className="relative" ref={notificationsRef}>
                <button
                  type="button"
                  onClick={() => setNotificationsOpen((value) => !value)}
                  className="relative inline-flex h-9 w-9 items-center justify-center rounded-full border border-line bg-card text-muted transition hover:text-ink"
                  aria-label={
                    unreadCount > 0
                      ? `Notifications, ${unreadCount} unread`
                      : "Notifications"
                  }
                  aria-expanded={notificationsOpen}
                  aria-haspopup="menu"
                >
                  <Bell className="h-4 w-4" />
                  {unreadCount > 0 ? (
                    <span className="absolute -right-1 -top-1 inline-flex min-w-[17px] items-center justify-center rounded-full bg-brand-600 px-1 text-[9px] font-bold text-white ring-2 ring-base">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  ) : null}
                </button>
                {notificationsOpen ? (
                  <div
                    className="absolute right-0 top-12 z-50 w-[320px] animate-dropdown-in glass-strong overflow-hidden rounded-xl"
                    role="menu"
                  >
                    <div className="flex items-center justify-between border-b border-line px-4 py-3">
                      <p className="text-[12px] font-semibold text-ink">
                        Notifications
                      </p>
                      <span className="text-[10px] text-muted">
                        {unreadCount} unread
                      </span>
                    </div>
                    <div className="max-h-[320px] overflow-y-auto">
                      {recentNotifications.length === 0 ? (
                        <p className="px-4 py-8 text-center text-[11.5px] text-muted">
                          You are all caught up.
                        </p>
                      ) : (
                        recentNotifications.map((item) => (
                          <Link
                            key={item.id}
                            href={item.href ?? NOTIFICATION_PATH[variant]}
                            className="block border-b border-line/70 px-4 py-3 transition hover:bg-surface"
                            role="menuitem"
                          >
                            <p className="flex items-center gap-1.5 text-[11.5px] font-medium text-ink">
                              {!item.read_at ? (
                                <span className="h-1.5 w-1.5 rounded-full bg-brand-400" />
                              ) : null}
                              {item.title}
                            </p>
                            <p className="mt-1 line-clamp-2 text-[10.5px] leading-4 text-muted">
                              {item.body}
                            </p>
                          </Link>
                        ))
                      )}
                    </div>
                    <Link
                      href={NOTIFICATION_PATH[variant]}
                      className="block px-4 py-3 text-center text-[11px] font-semibold text-accent-300 transition hover:bg-surface"
                      role="menuitem"
                    >
                      View all notifications
                    </Link>
                  </div>
                ) : null}
              </div>

              <div className="relative" ref={profileRef}>
                <button
                  type="button"
                  onClick={() => setProfileOpen((value) => !value)}
                  className="flex items-center gap-1.5 rounded-full border border-line bg-card py-1 pl-1 pr-2 transition hover:border-brand-300"
                  aria-expanded={profileOpen}
                  aria-haspopup="menu"
                  aria-label="Open profile menu"
                >
                  <Avatar name={viewer.fullName} src={viewer.avatarUrl} size="xs" />
                  <ChevronDown className="h-3 w-3 text-muted" />
                </button>
                {profileOpen ? (
                  <div
                    className="absolute right-0 top-12 z-50 w-56 animate-dropdown-in glass-strong overflow-hidden rounded-xl"
                    role="menu"
                  >
                    <div className="border-b border-line px-4 py-3">
                      <p className="truncate text-[12px] font-semibold text-ink">
                        {viewer.fullName}
                      </p>
                      <p className="mt-0.5 truncate text-[10px] text-muted">
                        {viewer.email}
                      </p>
                    </div>
                    <Link
                      href={PROFILE_PATH[variant]}
                      className="flex items-center gap-2 px-4 py-2.5 text-[12px] text-muted transition hover:bg-brand-50 hover:text-ink"
                      role="menuitem"
                    >
                      <User className="h-3.5 w-3.5" />
                      My profile
                    </Link>
                    <Link
                      href={SETTINGS_PATH[variant]}
                      className="flex items-center gap-2 px-4 py-2.5 text-[12px] text-muted transition hover:bg-brand-50 hover:text-ink"
                      role="menuitem"
                    >
                      <Settings className="h-3.5 w-3.5" />
                      Settings
                    </Link>
                    <Link
                      href="/events"
                      className="flex items-center gap-2 px-4 py-2.5 text-[12px] text-muted transition hover:bg-brand-50 hover:text-ink"
                      role="menuitem"
                    >
                      <Ticket className="h-3.5 w-3.5" />
                      Discover events
                    </Link>
                    <form action="/auth/signout">
                      <button
                        type="submit"
                        className="flex w-full items-center gap-2 border-t border-line px-4 py-2.5 text-left text-[12px] text-danger transition hover:bg-danger/15"
                        role="menuitem"
                      >
                        <LogOut className="h-3.5 w-3.5" />
                        Sign out
                      </button>
                    </form>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </header>

        <main className="relative mx-auto w-full max-w-[1280px] bg-[radial-gradient(ellipse_at_top_right,rgba(37,99,235,0.05),transparent_45%)] px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}
