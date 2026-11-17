import type { RestaurantCopy } from "@/lib/restaurant";

const fr: RestaurantCopy = {
  meta: {
    title: "Restaurant : dîner marocain et berbère à Imlil",
    description: "Dîner marocain et berbère traditionnel à Riad Berber Towers, au centre d’Imlil : soupe et salades, tajine ou couscous, fruits et thé à la menthe. Servi de 18 h à 21 h, commande avant 14 h.",
  },
  label: "Restaurant",
  title: "Dîner au riad",
  lead: "Une cuisine marocaine et berbère traditionnelle, préparée dans notre cuisine et servie à votre table. Un goût du Maroc au cœur de l’Atlas.",
  price: { per: "par personne", what: "Menu du dîner : entrée, plat et dessert" },
  card: { title: "Menu", subtitle: "Cuisine marocaine & berbère traditionnelle", footer: "Riad Berber Towers · Imlil · Maroc" },
  starters: {
    title: "Entrées",
    note: "Choisissez une option",
    option: "Option",
    options: [
      ["Soupe marocaine traditionnelle aux légumes", "Taktouka, salade cuite de tomates et poivrons"],
      ["Soupe marocaine traditionnelle aux légumes", "Salade de riz marocaine"],
      ["Soupe marocaine traditionnelle aux légumes", "Légumes de saison sautés"],
    ],
  },
  mains: {
    title: "Plat principal",
    note: "Choisissez un plat",
    items: ["Tajine de poulet au citron confit et aux olives", "Tajine de bœuf ou d’agneau aux pruneaux", "Couscous aux sept légumes, au poulet ou à l’agneau"],
  },
  dessert: { title: "Dessert & rafraîchissements", items: ["Fruits frais de saison", "Thé à la menthe traditionnel", "Eau minérale"] },
  drinks: {
    title: "Boissons",
    names: { coke: "Coca-Cola", cokeZero: "Coca-Cola Zero", sprite: "Sprite", hawai: "Hawaï", schweppes: "Schweppes Citron", orange: "Jus d’orange frais" },
    tbc: "sur demande",
  },
  timing: {
    title: "Comment ça marche",
    order: "Avant 14 h",
    orderText: "Dites-nous que vous dînez au riad et choisissez votre entrée et votre plat.",
    dinner: "18 h – 21 h",
    dinnerText: "Le dîner est servi dans notre salle à manger, à votre table.",
    lunch: "Déjeuner",
    lunchText: "Le déjeuner, ou un dîner à une autre heure, s’organise avec nous.",
  },
  diets: { title: "Tous les régimes à table", text: "Dites-le-nous à la commande et nous adaptons le menu.", items: ["Végétarien", "Végan", "Sans gluten", "Sans lactose"] },
  alts: {
    tagines: "Tajines, salades et pain sur une table dressée pour le dîner à Riad Berber Towers",
    couscous: "Couscous aux sept légumes et tajine servis à table",
    serving: "Des hôtes se servent le couscous et le tajine",
    room: "Des hôtes dînent dans la salle à manger de Riad Berber Towers",
  },
  cta: {
    title: "Dînez avec nous",
    text: "Commandez avant 14 h sur WhatsApp ou à la réception, avec votre choix d’entrée et de plat.",
    withRoom: "Vous séjournez chez nous ? Ajoutez le dîner en réservant votre chambre.",
    roomLink: "Réserver une chambre",
    button: "Commander le dîner sur WhatsApp",
    message: "Bonjour, nous souhaitons dîner ce soir à Riad Berber Towers. Nombre de personnes : ",
  },
};

export default fr;
