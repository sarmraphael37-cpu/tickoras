"use client";

import { useState } from "react";
import { Download, FileDown, QrCode, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { downloadTicketPdf } from "@/lib/client/ticket-pdf";

export function TicketActions({
  reference,
  svg,
  eventTitle,
  attendeeName,
  ticketType,
  date,
  venue,
  bookingReference,
}: {
  reference: string;
  svg: string;
  eventTitle: string;
  attendeeName: string;
  ticketType: string;
  date: string;
  venue: string;
  bookingReference: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function downloadQr() {
    const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `tickora-qr-${reference}.svg`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  async function downloadPdf() {
    setBusy(true);
    setError(null);
    try {
      await downloadTicketPdf({
        reference,
        eventTitle,
        attendeeName,
        ticketType,
        date,
        venue,
        bookingReference,
        qrSvg: svg,
      });
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not build the PDF. Try printing the ticket instead.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2 print:hidden">
      <Button type="button" variant="outline" size="sm" onClick={downloadQr}>
        <Download className="h-3.5 w-3.5" />
        Download QR
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => void downloadPdf()}
        disabled={busy}
      >
        <FileDown className="h-3.5 w-3.5" />
        {busy ? "Building PDF…" : "Download PDF"}
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() =>
          document
            .getElementById("ticket-qr")
            ?.scrollIntoView({ behavior: "smooth", block: "center" })
        }
      >
        <QrCode className="h-3.5 w-3.5" />
        View QR
      </Button>
      <Button type="button" variant="outline" size="sm" onClick={() => window.print()}>
        <Printer className="h-3.5 w-3.5" />
        Print
      </Button>
      {error ? <p className="w-full text-right text-[10.5px] text-danger">{error}</p> : null}
    </div>
  );
}
