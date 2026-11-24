import type { Metadata } from "next";
import { ScannerConsole } from "@/components/scanner/scanner-console";
import { PageHeader } from "@/components/dashboard/page-header";
import { requireRole } from "@/lib/auth";
import { listRecentCheckIns, listScannerEvents } from "@/lib/data/scanner";

export const metadata: Metadata = { title: "Scan tickets" };
export const dynamic = "force-dynamic";

export default async function ScannerScanPage({
  searchParams,
}: {
  searchParams: Promise<{ event?: string }>;
}) {
  const viewer = await requireRole(["scanner", "organizer", "admin"], "/scanner/scan");
  const { event } = await searchParams;
  const events = await listScannerEvents(viewer);
  const recent = await listRecentCheckIns(
    events.map((item) => item.id),
    20,
  );
  const initialEventId = events.some((item) => item.id === event) ? event! : "";

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Door operations"
        title="Scan tickets"
        description="Point the camera at the attendee's QR code, or enter the ticket code manually. Every scan is verified against the live database."
      />
      <ScannerConsole events={events} recent={recent} initialEventId={initialEventId} />
    </div>
  );
}
