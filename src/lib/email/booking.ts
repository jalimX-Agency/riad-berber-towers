import { Resend } from "resend";
import { getTranslations } from "next-intl/server";
import { db } from "@/lib/db";
import { site } from "@/lib/site";
import { formatPrice } from "@/lib/rooms";
import { localePath } from "@/i18n/routing";

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export function formatStayDate(d: Date, locale: string) {
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-MA" : locale, {
    weekday: "short",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(d);
}

function layout(body: string, dir: "ltr" | "rtl") {
  return `<!doctype html><html dir="${dir}"><body style="margin:0;background:#EEE7D6;font-family:Georgia,'Times New Roman',serif;color:#2F2016">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#EEE7D6;padding:32px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#F7F3EA;border:1px solid #d9cfb9">
<tr><td style="padding:28px 32px 8px"><img src="${site.url}/brand/rbt-horizontal-color-email.png" alt="${site.name}" width="220" style="display:block;width:220px;max-width:100%"></td></tr>
<tr><td style="padding:8px 32px 32px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6">${body}</td></tr>
<tr><td style="padding:16px 32px;background:#4A3628;color:#EEE7D6;font-family:Arial,Helvetica,sans-serif;font-size:12px">${site.name} · Imlil, High Atlas · ${site.phones[0]} · ${site.email}</td></tr>
</table></td></tr></table></body></html>`;
}

const row = (k: string, v: string) =>
  `<tr><td style="padding:8px 0;border-bottom:1px solid #e3dac6;color:#6C7472">${esc(k)}</td><td style="padding:8px 0;border-bottom:1px solid #e3dac6;text-align:end;font-weight:bold">${esc(v)}</td></tr>`;

/**
 * Sends the guest confirmation (in their language) and the owner notification.
 * Never throws: an email failure must not lose a booking. Skips when Resend isn't configured.
 */
export async function sendBookingEmails(bookingId: string) {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  const admin = process.env.EMAIL_ADMIN || site.email;
  if (!key || !from) {
    console.info(`[email] Resend not configured, skipped emails for booking ${bookingId}`);
    return;
  }

  try {
    const b = await db.booking.findUnique({
      where: { id: bookingId },
      include: { guest: true, room: { include: { translations: true } } },
    });
    if (!b) return;
    const locale = b.locale;
    const t = await getTranslations({ locale, namespace: "email" });
    const tb = await getTranslations({ locale, namespace: "book" });
    const ts = await getTranslations({ locale, namespace: "search" });
    const roomName = b.room.translations.find((x) => x.locale === locale)?.name || b.room.name;
    const total = formatPrice(Number(b.total), b.currency, locale);
    const resend = new Resend(key);

    const guestHtml = layout(
      `<h1 style="font-family:Georgia,serif;font-weight:normal;font-size:26px;margin:16px 0 8px">${esc(t("guest.title", { name: b.guest.firstName }))}</h1>
<p>${esc(t("guest.intro"))}</p>
<p style="font-size:13px;color:#6C7472;margin:20px 0 4px">${esc(tb("reference"))}</p>
<p style="font-family:'Courier New',monospace;font-size:22px;letter-spacing:2px;margin:0 0 16px;color:#955738">${b.reference}</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
${row(tb("room"), roomName)}
${row(ts("checkIn"), formatStayDate(b.checkIn, locale))}
${row(ts("checkOut"), formatStayDate(b.checkOut, locale))}
${row(tb("stay"), `${ts("nights", { count: b.nights })}, ${ts("adults", { count: b.adults })}`)}
${row(tb("total"), total)}
${row(tb("payment"), tb("payOnArrival"))}
</table>
<p style="margin-top:20px">${esc(t("guest.next"))}</p>
<p><a href="https://wa.me/${site.whatsapp}" style="color:#955738">WhatsApp ${site.phones[0]}</a></p>
<p style="color:#6C7472;font-size:13px">${esc(t("guest.signoff"))}</p>`,
      locale === "ar" ? "rtl" : "ltr",
    );

    const adminUrl = `${site.url}/admin`;
    const ownerHtml = layout(
      `<h1 style="font-family:Georgia,serif;font-weight:normal;font-size:24px;margin:16px 0 8px">New booking request · ${b.reference}</h1>
<p>Status: <b>PENDING</b>. Please confirm with the guest (reply to this email goes to them).</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
${row("Room", b.room.name)}
${row("Check-in", formatStayDate(b.checkIn, "en"))}
${row("Check-out", formatStayDate(b.checkOut, "en"))}
${row("Stay", `${b.nights} night(s), ${b.adults} adult(s)`)}
${row("Total (pay on arrival)", formatPrice(Number(b.total), b.currency, "en"))}
${row("Guest", `${b.guest.firstName} ${b.guest.lastName}`)}
${row("Email", b.guest.email)}
${row("Phone", b.guest.phone)}
${row("Country", b.guest.country || "-")}
${row("Arrival time", b.arrivalTime || "-")}
${row("Language", locale.toUpperCase())}
</table>
${b.specialRequests ? `<p style="margin-top:16px"><b>Special requests</b><br>${esc(b.specialRequests).replace(/\n/g, "<br>")}</p>` : ""}
<p><a href="https://wa.me/${b.guest.phone.replace(/\D/g, "")}" style="color:#955738">WhatsApp the guest</a> · <a href="${adminUrl}" style="color:#955738">Open admin</a></p>`,
      "ltr",
    );

    const results = await Promise.allSettled([
      resend.emails.send({
        from,
        to: b.guest.email,
        replyTo: site.email,
        subject: t("guest.subject", { reference: b.reference }),
        html: guestHtml,
      }),
      resend.emails.send({
        from,
        to: admin,
        replyTo: b.guest.email,
        subject: `New booking ${b.reference} · ${b.room.name} · ${formatStayDate(b.checkIn, "en")}`,
        html: ownerHtml,
      }),
    ]);
    results.forEach((r, i) => {
      const who = i === 0 ? "guest" : "owner";
      if (r.status === "rejected") console.error(`[email] ${who} send failed for ${b.reference}`, r.reason);
      else if (r.value.error) console.error(`[email] ${who} send failed for ${b.reference}`, r.value.error);
      else console.info(`[email] ${who} email sent for ${b.reference} (id ${r.value.data?.id})`);
    });
  } catch (e) {
    console.error("[email] booking emails failed", e);
  }
}

export const confirmationPath = (locale: string, id: string) => localePath(locale, `/book/confirmed/${id}`);
