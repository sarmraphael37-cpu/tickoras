import type { Metadata } from "next";
import Link from "next/link";
import {
  CreditCard,
  LifeBuoy,
  ScanLine,
  ShieldCheck,
  Ticket,
  Users,
} from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { PageHero } from "@/components/page-hero";

export const metadata: Metadata = {
  title: "Help centre",
  description:
    "Answers about TICKORA tickets, QR entry, payments, refunds and organizer accounts.",
};

const sections = [
  {
    id: "tickets",
    icon: Ticket,
    title: "Tickets & entry",
    faqs: [
      {
        q: "Where are my tickets?",
        a: "After your payment is verified, your tickets appear under My Tickets in your attendee dashboard. Each ticket has its own QR code. You can open them on your phone or print them.",
      },
      {
        q: "Do I need a printed ticket?",
        a: "No. Your QR code on screen is enough. Screenshots work, but the code is single-use and will show as checked in after the first successful scan.",
      },
      {
        q: "Can I send a ticket to someone else?",
        a: "Tickets are issued to the account that paid. If you need to change the attendee name, contact the organizer before the event. Transfers are at the organizer's discretion and are not available after check-in.",
      },
      {
        q: "What happens if my QR code will not scan?",
        a: "Show your ticket reference to the event staff. They can verify it in the scanner portal. Do not share your QR code publicly — anyone with it can attempt entry.",
      },
    ],
  },
  {
    id: "payments",
    icon: CreditCard,
    title: "Payments",
    faqs: [
      {
        q: "Which payment methods can I use?",
        a: "TICKORA is designed for Demo payments, MTN Mobile Money, Orange Money and card payments. Demo payments are clearly labelled and move no real money. Real providers are enabled once TICKORA's provider integrations are fully configured.",
      },
      {
        q: "Why is my booking not confirmed yet?",
        a: "A booking is only confirmed after server-side payment verification. Until then it stays pending and the seats are reserved for a limited period. If the reservation expires, the seats are released automatically.",
      },
      {
        q: "Are prices in XAF?",
        a: "Yes. Every ticket price, service fee and total is displayed in Central African CFA francs (XAF) and calculated on the server.",
      },
      {
        q: "How long do I have to pay?",
        a: "Reservations currently last 15 minutes. The checkout page shows your live expiry time. After expiry the booking is cancelled and the seats are returned to inventory.",
      },
    ],
  },
  {
    id: "refunds",
    icon: ShieldCheck,
    title: "Refunds & cancellations",
    faqs: [
      {
        q: "Can I cancel a booking?",
        a: "Unpaid reservations can be cancelled from the booking page and release immediately. Paid tickets follow the organizer's refund policy and require a refund request.",
      },
      {
        q: "How do refunds work?",
        a: "Submit a request from the booking in your attendee dashboard. The organizer and TICKORA support review it. Approved demo refunds are simulated and clearly marked; real provider refunds depend on the provider's processing timeline.",
      },
      {
        q: "What if the event is cancelled?",
        a: "If an organizer cancels a published event, affected attendees are notified. Refund handling depends on the organizer's policy and the payment method used. TICKORA support will assist with the process.",
      },
    ],
  },
  {
    id: "organizers",
    icon: Users,
    title: "Organizer accounts",
    faqs: [
      {
        q: "How do I become an organizer?",
        a: "Register with an organizer account, complete your organization profile, then submit it for review. You can prepare event drafts while your account is pending, but nothing can be published until both your organizer account and each event are approved.",
      },
      {
        q: "Why does my event need approval?",
        a: "Every published event is reviewed by a TICKORA administrator to protect attendees and maintain platform quality. Approval of your organizer account and approval of each event are separate steps.",
      },
      {
        q: "Who can scan tickets?",
        a: "Only assigned scanners, the event owner and authorized administrators can check in tickets. Add scanners by email from your event's Staff & Scanners page. Check-in is atomic, so a ticket cannot be accepted twice.",
      },
      {
        q: "When can I request a payout?",
        a: "Approved organizers can request a payout from confirmed sales, subject to the minimum and any pending refunds. Payout reviews are handled by TICKORA administrators.",
      },
    ],
  },
];

export default function HelpPage() {
  return (
    <>
      <SiteHeader />
      <main>
        <PageHero
          eyebrow="Help centre"
          title={
            <>
              Answers, without
              <br />
              <span className="italic text-accent-300">the hold music.</span>
            </>
          }
          description="Everything you need to know about getting in, paying and running events on TICKORA."
        >
          <div className="rounded-2xl border border-line bg-card p-5 shadow-card">
            <LifeBuoy className="h-5 w-5 text-accent-300" />
            <p className="mt-3 text-[12px] font-semibold text-ink">Still stuck?</p>
            <p className="mt-1 text-[11px] leading-5 text-muted">
              Email support@tickora.cm
              <br />
              Mon–Fri, 08:00–18:00 WAT.
            </p>
            <Link
              href="/contact"
              className="mt-3 inline-flex text-[11px] font-semibold text-accent-300 hover:underline"
            >
              Contact support →
            </Link>
          </div>
        </PageHero>

        <section className="container-page py-12 sm:py-16">
          <div className="grid gap-10 lg:grid-cols-[220px_1fr]">
            <aside className="lg:sticky lg:top-24 lg:self-start">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
                On this page
              </p>
              <nav className="mt-3 space-y-1">
                {sections.map((section) => (
                  <a
                    key={section.id}
                    href={`#${section.id}`}
                    className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-[12px] text-muted transition hover:bg-card hover:text-ink"
                  >
                    <section.icon className="h-3.5 w-3.5 text-accent-300" />
                    {section.title}
                  </a>
                ))}
              </nav>
            </aside>

            <div className="space-y-12">
              {sections.map((section) => (
                <section key={section.id} id={section.id} className="scroll-mt-28">
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-50 text-accent-300">
                      <section.icon className="h-4 w-4" />
                    </span>
                    <h2 className="font-display text-[26px] text-ink">{section.title}</h2>
                  </div>
                  <div className="mt-5 divide-y divide-line rounded-2xl border border-line bg-card">
                    {section.faqs.map((faq) => (
                      <details key={faq.q} className="group px-5 py-4 [&_summary::-webkit-details-marker]:hidden">
                        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[13px] font-semibold text-ink">
                          {faq.q}
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-line text-[13px] font-normal text-muted transition group-open:rotate-45 group-open:border-brand-200 group-open:text-accent-300">
                            +
                          </span>
                        </summary>
                        <p className="mt-3 max-w-2xl text-[12px] leading-6 text-muted">{faq.a}</p>
                      </details>
                    ))}
                  </div>
                </section>
              ))}

              <section className="rounded-2xl bg-forest p-7 text-white sm:p-9">
                <ScanLine className="h-5 w-5 text-accent-300" />
                <h2 className="mt-4 font-display text-[28px] leading-tight">
                  Organizing an event?
                </h2>
                <p className="mt-2 max-w-lg text-[12px] leading-6 text-white/60">
                  Our organizer handbook covers approvals, ticket tiers, scanner
                  management and payouts. Or just talk to a human.
                </p>
                <div className="mt-5 flex flex-wrap gap-3">
                  <Link
                    href="/register?type=organizer"
                    className="inline-flex h-10 items-center rounded-full bg-card px-5 text-[12px] font-semibold text-ice hover:bg-brand-50"
                  >
                    Become an organizer
                  </Link>
                  <Link
                    href="/contact"
                    className="inline-flex h-10 items-center rounded-full border border-white/20 px-5 text-[12px] font-semibold text-white hover:bg-card/10"
                  >
                    Contact us
                  </Link>
                </div>
              </section>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
