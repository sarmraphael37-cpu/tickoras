import Link from "next/link";
import {
  ArrowUpRight,
  Facebook,
  Instagram,
  Linkedin,
  Mail,
  MapPin,
  Twitter,
} from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { NewsletterForm } from "@/components/newsletter-form";
import { SOCIAL_LINKS } from "@/lib/site";

const columns = [
  {
    title: "About TICKORA",
    links: [
      { href: "/about", label: "About TICKORA" },
      { href: "/how-it-works", label: "How it works" },
      { href: "/about#organizers", label: "Our organizers" },
      { href: "/register?type=organizer", label: "Become an Organizer" },
    ],
  },
  {
    title: "Discover",
    links: [
      { href: "/events", label: "Discover Events" },
      { href: "/categories", label: "Categories" },
      { href: "/events?city=Buea", label: "Buea" },
      { href: "/events?city=Douala", label: "Douala" },
      { href: "/events?city=Yaound%C3%A9", label: "Yaoundé" },
      { href: "/events?city=Limbe", label: "Limbe" },
    ],
  },
  {
    title: "Support",
    links: [
      { href: "/help", label: "Help Centre" },
      { href: "/contact", label: "Contact" },
      { href: "/help#tickets", label: "Ticket entry" },
      { href: "/help#refunds", label: "Refunds" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/privacy", label: "Privacy Policy" },
      { href: "/terms", label: "Terms of Service" },
      { href: "/help#payments", label: "Payment terms" },
      { href: "/help", label: "FAQs" },
    ],
  },
];

const SOCIAL_ICONS = {
  Instagram,
  X: Twitter,
  Facebook,
  LinkedIn: Linkedin,
} as const;

export function SiteFooter() {
  return (
    <footer className="glass-subtle border-t">
      <div className="container-page py-12 lg:py-16">
        <div className="grid gap-12 lg:grid-cols-[1.1fr_2fr]">
          <div>
            <Logo />
            <p className="mt-5 max-w-xs text-[13px] leading-6 text-muted">
              Cameroon&apos;s event discovery and ticketing platform. Find the
              moments worth leaving the house for — and get in without the queue.
            </p>
            <div className="mt-6 space-y-2 text-[12px] text-muted">
              <p className="flex items-center gap-2">
                <MapPin className="h-3.5 w-3.5 text-accent-300" />
                Douala · Buea · Yaoundé · Limbe
              </p>
              <p className="flex items-center gap-2">
                <Mail className="h-3.5 w-3.5 text-accent-300" />
                <a href="mailto:hello@tickora.cm" className="hover:text-accent-200">
                  hello@tickora.cm
                </a>
              </p>
            </div>

            <div className="mt-7">
              <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink">
                Follow TICKORA
              </p>
              <div className="flex flex-wrap items-center gap-2">
                {SOCIAL_LINKS.map((social) => {
                  const Icon =
                    SOCIAL_ICONS[social.label as keyof typeof SOCIAL_ICONS];
                  return (
                    <a
                      key={social.label}
                      href={social.href}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={`Find TICKORA on ${social.label}`}
                      className="inline-flex h-9 items-center gap-1.5 rounded-full border border-line px-3 text-[11px] font-medium text-muted transition hover:border-brand-300 hover:text-accent-200"
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {social.label}
                    </a>
                  );
                })}
              </div>
            </div>

            <div className="mt-7 max-w-sm">
              <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink">
                The TICKORA dispatch
              </p>
              <NewsletterForm compact />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
            {columns.map((column) => (
              <div key={column.title}>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink">
                  {column.title}
                </p>
                <ul className="mt-4 space-y-2.5">
                  {column.links.map((link) => (
                    <li key={link.href + link.label}>
                      <Link
                        href={link.href}
                        className="group inline-flex items-center gap-1 text-[12px] text-muted transition hover:text-accent-200"
                      >
                        {link.label}
                        <ArrowUpRight className="h-3 w-3 opacity-0 transition group-hover:opacity-100" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-4 border-t border-line pt-6 text-[11px] text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} TICKORA. All rights reserved.</p>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
              Prices in XAF · Times in Africa/Douala
            </span>
            <Link href="/privacy" className="hover:text-accent-200">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-accent-200">
              Terms
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
