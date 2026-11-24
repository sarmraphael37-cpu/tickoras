import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { PageHero } from "@/components/page-hero";

export const metadata: Metadata = {
  title: "Terms of service",
  description:
    "The terms that govern attendance, bookings, payments and organizer use of TICKORA.",
};

const sections = [
  {
    id: "platform",
    title: "1. About TICKORA",
    body: [
      "TICKORA is a digital event discovery, booking and ticketing platform operated in Cameroon. We provide technology that lets organizers publish events and sell tickets, and lets attendees discover events and purchase tickets.",
      "TICKORA is not the organizer or producer of third-party events unless expressly stated. The organizer named on an event page is responsible for delivering that event, its content, venue access and on-site conduct.",
    ],
  },
  {
    id: "accounts",
    title: "2. Accounts and eligibility",
    body: [
      "You must provide accurate registration details and keep them up to date. You are responsible for activity under your account and for keeping your credentials secure.",
      "Organizer accounts are subject to separate review. An organizer may prepare drafts while pending, but TICKORA may decline or suspend an account at any time where verification, legal or quality requirements are not met.",
      "Administrator accounts are created only by TICKORA. Public administrator registration is not available.",
    ],
  },
  {
    id: "bookings",
    title: "3. Bookings and ticket issuance",
    body: [
      "A booking creates a temporary reservation. The reservation expires if payment is not completed within the period shown at checkout. Tickets are issued only after TICKORA's server-side payment verification confirms a successful transaction, or after an authorized free-booking process completes.",
      "Ticket inventory is limited and allocated transactionally. If the requested quantity is no longer available, the booking may fail. We do not overbook events.",
      "Each ticket is unique and single-use. Sharing a QR code publicly may allow someone else to attempt entry. TICKORA is not responsible for entry denied because a ticket was scanned before you arrived.",
    ],
  },
  {
    id: "payments",
    title: "4. Prices, fees and payments",
    body: [
      "All prices are displayed in Central African CFA francs (XAF). The ticket price, platform service fee and total payable are calculated and validated on the server. The amount shown at final checkout is authoritative.",
      "Payment availability depends on the configured providers. Demo payments are clearly labelled, move no real money and exist for development and demonstration only. Real mobile money and card providers are enabled only when fully configured, including signature verification and reconciliation.",
      "TICKORA never accepts a browser-side assertion that a payment succeeded. A booking is confirmed only after a trusted backend verification.",
    ],
  },
  {
    id: "refunds",
    title: "5. Cancellations and refunds",
    body: [
      "Unpaid reservations may be cancelled before expiry. Paid tickets are subject to the organizer's stated policy, applicable law and TICKORA's review process.",
      "Refund requests are submitted from the attendee dashboard. Approval may be handled by the organizer and TICKORA support. Refund timing depends on the payment method and provider. Where an event is cancelled or materially changed, TICKORA will facilitate communication and the applicable refund process.",
      "Fees may be non-refundable where permitted by applicable law and clearly disclosed.",
    ],
  },
  {
    id: "organizers",
    title: "6. Organizer obligations",
    body: [
      "Organizers must have the right to produce the event and to use all uploaded content. Event details, ticket quantities, sales windows, venue information and prices must be accurate.",
      "Every event requires administrator approval before publication. TICKORA may reject, suspend or remove an event that is misleading, unsafe, unlawful or inconsistent with platform standards. Organizers may not approve their own events.",
      "Organizers must honour valid tickets, operate check-in fairly and handle attendee data in accordance with applicable law and the TICKORA privacy policy. Payouts are subject to review, minimum thresholds and deductions for refunds or chargebacks.",
    ],
  },
  {
    id: "conduct",
    title: "7. Acceptable use",
    body: [
      "You may not attempt to bypass access controls, manipulate prices or payment states, scrape personal data, interfere with the platform, or use automated tools to exhaust inventory. Fraudulent or abusive activity may result in suspension and referral to the relevant authorities.",
      "Event attendees must comply with venue rules and the organizer's entry requirements. TICKORA and the organizer may refuse entry where necessary for safety or compliance.",
    ],
  },
  {
    id: "liability",
    title: "8. Disclaimers and liability",
    body: [
      "The platform is provided on an \"as available\" basis. We work to keep listings accurate and services available, but we do not guarantee uninterrupted access or that every third-party event will proceed as described.",
      "To the maximum extent permitted by applicable law, TICKORA's aggregate liability arising from the platform is limited to the platform service fees you paid for the booking concerned. Nothing in these terms excludes liability that cannot lawfully be excluded.",
    ],
  },
  {
    id: "changes",
    title: "9. Changes and contact",
    body: [
      "We may update these terms as the platform evolves. Material changes will be communicated on the platform. Continued use after the effective date constitutes acceptance.",
      "Questions about these terms: hello@tickora.cm. Our team is based in Douala, Cameroon.",
    ],
  },
];

export default function TermsPage() {
  return (
    <>
      <SiteHeader />
      <main>
        <PageHero
          eyebrow="Legal"
          backHref="/"
          title="Terms of service"
          description="Clear rules for a trustworthy marketplace. Effective 1 January 2026."
        />
        <section className="container-page py-12 sm:py-16">
          <div className="grid gap-10 lg:grid-cols-[220px_1fr]">
            <aside className="lg:sticky lg:top-24 lg:self-start">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
                Contents
              </p>
              <nav className="mt-3 space-y-0.5">
                {sections.map((section) => (
                  <a
                    key={section.id}
                    href={`#${section.id}`}
                    className="block rounded-md px-2.5 py-1.5 text-[11.5px] leading-5 text-muted transition hover:bg-card hover:text-ink"
                  >
                    {section.title}
                  </a>
                ))}
              </nav>
            </aside>
            <div className="max-w-3xl">
              <div className="prose-tickora">
                <p>
                  These terms form an agreement between you and TICKORA. By using
                  the platform, creating an account, booking a ticket or publishing
                  an event, you accept them. Please read them carefully.
                </p>
                {sections.map((section) => (
                  <section key={section.id} id={section.id} className="scroll-mt-28">
                    <h2>{section.title}</h2>
                    {section.body.map((paragraph, index) => (
                      <p key={index}>{paragraph}</p>
                    ))}
                  </section>
                ))}
                <div className="mt-10 glass-subtle rounded-xl p-5 text-[12px]">
                  <p className="font-semibold text-ink">Read next</p>
                  <p className="mt-1">
                    <Link href="/privacy">Privacy policy</Link> ·{" "}
                    <Link href="/help">Help centre</Link> ·{" "}
                    <Link href="/contact">Contact TICKORA</Link>
                  </p>
                </div>
                <p className="mt-6 text-[11px]">
                  This document is a product-ready baseline and does not constitute
                  legal advice. TICKORA should obtain Cameroon-specific legal review
                  before commercial launch.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
