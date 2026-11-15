// Initial room copy, based only on facts from the current site and the owner (Nov 2026).
// The seed writes it once; after that the copy is edited in the admin.
// FR / ES / DE / AR are first drafts for native review.

type Copy = { name: string; tagline: string; description: string };
export const roomCopy: Record<string, Record<"en" | "fr" | "es" | "de" | "ar", Copy>> = {
  targa: {
    en: { name: "Targa Room", tagline: "Garden view and traditional charm", description: "Our standard room, on the ground floor and opening onto the garden. A calm, cosy space for two, with tadelakt walls, heated floors for winter nights and a private bathroom with a Fes zellij shower." },
    fr: { name: "Chambre Targa", tagline: "Vue jardin et charme traditionnel", description: "Notre chambre standard, au rez-de-chaussée, ouverte sur le jardin. Un espace calme et chaleureux pour deux, avec murs en tadelakt, sol chauffant pour les nuits d'hiver et salle de bain privée avec douche en zellige de Fès." },
    es: { name: "Habitación Targa", tagline: "Vista al jardín y encanto tradicional", description: "Nuestra habitación estándar, en la planta baja y abierta al jardín. Un espacio tranquilo y acogedor para dos, con paredes de tadelakt, suelo radiante para las noches de invierno y baño privado con ducha de zellige de Fez." },
    de: { name: "Zimmer Targa", tagline: "Gartenblick und traditioneller Charme", description: "Unser Standardzimmer im Erdgeschoss, zum Garten hin geöffnet. Ein ruhiger, gemütlicher Raum für zwei, mit Wänden aus Tadelakt, Fußbodenheizung für Winternächte und einem eigenen Bad mit Dusche aus Zellige aus Fès." },
    ar: { name: "غرفة تاركا", tagline: "إطلالة على الحديقة وسحر تقليدي", description: "غرفتنا العادية في الطابق الأرضي، تنفتح على الحديقة. مكان هادئ ودافئ لشخصين، بجدران من التادلاكت، وأرضية مدفأة لليالي الشتاء، وحمّام خاص بدُش من الزليج الفاسي." },
  },
  tarzoute: {
    en: { name: "Suite Tarzoute", tagline: "A private terrace over the village and the mountains", description: "A ground-floor suite with its own terrace looking out over the village and the peaks. Handcrafted Moroccan finishes in the bathroom, heated floors for cool evenings and fast Wi-Fi." },
    fr: { name: "Suite Tarzoute", tagline: "Une terrasse privée sur le village et les montagnes", description: "Une suite au rez-de-chaussée avec sa propre terrasse donnant sur le village et les sommets. Finitions marocaines artisanales dans la salle de bain, sol chauffant pour les soirées fraîches et Wi-Fi rapide." },
    es: { name: "Suite Tarzoute", tagline: "Una terraza privada sobre el pueblo y las montañas", description: "Una suite en la planta baja con terraza propia que mira al pueblo y a las cumbres. Acabados marroquíes artesanales en el baño, suelo radiante para las noches frescas y Wi-Fi rápido." },
    de: { name: "Suite Tarzoute", tagline: "Eine private Terrasse über dem Dorf und den Bergen", description: "Eine Suite im Erdgeschoss mit eigener Terrasse und Blick über das Dorf und die Gipfel. Marokkanisches Handwerk im Bad, Fußbodenheizung für kühle Abende und schnelles WLAN." },
    ar: { name: "جناح ترزوت", tagline: "شرفة خاصة تطل على القرية والجبال", description: "جناح في الطابق الأرضي بشرفة خاصة تطل على القرية والقمم. لمسات مغربية يدوية في الحمّام، وأرضية مدفأة للأمسيات الباردة، وإنترنت سريع." },
  },
  imlil: {
    en: { name: "Suite Imlil", tagline: "Mountains, garden and village in one window", description: "A first-floor suite named after our village, with views over the mountains, the garden and the rooftops of Imlil. Heated floors, a private bathroom, Wi-Fi, and a coffee maker and kettle for slow mornings." },
    fr: { name: "Suite Imlil", tagline: "Montagnes, jardin et village dans une seule fenêtre", description: "Une suite au premier étage qui porte le nom de notre village, avec vue sur les montagnes, le jardin et les toits d'Imlil. Sol chauffant, salle de bain privée, Wi-Fi, cafetière et bouilloire pour les matins tranquilles." },
    es: { name: "Suite Imlil", tagline: "Montañas, jardín y pueblo en una sola ventana", description: "Una suite en la primera planta que lleva el nombre de nuestro pueblo, con vistas a las montañas, al jardín y a los tejados de Imlil. Suelo radiante, baño privado, Wi-Fi, cafetera y hervidor para mañanas sin prisa." },
    de: { name: "Suite Imlil", tagline: "Berge, Garten und Dorf in einem Fenster", description: "Eine Suite im ersten Stock, benannt nach unserem Dorf, mit Blick auf die Berge, den Garten und die Dächer von Imlil. Fußbodenheizung, eigenes Bad, WLAN sowie Kaffeemaschine und Wasserkocher für ruhige Morgen." },
    ar: { name: "جناح إمليل", tagline: "الجبال والحديقة والقرية في نافذة واحدة", description: "جناح في الطابق الأول يحمل اسم قريتنا، يطل على الجبال والحديقة وأسطح إمليل. أرضية مدفأة، وحمّام خاص، وإنترنت، وآلة قهوة وغلاية لصباحات هادئة." },
  },
  toubkal: {
    en: { name: "Suite Toubkal", tagline: "A balcony facing the mountains", description: "Our signature suite on the first floor, named after North Africa's highest peak. A private balcony with mountain, garden and village views, heated floors, a private bathroom and Wi-Fi." },
    fr: { name: "Suite Toubkal", tagline: "Un balcon face aux montagnes", description: "Notre suite emblématique au premier étage, qui porte le nom du plus haut sommet d'Afrique du Nord. Balcon privé avec vue sur les montagnes, le jardin et le village, sol chauffant, salle de bain privée et Wi-Fi." },
    es: { name: "Suite Toubkal", tagline: "Un balcón frente a las montañas", description: "Nuestra suite insignia en la primera planta, con el nombre del pico más alto del norte de África. Balcón privado con vistas a las montañas, al jardín y al pueblo, suelo radiante, baño privado y Wi-Fi." },
    de: { name: "Suite Toubkal", tagline: "Ein Balkon mit Blick auf die Berge", description: "Unsere besondere Suite im ersten Stock, benannt nach dem höchsten Gipfel Nordafrikas. Ein privater Balkon mit Blick auf Berge, Garten und Dorf, Fußbodenheizung, eigenes Bad und WLAN." },
    ar: { name: "جناح توبقال", tagline: "شرفة في مواجهة الجبال", description: "جناحنا المميز في الطابق الأول، يحمل اسم أعلى قمة في شمال إفريقيا. شرفة خاصة تطل على الجبال والحديقة والقرية، وأرضية مدفأة، وحمّام خاص، وإنترنت." },
  },
  atlas: {
    en: { name: "Suite Atlas", tagline: "A balcony over the village and the garden", description: "A warm first-floor suite with a private balcony over the village and the garden. Tadelakt walls polished by hand, a shower in Fes zellij, and heated floors that keep the room warm in winter." },
    fr: { name: "Suite Atlas", tagline: "Un balcon sur le village et le jardin", description: "Une suite chaleureuse au premier étage avec balcon privé sur le village et le jardin. Murs en tadelakt polis à la main, douche en zellige de Fès et sol chauffant qui garde la chambre au chaud en hiver." },
    es: { name: "Suite Atlas", tagline: "Un balcón sobre el pueblo y el jardín", description: "Una suite cálida en la primera planta con balcón privado sobre el pueblo y el jardín. Paredes de tadelakt pulidas a mano, ducha de zellige de Fez y suelo radiante que mantiene la habitación caliente en invierno." },
    de: { name: "Suite Atlas", tagline: "Ein Balkon über dem Dorf und dem Garten", description: "Eine warme Suite im ersten Stock mit privatem Balkon über dem Dorf und dem Garten. Von Hand polierte Wände aus Tadelakt, eine Dusche aus Zellige aus Fès und eine Fußbodenheizung, die das Zimmer im Winter warm hält." },
    ar: { name: "جناح الأطلس", tagline: "شرفة على القرية والحديقة", description: "جناح دافئ في الطابق الأول بشرفة خاصة تطل على القرية والحديقة. جدران من التادلاكت مصقولة باليد، ودُش من الزليج الفاسي، وأرضية مدفأة تحافظ على دفء الغرفة في الشتاء." },
  },
  taddart: {
    en: { name: "Suite Taddart", tagline: "The widest view in the house", description: "A first-floor suite with the widest panorama in the riad: mountains, valleys and villages. Its private balcony is made for sunrise and stargazing, with heated floors and handcrafted Moroccan finishes inside." },
    fr: { name: "Suite Taddart", tagline: "La plus grande vue de la maison", description: "Une suite au premier étage avec le plus large panorama du riad : montagnes, vallées et villages. Son balcon privé est fait pour le lever du soleil et les nuits étoilées, avec sol chauffant et finitions marocaines artisanales." },
    es: { name: "Suite Taddart", tagline: "La vista más amplia de la casa", description: "Una suite en la primera planta con el panorama más amplio del riad: montañas, valles y pueblos. Su balcón privado está hecho para el amanecer y las noches de estrellas, con suelo radiante y acabados marroquíes artesanales." },
    de: { name: "Suite Taddart", tagline: "Die weiteste Aussicht im Haus", description: "Eine Suite im ersten Stock mit dem weitesten Panorama des Riads: Berge, Täler und Dörfer. Ihr privater Balkon ist wie gemacht für Sonnenaufgänge und Sternennächte, dazu Fußbodenheizung und marokkanisches Handwerk im Inneren." },
    ar: { name: "جناح تادّارت", tagline: "أوسع إطلالة في البيت", description: "جناح في الطابق الأول بأوسع إطلالة في الرياض: جبال ووديان وقرى. شرفته الخاصة مثالية لشروق الشمس ومراقبة النجوم، مع أرضية مدفأة ولمسات مغربية يدوية." },
  },
  adrar: {
    en: { name: "Suite Adrar", tagline: "At the top of the house, facing the mountain", description: "The only suite on the second floor, at the top of the riad. A balcony looks out over the mountains and the village, with heated floors, a private bathroom in Moroccan tilework and Wi-Fi." },
    fr: { name: "Suite Adrar", tagline: "Au sommet de la maison, face à la montagne", description: "La seule suite du deuxième étage, au sommet du riad. Un balcon donne sur les montagnes et le village, avec sol chauffant, salle de bain privée en zellige et Wi-Fi." },
    es: { name: "Suite Adrar", tagline: "En lo alto de la casa, frente a la montaña", description: "La única suite de la segunda planta, en lo alto del riad. Un balcón mira a las montañas y al pueblo, con suelo radiante, baño privado con azulejos marroquíes y Wi-Fi." },
    de: { name: "Suite Adrar", tagline: "Ganz oben im Haus, mit Blick auf den Berg", description: "Die einzige Suite im zweiten Stock, ganz oben im Riad. Ein Balkon blickt auf die Berge und das Dorf, dazu Fußbodenheizung, ein eigenes Bad mit marokkanischen Fliesen und WLAN." },
    ar: { name: "جناح أدرار", tagline: "في أعلى البيت، في مواجهة الجبل", description: "الجناح الوحيد في الطابق الثاني، في أعلى الرياض. شرفة تطل على الجبال والقرية، مع أرضية مدفأة، وحمّام خاص بالزليج المغربي، وإنترنت." },
  },
};
