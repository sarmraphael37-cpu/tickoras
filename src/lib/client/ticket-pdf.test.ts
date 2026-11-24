import { describe, expect, it } from "vitest";
import { buildTicketPdf } from "@/lib/client/ticket-pdf";

describe("ticket PDF export", () => {
  it("builds a self-contained PDF with the QR image and ticket details", () => {
    const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xd9]);
    const pdf = buildTicketPdf(
      {
        reference: "TKT-TEST-1234",
        eventTitle: "Douala Jazz Nights",
        attendeeName: "Ama Nkomo",
        ticketType: "VIP",
        date: "Sat, 14 Mar 2026 · 20:00",
        venue: "Mokolo, Douala",
        bookingReference: "TKT-BOOK-1",
        qrSvg: "",
      },
      jpeg,
      320,
      320,
    );
    const text = new TextDecoder().decode(pdf);
    expect(text.startsWith("%PDF-1.4")).toBe(true);
    expect(text).toContain("/DCTDecode");
    expect(text).toContain("TKT-TEST-1234");
    expect(text).toContain("Douala Jazz Nights");
    expect(text).toContain("%%EOF");
    expect(text).toContain("xref");
  });
});
