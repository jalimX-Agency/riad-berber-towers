import type { GuideCopy } from "@/lib/imlil-guide";

const fr: GuideCopy = {
  meta: {
    title: "Guide d’Imlil : quand partir, comment venir et que voir",
    description:
      "Notre guide d’Imlil dans le Haut Atlas : la meilleure saison, venir depuis Marrakech, les villages et cols de la vallée, l’ascension du Toubkal et nos conseils pratiques depuis une maison d’hôtes familiale du village.",
  },
  hero: {
    label: "Guide d’Imlil",
    title: "Imlil, au pied du Toubkal",
    lead: "Un village de montagne de noyers, de terrasses et de chemins muletiers, à 64 km de Marrakech, point de départ du plus haut sommet d’Afrique du Nord. C’est notre vallée, et voici ce que nous en racontons à nos hôtes.",
    alt: "La vallée d’Imlil en automne, peupliers dorés, champs verts et Atlas enneigé en arrière-plan",
  },
  facts: [
    { value: "1 740 m", label: "Altitude du village" },
    { value: "64 km", label: "De Marrakech, environ 1 h 30" },
    { value: "4 167 m", label: "Le Toubkal, plus haut sommet d’Afrique du Nord" },
    { value: "1942", label: "Création du parc national du Toubkal" },
  ],
  toc: "Dans ce guide",
  about: {
    label: "Le village",
    title: "Une vallée berbère dans le Haut Atlas",
    paras: [
      "Imlil se trouve au fond de la vallée des Aït Mizane, là où s’arrête la route de Marrakech et où commencent les chemins muletiers. Autour, des hameaux amazighs (berbères) de pierre et de terre s’accrochent aux pentes au-dessus de terrasses de noyers, de pommiers et de cerisiers, irriguées par des canaux entretenus depuis des générations.",
      "La langue de la vallée est le tachelhit, la langue amazighe du Haut Atlas, avec l’arabe ; la plupart de ceux qui travaillent avec les visiteurs parlent français et anglais. La vie suit encore les saisons : les vergers fleurissent au printemps, les noix se récoltent à l’automne et les mules portent ce que les routes ne peuvent pas porter.",
      "Le village est la porte du parc national du Toubkal et la base principale pour gravir le Jbel Toubkal. Mais nul besoin d’atteindre un sommet pour l’aimer : de courtes balades mènent dans toutes les directions vers des villages, des cols et des cascades, et les soirées sont calmes sous un ciel plein d’étoiles.",
    ],
    alt: "Un village du Haut Atlas sur sa pente, au-dessus d’arbres aux couleurs d’automne, avec des randonneurs et un mulet sur le sentier",
  },
  when: {
    label: "Quand partir",
    title: "Quatre saisons en montagne",
    lead: "À 1 740 m, Imlil est toujours plus frais que Marrakech. Les journées sont souvent ensoleillées toute l’année, mais les nuits sont froides hors été.",
    best: "Idéal pour marcher : d’avril à juin et de septembre à novembre.",
    seasons: {
      spring: { name: "Printemps", months: "Mars – mai", text: "Vergers en fleurs, terrasses vertes et neige encore sur les sommets. Journées douces, nuits fraîches et quelques pluies. Une belle période pour marcher." },
      summer: { name: "Été", months: "Juin – août", text: "Journées chaudes autour de 25 °C quand Marrakech étouffe, et nuits fraîches. De longues journées pour randonner ; partez tôt pour éviter le soleil de midi." },
      autumn: { name: "Automne", months: "Septembre – novembre", text: "Temps stable, arbres dorés et récolte des noix en octobre. La saison préférée de nombreux marcheurs, et la meilleure fenêtre pour le Toubkal." },
      winter: { name: "Hiver", months: "Décembre – février", text: "Neige sur les montagnes et parfois au village, nuits sous zéro, journées froides et lumineuses. Magique, et nos sols chauffants sont les bienvenus. Le Toubkal demande un équipement d’hiver." },
    },
  },
  getting: {
    label: "Venir",
    title: "De Marrakech à Imlil",
    steps: [
      { name: "Marrakech", meta: "0 km", text: "Quittez la ville vers le sud par la route de Tahannaout, direction Asni." },
      { name: "Asni", meta: "47 km", text: "Le bourg de la vallée et son souk hebdomadaire. La route commence à monter." },
      { name: "Imlil", meta: "64 km · environ 1 h 30", text: "La route s’arrête au centre du village, à quelques pas de notre porte." },
    ],
    note: "En voiture, comptez environ une heure et demie. Des grands taxis partent de Marrakech vers Asni ou directement vers Imlil, en partagé ou en privé ; depuis Asni, taxis collectifs et minibus couvrent les 17 derniers kilomètres. Les prix varient : mettez-vous d’accord avant de partir.",
    whatsapp: "Demandez-nous l’itinéraire",
    whatsappMessage: "Bonjour, je souhaite l’itinéraire pour venir à Riad Berber Towers à Imlil.",
  },
  around: {
    label: "Autour d’Imlil",
    title: "Villages, cols et cascades",
    lead: "Ici, tout commence à pied, directement depuis le village. Certains lieux demandent quelques heures, d’autres une journée.",
    activity: "Voir la randonnée guidée",
    places: {
      aroumd: { name: "Aroumd", meta: "Environ 1 900 m · 1 h à pied", text: "Le plus grand village de la vallée, bâti sur un éperon rocheux au-dessus de la rivière, avec ses maisons en pierre, ses ruelles et ses terrasses. La première étape vers le Toubkal." },
      chamharouch: { name: "Sidi Chamharouch", meta: "Environ 2 310 m · une demi-journée", text: "Un lieu de pèlerinage dans la vallée de la Mizane, marqué par un grand rocher peint en blanc, sur le chemin du Toubkal. Cascades saisonnières en chemin." },
      tamatert: { name: "Tamatert et le Tizi n’Tamatert", meta: "Col à environ 2 280 m", text: "Juste au-dessus d’Imlil, le village de Tamatert et le col qui le domine offrent une vue sur la vallée ; le sentier continue vers l’est jusqu’aux hameaux de Tacheddirt et Ouaneskra." },
      mzik: { name: "Tizi Mzik", meta: "2 489 m · une journée", text: "Un col à l’ouest d’Imlil avec une large vue sur la vallée d’Azzaden, atteint par les noyeraies et les bois de genévriers." },
      toubkal: { name: "Jbel Toubkal", meta: "4 167 m · deux jours", text: "Le plus haut sommet d’Afrique du Nord. L’ascension classique part d’Imlil avec une nuit au refuge sous le sommet." },
      asni: { name: "Le souk d’Asni", meta: "17 km plus bas dans la vallée", text: "Le marché hebdomadaire de la vallée, où les villages viennent acheter et vendre légumes, épices, mules et outils. Demandez-nous le jour avant de partir." },
    },
  },
  toubkal: {
    label: "Gravir le Toubkal",
    title: "Le sommet de l’Afrique du Nord",
    paras: [
      "Le Jbel Toubkal (4 167 m) est une ascension non technique en été mais une vraie montagne : elle se fait généralement en deux jours depuis Imlil, par Aroumd et Sidi Chamharouch jusqu’au refuge vers 3 207 m, puis le sommet à l’aube et la longue descente vers le village.",
      "Depuis 2019, un guide de montagne agréé est obligatoire pour gravir le Toubkal. On peut en réserver à Imlil, et nous vous conseillons volontiers. De décembre à avril, les pentes hautes sont sous la neige et la glace : crampons, piolet et expérience sont nécessaires.",
      "Prenez le temps de vous acclimater : une ou deux nuits à Imlil et une randonnée à la journée rendent le sommet bien plus agréable.",
    ],
    facts: [
      { value: "2 jours", label: "Ascension classique depuis Imlil" },
      { value: "3 207 m", label: "Refuge sous le sommet" },
      { value: "Guide", label: "Obligatoire depuis 2019" },
    ],
  },
  partner: {"text":"Notre agence sœur Toubkal Peaks organise l’ascension du Toubkal avec des guides locaux agréés, depuis Imlil.","cta":"Treks du Toubkal sur toubkal-peaks.com"},
  transfer: "Nous proposons aussi un transfert privé depuis Marrakech (aéroport, hôtel ou riad) jusqu’à la maison ; depuis une autre ville, contactez-nous.",
  practical: {
    label: "Conseils pratiques",
    title: "Bon à savoir avant de venir",
    items: [
      { title: "Prévoyez du liquide", text: "Il n’y a pas de distributeur fiable à Imlil ; les plus proches sont à Asni. Apportez des dirhams de Marrakech, la carte est rarement acceptée au village." },
      { title: "Plusieurs couches", text: "Même en été, matins et soirées sont frais à 1 740 m. En hiver, prévoyez des vêtements chauds ; le soleil est fort toute l’année, pensez à la protection solaire." },
      { title: "De bonnes chaussures", text: "Les sentiers sont caillouteux et raides par endroits. Des chaussures de marche qui accrochent facilitent chaque sortie." },
      { title: "Respect des coutumes", text: "Tenue correcte dans les villages, et demandez avant de photographier quelqu’un. Quelques mots de salutation en tachelhit ou en arabe sont toujours appréciés." },
      { title: "Altitude", text: "Allez-y doucement le premier jour, buvez beaucoup d’eau et augmentez progressivement la longueur des randonnées." },
      { title: "Soutenir la vallée", text: "Le séisme d’Al Haouz en 2023 a durement frappé la région. Les villages se reconstruisent, et séjourner et engager des guides sur place soutient directement les familles de la vallée." },
    ],
  },
  cta: {
    title: "Séjournez au cœur de la vallée",
    text: "Riad Berber Towers est au centre d’Imlil. Réservez une chambre et laissez-nous organiser vos randonnées, votre cours de cuisine et vos journées en montagne.",
    rooms: "Voir les chambres",
    activities: "Nos activités",
  },
};

export default fr;
