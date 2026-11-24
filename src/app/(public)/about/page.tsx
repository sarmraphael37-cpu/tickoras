import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  HeartHandshake,
  MapPin,
  ShieldCheck,
  Sparkles,
  Ticket,
} from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { PageHero } from "@/components/page-hero";

export const metadata: Metadata = {
  title: "About TICKORA",
  description:
    "TICKORA is Cameroon's event discovery and ticketing platform. Learn how we verify organizers, protect buyers and support live experiences.",
};

const principles = [
  {
    icon: BadgeCheck,
    title: "Trust is designed in",
    text: "Every organizer passes a review before publishing. Payments are verified on our servers, never in the browser.",
  },
  {
    icon: MapPin,
    title: "Built for Cameroon",
    text: "Prices in XAF, cities we actually know, and payment options that make sense locally — with room to grow internationally.",
  },
  {
    icon: Ticket,
    title: "The ticket is the experience",
    text: "Your pass should feel as considered as the event itself. Clear, beautiful and ready when you reach the door.",
  },
];

export default function AboutPage() {
  return (
    <>
      <SiteHeader />
      <main>
        <PageHero
          eyebrow="Our story"
          title={
            <>
              We built the front door to
              <br />
              <span className="italic text-accent-300">Cameroon&apos;s best nights.</span>
            </>
          }
          description="TICKORA exists to make discovering and attending live experiences effortless — for the people in the room and the people who create it."
        >
          <div className="rounded-2xl border border-line bg-card p-5 shadow-card">
            <p className="font-display text-[34px] leading-none text-ink">4</p>
            <p className="mt-1 text-[10px] font-medium uppercase tracking-[0.12em] text-muted">
              cities at launch
            </p>
            <div className="mt-4 flex items-center gap-1.5 text-[10px] text-accent-200">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
              Buea · Douala · Yaoundé · Limbe
            </div>
          </div>
        </PageHero>

        <section className="container-page py-14 sm:py-20">
          <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr]">
            <div>
              <p className="eyebrow">Why we exist</p>
              <h2 className="display-title mt-3 text-[34px] leading-[1.03] sm:text-[42px]">
                Great events were happening. Finding tickets was the hard part.
              </h2>
            </div>
            <div className="prose-tickora max-w-2xl">
              <p>
                Cameroon has no shortage of talent, ideas and reasons to gather.
                What it lacked was a dependable place to discover what&apos;s on and
                buy a ticket without a chain of calls, screenshots and cash
                handoffs.
              </p>
              <p>
                TICKORA brings discovery, booking, payment and entry into one
                coherent experience. For attendees, that means clarity and
                confidence. For organizers, it means real infrastructure: live
                inventory, verified payments, attendee lists and fast check-in.
              </p>
              <p>
                We start in Buea, Douala, Yaoundé and Limbe. The architecture is
                intentionally ready for more cities and currencies as the platform
                grows.
              </p>
            </div>
          </div>
        </section>

        <section className="border-y border-line bg-surface py-14 sm:py-20">
          <div className="container-page">
            <p className="eyebrow">What we stand for</p>
            <h2 className="display-title mt-3 max-w-xl text-[34px] leading-[1.03] sm:text-[42px]">
              Three principles, no exceptions.
            </h2>
            <div className="mt-9 grid gap-5 md:grid-cols-3">
              {principles.map((principle, index) => (
                <div
                  key={principle.title}
                  className="rounded-2xl border border-line bg-card p-6"
                >
                  <div className="flex items-center justify-between">
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-accent-300">
                      <principle.icon className="h-5 w-5" strokeWidth={1.6} />
                    </span>
                    <span className="font-display text-[22px] text-accent-200">
                      0{index + 1}
                    </span>
                  </div>
                  <h3 className="mt-5 text-[15px] font-semibold text-ink">
                    {principle.title}
                  </h3>
                  <p className="mt-2 text-[12px] leading-6 text-muted">
                    {principle.text}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="organizers" className="container-page py-14 sm:py-20">
          <div className="grid gap-10 lg:grid-cols-[1fr_1fr] lg:items-center">
            <div>
              <p className="eyebrow">For organizers</p>
              <h2 className="display-title mt-3 text-[34px] leading-[1.03] sm:text-[42px]">
                You bring the room together.
                <br />
                We handle the rest.
              </h2>
              <p className="mt-4 max-w-lg text-[13px] leading-7 text-muted">
                From the first draft to the last person through the door, TICKORA
                gives you a single operating system for your event.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href="/register?type=organizer"
                  className="inline-flex h-11 items-center gap-2 rounded-full bg-brand-600 px-5 text-[13px] font-semibold text-white transition hover:bg-brand-700"
                >
                  Apply to become an organizer
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/help#organizers"
                  className="inline-flex h-11 items-center rounded-full border border-line bg-card px-5 text-[13px] font-semibold text-ink transition hover:bg-brand-50"
                >
                  Read the guide
                </Link>
              </div>
              <p className="mt-3 text-[11px] text-muted">
                Applications are reviewed manually. You can prepare drafts while
                your account is pending.
              </p>
            </div>
            <div className="space-y-3">
              {[
                {
                  icon: Building2,
                  title: "Set up your organization",
                  text: "Add your identity, logo and contact details. Submit for review.",
                },
                {
                  icon: Sparkles,
                  title: "Build a sellable event",
                  text: "Draft the page, configure ticket tiers and sales windows.",
                },
                {
                  icon: ShieldCheck,
                  title: "Submit for approval",
                  text: "An administrator reviews every event before it appears publicly.",
                },
                {
                  icon: HeartHandshake,
                  title: "Sell, scan and settle",
                  text: "Track revenue, manage scanners, check people in and request payouts.",
                },
              ].map((step, index) => (
                <div
                  key={step.title}
                  className="flex gap-4 glass-subtle rounded-xl p-4"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-accent-300">
                    <step.icon className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-[12.5px] font-semibold text-ink">{step.title}</p>
                    <p className="mt-0.5 text-[11px] leading-5 text-muted">{step.text}</p>
                  </div>
                  <span className="ml-auto font-display text-[18px] text-accent-200">
                    0{index + 1}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="container-page pb-16 sm:pb-24">
          <div className="relative overflow-hidden rounded-3xl bg-forest px-7 py-12 text-white sm:px-12 sm:py-16">
            <div
              className="pointer-events-none absolute inset-0 opacity-30"
              style={{
                backgroundImage:
                  "radial-gradient(ellipse at 80% 0%, rgba(82,187,155,0.7), transparent 50%)",
              }}
            />
            <div className="relative max-w-2xl">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-accent-300">
                The invitation
              </p>
              <h2 className="mt-4 font-display text-[36px] leading-[1.02] sm:text-[48px]">
                The next great memory is already on sale.
              </h2>
              <p className="mt-4 max-w-lg text-[13px] leading-6 text-white/65">
                Find something that makes you lean forward. Bring someone with you.
                We&apos;ll make sure the door is easy.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link
                  href="/events"
                  className="inline-flex h-11 items-center gap-2 rounded-full bg-card px-5 text-[13px] font-semibold text-ice transition hover:bg-brand-50"
                >
                  Discover events
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/contact"
                  className="inline-flex h-11 items-center rounded-full border border-white/20 px-5 text-[13px] font-semibold text-white transition hover:bg-card/10"
                >
                  Talk to us
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
