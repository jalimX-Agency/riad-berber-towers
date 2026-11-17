import type { RestaurantCopy } from "@/lib/restaurant";

const en: RestaurantCopy = {
  meta: {
    title: "Restaurant: Moroccan and Berber dinner in Imlil",
    description: "Traditional Moroccan and Berber dinner at Riad Berber Towers in the centre of Imlil: soup and salads, tagine or couscous, fruit and mint tea. Served 18:00–21:00, order before 14:00.",
  },
  label: "Restaurant",
  title: "Dinner at the riad",
  lead: "Traditional Moroccan and Berber cooking, cooked in our kitchen and served at your table. A taste of Morocco in the heart of the Atlas.",
  price: { per: "per person", what: "Set dinner: starter, main course and dessert" },
  card: { title: "Menu", subtitle: "Traditional Moroccan & Berber cuisine", footer: "Riad Berber Towers · Imlil · Morocco" },
  starters: {
    title: "Starters",
    note: "Choose one option",
    option: "Option",
    options: [
      ["Traditional Moroccan vegetable soup", "Taktouka, cooked tomato and pepper salad"],
      ["Traditional Moroccan vegetable soup", "Moroccan rice salad"],
      ["Traditional Moroccan vegetable soup", "Sautéed seasonal vegetables"],
    ],
  },
  mains: {
    title: "Main course",
    note: "Choose one dish",
    items: [
      "Chicken tagine with preserved lemon and olives",
      "Beef or lamb tagine with prunes",
      "Couscous with seven vegetables, with chicken or lamb",
    ],
  },
  dessert: { title: "Dessert & refreshments", items: ["Fresh seasonal fruit", "Traditional mint tea", "Mineral water"] },
  drinks: {
    title: "Drinks",
    names: { coke: "Coca-Cola", cokeZero: "Coca-Cola Zero", sprite: "Sprite", hawai: "Hawaï", schweppes: "Schweppes Lemon", orange: "Fresh orange juice" },
    tbc: "on request",
  },
  timing: {
    title: "How it works",
    order: "Before 14:00",
    orderText: "Tell us you are joining for dinner and choose your starter and main course.",
    dinner: "18:00 – 21:00",
    dinnerText: "Dinner is served in our dining room, at your own table.",
    lunch: "Lunch",
    lunchText: "Lunch and dinner at other times can be arranged with us.",
  },
  diets: { title: "Every diet at the table", text: "Tell us when you order and we adapt the menu.", items: ["Vegetarian", "Vegan", "Gluten-free", "Dairy-free"] },
  alts: {
    tagines: "Tagines, salads and bread on a table set for dinner at Riad Berber Towers",
    couscous: "Couscous with seven vegetables and a tagine served at the table",
    serving: "Guests serving themselves couscous and tagine",
    room: "Guests at dinner in the dining room of Riad Berber Towers",
  },
  cta: {
    title: "Join us for dinner",
    text: "Order before 14:00 on WhatsApp or at reception, with your choice of starter and main course.",
    withRoom: "Staying with us? Add dinner when you book your room.",
    roomLink: "Book a room",
    button: "Order dinner on WhatsApp",
    message: "Hello, we would like dinner tonight at Riad Berber Towers. Number of people: ",
  },
};

export default en;
