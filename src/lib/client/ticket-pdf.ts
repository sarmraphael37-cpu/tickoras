/**
 * Client-side PDF export for a single ticket. The QR payload is supplied by the
 * server as an SVG string; it is converted to a JPEG and embedded in a small,
 * self-contained PDF. No attendee data is sent to a third-party service.
 */

export interface TicketPdfData {
  reference: string;
  eventTitle: string;
  attendeeName: string;
  ticketType: string;
  date: string;
  venue: string;
  bookingReference: string;
  qrSvg: string;
}

export async function downloadTicketPdf(data: TicketPdfData): Promise<void> {
  const qr = await svgToJpeg(data.qrSvg);
  const pdf = buildTicketPdf(data, qr.bytes, qr.width, qr.height);
  const pdfBuffer = new Uint8Array(pdf).buffer as ArrayBuffer;
  const url = URL.createObjectURL(new Blob([pdfBuffer], { type: "application/pdf" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `tickora-ticket-${data.reference}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

async function svgToJpeg(
  svg: string,
): Promise<{ bytes: Uint8Array; width: number; height: number }> {
  const url = URL.createObjectURL(
    new Blob([svg], { type: "image/svg+xml;charset=utf-8" }),
  );
  const image = new Image();
  try {
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("Could not render the QR code."));
      image.src = url;
    });
    const width = image.naturalWidth || 320;
    const height = image.naturalHeight || 320;
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas is not available in this browser.");
    context.fillStyle = "#FFFFFF";
    context.fillRect(0, 0, width, height);
    context.drawImage(image, 0, 0, width, height);
    const base64 = canvas.toDataURL("image/jpeg", 0.92).split(",")[1] ?? "";
    return { bytes: base64ToBytes(base64), width, height };
  } finally {
    URL.revokeObjectURL(url);
  }
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function escapePdfText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)")
    .replace(/[^\x20-\x7E]/g, "?");
}

function clip(value: string, max: number): string {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

export function buildTicketPdf(
  data: TicketPdfData,
  jpeg: Uint8Array,
  imageWidth: number,
  imageHeight: number,
): Uint8Array {
  const encoder = new TextEncoder();
  const chunks: Uint8Array[] = [];
  let length = 0;
  const offsets: number[] = [];

  function pushText(value: string) {
    const bytes = encoder.encode(value);
    chunks.push(bytes);
    length += bytes.length;
  }

  function pushBytes(bytes: Uint8Array) {
    chunks.push(bytes);
    length += bytes.length;
  }

  function mark(index: number) {
    offsets[index] = length;
  }

  const text = [
    "q",
    "0.02 0.18 0.14 rg 0 762 595 80 re f",
    "BT /F2 24 Tf 1 1 1 rg 40 802 Td (TICKORA) Tj ET",
    "BT /F1 10 Tf 0.75 0.85 0.82 rg 40 782 Td (OFFICIAL ENTRY TICKET) Tj ET",
    "0.1 0.1 0.1 rg",
    `BT /F2 18 Tf 40 720 Td (${escapePdfText(clip(data.eventTitle, 46))}) Tj ET`,
    `BT /F1 11 Tf 40 692 Td (Ticket type: ${escapePdfText(clip(data.ticketType, 40))}) Tj ET`,
    `BT /F1 11 Tf 40 670 Td (Ticket holder: ${escapePdfText(clip(data.attendeeName, 40))}) Tj ET`,
    `BT /F1 11 Tf 40 648 Td (Date: ${escapePdfText(clip(data.date, 45))}) Tj ET`,
    `BT /F1 11 Tf 40 626 Td (Venue: ${escapePdfText(clip(data.venue, 45))}) Tj ET`,
    `BT /F1 11 Tf 40 604 Td (Booking: ${escapePdfText(clip(data.bookingReference, 40))}) Tj ET`,
    `BT /F2 13 Tf 40 556 Td (Reference: ${escapePdfText(data.reference)}) Tj ET`,
    "0.82 0.86 0.84 RG 40 528 m 555 528 l S",
    "BT /F1 9 Tf 40 500 Td (Scan this QR code at the entrance. One ticket, one entry.) Tj ET",
    "q 350 250 200 200 cm /Im0 Do Q",
    "BT /F1 9 Tf 40 90 Td (Issued securely by TICKORA. Do not share this code publicly.) Tj ET",
    "BT /F1 9 Tf 40 72 Td (Prices in XAF. Times shown in Africa/Douala.) Tj ET",
    "Q",
  ].join("\n");
  const textBytes = encoder.encode(text);

  pushText("%PDF-1.4\n");

  mark(1);
  pushText("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n");

  mark(2);
  pushText(
    "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n",
  );

  mark(3);
  pushText(
    "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] " +
      "/Resources << /Font << /F1 6 0 R /F2 7 0 R >> /XObject << /Im0 5 0 R >> >> " +
      "/Contents 4 0 R >>\nendobj\n",
  );

  mark(4);
  pushText(`4 0 obj\n<< /Length ${textBytes.length} >>\nstream\n`);
  pushBytes(textBytes);
  pushText("\nendstream\nendobj\n");

  mark(5);
  pushText(
    `5 0 obj\n<< /Type /XObject /Subtype /Image /Width ${imageWidth} /Height ${imageHeight} ` +
      `/ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`,
  );
  pushBytes(jpeg);
  pushText("\nendstream\nendobj\n");

  mark(6);
  pushText("6 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n");

  mark(7);
  pushText(
    "7 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj\n",
  );

  const xrefOffset = length;
  pushText("xref\n0 8\n0000000000 65535 f \n");
  for (let index = 1; index <= 7; index += 1) {
    pushText(`${String(offsets[index]).padStart(10, "0")} 00000 n \n`);
  }
  pushText(
    `trailer\n<< /Size 8 /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`,
  );

  const result = new Uint8Array(length);
  let cursor = 0;
  for (const chunk of chunks) {
    result.set(chunk, cursor);
    cursor += chunk.length;
  }
  return result;
}
