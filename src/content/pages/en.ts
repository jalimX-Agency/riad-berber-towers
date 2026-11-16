import type { PagesCopy } from "@/lib/pages";

const en: PagesCopy = {
  story: {
    meta: {
      title: "Our story: one day at Riad Berber Towers",
      description:
        "A day at Riad Berber Towers in Imlil, hour by hour: light on the ridge, breakfast on the roof, tea by the zellij fountain and lamps on the terrace. And what the house is made of.",
    },
    label: "Our story",
    title: ["A mountain house", "made by hand"],
    lead: "Three floors of tadelakt, Fes zellij and carved wood, at the end of the road from Marrakech. Rather than tell you about it, here is what a day in it feels like.",
    facts: ["Imlil · 1,740 m", "3 floors + roof", "7 rooms"],
    day: {
      label: "One day at the house",
      title: "From first light to the last lamp",
      hours: [
        {
          time: "06:00",
          title: "Light on the ridge",
          text: "The sun reaches the peaks long before the village. Below, the walnut trees are still blue with shade, and the river is the loudest thing in Imlil.",
          alt: "Riad Berber Towers among the walnut trees in the early light",
        },
        {
          time: "08:30",
          title: "Breakfast on the roof",
          text: "Breakfast is carried up to the terrace. You eat with the Toubkal ridges right in front of the table and the village waking up below.",
          alt: "The roof terrace of Riad Berber Towers seen from above",
        },
        {
          time: "10:00",
          title: "Out of the door",
          text: "The trail starts in the street outside. Mules pass with loads for the mountain; walkers head up towards Aroumd or over to Tamatert.",
          alt: "The tower of Riad Berber Towers with the mountains behind",
        },
        {
          time: "13:00",
          title: "Back for lunch",
          text: "Some days the kitchen smells of khobz and a tagine that has been cooking slowly all morning. On cooking-class days, guests knead the dough themselves.",
          alt: "Ingredients for a tagine laid out in the kitchen",
        },
        {
          time: "17:00",
          title: "Tea by the fountain",
          text: "The salon fills with the sound of the zellij fountain. Tea is poured from high, and tomorrow's walk is planned on the low sofas.",
          alt: "Mint tea served beside the zellij fountain in the salon",
        },
        {
          time: "21:00",
          title: "Lamps on the terrace",
          text: "The village goes quiet, the terrace lamps come on and the sky over the Atlas fills with stars. Downstairs, the floors are warm.",
          alt: "Riad Berber Towers at night with the terrace lamps lit",
        },
      ],
    },
    touch: {
      label: "Touch",
      title: "What the house is made of",
      materials: [
        {
          name: "Fes zellij",
          text: "Glazed tiles cut by hand, piece by piece. On the floors, around the fountain and in every shower.",
        },
        {
          name: "Carved wood",
          text: "Doors, beams, the reception counter and the gallery around the atrium.",
        },
        {
          name: "Tadelakt",
          text: "Lime plaster polished with a stone and black soap until it is smooth and warm.",
        },
        {
          name: "Wrought iron",
          text: "The balustrades that ring the open atrium on every floor.",
        },
        {
          name: "Coloured glass",
          text: "The skylight at the top of the house, dropping coloured light down the atrium all day.",
        },
      ],
    },
    word: {
      label: "One word before you come",
      word: "Azul",
      text: "means hello in Tashelhit, the language of the valley. Our name says Berber because that is the word travellers know. Here, people call themselves Imazighen.",
    },
    end: {
      title: "Stay a day. Or seven.",
      text: "Seven rooms, three floors and a roof terrace facing Toubkal.",
      rooms: "See the rooms",
      contact: "Write to us",
    },
  },
  contact: {
    meta: {
      title: "Contact Riad Berber Towers in Imlil",
      description:
        "WhatsApp, phone, email and directions to Riad Berber Towers in the centre of Imlil, High Atlas, Morocco.",
    },
    label: "Contact",
    title: "We are here to help",
    lead: "A question about a room, an activity or the road to Imlil? Write to us. The fastest way to reach us is WhatsApp.",
    whatsapp: {
      title: "WhatsApp",
      text: "Usually the quickest way to reach us.",
      button: "Message us on WhatsApp",
      message: "Hello Riad Berber Towers, I have a question.",
    },
    phone: "Phone",
    email: {
      title: "Email",
      text: "For longer questions, group stays or special requests.",
    },
    address: {
      title: "Address",
      lines: ["Riad Berber Towers", "Imlil Centre, Asni", "Al Haouz, Morocco"],
      map: "Open in Google Maps",
    },
    find: {
      title: "Finding us",
      text: "The road from Marrakech ends in the centre of Imlil, and the house is a few steps away. Send us a message when you arrive and we will guide you to the door.",
    },
    faq: {
      title: "Frequent questions",
      items: [
        {
          q: "Is breakfast included?",
          a: "Yes. Every night includes breakfast, served on the roof terrace.",
        },
        {
          q: "Do you accept children?",
          a: "No. Riad Berber Towers is for adults only.",
        },
        {
          q: "Can I bring my pet?",
          a: "No. Animals are not allowed at the riad.",
        },
        {
          q: "How do I pay?",
          a: "A {deposit}% advance confirms the booking and is not refundable. The rest is paid in cash on arrival: {currencies}.",
        },
        {
          q: "How many guests per room?",
          a: "Up to {max} guests per room. Suite Toubkal takes a third guest, with {percent}% added to the price.",
        },
        {
          q: "One bed or two?",
          a: "Every room can be set up with one king-size bed or two separate beds. You choose when you book.",
        },
        {
          q: "Is it warm in winter?",
          a: "Yes. Every room has heated floors, and there is Wi-Fi throughout the house.",
        },
        {
          q: "Can you organise activities?",
          a: "Yes: guided hikes, mountain biking and a Moroccan cooking class, all from the house. See our activities page.",
        },
      ],
    },
  },
  gallery: {
    meta: {
      title: "Gallery: photos of Riad Berber Towers in Imlil",
      description:
        "Photos of Riad Berber Towers: the house, the rooms, the zellij bathrooms, mint tea and our kitchen, in the village of Imlil.",
    },
    label: "Gallery",
    title: "The house in pictures",
    lead: "Wood, zellij and light, from the fountain to the roof terrace.",
    all: "All",
    categories: {
      house: "The house",
      rooms: "Rooms",
      bathrooms: "Bathrooms",
      tea: "Mint tea",
      kitchen: "Kitchen",
    },
    close: "Close",
    prev: "Previous photo",
    next: "Next photo",
    open: "Open photo",
  },
  legal: {
    updated: "Last updated: 16 November 2026",
    terms: {
      meta: {
        title: "Booking terms",
        description:
          "Booking, payment and stay conditions at Riad Berber Towers, Imlil.",
      },
      title: "Booking terms",
      intro:
        "These terms apply to every booking made with Riad Berber Towers, on this website, by WhatsApp, by email or by phone. By booking, you accept them.",
      sections: [
        {
          title: "1. The guesthouse",
          paras: [
            "Riad Berber Towers is a guesthouse in Imlil Centre, Asni, Al Haouz, Morocco. Contact: riadberbertowers@gmail.com, +212 661 283 086.",
          ],
        },
        {
          title: "2. Booking",
          paras: [
            "A booking request made on this website is confirmed once we have received the advance payment and sent you a confirmation by email.",
            "Prices are per room and per night, breakfast included, in the currency shown at the time of booking.",
          ],
        },
        {
          title: "3. Advance payment",
          paras: [
            "A {deposit}% advance of the total price confirms the booking. This advance is not refundable, including if the stay is cancelled, shortened or not used.",
          ],
        },
        {
          title: "4. Balance",
          paras: [
            "The balance is paid in cash on arrival, in one of these currencies: {currencies}.",
          ],
        },
        {
          title: "5. Changes and cancellations",
          paras: [
            "Please contact us as early as possible if you need to change your dates. We will do our best to move your booking, subject to availability. The advance payment is not refunded in case of cancellation or no-show.",
          ],
        },
        {
          title: "6. House rules",
          paras: [
            "The riad is for adults only: children are not accepted.",
            "Animals are not allowed.",
            "Up to {max} guests per room. Suite Toubkal takes a third guest, with {percent}% added to the price.",
            "Please respect the calm of the house and of the village, and take care of the rooms and their furnishings. Damage caused during the stay may be charged.",
          ],
        },
        {
          title: "7. Activities",
          paras: [
            "Hikes, mountain biking and other activities are organised with local guides. Itineraries may change with the weather and mountain conditions. Guests take part according to their own fitness and are responsible for choosing an activity suited to them; we recommend appropriate travel insurance.",
          ],
        },
        {
          title: "8. Liability",
          paras: [
            "We are not responsible for loss or theft of personal belongings left unattended, or for events beyond our control (weather, road closures, natural events).",
          ],
        },
        {
          title: "9. Law",
          paras: [
            "These terms are governed by Moroccan law. In case of a disagreement, we will first look for a friendly solution with you.",
          ],
        },
      ],
    },
    privacy: {
      meta: {
        title: "Privacy policy",
        description:
          "How Riad Berber Towers collects and uses your personal data.",
      },
      title: "Privacy policy",
      intro:
        "We collect only the information we need to welcome you, and we never sell it. This page explains what we collect, why, and your rights.",
      sections: [
        {
          title: "1. Who we are",
          paras: [
            "Riad Berber Towers, Imlil Centre, Asni, Al Haouz, Morocco, is responsible for your data. Contact: riadberbertowers@gmail.com.",
          ],
        },
        {
          title: "2. What we collect",
          paras: [
            "When you book: your first and last name, email, phone number, country (optional), dates, number of guests, bed choice, arrival time and any special requests.",
            "If you send us a payment proof, the file you upload.",
            "When you write to us by WhatsApp or email, the content of your messages.",
          ],
        },
        {
          title: "3. Why we use it",
          paras: [
            "To manage your booking and your stay, to send you confirmations and payment information, to answer your questions, and to meet our legal and accounting obligations. We do not send newsletters or advertising.",
          ],
        },
        {
          title: "4. Who can see it",
          paras: [
            "Only our team. To run the website we use trusted providers who process data on our behalf: Vercel (hosting), Neon (database, hosted in the European Union), Cloudflare R2 (file storage) and Resend (email delivery). Payments made through PayPal are handled by PayPal under its own policy.",
          ],
        },
        {
          title: "5. How long we keep it",
          paras: [
            "Booking data is kept as long as needed for your stay and for our legal and accounting obligations, then deleted. Payment proofs are kept only as long as they are needed.",
          ],
        },
        {
          title: "6. Cookies",
          paras: [
            "This website uses only the cookies needed for it to work (for example the language you choose, and the sign-in of our staff in the administration area). We do not use advertising or tracking cookies.",
          ],
        },
        {
          title: "7. Your rights",
          paras: [
            "You can ask to see, correct or delete your data, or object to its use, by writing to riadberbertowers@gmail.com. These rights are protected by Moroccan law 09-08 and, for guests from the European Union, by the GDPR. You can also contact the CNDP, the Moroccan data protection authority.",
          ],
        },
      ],
    },
  },
};

export default en;
