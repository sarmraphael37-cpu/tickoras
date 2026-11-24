import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { PageHero } from "@/components/page-hero";

export const metadata: Metadata = {
  title: "Privacy policy",
  description:
    "How TICKORA collects, uses and protects personal data for attendees, organizers and scanners.",
};

const sections = [
  {
    id: "who",
    title: "1. Who we are",
    body: [
      "TICKORA operates the event discovery and ticketing platform at tickora.cm and its associated applications. For privacy questions, contact privacy@tickora.cm.",
      "This policy explains what we collect, why we collect it, how long we keep it and the choices available to you. It applies to attendees, organizers, event staff and visitors to the public website.",
    ],
  },
  {
    id: "collect",
    title: "2. Information we collect",
    body: [
      "Account information: name, email address, phone number, account type, password credentials (stored by our authentication provider in hashed form), avatar and profile preferences.",
      "Booking and ticket information: events booked, ticket types, quantities, order totals, payment status, ticket references, QR token hashes and check-in records. QR codes contain a random verification token, not your name, email or phone number.",
      "Payment information: provider, transaction reference, amount and status. TICKORA does not store full card numbers or mobile money PINs. Payment credentials are handled by the relevant provider.",
      "Organizer information: organization name, description, contact details, verification information, payout destination details and event content.",
      "Technical information: IP address, device and browser details, session metadata and security/audit logs. We use these to operate and protect the service.",
    ],
  },
  {
    id: "why",
    title: "3. Why we use it",
    body: [
      "To create and secure accounts, process bookings, verify payments, issue and validate tickets, prevent duplicate entry and communicate about your bookings.",
      "To review organizer and event applications, detect fraud and abuse, enforce our terms and maintain audit trails for administrative actions.",
      "To provide support, respond to enquiries and send service messages. Marketing emails are sent only where permitted or with consent and can be unsubscribed at any time.",
      "To understand aggregate platform performance through counts and anonymized or aggregated analytics. We do not sell personal data.",
    ],
  },
  {
    id: "sharing",
    title: "4. When we share information",
    body: [
      "With the organizer of an event you book, to the extent needed to manage attendance, check-in and event operations. This includes attendee name, ticket type and booking status.",
      "With payment providers and infrastructure processors that help us operate the platform, under contractual confidentiality and security obligations.",
      "With authorities where required by law, or to protect the rights, safety and security of TICKORA, our users or the public.",
      "Administrators and authorized event staff receive access only to the data necessary for their role, enforced through database policies and server-side authorization.",
    ],
  },
  {
    id: "security",
    title: "5. Security and retention",
    body: [
      "We use row-level security, server-side validation, hashed authentication credentials, restricted service keys and audit logging. Access to production systems is limited. No system is perfectly secure, but we design to minimize what is exposed.",
      "We retain account, transaction, ticket and audit records for as long as needed to operate the service, satisfy legal and accounting obligations, resolve disputes and prevent fraud. When data is no longer needed, it is deleted or aggregated.",
      "Payment webhook events and audit logs may be retained longer where required for reconciliation or legal compliance.",
    ],
  },
  {
    id: "rights",
    title: "6. Your choices and rights",
    body: [
      "You can review and update your profile details from your dashboard. You can request access, correction, deletion or a copy of your personal data by emailing privacy@tickora.cm. We will verify your identity before acting.",
      "Some records cannot be deleted immediately where we must retain them for legal, tax, fraud-prevention or dispute-resolution reasons. Where deletion is not possible, we will explain why and restrict further use.",
      "You can unsubscribe from marketing messages using the link in the email or by contacting us. Service messages about bookings and security are not marketing and may still be sent.",
    ],
  },
  {
    id: "cookies",
    title: "7. Cookies and sessions",
    body: [
      "TICKORA uses essential cookies for authentication and session persistence. These are required to keep you signed in and to protect your account. We do not currently use advertising cookies.",
      "If we introduce optional analytics or marketing cookies, we will provide appropriate notice and choices before they are set.",
    ],
  },
  {
    id: "children",
    title: "8. Children",
    body: [
      "The platform is not intended for children to create accounts. Some events may admit children when accompanied by a responsible adult, in line with the organizer's policy. Organizers are responsible for setting and communicating age requirements.",
    ],
  },
  {
    id: "changes",
    title: "9. Changes and contact",
    body: [
      "We may update this policy as the platform evolves. Material changes will be posted on this page with a new effective date.",
      "Contact: privacy@tickora.cm · TICKORA, Douala, Cameroon.",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <>
      <SiteHeader />
      <main>
        <PageHero
          eyebrow="Legal"
          backHref="/"
          title="Privacy policy"
          description="What we collect, why we need it and how we protect it. Effective 1 January 2026."
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
                <div className="rounded-xl border border-brand-200 bg-brand-50 p-5 text-[12px] text-accent-100">
                  <p className="font-semibold">The short version</p>
                  <p className="mt-1">
                    We collect what is needed to sell and validate tickets, protect
                    accounts and review organizers. We do not sell your data. Your
                    QR code contains a random token, not your personal details.
                  </p>
                </div>
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
                    <Link href="/terms">Terms of service</Link> ·{" "}
                    <Link href="/help">Help centre</Link> ·{" "}
                    <Link href="/contact">Contact TICKORA</Link>
                  </p>
                </div>
                <p className="mt-6 text-[11px]">
                  This document is a product-ready baseline and does not constitute
                  legal advice. TICKORA should obtain Cameroon-specific data
                  protection review before commercial launch.
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
