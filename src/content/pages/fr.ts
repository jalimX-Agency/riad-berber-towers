import type { PagesCopy } from "@/lib/pages";

const fr: PagesCopy = {
  story: {
    meta: {
      title: "Notre histoire : une journée à Riad Berber Towers",
      description:
        "Une journée à Riad Berber Towers à Imlil, heure par heure : la lumière sur la crête, le petit-déjeuner sur le toit, le thé près de la fontaine en zellige et les lampes sur la terrasse. Et ce dont la maison est faite.",
    },
    label: "Notre histoire",
    title: ["Une maison de montagne", "faite à la main"],
    lead: "Trois étages de tadelakt, de zellige de Fès et de bois sculpté, au bout de la route de Marrakech. Plutôt que de vous la décrire, voici à quoi ressemble une journée ici.",
    facts: ["Imlil · 1 740 m", "3 étages + toit", "7 chambres"],
    day: {
      label: "Une journée à la maison",
      title: "De la première lumière à la dernière lampe",
      hours: [
        {
          time: "06:00",
          title: "La lumière sur la crête",
          text: "Le soleil touche les sommets bien avant le village. En bas, les noyers sont encore bleus d’ombre, et la rivière est le bruit le plus fort d’Imlil.",
          alt: "Riad Berber Towers parmi les noyers dans la lumière du matin",
        },
        {
          time: "08:30",
          title: "Petit-déjeuner sur le toit",
          text: "Le petit-déjeuner monte sur la terrasse. On mange face aux crêtes du Toubkal, pendant que le village se réveille en contrebas.",
          alt: "La terrasse de Riad Berber Towers vue d’en haut",
        },
        {
          time: "10:00",
          title: "Passer la porte",
          text: "Le sentier commence dans la rue, devant la maison. Les mules passent chargées pour la montagne ; les marcheurs montent vers Aroumd ou partent vers Tamatert.",
          alt: "La tour de Riad Berber Towers avec les montagnes derrière",
        },
        {
          time: "13:00",
          title: "Retour pour déjeuner",
          text: "Certains jours, la cuisine sent le khobz et le tajine qui mijote depuis le matin. Les jours de cours de cuisine, ce sont les hôtes qui pétrissent la pâte.",
          alt: "Les ingrédients d’un tajine disposés dans la cuisine",
        },
        {
          time: "17:00",
          title: "Le thé près de la fontaine",
          text: "Le salon s’emplit du bruit de la fontaine en zellige. Le thé est versé de haut, et la marche du lendemain se prépare sur les banquettes basses.",
          alt: "Thé à la menthe servi près de la fontaine en zellige du salon",
        },
        {
          time: "21:00",
          title: "Les lampes sur la terrasse",
          text: "Le village se tait, les lampes de la terrasse s’allument et le ciel de l’Atlas se remplit d’étoiles. En bas, les sols sont chauds.",
          alt: "Riad Berber Towers la nuit, lampes de la terrasse allumées",
        },
      ],
    },
    touch: {
      label: "Toucher",
      title: "Ce dont la maison est faite",
      materials: [
        {
          name: "Zellige de Fès",
          text: "Des carreaux émaillés taillés à la main, un à un. Sur les sols, autour de la fontaine et dans chaque douche.",
        },
        {
          name: "Bois sculpté",
          text: "Portes, poutres, comptoir de la réception et galerie autour du patio.",
        },
        {
          name: "Tadelakt",
          text: "Un enduit à la chaux poli à la pierre et au savon noir jusqu’à devenir lisse et chaud.",
        },
        {
          name: "Fer forgé",
          text: "Les balustrades qui entourent le patio à chaque étage.",
        },
        {
          name: "Verre coloré",
          text: "La verrière au sommet de la maison, qui fait tomber une lumière colorée dans le patio toute la journée.",
        },
      ],
    },
    word: {
      label: "Un mot avant de venir",
      word: "Azul",
      text: "veut dire bonjour en tachelhit, la langue de la vallée. Notre nom dit « Berber » parce que c’est le mot que connaissent les voyageurs. Ici, on se dit Imazighen.",
    },
    end: {
      title: "Restez un jour. Ou sept.",
      text: "Sept chambres, trois étages et une terrasse face au Toubkal.",
      rooms: "Voir les chambres",
      contact: "Nous écrire",
    },
  },
  contact: {
    meta: {
      title: "Contacter Riad Berber Towers à Imlil",
      description:
        "WhatsApp, téléphone, e-mail et accès à Riad Berber Towers, au centre d’Imlil, Haut Atlas, Maroc.",
    },
    label: "Contact",
    title: "Nous sommes là pour vous aider",
    lead: "Une question sur une chambre, une activité ou la route d’Imlil ? Écrivez-nous. Le plus rapide est WhatsApp.",
    whatsapp: {
      title: "WhatsApp",
      text: "C’est généralement le moyen le plus rapide de nous joindre.",
      button: "Écrivez-nous sur WhatsApp",
      message: "Bonjour Riad Berber Towers, j’ai une question.",
    },
    phone: "Téléphone",
    email: {
      title: "E-mail",
      text: "Pour les questions plus longues, les groupes ou les demandes particulières.",
    },
    address: {
      title: "Adresse",
      lines: ["Riad Berber Towers", "Imlil Centre, Asni", "Al Haouz, Maroc"],
      map: "Ouvrir dans Google Maps",
    },
    find: {
      title: "Nous trouver",
      text: "La route de Marrakech s’arrête au centre d’Imlil, et la maison est à quelques pas. Envoyez-nous un message à votre arrivée et nous vous guiderons jusqu’à la porte.",
    },
    faq: {
      title: "Questions fréquentes",
      items: [
        {
          q: "Le petit-déjeuner est-il inclus ?",
          a: "Oui. Chaque nuit inclut le petit-déjeuner, servi sur la terrasse.",
        },
        {
          q: "Acceptez-vous les enfants ?",
          a: "Non. Riad Berber Towers est réservé aux adultes.",
        },
        {
          q: "Puis-je venir avec mon animal ?",
          a: "Non. Les animaux ne sont pas admis au riad.",
        },
        {
          q: "Comment payer ?",
          a: "Un acompte de {deposit} % confirme la réservation et n’est pas remboursable. Le solde se règle en espèces à l’arrivée : {currencies}.",
        },
        {
          q: "Combien de personnes par chambre ?",
          a: "Jusqu’à {max} personnes par chambre. La suite Toubkal accueille une troisième personne, avec {percent} % de plus sur le prix.",
        },
        {
          q: "Un lit ou deux ?",
          a: "Chaque chambre peut être préparée avec un grand lit ou deux lits séparés. Vous choisissez à la réservation.",
        },
        {
          q: "Fait-il chaud en hiver ?",
          a: "Oui. Chaque chambre a des sols chauffants, et le Wi-Fi est disponible dans toute la maison.",
        },
        {
          q: "Organisez-vous des activités ?",
          a: "Oui : randonnées guidées, VTT et cours de cuisine marocaine, au départ de la maison. Voir notre page activités.",
        },
      ],
    },
  },
  gallery: {
    meta: {
      title: "Galerie : photos de Riad Berber Towers à Imlil",
      description:
        "Photos de Riad Berber Towers : la maison, les chambres, les salles de bains en zellige, le thé à la menthe et notre cuisine, dans le village d’Imlil.",
    },
    label: "Galerie",
    title: "La maison en images",
    lead: "Bois, zellige et lumière, de la fontaine à la terrasse.",
    all: "Tout",
    categories: {
      house: "La maison",
      rooms: "Chambres",
      bathrooms: "Salles de bains",
      tea: "Thé à la menthe",
      kitchen: "Cuisine",
    },
    close: "Fermer",
    prev: "Photo précédente",
    next: "Photo suivante",
    open: "Ouvrir la photo",
  },
  legal: {
    updated: "Dernière mise à jour : 16 novembre 2026",
    terms: {
      meta: {
        title: "Conditions de réservation",
        description:
          "Conditions de réservation, de paiement et de séjour à Riad Berber Towers, Imlil.",
      },
      title: "Conditions de réservation",
      intro:
        "Ces conditions s’appliquent à toute réservation auprès de Riad Berber Towers, sur ce site, par WhatsApp, par e-mail ou par téléphone. En réservant, vous les acceptez.",
      sections: [
        {
          title: "1. La maison d’hôtes",
          paras: [
            "Riad Berber Towers est une maison d’hôtes située à Imlil Centre, Asni, Al Haouz, Maroc. Contact : riadberbertowers@gmail.com, +212 661 283 086.",
          ],
        },
        {
          title: "2. Réservation",
          paras: [
            "Une demande de réservation faite sur ce site est confirmée dès réception de l’acompte et après l’envoi de notre confirmation par e-mail.",
            "Les prix s’entendent par chambre et par nuit, petit-déjeuner inclus, dans la devise affichée au moment de la réservation.",
          ],
        },
        {
          title: "3. Acompte",
          paras: [
            "Un acompte de {deposit} % du prix total confirme la réservation. Cet acompte n’est pas remboursable, y compris en cas d’annulation, de séjour écourté ou de non-présentation.",
          ],
        },
        {
          title: "4. Solde",
          paras: [
            "Le solde se règle en espèces à l’arrivée, dans l’une de ces devises : {currencies}.",
          ],
        },
        {
          title: "5. Modifications et annulations",
          paras: [
            "Contactez-nous le plus tôt possible si vous devez changer vos dates. Nous ferons de notre mieux pour déplacer votre réservation, selon les disponibilités. L’acompte n’est pas remboursé en cas d’annulation ou de non-présentation.",
          ],
        },
        {
          title: "6. Règles de la maison",
          paras: [
            "Le riad est réservé aux adultes : les enfants ne sont pas acceptés.",
            "Les animaux ne sont pas admis.",
            "Jusqu’à {max} personnes par chambre. La suite Toubkal accueille une troisième personne, avec {percent} % de plus sur le prix.",
            "Merci de respecter le calme de la maison et du village, et de prendre soin des chambres et de leur mobilier. Les dégâts causés pendant le séjour peuvent être facturés.",
          ],
        },
        {
          title: "7. Activités",
          paras: [
            "Les randonnées, le VTT et les autres activités sont organisés avec des guides locaux. Les itinéraires peuvent changer selon la météo et l’état de la montagne. Chacun participe selon sa condition physique et choisit une activité adaptée ; nous recommandons une assurance voyage.",
          ],
        },
        {
          title: "8. Responsabilité",
          paras: [
            "Nous ne sommes pas responsables de la perte ou du vol d’effets personnels laissés sans surveillance, ni des événements indépendants de notre volonté (météo, routes fermées, événements naturels).",
          ],
        },
        {
          title: "9. Droit applicable",
          paras: [
            "Ces conditions sont régies par le droit marocain. En cas de désaccord, nous chercherons d’abord une solution amiable avec vous.",
          ],
        },
      ],
    },
    privacy: {
      meta: {
        title: "Politique de confidentialité",
        description:
          "Comment Riad Berber Towers collecte et utilise vos données personnelles.",
      },
      title: "Politique de confidentialité",
      intro:
        "Nous ne collectons que les informations nécessaires pour vous accueillir, et nous ne les vendons jamais. Cette page explique ce que nous collectons, pourquoi, et vos droits.",
      sections: [
        {
          title: "1. Qui sommes-nous",
          paras: [
            "Riad Berber Towers, Imlil Centre, Asni, Al Haouz, Maroc, est responsable de vos données. Contact : riadberbertowers@gmail.com.",
          ],
        },
        {
          title: "2. Ce que nous collectons",
          paras: [
            "Lors d’une réservation : vos nom et prénom, e-mail, téléphone, pays (facultatif), dates, nombre de personnes, choix des lits, heure d’arrivée et demandes particulières.",
            "Si vous nous envoyez une preuve de paiement, le fichier que vous téléversez.",
            "Quand vous nous écrivez par WhatsApp ou e-mail, le contenu de vos messages.",
          ],
        },
        {
          title: "3. Pourquoi nous les utilisons",
          paras: [
            "Pour gérer votre réservation et votre séjour, vous envoyer les confirmations et les informations de paiement, répondre à vos questions, et respecter nos obligations légales et comptables. Nous n’envoyons ni newsletter ni publicité.",
          ],
        },
        {
          title: "4. Qui y a accès",
          paras: [
            "Seulement notre équipe. Pour faire fonctionner le site, nous utilisons des prestataires de confiance qui traitent les données pour notre compte : Vercel (hébergement), Neon (base de données, hébergée dans l’Union européenne), Cloudflare R2 (stockage de fichiers) et Resend (envoi d’e-mails). Les paiements via PayPal sont traités par PayPal selon sa propre politique.",
          ],
        },
        {
          title: "5. Durée de conservation",
          paras: [
            "Les données de réservation sont conservées le temps nécessaire à votre séjour et à nos obligations légales et comptables, puis supprimées. Les preuves de paiement ne sont conservées que le temps nécessaire.",
          ],
        },
        {
          title: "6. Cookies",
          paras: [
            "Ce site n’utilise que les cookies nécessaires à son fonctionnement (par exemple la langue choisie, et la connexion de notre équipe à l’espace d’administration). Nous n’utilisons pas de cookies publicitaires ni de suivi.",
          ],
        },
        {
          title: "7. Vos droits",
          paras: [
            "Vous pouvez demander à consulter, corriger ou supprimer vos données, ou vous opposer à leur utilisation, en écrivant à riadberbertowers@gmail.com. Ces droits sont protégés par la loi marocaine 09-08 et, pour les voyageurs de l’Union européenne, par le RGPD. Vous pouvez aussi contacter la CNDP, l’autorité marocaine de protection des données.",
          ],
        },
      ],
    },
  },
};

export default fr;
