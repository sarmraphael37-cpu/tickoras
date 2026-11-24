import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  CalendarCheck2,
  Check,
  CreditCard,
  QrCode,
  Search,
  ShieldCheck,
  Ticket,
  Users,
} from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { PageHero } from "@/components/page-hero";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "How TICKORA works",
  description:
    "Discover an event, select tickets, pay securely, receive a QR ticket and attend. For organizers: register, create, submit for approval, sell and manage attendees.",
  openGraph: {
    title: "How TICKORA works",
    description:
      "The simplest way to discover events, book tickets and host experiences in Cameroon.",
    type: "website",
  },
};

const attendeeSteps = [
  {
    icon: Search,
    title: "Discover an event",
    copy: "Search by keyword, category, city, date or price. Filter the live calendar until something feels right.",
  },
  {
    icon: Ticket,
    title: "Select tickets",
    copy: "Compare tiers, read the details and choose your quantity. Availability is shown on every tier.",
  },
  {
    icon: CreditCard,
    title: "Pay securely",
    copy: "Your total is calculated on the server. Inventory is held while you complete payment in XAF.",
  },
  {
    icon: QrCode,
    title: "Receive a QR ticket",
    copy: "Once payment is verified, each ticket appears in your TICKORA account with its own QR code.",
  },
  {
    icon: CalendarCheck2,
    title: "Attend the event",
    copy: "Show your code at the door. One scan checks you in — no printing, no queue for a wristband.",
  },
];

const organizerSteps = [
  {
    icon: ShieldCheck,
    title: "Register",
    copy: "Create an organizer account and tell us about your team. We review every application.",
  },
  {
    icon: CalendarCheck2,
    title: "Create an event",
    copy: "Add your date, venue, description, cover art and ticket tiers. Save drafts while you work.",
  },
  {
    icon: Check,
    title: "Submit for approval",
    copy: "Send the event for review. Nothing goes public until an administrator approves it.",
  },
  {
    icon: CreditCard,
    title: "Sell tickets",
    copy: "Watch confirmed orders and revenue in real time. TICKORA handles checkout and fees.",
  },
  {
    icon: Users,
    title: "Manage attendees",
    copy: "Invite scanners by email, check guests in at the door and reconcile attendance after the event.",
  },
];

export default function HowItWorksPage() {
  return (
    <>
      <SiteHeader />
      <main>
        <PageHero
          eyebrow="How it works"
          title={
            <>
              Five steps to the door
              <span className="text-accent-300">.</span>
            </>
          }
          description="TICKORA connects discovery, checkout and the door in one place. Here is exactly what happens on both sides of the ticket."
          backHref="/"
          backLabel="Back home"
        >
          <Link
            href="/events"
            className={cn(buttonVariants({ variant: "primary" }))}
          >
            Find an event
            <ArrowRight className="h-4 w-4" />
          </Link>
        </PageHero>

        <section className="container-page py-12 sm:py-16">
          <div className="grid gap-5 lg:grid-cols-2">
            <div className="rounded-3xl border border-line bg-card p-6 shadow-card sm:p-8">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-brand-50 text-accent-300">
                  <Ticket className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-accent-300">
                    Attendee journey
                  </p>
                  <h2 className="mt-0.5 font-display text-[26px] leading-none text-ink">
                    From discovery to entry
                  </h2>
                </div>
              </div>
              <ol className="mt-8 space-y-6">
                {attendeeSteps.map((step, index) => (
                  <li key={step.title} className="flex gap-4">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-forest text-[11px] font-semibold text-white">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <div>
                      <p className="flex items-center gap-2 text-[13.5px] font-semibold text-ink">
                        <step.icon className="h-4 w-4 text-accent-300" />
                        {step.title}
                      </p>
                      <p className="mt-1.5 text-[12px] leading-6 text-muted">
                        {step.copy}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
              <Link
                href="/events"
                className={cn(
                  buttonVariants({ variant: "outline" }),
                  "mt-9 w-full sm:w-auto",
                )}
              >
                Browse events
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="rounded-3xl border border-line bg-card p-6 shadow-card sm:p-8">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-brand-50 text-accent-300">
                  <Users className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-accent-300">
                    Organizer journey
                  </p>
                  <h2 className="mt-0.5 font-display text-[26px] leading-none text-ink">
                    From idea to audience
                  </h2>
                </div>
              </div>
              <ol className="mt-8 space-y-6">
                {organizerSteps.map((step, index) => (
                  <li key={step.title} className="flex gap-4">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-600 text-[11px] font-semibold text-white">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <div>
                      <p className="flex items-center gap-2 text-[13.5px] font-semibold text-ink">
                        <step.icon className="h-4 w-4 text-accent-300" />
                        {step.title}
                      </p>
                      <p className="mt-1.5 text-[12px] leading-6 text-muted">
                        {step.copy}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
              <Link
                href="/register?type=organizer"
                className={cn(
                  buttonVariants({ variant: "primary" }),
                  "mt-9 w-full sm:w-auto",
                )}
              >
                Become an Organizer
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>

        <section className="border-y border-line bg-surface py-14 sm:py-16">
          <div className="container-page grid gap-8 lg:grid-cols-[1fr_1.2fr] lg:items-center">
            <div>
              <p className="eyebrow">Good to know</p>
              <h2 className="display-title mt-2 max-w-md text-[28px] sm:text-[34px]">
                Approval protects everyone.
              </h2>
              <p className="mt-4 max-w-lg text-[13px] leading-6 text-muted">
                Organizer approval and event approval are separate steps. Published
                events are read-only to organizers so ticket buyers are never
                surprised by changes after purchase.
              </p>
              <Link
                href="/help#organizers"
                className="mt-5 inline-flex items-center gap-1.5 text-[12px] font-semibold text-accent-200 hover:underline"
              >
                Read the organizer FAQ
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                {
                  title: "15-minute hold",
                  copy: "Tickets are reserved while you pay, then released automatically.",
                  icon: CalendarCheck2,
                },
                {
                  title: "XAF throughout",
                  copy: "Every price, fee and total is shown in Central African francs.",
                  icon: CreditCard,
                },
                {
                  title: "Africa/Douala time",
                  copy: "Event times are displayed in Cameroon time by default.",
                  icon: QrCode,
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="rounded-2xl border border-line bg-card p-4"
                >
                  <item.icon className="h-4 w-4 text-accent-300" />
                  <p className="mt-3 text-[12.5px] font-semibold text-ink">
                    {item.title}
                  </p>
                  <p className="mt-1.5 text-[11px] leading-5 text-muted">
                    {item.copy}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
