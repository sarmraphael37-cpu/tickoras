import Link from "next/link";
import { ArrowLeft, BadgeCheck, QrCode, ShieldCheck } from "lucide-react";
import { Logo } from "@/components/brand/logo";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[0.92fr_1.08fr]">
      <aside className="relative hidden overflow-hidden bg-gradient-to-br from-[#071426] via-[#0D1B30] to-[#0B2A5B] p-10 text-white lg:flex lg:flex-col lg:justify-between xl:p-14">
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              "radial-gradient(ellipse at 80% 10%, rgba(37,99,235,0.55), transparent 52%), radial-gradient(ellipse at 10% 90%, rgba(96,165,250,0.18), transparent 55%)",
          }}
        />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.14]"
          style={{
            backgroundImage:
              "radial-gradient(#60A5FA 0.6px, transparent 0.6px)",
            backgroundSize: "20px 20px",
          }}
        />
        <div className="relative">
          <Logo variant="light" />
        </div>

        <div className="relative max-w-md">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-accent-300">
            Discover. Book. Experience.
          </p>
          <h2 className="mt-5 font-display text-[44px] leading-[0.98] xl:text-[52px]">
            The best seat
            <br />
            is the one you
            <br />
            already have.
          </h2>
          <p className="mt-5 max-w-sm text-[13px] leading-6 text-white/60">
            One account for every event you&apos;ll remember — with secure
            tickets, instant entry and a clear view of what&apos;s next.
          </p>

          <div className="mt-9 space-y-3">
            {[
              { icon: ShieldCheck, text: "Secure payments, verified server-side" },
              { icon: QrCode, text: "Digital tickets with single-use QR entry" },
              { icon: BadgeCheck, text: "Vetted organizers across Cameroon" },
            ].map((item) => (
              <div key={item.text} className="flex items-center gap-2.5 text-[12px] text-white/70">
                <item.icon className="h-4 w-4 text-accent-300" />
                {item.text}
              </div>
            ))}
          </div>
        </div>

        <div className="relative flex items-center justify-between text-[10px] uppercase tracking-[0.14em] text-white/40">
          <span>Buea · Douala · Yaoundé · Limbe</span>
          <span>© {new Date().getFullYear()} TICKORA</span>
        </div>
      </aside>

      <main className="flex min-h-screen flex-col">
        <div className="flex items-center justify-between px-5 py-5 sm:px-8">
          <Logo className="lg:hidden" />
          <Link
            href="/"
            className="ml-auto inline-flex items-center gap-1.5 text-[11px] font-medium text-muted transition hover:text-ink"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to TICKORA
          </Link>
        </div>
        <div className="flex flex-1 items-center justify-center px-5 pb-12 pt-4 sm:px-8">
          <div className="glass w-full max-w-[460px] rounded-2xl p-6 sm:p-8">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
