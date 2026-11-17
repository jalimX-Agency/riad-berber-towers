import type { RestaurantCopy } from "@/lib/restaurant";

const es: RestaurantCopy = {
  meta: {
    title: "Restaurante: cena marroquí y bereber en Imlil",
    description: "Cena tradicional marroquí y bereber en Riad Berber Towers, en el centro de Imlil: sopa y ensaladas, tajín o cuscús, fruta y té de menta. De 18:00 a 21:00, pedido antes de las 14:00.",
  },
  label: "Restaurante",
  title: "Cena en el riad",
  lead: "Cocina tradicional marroquí y bereber, preparada en nuestra cocina y servida en tu mesa. Un sabor de Marruecos en el corazón del Atlas.",
  price: { per: "por persona", what: "Menú de cena: entrante, plato principal y postre" },
  card: { title: "Menú", subtitle: "Cocina tradicional marroquí y bereber", footer: "Riad Berber Towers · Imlil · Marruecos" },
  starters: {
    title: "Entrantes",
    note: "Elige una opción",
    option: "Opción",
    options: [
      ["Sopa tradicional marroquí de verduras", "Taktouka, ensalada cocida de tomate y pimiento"],
      ["Sopa tradicional marroquí de verduras", "Ensalada marroquí de arroz"],
      ["Sopa tradicional marroquí de verduras", "Verduras de temporada salteadas"],
    ],
  },
  mains: {
    title: "Plato principal",
    note: "Elige un plato",
    items: ["Tajín de pollo con limón confitado y aceitunas", "Tajín de ternera o cordero con ciruelas", "Cuscús de siete verduras, con pollo o cordero"],
  },
  dessert: { title: "Postre y refrescos", items: ["Fruta fresca de temporada", "Té de menta tradicional", "Agua mineral"] },
  drinks: {
    title: "Bebidas",
    names: { coke: "Coca-Cola", cokeZero: "Coca-Cola Zero", sprite: "Sprite", hawai: "Hawaï", schweppes: "Schweppes Limón", orange: "Zumo de naranja natural" },
    tbc: "consultar",
  },
  timing: {
    title: "Cómo funciona",
    order: "Antes de las 14:00",
    orderText: "Avísanos de que cenas en el riad y elige tu entrante y tu plato principal.",
    dinner: "18:00 – 21:00",
    dinnerText: "La cena se sirve en nuestro comedor, en tu mesa.",
    lunch: "Almuerzo",
    lunchText: "El almuerzo, o la cena a otra hora, se organiza con nosotros.",
  },
  diets: { title: "Todas las dietas en la mesa", text: "Dínoslo al pedir y adaptamos el menú.", items: ["Vegetariano", "Vegano", "Sin gluten", "Sin lácteos"] },
  alts: {
    tagines: "Tajines, ensaladas y pan en una mesa preparada para la cena en Riad Berber Towers",
    couscous: "Cuscús de siete verduras y tajín servidos en la mesa",
    serving: "Huéspedes sirviéndose cuscús y tajín",
    room: "Huéspedes cenando en el comedor de Riad Berber Towers",
  },
  cta: {
    title: "Cena con nosotros",
    text: "Pide antes de las 14:00 por WhatsApp o en recepción, con tu entrante y tu plato principal.",
    withRoom: "¿Te alojas con nosotros? Añade la cena al reservar tu habitación.",
    roomLink: "Reservar una habitación",
    button: "Pedir la cena por WhatsApp",
    message: "Hola, nos gustaría cenar esta noche en Riad Berber Towers. Número de personas: ",
  },
};

export default es;
