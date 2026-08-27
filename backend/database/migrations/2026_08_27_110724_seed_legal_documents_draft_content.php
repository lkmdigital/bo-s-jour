<?php

use App\Models\LegalDocument;
use Illuminate\Database\Migrations\Migration;

/**
 * Premier jet de contenu pour CGU/CGV/Politique de confidentialité — rédigé
 * à partir des fonctionnalités réelles de la plateforme (paiement Malia Pay,
 * annulation/remboursement, programme de fidélité, assistant IA). Reste un
 * BROUILLON : is_published n'est jamais touché ici, une validation
 * juridique et la décision de publication restent entièrement manuelles via
 * Paramètres > Juridique.
 *
 * Guard sur `content` NULL : ne s'applique qu'une fois, pour ne jamais
 * écraser un contenu déjà édité par un administrateur.
 */
return new class extends Migration
{
    public function up(): void
    {
        $documents = [
            'cgu' => <<<'EOT'
Article 1 — Objet

Les présentes Conditions Générales d'Utilisation (« CGU ») ont pour objet de définir les modalités et conditions dans lesquelles bo séjour met à disposition sa plateforme de réservation d'hébergements (la « Plateforme »), accessible notamment via le site bosejour.ci, ainsi que les droits et obligations des utilisateurs dans ce cadre.

L'utilisation de la Plateforme implique l'acceptation pleine et entière des présentes CGU. Les conditions propres à une réservation (prix, paiement, annulation) sont régies par les Conditions Générales de Vente, consultables séparément.

Article 2 — Définitions

« Plateforme » désigne le site et les applications bo séjour permettant la mise en relation entre Voyageurs et Partenaires.

« Utilisateur » désigne toute personne physique ou morale utilisant la Plateforme, qu'il s'agisse d'un Voyageur, d'un Partenaire ou d'un Compte Entreprise.

« Voyageur » désigne tout Utilisateur recherchant ou réservant un hébergement.

« Partenaire » (ou « Hôte ») désigne tout Utilisateur proposant un ou plusieurs hébergements à la réservation sur la Plateforme.

« Compte Entreprise » désigne un compte Voyageur rattaché à une entité professionnelle, pouvant regrouper plusieurs collaborateurs autorisés à réserver pour le compte de cette entité.

« Réservation » désigne la transaction par laquelle un Voyageur retient un hébergement proposé par un Partenaire, moyennant paiement.

Article 3 — Accès à la Plateforme et création de compte

L'accès à certaines fonctionnalités de la Plateforme nécessite la création d'un compte. L'Utilisateur s'engage à fournir des informations exactes, complètes et à jour lors de son inscription, et à les maintenir à jour.

Un Partenaire souhaitant proposer un hébergement doit fournir les documents justificatifs demandés par bo séjour (pièce d'identité, justificatifs relatifs à l'établissement) dans le cadre du contrôle de conformité préalable à la publication de son annonce. bo séjour se réserve le droit de refuser, suspendre ou retirer la publication d'un établissement dont la conformité documentaire n'est pas ou plus assurée.

Chaque Utilisateur est responsable de la confidentialité de ses identifiants de connexion et de toute activité réalisée depuis son compte.

Article 4 — Rôles des utilisateurs

La Plateforme distingue plusieurs profils : Voyageur, Partenaire, Compte Entreprise et Administrateur. Les fonctionnalités accessibles diffèrent selon le profil. bo séjour se réserve le droit de faire évoluer les fonctionnalités propres à chaque profil sans que cela ne constitue une modification substantielle des présentes CGU.

Article 5 — Obligations des Utilisateurs

Chaque Utilisateur s'engage à :
— utiliser la Plateforme conformément à sa destination et à la réglementation en vigueur ;
— ne pas publier de contenu (annonce, avis, message) mensonger, diffamatoire, discriminatoire ou portant atteinte aux droits d'un tiers ;
— ne pas tenter de contourner les circuits de réservation et de paiement de la Plateforme ;
— pour un Partenaire, garantir l'exactitude des informations et photographies publiées concernant son établissement, et honorer les Réservations confirmées.

Article 6 — Assistant IA

La Plateforme propose, pour certains profils (Administrateur, Partenaire, Voyageur), un assistant conversationnel s'appuyant sur un service d'intelligence artificielle tiers (Claude, développé par Anthropic). Cet assistant fournit des réponses, recommandations ou brouillons de contenu à partir des données de la Plateforme ; il ne prend aucune décision automatique engageant bo séjour ou l'Utilisateur, et ses suggestions doivent être vérifiées avant d'être suivies. Le traitement des données par ce prestataire est décrit dans la Politique de Confidentialité.

Article 7 — Programme Membre et Programme Corporate

bo séjour propose un programme de fidélité (points, niveaux, bons de réduction) et un programme dédié aux Comptes Entreprise. Les règles de fonctionnement de ces programmes, ainsi que les conditions d'obtention et d'utilisation des avantages associés, sont précisées dans les Conditions Générales de Vente et dans les pages dédiées de la Plateforme. bo séjour se réserve le droit de modifier ou de mettre fin à ces programmes, sous réserve d'en informer les Utilisateurs concernés.

Article 8 — Propriété intellectuelle

La Plateforme, sa structure, ses éléments graphiques, sa marque et ses contenus éditoriaux sont la propriété de bo séjour ou de ses partenaires, et sont protégés par le droit de la propriété intellectuelle. Toute reproduction ou exploitation non autorisée est interdite.

Les Partenaires demeurent titulaires des droits sur les contenus (textes, photographies) qu'ils publient, et en garantissent la licéité. Ils concèdent à bo séjour le droit de les afficher et de les diffuser dans le cadre du fonctionnement de la Plateforme.

Article 9 — Responsabilité

bo séjour agit en qualité d'intermédiaire technique entre Voyageurs et Partenaires. Les hébergements proposés sont sous la seule responsabilité des Partenaires qui les publient : bo séjour ne garantit ni la qualité, ni la conformité, ni la disponibilité réelle des hébergements présentés, au-delà des contrôles de conformité qu'elle met en œuvre.

bo séjour ne saurait être tenue responsable des dommages résultant d'une interruption, d'un dysfonctionnement de la Plateforme, ou d'un manquement d'un Partenaire ou d'un Voyageur à ses obligations.

Article 10 — Suspension et résiliation

bo séjour peut suspendre ou résilier l'accès d'un Utilisateur à la Plateforme en cas de manquement aux présentes CGU, de fraude avérée ou suspectée, ou de non-respect de la réglementation applicable, après notification lorsque les circonstances le permettent.

Article 11 — Droit applicable et litiges

Les présentes CGU sont soumises au droit ivoirien. Tout litige relatif à leur interprétation ou à leur exécution relève, à défaut de résolution amiable, de la compétence des juridictions d'Abidjan.

Article 12 — Modification des CGU

bo séjour peut modifier les présentes CGU à tout moment. Les Utilisateurs sont informés de toute modification substantielle ; la poursuite de l'utilisation de la Plateforme après notification vaut acceptation des CGU modifiées.
EOT,
            'cgv' => <<<'EOT'
Article 1 — Objet

Les présentes Conditions Générales de Vente (« CGV ») régissent les modalités de réservation et de paiement des hébergements proposés par les Partenaires sur la Plateforme bo séjour. Elles complètent les Conditions Générales d'Utilisation.

Article 2 — Processus de réservation

Le Voyageur sélectionne un hébergement, des dates de séjour et, le cas échéant, une chambre ou un type de prestation. Le prix affiché intègre le tarif fixé par le Partenaire pour la période concernée, ainsi que les éventuelles réductions applicables (code promotionnel, bon de fidélité). La Réservation n'est définitive qu'après confirmation du paiement.

Article 3 — Prix et paiement

Les prix sont exprimés en francs CFA (FCFA), toutes taxes applicables comprises sauf mention contraire. Le paiement s'effectue en ligne, au moment de la réservation, via les moyens de paiement proposés par la Plateforme (notamment Wave, Orange Money, carte bancaire Visa/Mastercard, Djamo), par l'intermédiaire d'un prestataire de paiement tiers. bo séjour ne conserve pas les données de carte bancaire du Voyageur ; celles-ci sont traitées directement par le prestataire de paiement.

Selon l'hébergement, un acompte ou une caution peut être exigé ; ses modalités (montant, conditions de restitution) sont précisées sur la fiche de l'hébergement avant la réservation.

Article 4 — Confirmation de réservation

Une confirmation de réservation est adressée au Voyageur (par e-mail et, le cas échéant, par WhatsApp) une fois le paiement validé, mentionnant le code de confirmation et le numéro de réservation. Le Partenaire est informé de la nouvelle réservation.

Article 5 — Annulation et remboursement

Chaque hébergement est associé à une politique d'annulation propre, définie par le Partenaire et affichée avant la réservation (notamment un délai en heures avant l'arrivée au-delà duquel l'annulation n'ouvre plus droit à remboursement).

Lorsque l'annulation intervient dans les délais prévus par cette politique, ou lorsque la réservation est refusée par le Partenaire, le montant remboursable est déterminé selon les règles applicables à la réservation concernée. Le remboursement est ensuite traité par les équipes bo séjour vers le moyen de paiement utilisé lors de la réservation, dans un délai indicatif qui sera précisé au Voyageur lors du traitement de sa demande. bo séjour ne garantit pas un remboursement automatique instantané.

Toute demande relative à une annulation ou à un remboursement peut être adressée au service client bo séjour.

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
EOT,
            'confidentialite' => <<<'EOT'
Article 1 — Responsable du traitement

Le responsable du traitement des données à caractère personnel collectées sur la Plateforme bo séjour est la société éditrice de bo séjour (« bo séjour »). Les coordonnées de contact figurent à l'Article 11 ci-dessous.

Article 2 — Données collectées

Selon son profil et son usage de la Plateforme, bo séjour peut collecter :
— des données d'identification et de contact (nom, e-mail, téléphone, date de naissance) ;
— pour les Partenaires, des documents justificatifs relatifs à l'établissement et à son exploitant, requis dans le cadre du contrôle de conformité préalable à la publication d'une annonce ;
— des données relatives aux réservations (dates, montants, établissement concerné, historique) ;
— des données de paiement limitées : bo séjour ne stocke pas les données de carte bancaire, celles-ci étant traitées directement par le prestataire de paiement (voir Article 5) ;
— des données de fidélité (points, niveau, bons obtenus) ;
— des avis et évaluations publiés par le Voyageur ;
— des préférences déclarées (type d'hébergement, budget indicatif, région) et des données de navigation nécessaires au fonctionnement de la Plateforme.

Article 3 — Finalités du traitement

Ces données sont traitées pour : la gestion des comptes et des réservations ; le traitement des paiements ; le contrôle de conformité des établissements ; la gestion du programme de fidélité ; l'envoi de communications liées au compte ou à une réservation (confirmation, rappel, notification) ; l'amélioration du service, y compris via les fonctionnalités d'assistance décrites à l'Article 4 ; le respect des obligations légales de bo séjour.

Article 4 — Assistant IA et traitement automatisé

Certaines fonctionnalités de la Plateforme (assistant conversationnel pour les administrateurs, les partenaires et les voyageurs, génération de contenu, recommandations) s'appuient sur un service d'intelligence artificielle tiers, Claude, développé par la société américaine Anthropic. À la date des présentes, ce service traite uniquement des données déjà accessibles à l'Utilisateur qui interroge l'assistant (ses propres réservations, ses données de fidélité, des données agrégées d'activité, des avis publics) et des requêtes de recherche formulées par l'Utilisateur ; il n'est, à ce jour, procédé à aucun envoi de documents d'identité ou justificatifs à ce prestataire. Toute évolution future qui impliquerait un tel traitement fera l'objet d'une mise à jour préalable de la présente politique.

Article 5 — Destinataires et sous-traitants

Selon la finalité concernée, certaines données sont transmises à des prestataires intervenant pour le compte de bo séjour : le prestataire de paiement (Malia Pay) pour le traitement des transactions ; les prestataires de messagerie et de notification (dont WhatsApp Business/Meta, un service de notifications push, un service d'envoi de SMS) pour l'envoi de communications ; le prestataire d'intelligence artificielle (Anthropic) pour les fonctionnalités décrites à l'Article 4. Ces prestataires ne sont autorisés à traiter les données que pour les finalités convenues avec bo séjour.

bo séjour ne vend ni ne loue les données personnelles des Utilisateurs à des tiers à des fins commerciales.

Article 6 — Durée de conservation

Les données sont conservées pendant la durée nécessaire aux finalités pour lesquelles elles ont été collectées, augmentée le cas échéant des durées de conservation imposées par la réglementation applicable (notamment comptable et fiscale). Un Utilisateur peut demander la suppression de son compte dans les conditions prévues à l'Article 8.

Article 7 — Sécurité des données

bo séjour met en œuvre des mesures techniques et organisationnelles raisonnables pour protéger les données personnelles contre la perte, l'accès non autorisé, la divulgation ou l'altération.

Article 8 — Droits des personnes

Conformément à la loi ivoirienne n° 2013-450 du 19 juin 2013 relative à la protection des données à caractère personnel, tout Utilisateur dispose d'un droit d'accès, de rectification, d'opposition et de suppression de ses données personnelles. Ces droits peuvent être exercés auprès de bo séjour selon les modalités indiquées à l'Article 11. L'Utilisateur dispose également du droit d'introduire une réclamation auprès de l'Autorité de Régulation des Télécommunications/TIC de Côte d'Ivoire (ARTCI), autorité compétente en matière de protection des données personnelles.

Article 9 — Cookies

La Plateforme utilise des cookies et technologies similaires nécessaires à son fonctionnement (authentification, préférences) et, le cas échéant, à des fins de mesure d'audience. L'Utilisateur peut configurer son navigateur pour refuser certains cookies, ce qui peut affecter certaines fonctionnalités de la Plateforme.

Article 10 — Transferts de données

Certains prestataires mentionnés à l'Article 5, dont le prestataire d'intelligence artificielle, sont établis hors de Côte d'Ivoire, notamment aux États-Unis. bo séjour veille à ce que ces transferts s'accompagnent de garanties appropriées conformes à la réglementation applicable.

Article 11 — Contact

Pour toute question relative à la présente politique ou pour exercer ses droits, l'Utilisateur peut contacter bo séjour via les coordonnées de contact indiquées sur la Plateforme.

Article 12 — Modification de la politique

La présente politique peut être modifiée pour refléter l'évolution des traitements réalisés par bo séjour ou de la réglementation applicable. La version en vigueur est celle publiée sur la Plateforme, avec sa date de mise à jour.
EOT,
        ];

        foreach ($documents as $slug => $content) {
            LegalDocument::where('slug', $slug)
                ->whereNull('content')
                ->update(['content' => $content, 'version' => '1.0']);
        }
    }

    public function down(): void
    {
        // Contenu volontairement laissé en place au rollback — le down()
        // ne fait rien pour éviter de remettre le null en base par erreur
        // si du contenu a déjà été retouché par un administrateur depuis.
    }
};
