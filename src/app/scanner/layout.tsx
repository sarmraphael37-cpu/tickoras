import Link from "next/link";
import { LogoMark } from "@/components/brand/logo";
import { ScannerNav } from "@/components/scanner/scanner-nav";
import { ThemeToggle } from "@/components/theme-toggle";
import { requireRole } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function ScannerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireRole(["scanner", "organizer", "admin"], "/scanner");

  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <header className="sticky top-0 z-30 border-b border-line glass-strong backdrop-blur-xl">
        <div className="mx-auto flex h-14 w-full max-w-[1280px] items-center gap-3 px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2.5" aria-label="TICKORA home">
            <LogoMark className="h-7 w-7" />
            <span className="text-[13px] font-semibold tracking-[0.14em] text-ice">
              TICKORA
            </span>
          </Link>
          <span className="h-5 w-px bg-line" />
          <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-accent-300">
            Door scanner
          </span>
          <div className="ml-auto">
            <ThemeToggle />
          </div>
        </div>
        <ScannerNav />
      </header>

      <main className="mx-auto w-full max-w-[1280px] flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        {children}
      </main>
    </div>
  );
}
