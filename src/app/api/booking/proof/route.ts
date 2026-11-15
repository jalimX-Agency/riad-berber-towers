import { after, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendProofToOwner } from "@/lib/email/booking";
import { MAX_PROOF_BYTES } from "@/lib/booking/policy";

export const dynamic = "force-dynamic";

const MAX_PROOFS_PER_BOOKING = 5;

/** The real type from the file's first bytes (never trust the browser's MIME type or the extension). */
function sniff(b: Uint8Array): string | null {
  const ascii = (from: number, to: number) => String.fromCharCode(...b.slice(from, to));
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b[0] === 0x89 && ascii(1, 4) === "PNG") return "image/png";
  if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return "image/webp";
  if (ascii(0, 5) === "%PDF-") return "application/pdf";
  if (ascii(4, 8) === "ftyp" && ["heic", "heix", "heif", "mif1", "msf1"].includes(ascii(8, 12))) return "image/heic";
  return null;
}

/**
 * POST /api/booking/proof (multipart: token, file)
 * The guest uploads the proof of the deposit payment from their payment page.
 * The booking then waits for the riad to check it (PAYMENT_REVIEW).
 */
export async function POST(req: Request) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }
  const token = String(form.get("token") ?? "");
  const file = form.get("file");
  if (!/^[\w-]{20,64}$/.test(token)) return NextResponse.json({ error: "invalid" }, { status: 400 });
  if (!(file instanceof File) || file.size === 0) return NextResponse.json({ error: "missing" }, { status: 400 });
  if (file.size > MAX_PROOF_BYTES) return NextResponse.json({ error: "too_big" }, { status: 413 });

  const booking = await db.booking.findFirst({
    where: { payToken: token },
    select: { id: true, status: true, _count: { select: { proofs: true } } },
  });
  if (!booking) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (booking.status !== "AWAITING_PAYMENT" && booking.status !== "PAYMENT_REVIEW") return NextResponse.json({ error: "closed" }, { status: 409 });
  if (booking._count.proofs >= MAX_PROOFS_PER_BOOKING) return NextResponse.json({ error: "too_many" }, { status: 429 });

  const bytes = new Uint8Array(await file.arrayBuffer());
  const mimeType = sniff(bytes);
  if (!mimeType) return NextResponse.json({ error: "type" }, { status: 415 });

  const filename = (file.name || "proof").replace(/[^\w.\- ]/g, "_").slice(-100);
  await db.$transaction([
    db.paymentProof.create({ data: { bookingId: booking.id, filename, mimeType, size: bytes.length, data: bytes } }),
    db.booking.update({ where: { id: booking.id }, data: { status: "PAYMENT_REVIEW" } }),
  ]);
  // tell the riad after the response, so the guest doesn't wait for the email
  after(() => sendProofToOwner(booking.id));
  return NextResponse.json({ ok: true });
}
