// Coordonnées et contenu du Centre d'aide / FAQ / Contact (retour client 2026-09-21 :
// les liens du footer ne menaient nulle part).

export const SUPPORT = {
  phone: '+225 07 06 40 29 29',
  phoneHref: 'tel:+2250706402929',
  whatsappHref: 'https://wa.me/2250706402929?text=Bonjour%2C%20j%27ai%20besoin%20d%27assistance.',
  email: 'support@bosejour.ci',
  emailHref: 'mailto:support@bosejour.ci',
  facebookHref: 'https://www.facebook.com/profile.php?id=61586042046006',
};

export interface FaqItem {
  q: string;
  a: string;
}

export interface FaqGroup {
  slug: string;
  title: string;
  items: FaqItem[];
}

export const FAQ_GROUPS: FaqGroup[] = [
  {
    slug: 'reserver',
    title: 'Réserver',
    items: [
      {
        q: 'Comment réserver un hébergement ?',
        a: "Choisissez un établissement (et une chambre), indiquez vos dates et le nombre de voyageurs, renseignez vos coordonnées puis envoyez votre demande. Vous n'avez pas besoin de créer un compte.",
      },
      {
        q: 'Que signifie « en attente de validation » ?',
        a: "Votre demande a été transmise au partenaire, qui doit confirmer la disponibilité pour vos dates avant tout paiement. Dès qu'il valide, vous recevez la confirmation de disponibilité ainsi qu'un lien de paiement sécurisé.",
      },
      {
        q: 'Combien de temps le partenaire a-t-il pour répondre ?',
        a: "Une échéance de réponse est indiquée sur la page de votre demande. Sans réponse dans ce délai, la demande est annulée automatiquement et vous pouvez en faire une autre.",
      },
      {
        q: 'Puis-je réserver pour quelqu’un d’autre ?',
        a: "Oui. À l'étape « Voyageur » du tunnel de réservation, choisissez « Je réserve pour une tierce personne » et indiquez les coordonnées de la personne qui séjournera.",
      },
    ],
  },
  {
    slug: 'payer',
    title: 'Payer',
    items: [
      {
        q: 'Quels moyens de paiement sont acceptés ?',
        a: 'Wave, Orange Money, MTN Mobile Money, Visa / Mastercard et Djamo. Le paiement se fait en ligne, sur une page sécurisée.',
      },
      {
        q: 'Y a-t-il une réduction pour le paiement en ligne ?',
        a: "En payant l'intégralité du séjour en ligne, vous bénéficiez d'une réduction. Elle est indiquée avant que vous ne validiez le paiement.",
      },
      {
        q: 'Puis-je garantir ma réservation sans tout payer ?',
        a: "Selon la politique de l'établissement, vous pouvez garantir votre réservation en payant la première nuitée en ligne ; le solde se règle directement à l'établissement à votre arrivée.",
      },
      {
        q: 'Quand reçois-je ma confirmation ?',
        a: "Juste après le paiement, vous recevez un e-mail de confirmation contenant votre numéro de réservation, votre code boséjour et votre reçu de paiement en PDF.",
      },
    ],
  },
  {
    slug: 'annuler',
    title: 'Modifier ou annuler',
    items: [
      {
        q: 'Comment annuler ma réservation ?',
        a: "Connecté, rendez-vous dans « Mes réservations ». Sans compte, ouvrez votre réservation depuis le lien de l'e-mail, cliquez sur « Annuler la réservation » et confirmez avec l'adresse e-mail utilisée. Une réservation déjà payée s'annule en nous contactant.",
      },
      {
        q: 'Que se passe-t-il si le partenaire refuse ma demande ?',
        a: "Vous en êtes informé et, si vous aviez déjà payé, vous êtes remboursé (sous 24 h).",
      },
      {
        q: 'Quelles sont les conditions d’annulation ?',
        a: "Elles dépendent de chaque établissement (flexible, modérée ou stricte) et sont affichées avant que vous ne validiez votre réservation, ainsi que sur la page de votre réservation.",
      },
    ],
  },
  {
    slug: 'reservation',
    title: 'Ma réservation et mon reçu',
    items: [
      {
        q: 'J’ai perdu le lien de ma réservation, comment la retrouver ?',
        a: "Utilisez la page « Retrouver ma réservation » : saisissez votre numéro de réservation (ou votre code boséjour) et l'adresse e-mail utilisée lors de la réservation.",
      },
      {
        q: 'Où trouver et imprimer mon reçu ?',
        a: "Sur la page de votre réservation, section « Reçu de paiement » : vous pouvez l'imprimer, le télécharger ou le partager. Le reçu est aussi joint en PDF à l'e-mail de confirmation.",
      },
      {
        q: 'À quoi sert le code boséjour ?',
        a: "C'est le code de confirmation à présenter à l'établissement lors de votre arrivée.",
      },
    ],
  },
  {
    slug: 'partenaires',
    title: 'Partenaires',
    items: [
      {
        q: 'Comment publier mon établissement ?',
        a: "Créez votre espace partenaire depuis la page « Établissement », complétez votre profil et les documents demandés, puis ajoutez votre établissement. Notre équipe le valide avant sa mise en ligne.",
      },
      {
        q: 'Comment répondre à une demande de réservation ?',
        a: "Depuis votre espace partenaire, rubrique Réservations : confirmez la disponibilité ou refusez la demande. Le voyageur est alors invité à payer ou informé du refus.",
      },
    ],
  },
];
