import { readFile } from "node:fs/promises";
import path from "node:path";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { getTranslations } from "next-intl/server";
import { db } from "@/lib/db";
import { site } from "@/lib/site";
import { formatPrice } from "@/lib/rooms";
import { formatStayDate } from "@/lib/email/booking";
import { bookingPayment } from "./payment";
import { CASH_CURRENCIES, DEPOSIT_PERCENT } from "./policy";

// Brand colours (globals.css)
const INK = rgb(0.184, 0.125, 0.086); // #2F2016
const EARTH = rgb(0.584, 0.341, 0.22); // #955738
const MUTED = rgb(0.424, 0.455, 0.447); // #6C7472
const RULE = rgb(0.851, 0.812, 0.725); // #d9cfb9
const PAPER = rgb(0.969, 0.953, 0.918); // #F7F3EA

/**
 * The reservation voucher ("fiche de réservation") sent with the confirmation email.
 * Built with the standard PDF fonts, which cover Latin scripts only: Arabic-speaking guests get the
 * English voucher (their email itself is in Arabic). Characters the fonts can't draw become "?".
 */
export async function buildVoucher(bookingId: string): Promise<{ filename: string; bytes: Uint8Array } | null> {
  const b = await db.booking.findUnique({
    where: { id: bookingId },
    include: { guest: true, room: { include: { translations: true } } },
  });
  if (!b) return null;

  const locale = b.locale === "ar" ? "en" : b.locale;
  const t = await getTranslations({ locale, namespace: "voucher" });
  const ts = await getTranslations({ locale, namespace: "search" });
  const tp = await getTranslations({ locale, namespace: "policy" });
  const tb = await getTranslations({ locale, namespace: "book" });
  const roomName = b.room.translations.find((x) => x.locale === locale)?.name || b.room.name;
  const pay = bookingPayment(b);
  const money = (n: number) => formatPrice(n, b.currency, locale).replace(/ | /g, " ");

  const doc = await PDFDocument.create();
  doc.setTitle(`${t("title")} ${b.reference}`);
  doc.setAuthor(site.name);
  const page = doc.addPage([595.28, 841.89]); // A4
  const serif = await doc.embedFont(StandardFonts.TimesRoman);
  const sans = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  // keep only what the WinAnsi fonts can encode
  const safe = (font: PDFFont, s: string) =>
    [...s.replace(/ | /g, " ")]
      .map((c) => {
        try {
          font.encodeText(c);
          return c;
        } catch {
          return "?";
        }
      })
      .join("");
  const text = (p: PDFPage, s: string, x: number, y: number, size: number, font: PDFFont, color = INK) =>
    p.drawText(safe(font, s), { x, y, size, font, color });
  const right = (p: PDFPage, s: string, xEnd: number, y: number, size: number, font: PDFFont, color = INK) => {
    const v = safe(font, s);
    p.drawText(v, { x: xEnd - font.widthOfTextAtSize(v, size), y, size, font, color });
  };
  // wrap a paragraph to a width; returns the y after the last line
  const para = (s: string, x: number, y: number, width: number, size: number, font: PDFFont, color = INK, lead = 1.45) => {
    const words = safe(font, s).split(" ");
    let line = "";
    for (const w of words) {
      const test = line ? `${line} ${w}` : w;
      if (font.widthOfTextAtSize(test, size) > width && line) {
        page.drawText(line, { x, y, size, font, color });
        y -= size * lead;
        line = w;
      } else line = test;
    }
    if (line) page.drawText(line, { x, y, size, font, color });
    return y - size * lead;
  };

  const W = page.getWidth();
  const M = 48;
  page.drawRectangle({ x: 0, y: 0, width: W, height: page.getHeight(), color: PAPER });

  // header: logo + title
  try {
    const png = await doc.embedPng(await readFile(path.join(process.cwd(), "public/brand/rbt-horizontal-color-email.png")));
    const w = 190;
    page.drawImage(png, { x: M, y: 770, width: w, height: (png.height / png.width) * w });
  } catch {
    text(page, site.name, M, 790, 22, serif);
  }
  right(page, t("title"), W - M, 796, 20, serif, INK);
  right(page, b.reference, W - M, 776, 13, bold, EARTH);
  page.drawLine({ start: { x: M, y: 752 }, end: { x: W - M, y: 752 }, thickness: 1, color: RULE });

  // status ribbon
  page.drawRectangle({ x: M, y: 714, width: W - 2 * M, height: 26, color: rgb(0.894, 0.949, 0.918) });
  text(page, t("confirmed"), M + 12, 723, 11, bold, rgb(0.024, 0.373, 0.275));
  right(page, `${t("issued")} ${formatStayDate(new Date(), locale)}`, W - M - 12, 723, 9, sans, MUTED);

  // two columns: stay / guest
  const rows = (x: number, y: number, title: string, items: [string, string][], colW: number) => {
    text(page, title.toUpperCase(), x, y, 9, bold, EARTH);
    y -= 18;
    for (const [k, v] of items) {
      text(page, k, x, y, 9, sans, MUTED);
      y = para(v, x, y - 13, colW, 11, sans, INK, 1.3) - 6;
    }
    return y;
  };
  const colW = (W - 2 * M - 24) / 2;
  const stayEnd = rows(M, 690, t("stay"), [
    [t("room"), roomName],
    [ts("checkIn"), formatStayDate(b.checkIn, locale)],
    [ts("checkOut"), formatStayDate(b.checkOut, locale)],
    [t("guests"), `${ts("nights", { count: b.nights })}, ${ts("adults", { count: b.adults })}`],
    [tb("bed"), tb(`beds.${b.bedSetup}`)],
    [t("included"), t("breakfast")],
  ], colW);
  const guestEnd = rows(M + colW + 24, 690, t("guest"), [
    [t("name"), `${b.guest.firstName} ${b.guest.lastName}`],
    [t("email"), b.guest.email || "-"],
    [t("phone"), b.guest.phone || "-"],
    ...(b.arrivalTime ? ([[t("arrival"), b.arrivalTime]] as [string, string][]) : []),
  ], colW);

  // payment table
  let y = Math.min(stayEnd, guestEnd) - 14;
  page.drawLine({ start: { x: M, y }, end: { x: W - M, y }, thickness: 1, color: RULE });
  y -= 22;
  text(page, t("payment").toUpperCase(), M, y, 9, bold, EARTH);
  y -= 22;
  const money3: [string, string, boolean][] = [
    [t("total"), money(pay.total), false],
    [t("depositPaid", { percent: DEPOSIT_PERCENT }), money(pay.deposit), false],
    [t("balanceDue"), money(pay.balance), true],
  ];
  for (const [k, v, strong] of money3) {
    text(page, k, M, y, strong ? 12 : 11, strong ? bold : sans, INK);
    right(page, v, W - M, y, strong ? 14 : 11, strong ? bold : sans, strong ? EARTH : INK);
    y -= 8;
    page.drawLine({ start: { x: M, y }, end: { x: W - M, y }, thickness: 0.5, color: RULE });
    y -= 18;
  }
  y = para(tp("balance", { currencies: CASH_CURRENCIES.join(", ") }), M, y, W - 2 * M, 10, sans, MUTED);

  // house rules
  y -= 10;
  text(page, t("rules").toUpperCase(), M, y, 9, bold, EARTH);
  y -= 18;
  for (const rule of [tp("adultsOnly"), tp("noPets"), tp("deposit", { percent: DEPOSIT_PERCENT })]) {
    page.drawCircle({ x: M + 3, y: y + 3, size: 1.6, color: EARTH });
    y = para(rule, M + 12, y, W - 2 * M - 12, 10, sans, INK);
  }

  // footer: how to reach us
  page.drawRectangle({ x: 0, y: 0, width: W, height: 96, color: rgb(0.29, 0.212, 0.157) });
  text(page, site.name, M, 66, 14, serif, PAPER);
  text(page, t("address"), M, 48, 9, sans, PAPER);
  text(page, `${site.phones.join("  ·  ")}`, M, 34, 9, sans, PAPER);
  text(page, `${site.email}  ·  WhatsApp +${site.whatsapp}  ·  ${site.url.replace(/^https?:\/\//, "")}`, M, 20, 9, sans, PAPER);
  right(page, t("thanks"), W - M, 66, 11, serif, PAPER);

  return { filename: `${b.reference}.pdf`, bytes: await doc.save() };
}
