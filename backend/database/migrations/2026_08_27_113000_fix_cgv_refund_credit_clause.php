<?php

use App\Models\LegalDocument;
use Illuminate\Database\Migrations\Migration;

/**
 * Corrige l'article 5 des CGV (brouillon) : la clause de remboursement
 * décrivait un remboursement générique automatique, alors que la réalité
 * du produit distingue deux cas — annulation par le voyageur : avoir
 * (crédit) réutilisable, jamais un remboursement bancaire ; refus par
 * l'hôte : remboursement réel mais traité manuellement par l'équipe (les
 * deux confirmés par l'utilisateur, pas des manques à corriger côté code).
 *
 * Guard sur le contenu lui-même (ancien intitulé exact de l'article 5),
 * pas sur `updated_by` — cette colonne a été positionnée par des tests en
 * tinker pendant cette même session, pas par une vraie édition admin,
 * donc pas fiable comme signal ici. Si l'article 5 ne correspond plus
 * exactement à ce texte (quelqu'un l'a réellement retouché depuis), la
 * correction ne s'applique pas.
 */
return new class extends Migration
{
    public function up(): void
    {
        LegalDocument::where('slug', 'cgv')
            ->where('content', 'like', '%Article 5 — Annulation et remboursement%')
            ->update(['content' => <<<'EOT'
Article 1 — Objet

Les présentes Conditions Générales de Vente (« CGV ») régissent les modalités de réservation et de paiement des hébergements proposés par les Partenaires sur la Plateforme bo séjour. Elles complètent les Conditions Générales d'Utilisation.

Article 2 — Processus de réservation

Le Voyageur sélectionne un hébergement, des dates de séjour et, le cas échéant, une chambre ou un type de prestation. Le prix affiché intègre le tarif fixé par le Partenaire pour la période concernée, ainsi que les éventuelles réductions applicables (code promotionnel, bon de fidélité). La Réservation n'est définitive qu'après confirmation du paiement.

Article 3 — Prix et paiement

Les prix sont exprimés en francs CFA (FCFA), toutes taxes applicables comprises sauf mention contraire. Le paiement s'effectue en ligne, au moment de la réservation, via les moyens de paiement proposés par la Plateforme (notamment Wave, Orange Money, carte bancaire Visa/Mastercard, Djamo), par l'intermédiaire d'un prestataire de paiement tiers. bo séjour ne conserve pas les données de carte bancaire du Voyageur ; celles-ci sont traitées directement par le prestataire de paiement.

Selon l'hébergement, un acompte ou une caution peut être exigé ; ses modalités (montant, conditions de restitution) sont précisées sur la fiche de l'hébergement avant la réservation.

Article 4 — Confirmation de réservation

Une confirmation de réservation est adressée au Voyageur (par e-mail et, le cas échéant, par WhatsApp) une fois le paiement validé, mentionnant le code de confirmation et le numéro de réservation. Le Partenaire est informé de la nouvelle réservation.

Article 5 — Annulation, avoirs et remboursements

Chaque hébergement est associé à une politique d'annulation propre, définie par le Partenaire et affichée avant la réservation (notamment un délai en heures avant l'arrivée au-delà duquel l'annulation par le Voyageur n'ouvre plus droit à un avoir).

Lorsque le Voyageur annule une Réservation dans les délais prévus par cette politique, le montant déjà réglé n'est pas remboursé sur le moyen de paiement utilisé : il est converti en un avoir inscrit sur son compte, utilisable pour une prochaine réservation sur la Plateforme. Cet avoir est consultable dans l'espace « Mes avoirs » du Voyageur ; son application sur une nouvelle réservation est actuellement traitée par le service client bo séjour, sur demande du Voyageur. Aucun avoir n'est émis lorsque l'annulation intervient hors délai ou pour une Réservation non remboursable.

Lorsqu'une Réservation confirmée est refusée par le Partenaire, le Voyageur n'étant pas à l'origine de cette annulation, le montant réglé lui est remboursé — et non converti en avoir. Ce remboursement est traité par les équipes bo séjour vers le moyen de paiement utilisé lors de la réservation, dans un délai indicatif qui sera communiqué au Voyageur ; bo séjour ne garantit pas un remboursement automatique instantané.

Toute demande relative à une annulation, à un avoir ou à un remboursement peut être adressée au service client bo séjour.

Article 6 — Obligations du Partenaire

Le Partenaire s'engage à honorer toute Réservation confirmée, à maintenir à jour les disponibilités et tarifs de son établissement, et à accueillir le Voyageur dans les conditions décrites dans son annonce. Tout refus d'une Réservation confirmée sans motif légitime peut donner lieu aux mesures prévues par les CGU.

Article 7 — Obligations du Voyageur

Le Voyageur s'engage à se présenter à l'hébergement aux dates réservées, à régler tout solde ou caution éventuellement dû sur place selon les conditions de l'annonce, et à respecter le règlement intérieur de l'établissement.

Article 8 — Avis et évaluations

À l'issue de son séjour, le Voyageur peut publier un avis et une note sur l'hébergement. Les avis doivent refléter une expérience réelle et respecter les règles de modération de la Plateforme ; bo séjour se réserve le droit de retirer un avis manifestement mensonger, injurieux ou sans lien avec un séjour réel.

Article 9 — Programme Membre et Programme Corporate

Les réservations réalisées sur la Plateforme peuvent, selon les conditions en vigueur, faire gagner des points de fidélité, faire progresser le Voyageur dans les niveaux du Programme Membre, ou être prises en compte dans le suivi du chiffre d'affaires d'un Compte Entreprise dans le cadre du Programme Corporate. Les points, bons et récompenses n'ont pas de valeur monétaire de remboursement et sont soumis aux règles propres à chaque programme, consultables dans l'espace fidélité du Voyageur.

Article 10 — Réclamations et service client

Toute réclamation relative à une Réservation peut être adressée au service client bo séjour par les canaux indiqués sur la Plateforme. bo séjour s'efforce d'apporter une réponse dans un délai raisonnable ; elle peut, le cas échéant, faciliter la mise en relation entre le Voyageur et le Partenaire concerné.

Article 11 — Force majeure

Aucune des parties ne pourra être tenue responsable de l'inexécution de ses obligations en cas de force majeure, telle que définie par le droit ivoirien.

Article 12 — Droit applicable et litiges

Les présentes CGV sont soumises au droit ivoirien. Tout litige relève, à défaut de résolution amiable, de la compétence des juridictions d'Abidjan.
EOT]);
    }

    public function down(): void
    {
        // Correction de contenu — pas de retour arrière automatique.
    }
};
