import type { RestaurantCopy } from "@/lib/restaurant";

const de: RestaurantCopy = {
  meta: {
    title: "Restaurant: marokkanisches und Berber-Abendessen in Imlil",
    description: "Traditionelles marokkanisches und Berber-Abendessen im Riad Berber Towers im Zentrum von Imlil: Suppe und Salate, Tajine oder Couscous, Obst und Minztee. 18:00–21:00 Uhr, Bestellung bis 14:00 Uhr.",
  },
  label: "Restaurant",
  title: "Abendessen im Riad",
  lead: "Traditionelle marokkanische und Berberküche, in unserer Küche zubereitet und an Ihrem Tisch serviert. Ein Geschmack Marokkos im Herzen des Atlas.",
  price: { per: "pro Person", what: "Abendmenü: Vorspeise, Hauptgericht und Dessert" },
  card: { title: "Menü", subtitle: "Traditionelle marokkanische & Berberküche", footer: "Riad Berber Towers · Imlil · Marokko" },
  starters: {
    title: "Vorspeisen",
    note: "Wählen Sie eine Option",
    option: "Option",
    options: [
      ["Traditionelle marokkanische Gemüsesuppe", "Taktouka, gekochter Tomaten-Paprika-Salat"],
      ["Traditionelle marokkanische Gemüsesuppe", "Marokkanischer Reissalat"],
      ["Traditionelle marokkanische Gemüsesuppe", "Gebratenes Saisongemüse"],
    ],
  },
  mains: {
    title: "Hauptgericht",
    note: "Wählen Sie ein Gericht",
    items: ["Hähnchen-Tajine mit eingelegter Zitrone und Oliven", "Rind- oder Lamm-Tajine mit Pflaumen", "Couscous mit sieben Gemüsen, mit Hähnchen oder Lamm"],
  },
  dessert: { title: "Dessert & Erfrischungen", items: ["Frisches Saisonobst", "Traditioneller Minztee", "Mineralwasser"] },
  drinks: {
    title: "Getränke",
    names: { coke: "Coca-Cola", cokeZero: "Coca-Cola Zero", sprite: "Sprite", hawai: "Hawaï", schweppes: "Schweppes Lemon", orange: "Frischer Orangensaft" },
    tbc: "auf Anfrage",
  },
  timing: {
    title: "So funktioniert es",
    order: "Bis 14:00 Uhr",
    orderText: "Sagen Sie uns, dass Sie zum Abendessen kommen, und wählen Sie Vorspeise und Hauptgericht.",
    dinner: "18:00 – 21:00",
    dinnerText: "Das Abendessen wird in unserem Speiseraum an Ihrem Tisch serviert.",
    lunch: "Mittagessen",
    lunchText: "Mittagessen oder ein Abendessen zu einer anderen Zeit vereinbaren Sie mit uns.",
  },
  diets: { title: "Jede Ernährungsweise am Tisch", text: "Sagen Sie es uns bei der Bestellung, wir passen das Menü an.", items: ["Vegetarisch", "Vegan", "Glutenfrei", "Laktosefrei"] },
  alts: {
    tagines: "Tajines, Salate und Brot auf einem gedeckten Tisch im Riad Berber Towers",
    couscous: "Couscous mit sieben Gemüsen und Tajine am Tisch serviert",
    serving: "Gäste bedienen sich mit Couscous und Tajine",
    room: "Gäste beim Abendessen im Speiseraum des Riad Berber Towers",
  },
  cta: {
    title: "Essen Sie mit uns zu Abend",
    text: "Bestellen Sie bis 14:00 Uhr per WhatsApp oder an der Rezeption, mit Ihrer Wahl von Vorspeise und Hauptgericht.",
    withRoom: "Sie wohnen bei uns? Buchen Sie das Abendessen mit Ihrem Zimmer dazu.",
    roomLink: "Zimmer buchen",
    button: "Abendessen per WhatsApp bestellen",
    message: "Hallo, wir möchten heute Abend im Riad Berber Towers essen. Anzahl der Personen: ",
  },
};

export default de;
