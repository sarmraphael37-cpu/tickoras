import type { Metadata } from "next";
import Link from "next/link";
import { Mail, MapPin, MessageSquare, Users } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { PageHero } from "@/components/page-hero";
import { ContactForm } from "@/components/contact-form";

export const metadata: Metadata = {
  title: "Contact TICKORA",
  description:
    "Questions about tickets, payments, refunds or organizing an event? Contact the TICKORA team.",
};

export default function ContactPage() {
  return (
    <>
      <SiteHeader />
      <main>
        <PageHero
          eyebrow="Contact"
          backHref="/"
          title={
            <>
              Let&apos;s sort it out
              <span className="text-accent-300">.</span>
            </>
          }
          description="Whether you need help with a booking or want to bring your event to TICKORA, a real person will read this."
        />

        <section className="container-page py-12 sm:py-16">
          <div className="grid gap-10 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="rounded-2xl border border-line bg-card p-6 shadow-card sm:p-8">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-50 text-accent-300">
                  <MessageSquare className="h-4 w-4" />
                </span>
                <div>
                  <h2 className="text-[15px] font-semibold text-ink">Send a message</h2>
                  <p className="text-[11px] text-muted">
                    We reply within one business day.
                  </p>
                </div>
              </div>
              <div className="mt-6">
                <ContactForm />
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl border border-line bg-cream p-6">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
                  Direct email
                </p>
                <a
                  href="mailto:hello@tickora.cm"
                  className="mt-2 flex items-center gap-2 text-[15px] font-semibold text-ink hover:text-accent-200"
                >
                  <Mail className="h-4 w-4 text-accent-300" />
                  hello@tickora.cm
                </a>
                <p className="mt-2 text-[11px] leading-5 text-muted">
                  Include your booking reference (starts with TKR-) for faster help.
                </p>
                <div className="mt-5 border-t border-line pt-4">
                  <a
                    href="mailto:support@tickora.cm"
                    className="flex items-center gap-2 text-[12px] font-medium text-ink hover:text-accent-200"
                  >
                    <Users className="h-4 w-4 text-accent-300" />
                    support@tickora.cm — attendees
                  </a>
                  <a
                    href="mailto:organizers@tickora.cm"
                    className="mt-2.5 flex items-center gap-2 text-[12px] font-medium text-ink hover:text-accent-200"
                  >
                    <Users className="h-4 w-4 text-accent-300" />
                    organizers@tickora.cm — organizers
                  </a>
                </div>
              </div>

              <div className="rounded-2xl border border-line bg-card p-6">
                <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
                  <MapPin className="h-3.5 w-3.5 text-accent-300" />
                  Where we are
                </p>
                <p className="mt-2 text-[13px] font-semibold text-ink">Douala, Cameroon</p>
                <p className="mt-1 text-[11px] leading-5 text-muted">
                  Our support team works across Douala and Buea. Meetings with
                  organizers are by appointment.
                </p>
              </div>

              <div className="rounded-2xl border border-line bg-card p-6">
                <p className="text-[13px] font-semibold text-ink">
                  Looking for a quick answer?
                </p>
                <p className="mt-1 text-[11px] leading-5 text-muted">
                  Our help centre covers tickets, payment, refunds and organizer
                  approvals.
                </p>
                <Link
                  href="/help"
                  className="mt-3 inline-flex text-[11px] font-semibold text-accent-300 hover:underline"
                >
                  Visit the help centre →
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
