import type { PagesCopy } from "@/lib/pages";

const es: PagesCopy = {
  story: {
    meta: {
      title: "Nuestra historia: un día en Riad Berber Towers",
      description:
        "Un día en Riad Berber Towers, en Imlil, hora a hora: la luz en la cresta, el desayuno en la azotea, el té junto a la fuente de zellige y las lámparas en la terraza. Y de qué está hecha la casa.",
    },
    label: "Nuestra historia",
    title: ["Una casa de montaña", "hecha a mano"],
    lead: "Tres plantas de tadelakt, zellige de Fez y madera tallada, al final de la carretera de Marrakech. En vez de describirla, te contamos cómo es un día aquí.",
    facts: ["Imlil · 1.740 m","Terreno comprado en 2014","Abierto en 2025","7 habitaciones, cada una con su baño"],
    decade: {"label":"Diez años de pasión","title":"Una década de sueños, grabados en piedra","text":"Compramos el terreno en 2014. Hicieron falta años de pasión y trabajo, con materiales locales y las manos de artesanos marroquíes, antes de abrir las puertas en 2025: revoco de tadelakt, zellige de Fez, cedro tallado y artesanía bereber, para que cada huésped viva un auténtico pedazo de cultura marroquí.","from":"Terreno comprado","to":"Puertas abiertas","sign":"El equipo de Riad Berber Towers"},
    day: {
      label: "Un día en la casa",
      title: "De la primera luz a la última lámpara",
      hours: [
        {
          time: "06:00",
          title: "Luz en la cresta",
          text: "El sol llega a las cumbres mucho antes que al pueblo. Abajo, los nogales siguen azules de sombra y el río es lo que más se oye en Imlil.",
          alt: "Riad Berber Towers entre los nogales con la primera luz",
        },
        {
          time: "08:30",
          title: "Desayuno en la azotea",
          text: "El desayuno sube a la terraza. Se come con las crestas del Toubkal delante de la mesa y el pueblo despertándose abajo.",
          alt: "La azotea de Riad Berber Towers vista desde arriba",
        },
        {
          time: "10:00",
          title: "Salir por la puerta",
          text: "El sendero empieza en la calle, delante de casa. Pasan mulas cargadas para la montaña; los caminantes suben hacia Aroumd o cruzan hacia Tamatert.",
          alt: "La torre de Riad Berber Towers con las montañas detrás",
        },
        {
          time: "13:00",
          title: "Vuelta para comer",
          text: "Algunos días la cocina huele a khobz y a un tajín que lleva toda la mañana al fuego lento. Los días de clase de cocina, la masa la amasan los huéspedes.",
          alt: "Ingredientes para un tajín preparados en la cocina",
        },
        {
          time: "17:00",
          title: "Té junto a la fuente",
          text: "El salón se llena con el sonido de la fuente de zellige. El té se sirve desde lo alto y la ruta de mañana se planea en los sofás bajos.",
          alt: "Té de menta servido junto a la fuente de zellige del salón",
        },
        {
          time: "21:00",
          title: "Lámparas en la terraza",
          text: "El pueblo se calla, se encienden las lámparas de la terraza y el cielo del Atlas se llena de estrellas. Abajo, los suelos están calientes.",
          alt: "Riad Berber Towers de noche con las lámparas de la terraza encendidas",
        },
      ],
    },
    touch: {
      label: "Tacto",
      title: "De qué está hecha la casa",
      materials: [
        {
          name: "Zellige de Fez",
          text: "Azulejos esmaltados cortados a mano, pieza a pieza. En los suelos, alrededor de la fuente y en cada ducha.",
        },
        {
          name: "Cedro tallado",
          text: "Puertas, vigas, el mostrador de la recepción y la galería alrededor del patio, tallados en cedro.",
        },
        {
          name: "Tadelakt",
          text: "Revoco de cal pulido con piedra y jabón negro hasta quedar liso y cálido.",
        },
        {
          name: "Hierro forjado",
          text: "Las barandillas que rodean el patio en cada planta.",
        },
        {
          name: "Vidrio de color",
          text: "La claraboya en lo alto de la casa, que deja caer luz de colores por el patio todo el día.",
        },
      ],
    },
    word: {
      label: "Una palabra antes de venir",
      word: "Azul",
      text: "significa hola en tachelhit, la lengua del valle. Nuestro nombre dice «Berber» porque es la palabra que conocen los viajeros. Aquí, la gente se llama a sí misma imazighen.",
    },
    end: {
      title: "Quédate un día. O siete.",
      text: "Siete habitaciones, tres plantas y una terraza frente al Toubkal.",
      rooms: "Ver las habitaciones",
      contact: "Escríbenos",
    },
  },
  contact: {
    meta: {
      title: "Contactar con Riad Berber Towers en Imlil",
      description:
        "WhatsApp, teléfono, email y cómo llegar a Riad Berber Towers, en el centro de Imlil, Alto Atlas, Marruecos.",
    },
    label: "Contacto",
    title: "Estamos aquí para ayudarte",
    lead: "¿Una pregunta sobre una habitación, una actividad o la carretera a Imlil? Escríbenos. Lo más rápido es WhatsApp.",
    whatsapp: {
      title: "WhatsApp",
      text: "Normalmente es la forma más rápida de contactarnos.",
      button: "Escríbenos por WhatsApp",
      message: "Hola Riad Berber Towers, tengo una pregunta.",
    },
    phone: "Teléfono",
    email: {
      title: "Email",
      text: "Para preguntas más largas, grupos o peticiones especiales.",
    },
    address: {
      title: "Dirección",
      lines: [
        "Riad Berber Towers",
        "Imlil Centre, Asni",
        "Al Haouz, Marruecos",
      ],
      map: "Abrir en Google Maps",
    },
    find: {
      title: "Cómo encontrarnos",
      text: "La carretera de Marrakech termina en el centro de Imlil y la casa está a pocos pasos. Envíanos un mensaje al llegar y te guiaremos hasta la puerta.",
    },
    faq: {
      title: "Preguntas frecuentes",
      items: [
        {"q":"¿Podéis recogernos en Marrakech?","a":"Sí. Ofrecemos un traslado privado desde el aeropuerto de Marrakech, tu hotel o riad, o cualquier lugar de Marrakech hasta la casa. Desde otra ciudad, escríbenos y lo organizamos."},
        {
          q: "¿El desayuno está incluido?",
          a: "Sí. Todas las noches incluyen desayuno, servido en la terraza.",
        },
        {
          q: "¿Aceptáis niños?",
          a: "No se aceptan niños menores de 12 años. Los mayores de 12 años son bienvenidos.",
        },
        {
          q: "¿Puedo traer a mi mascota?",
          a: "No. Los animales no están permitidos en el riad.",
        },
        {
          q: "¿Qué otras normas de la casa hay que conocer?",
          a: "No se permiten fiestas ni celebraciones en el riad, ni alcohol en el establecimiento. Los ciudadanos marroquíes y de otros países árabes que viajen en pareja deben presentar un certificado de matrimonio válido a la llegada.",
        },
        {
          q: "¿Cómo se paga?",
          a: "Un anticipo del {deposit} % confirma la reserva y no es reembolsable. El resto se paga en efectivo a la llegada: {currencies}.",
        },
        {
          q: "¿Cuántas personas por habitación?",
          a: "Hasta {max} personas por habitación. La suite Toubkal admite una tercera persona, con un {percent} % más en el precio.",
        },
        {
          q: "¿Una cama o dos?",
          a: "Todas las habitaciones pueden prepararse con una cama de matrimonio grande o dos camas separadas. Lo eliges al reservar.",
        },
        {
          q: "¿Hace calor en invierno?",
          a: "Sí. Todas las habitaciones tienen suelo radiante, y hay Wi-Fi en toda la casa.",
        },
        {
          q: "¿Organizáis actividades?",
          a: "Sí: rutas guiadas, bicicleta de montaña y una clase de cocina marroquí, desde la casa. Mira nuestra página de actividades.",
        },
      ],
    },
  },
  gallery: {
    meta: {
      title: "Galería: fotos de Riad Berber Towers en Imlil",
      description:
        "Fotos de Riad Berber Towers: la casa, las habitaciones, los baños de zellige, el té de menta y nuestra cocina, en el pueblo de Imlil.",
    },
    label: "Galería",
    title: "La casa en imágenes",
    lead: "Madera, zellige y luz, de la fuente a la terraza.",
    all: "Todo",
    categories: {
      house: "La casa",
      rooms: "Habitaciones",
      bathrooms: "Baños",
      tea: "Té de menta",
      kitchen: "Cocina",
    },
    close: "Cerrar",
    prev: "Foto anterior",
    next: "Foto siguiente",
    open: "Abrir foto",
  },
  legal: {
    updated: "Última actualización: 16 de noviembre de 2026",
    terms: {
      meta: {
        title: "Condiciones de reserva",
        description:
          "Condiciones de reserva, pago y estancia en Riad Berber Towers, Imlil.",
      },
      title: "Condiciones de reserva",
      intro:
        "Estas condiciones se aplican a toda reserva con Riad Berber Towers, en esta web, por WhatsApp, por email o por teléfono. Al reservar, las aceptas.",
      sections: [
        {
          title: "1. La casa de huéspedes",
          paras: [
            "Riad Berber Towers es una casa de huéspedes en Imlil Centre, Asni, Al Haouz, Marruecos. Contacto: contact@riadberbertowers.com, +212 661 283 086.",
          ],
        },
        {
          title: "2. Reserva",
          paras: [
            "Una solicitud de reserva hecha en esta web queda confirmada cuando hemos recibido el anticipo y te hemos enviado la confirmación por email.",
            "Los precios son por habitación y noche, desayuno incluido, en la moneda indicada en el momento de reservar.",
          ],
        },
        {
          title: "3. Anticipo",
          paras: [
            "Un anticipo del {deposit} % del precio total confirma la reserva. Este anticipo no es reembolsable, tampoco en caso de cancelación, estancia acortada o no presentación.",
          ],
        },
        {
          title: "4. Saldo",
          paras: [
            "El resto se paga en efectivo a la llegada, en una de estas monedas: {currencies}.",
          ],
        },
        {
          title: "5. Cambios y cancelaciones",
          paras: [
            "Contáctanos lo antes posible si necesitas cambiar tus fechas. Haremos lo posible por mover tu reserva, según disponibilidad. El anticipo no se reembolsa en caso de cancelación o no presentación.",
          ],
        },
        {
          title: "6. Normas de la casa",
          paras: [
            "No se aceptan niños menores de 12 años.",
            "No se admiten animales.",
            "No se permiten fiestas ni celebraciones dentro del riad.",
            "No se permite el alcohol en el establecimiento.",
            "Los ciudadanos marroquíes y de otros países árabes que viajen en pareja deben presentar un certificado de matrimonio válido a la llegada.",
            "Hasta {max} personas por habitación. La suite Toubkal admite una tercera persona, con un {percent} % más en el precio.",
            "Respeta la tranquilidad de la casa y del pueblo, y cuida las habitaciones y su mobiliario. Los daños causados durante la estancia pueden cobrarse.",
          ],
        },
        {
          title: "7. Actividades",
          paras: [
            "Las rutas, la bicicleta de montaña y otras actividades se organizan con guías locales. Los itinerarios pueden cambiar según el tiempo y el estado de la montaña. Cada persona participa según su forma física y elige una actividad adecuada; recomendamos un seguro de viaje.",
          ],
        },
        {
          title: "8. Responsabilidad",
          paras: [
            "No somos responsables de la pérdida o robo de objetos personales dejados sin vigilancia, ni de hechos ajenos a nuestro control (tiempo, carreteras cortadas, fenómenos naturales).",
          ],
        },
        {
          title: "9. Ley aplicable",
          paras: [
            "Estas condiciones se rigen por la ley marroquí. En caso de desacuerdo, primero buscaremos contigo una solución amistosa.",
          ],
        },
      ],
    },
    privacy: {
      meta: {
        title: "Política de privacidad",
        description:
          "Cómo Riad Berber Towers recoge y usa tus datos personales.",
      },
      title: "Política de privacidad",
      intro:
        "Solo recogemos la información necesaria para recibirte, y nunca la vendemos. Esta página explica qué recogemos, por qué y cuáles son tus derechos.",
      sections: [
        {
          title: "1. Quiénes somos",
          paras: [
            "Riad Berber Towers, Imlil Centre, Asni, Al Haouz, Marruecos, es responsable de tus datos. Contacto: contact@riadberbertowers.com.",
          ],
        },
        {
          title: "2. Qué recogemos",
          paras: [
            "Al reservar: nombre y apellidos, email, teléfono, país (opcional), fechas, número de personas, tipo de cama, hora de llegada y peticiones especiales.",
            "Si nos envías un justificante de pago, el archivo que subes.",
            "Cuando nos escribes por WhatsApp o email, el contenido de tus mensajes.",
          ],
        },
        {
          title: "3. Para qué los usamos",
          paras: [
            "Para gestionar tu reserva y tu estancia, enviarte confirmaciones e información de pago, responder a tus preguntas y cumplir nuestras obligaciones legales y contables. No enviamos boletines ni publicidad.",
          ],
        },
        {
          title: "4. Quién puede verlos",
          paras: [
            "Solo nuestro equipo. Para que la web funcione usamos proveedores de confianza que tratan los datos por nuestra cuenta: Vercel (alojamiento), Neon (base de datos, alojada en la Unión Europea), Cloudflare R2 (almacenamiento de archivos) y Resend (envío de emails). Los pagos con PayPal los gestiona PayPal según su propia política.",
          ],
        },
        {
          title: "5. Cuánto tiempo los guardamos",
          paras: [
            "Los datos de reserva se guardan el tiempo necesario para tu estancia y nuestras obligaciones legales y contables, y después se eliminan. Los justificantes de pago se guardan solo el tiempo necesario.",
          ],
        },
        {
          title: "6. Cookies",
          paras: [
            "Esta web solo usa las cookies necesarias para funcionar (por ejemplo el idioma elegido y el acceso de nuestro equipo a la zona de administración). No usamos cookies publicitarias ni de seguimiento.",
          ],
        },
        {
          title: "7. Tus derechos",
          paras: [
            "Puedes pedir ver, corregir o eliminar tus datos, u oponerte a su uso, escribiendo a contact@riadberbertowers.com. Estos derechos están protegidos por la ley marroquí 09-08 y, para los viajeros de la Unión Europea, por el RGPD. También puedes contactar con la CNDP, la autoridad marroquí de protección de datos.",
          ],
        },
      ],
    },
  },
};

export default es;
