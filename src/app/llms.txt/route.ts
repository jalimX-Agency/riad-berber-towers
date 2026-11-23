import { site } from "@/lib/site";
import { getRooms } from "@/lib/rooms";
import { ACTIVITY_EXTRAS, DINNER_PRICE, TRANSFER_PRICE } from "@/lib/booking/extras";
import { activitiesCopy, COOKING, OUTINGS } from "@/lib/activities";
import { CASH_CURRENCIES, DEPOSIT_PERCENT } from "@/lib/booking/policy";

export const revalidate = 86400;

/** llms.txt: a plain summary of the riad for AI assistants (facts generated from the site's own data). */
export async function GET() {
  const rooms = await getRooms("en").catch(() => []);
  const c = activitiesCopy("en");
  const u = (p: string) => `${site.url}${p}`;
  const activityName = (slug: string) => {
    const o = OUTINGS.find((x) => x.slug === slug);
    return o ? c.outings.items[o.id].name : slug === COOKING.slug ? c.cooking.title : slug;
  };

  const text = `# ${site.name}

> Family guesthouse (riad) with ${site.rooms} rooms in the centre of Imlil, High Atlas, Morocco, at ${site.altitudeM} m, ${site.fromMarrakechKm} km (about 1 h 30) from Marrakech and at the start of the trail to Mount Toubkal (4,167 m), North Africa's highest peak. Built by hand with tadelakt, Fes zellij and carved cedar; land bought in 2014, opened in 2025. Breakfast on the roof terrace is included.

## Key facts
- Address: ${site.address.street}, ${site.address.locality}, ${site.address.region}, Morocco
- Email: ${site.email}
- Phone / WhatsApp: ${site.phones.join(", ")}
- Rooms: ${rooms.map((r) => `${r.name} (from €${r.price}/night)`).join("; ")}
- Every room: breakfast included, heated floors, Wi-Fi, one king-size bed or two separate beds
- House rules: no children under 12, no animals, no parties or celebrations, no alcohol on the premises; Moroccan nationals and nationals of other Arab countries travelling as a couple must show a valid marriage certificate at check-in; up to 2 guests per room (Suite Toubkal takes a third guest)
- Payment: ${DEPOSIT_PERCENT}% non-refundable advance to confirm, balance in cash on arrival (${CASH_CURRENCIES.join(", ")})
- Languages of the website: English, French, Spanish, German, Arabic

## Services bookable with a room
${ACTIVITY_EXTRAS.map((a) => `- ${activityName(a.slug)}: €${a.price} per person (${u(`/activities/${a.slug}`)})`).join("\n")}
- Dinner at the riad (Moroccan and Berber set menu, 18:00-21:00, order before 14:00): €${DINNER_PRICE} per person (${u("/restaurant")})
- Private transfer from Marrakech (airport, hotel or riad): €${TRANSFER_PRICE} per transfer

## Pages
- [Rooms and prices](${u("/rooms")})
- [Activities](${u("/activities")})
- [Restaurant](${u("/restaurant")})
- [Imlil guide: when to go, how to get there, Toubkal](${u("/imlil")})
- [Our story](${u("/story")})
- [Gallery](${u("/gallery")})
- [Contact and FAQ](${u("/contact")})
- [Booking terms](${u("/terms")})

## Partner
- Toubkal Peaks (same owners): Toubkal treks, Atlas valleys, Sahara and city tours, ${site.partner.url}
`;
  return new Response(text, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=3600" } });
}
