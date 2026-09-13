<?php

use App\Models\LegalDocument;
use Illuminate\Database\Migrations\Migration;

/**
 * Retour client (réunion 2026-09-08, engagement pris par Ziegnougo TRAORÉ :
 * "Envoyer CGU" / "Format des conditions d'utilisation défini") : remplace le
 * contenu v1.0 (rédigé le 2026-08-27 à partir des fonctionnalités réelles,
 * jamais relu par un juriste) par le document contractuel officiel fourni par
 * le client — "BoSejour_Document_Contractuel_Global_CGU_CGV_PC_V2_0.docx" —
 * découpé en ses 3 parties pour correspondre aux 3 slugs existants (cgu/cgv/
 * confidentialite), déjà publiés.
 *
 * Révèle au passage le nom de la société exploitante : HCS Consulting.
 *
 * Le document source laissait plusieurs champs "[à compléter]" (adresse du
 * responsable du traitement, contact données personnelles, DPO, durées de
 * conservation, adresse d'exercice des droits) — jamais laissés visibles
 * tels quels sur une page publique. Décisions confirmées avec l'utilisateur :
 * - contact données personnelles / exercice des droits : support@bosejour.ci
 *   (déjà l'adresse de contact affichée partout ailleurs sur le site) ;
 * - adresse postale du responsable du traitement : pas encore communiquée,
 *   volontairement omise de la PC plutôt que d'afficher un champ vide ou une
 *   valeur inventée — à ajouter dès qu'elle sera communiquée ;
 * - durées de conservation (Article 52) : valeurs standard du secteur
 *   (compte : durée d'utilisation + 3 ans d'inactivité ; réservation/
 *   facturation : 10 ans, obligation comptable OHADA ; prospection : 3 ans ;
 *   journaux de sécurité : 1 an ; comptes partenaires : durée du partenariat
 *   + 5 ans), à ajuster si le conseil juridique du client en fournit d'autres.
 *
 * Pas de guard sur l'ancien contenu (contrairement à
 * fix_cgv_refund_credit_clause.php, qui corrigeait un article isolé) : ce
 * document remplace intégralement et sciemment la version précédente dans
 * son ensemble, à la demande explicite du client.
 */
return new class extends Migration
{
    public function up(): void
    {
        $documents = [
            'cgu' => <<<'EOT'
TITRE I — DISPOSITIONS GÉNÉRALES

Article 1 — Objet

Les présentes CGU définissent les conditions dans lesquelles toute personne physique ou morale accède à la plateforme BoSéjour et utilise les fonctionnalités du Service Hébergement.
BoSéjour propose notamment des fonctionnalités de recherche, de présentation, de comparaison, de demande, de réservation, de communication et de gestion de services d’hébergement.

Article 2 — Définitions

1. BoSéjour : plateforme numérique exploitée par HCS Consulting.
2. Éditeur : HCS Consulting, identifié dans le présent document.
3. Plateforme : site internet, application, interface, extranet, outil, contenu et service exploité sous la marque BoSéjour.
4. Service Hébergement : services de recherche, présentation, mise en relation, réservation et suivi de prestations d’hébergement.
5. Utilisateur : toute personne accédant à la plateforme.
6. Voyageur : personne physique utilisant BoSéjour pour rechercher ou réserver un hébergement.
7. Client Corporate : entreprise ou organisation réservant pour ses collaborateurs, invités, clients ou partenaires.
8. Partenaire ou Hôtel : établissement hôtelier ou hébergeur référencé sur BoSéjour.
9. Extranet : espace sécurisé mis à la disposition d’un partenaire et de ses utilisateurs autorisés.
10. Compte : espace personnel ou professionnel donnant accès à certaines fonctionnalités.
11. Contenu : texte, photographie, vidéo, prix, disponibilité, avis, document, message ou donnée publié ou transmis sur la plateforme.
12. Donnée personnelle : information se rapportant à une personne physique identifiée ou identifiable.

Article 3 — Champ d’application

Les présentes CGU s’appliquent à tout accès ou usage de la plateforme, quel que soit le support utilisé, le lieu d’accès ou la qualité de l’utilisateur.
Les CGU sont complétées par les CGV, la PC, les conditions particulières de réservation.

Article 4 — Acceptation

L’accès à la plateforme peut être libre ou soumis à la création d’un compte. L’utilisation d’une fonctionnalité, la création d’un compte ou la validation d’une réservation vaut acceptation des clauses applicables.
Lorsque cela est requis, l’utilisateur manifeste son accord en cochant une case dédiée ou en accomplissant tout acte équivalent. L’utilisateur qui refuse les CGU doit cesser d’utiliser la plateforme.

Article 5 — Modification des documents

BoSéjour peut modifier les CGU, les CGV ou la PC pour tenir compte de l’évolution de la plateforme, des pratiques commerciales, des exigences de sécurité ou de la réglementation.
La version applicable à une réservation est celle acceptée au moment de sa conclusion, sous réserve des dispositions impératives. Les modifications substantielles peuvent être portées à la connaissance des utilisateurs par tout moyen approprié.

TITRE II — ACCÈS ET COMPTES

Article 6 — Conditions d’accès

L’utilisateur doit disposer de la capacité juridique requise pour utiliser les services et conclure les actes auxquels il s’engage.
Lorsqu’il agit au nom d’une entreprise ou d’un hôtel, il déclare disposer des pouvoirs nécessaires pour représenter cette entité.

Article 7 — Création d’un compte

L’utilisateur fournit des informations exactes, complètes et à jour. Il doit actualiser les informations devenues inexactes ou obsolètes.
BoSéjour peut demander un justificatif d’identité, de qualité, d’habilitation ou d’existence de l’entreprise lorsque cela est nécessaire à la sécurité de la plateforme ou à l’exécution d’un service.

Article 8 — Sécurité des identifiants

Les identifiants sont personnels et confidentiels. L’utilisateur doit prendre toutes les mesures nécessaires pour empêcher leur divulgation.

Toute perte, utilisation non autorisée ou suspicion d’usurpation doit être signalée immédiatement à BoSéjour. Les opérations réalisées avant le signalement peuvent être imputées au titulaire du compte, sauf preuve contraire.

Article 9 — Comptes Voyageur et Corporate

Le compte Voyageur permet notamment de rechercher des hébergements, gérer des demandes, suivre des réservations et recevoir des communications liées au séjour.

Le compte Corporate peut permettre à une entreprise de centraliser les réservations, d’autoriser des collaborateurs, de suivre les dépenses et de gérer des profils secondaires. Le Client Corporate répond des actions réalisées par ses utilisateurs autorisés.

Article 10 — Comptes Partenaire et Extranet

Le compte Partenaire permet à l’hôtel de gérer ses informations, tarifs, disponibilités, réservations, messages et statistiques selon les fonctionnalités disponibles.

Le partenaire peut créer des accès secondaires, notamment pour un administrateur, un réceptionniste, un comptable ou un commercial. Il demeure responsable des droits accordés et des actions réalisées depuis ces accès.

TITRE III — UTILISATION DE LA PLATEFORME

Article 11 — Recherche et informations

Les résultats de recherche peuvent dépendre des critères renseignés, des disponibilités, des tarifs, de la localisation, des conditions de l’offre et de paramètres techniques.

BoSéjour s’efforce de présenter des informations fiables. Les informations relatives à l’exploitation, aux équipements, à la sécurité et aux prestations de l’hôtel relèvent toutefois de la responsabilité du partenaire qui les fournit.

Article 12 — Réservations et communications

Les modalités de réservation, de confirmation, de paiement, de modification et d’annulation sont définies dans les CGV et dans les conditions particulières de chaque offre.

BoSéjour peut communiquer avec l’utilisateur par courriel, téléphone, SMS, notification, messagerie intégrée ou tout autre canal associé au compte.

Article 13 — Avis et contenus des utilisateurs

L’utilisateur qui publie un contenu garantit qu’il dispose des droits nécessaires et que ce contenu est exact, licite, respectueux et non trompeur.

Il est interdit de publier des contenus diffamatoires, haineux, frauduleux, pornographiques, menaçants, contrefaisants ou portant atteinte aux droits d’un tiers.

BoSéjour peut retirer ou désactiver un contenu qui enfreint les présentes CGU ou la loi, sans que ce retrait constitue une reconnaissance de responsabilité.

Article 14 — Outils automatisés et services de tiers

La plateforme peut intégrer des outils de paiement, de cartographie, de messagerie, d’analyse, de vérification ou d’assistance opérés par des tiers.

L’utilisation d’un service tiers peut être soumise à ses propres conditions. BoSéjour ne contrôle pas intégralement les services tiers et ne répond pas de leurs interruptions ou contenus, sauf disposition contraire.

TITRE IV — DROITS, INTERDICTIONS ET RESPONSABILITÉS D’UTILISATION

Article 15 — Obligations de l’utilisateur

L’utilisateur s’engage à :

1. utiliser la plateforme conformément à la loi et aux présentes CGU ;
2. fournir des informations exactes ;
3. préserver la sécurité de ses identifiants ;
4. respecter les droits de BoSéjour, des hôtels, des voyageurs et des tiers ;
5. signaler toute anomalie, fraude ou contenu illicite ;
6. ne pas détourner la plateforme de sa finalité.

Article 16 — Usages interdits

Sont notamment interdits :

1. l’accès frauduleux ou le contournement des mesures de sécurité ;
2. l’utilisation d’un compte appartenant à un tiers ;
3. la diffusion de virus ou de code malveillant ;
4. l’extraction massive ou automatisée des données sans autorisation ;
5. la revente non autorisée des accès ou contenus ;
6. la fourniture d’informations fausses ou trompeuses ;
7. toute action susceptible de perturber la plateforme ou de nuire à un hôtel ou à un client.

Article 17 — Propriété intellectuelle

La structure, les marques, logos, textes, photographies, interfaces, bases de données, logiciels et éléments de la plateforme sont protégés par les droits applicables.

Toute reproduction, adaptation, extraction, représentation ou réutilisation non autorisée est interdite. L’accès à la plateforme ne transfère aucun droit de propriété à l’utilisateur.

TITRE V — DISPONIBILITÉ, SUSPENSION ET FIN D’ACCÈS

Article 18 — Disponibilité

BoSéjour s’efforce de maintenir la plateforme accessible, sans garantir une disponibilité continue ni l’absence d’erreurs.

La plateforme peut être suspendue pour maintenance, mise à jour, sécurité, correction d’anomalie, incident technique ou force majeure.

Article 19 — Suspension et suppression

BoSéjour peut suspendre ou limiter un compte en cas de fraude, d’usage abusif, de violation des CGU, de risque de sécurité, d’impayé ou d’obligation légale.

En cas d’urgence, la mesure peut être prise sans préavis. Lorsque cela est possible, BoSéjour indique le motif et les modalités de réexamen.

L’utilisateur peut demander la fermeture de son compte. La fermeture n’efface pas les obligations nées avant sa prise d’effet ni les données devant être conservées pour des motifs légaux, comptables ou probatoires.

TITRE VI — RESPONSABILITÉ ET DISPOSITIONS FINALES DES CGU

Article 20 — Responsabilité de BoSéjour

BoSéjour agit comme opérateur de plateforme et intermédiaire technique, sauf mention contraire. Elle ne garantit ni la disponibilité permanente des hôtels, ni l’exactitude absolue de tous les contenus publiés par les partenaires ou utilisateurs.

Dans les limites autorisées par la loi, BoSéjour ne répond pas des dommages indirects, pertes d’exploitation, pertes de chance ou préjudices résultant d’un fait du partenaire, de l’utilisateur, d’un tiers ou d’un événement indépendant de sa volonté.

Article 21 — Force majeure

Aucune partie ne peut être tenue responsable d’un manquement résultant d’un événement de force majeure reconnu par le droit applicable, notamment catastrophe naturelle, guerre, émeute, incendie, panne généralisée, défaillance réseau, décision administrative ou événement imprévisible et irrésistible.

Article 22 — Droit applicable

Les CGU sont régies par le droit de la République de Côte d’Ivoire, sous réserve des dispositions impératives applicables.

Les parties recherchent une solution amiable avant toute procédure. À défaut, les juridictions compétentes du ressort du siège social de HCS Consulting sont compétentes, sous réserve des règles impératives applicables.
EOT,
            'cgv' => <<<'EOT'
TITRE VII — VENTE DES SERVICES D’HÉBERGEMENT

Article 23 — Objet des CGV

Les présentes CGV encadrent les demandes, réservations, paiements, annulations, remboursements et réclamations relatifs aux services d’hébergement proposés sur BoSéjour.

Selon l’offre, BoSéjour agit comme intermédiaire de réservation, mandataire transparent ou opérateur du parcours de paiement. La qualité applicable est précisée dans le parcours de commande ou la confirmation.

Article 24 — Formation du contrat de réservation

Le client sélectionne une offre, renseigne les informations nécessaires, vérifie le récapitulatif, accepte les documents applicables et valide sa commande.

La réservation peut être confirmée immédiatement ou soumise à l’acceptation de l’hôtel. Elle ne devient ferme qu’à réception de la confirmation prévue par le parcours.

La confirmation précise notamment l’hôtel, les dates, le type d’hébergement, le nombre de voyageurs, le prix, les services inclus, les conditions de paiement et les règles d’annulation.

Article 25 — Prix, taxes et frais

Le prix affiché est celui applicable au moment de la validation, sous réserve d’une erreur manifeste. Il peut varier selon les dates, la durée, l’hébergement, le nombre de personnes, les promotions et les conditions de l’hôtel.

Les taxes et frais inclus sont indiqués dans le parcours de commande lorsque leur montant est connu. Les taxes locales, cautions, frais de ménage, consommations ou services payables sur place sont dus directement à l’hôtel lorsqu’ils ne sont pas inclus dans le prix réglé à BoSéjour.

Article 26 — Paiement par le client

Les moyens de paiement disponibles sont ceux affichés au moment de la réservation, notamment carte bancaire, Mobile Money, virement, lien de paiement ou tout autre moyen accepté.

Le paiement peut être traité par BoSéjour, par un prestataire de paiement ou directement par l’hôtel. Le client garantit qu’il est autorisé à utiliser le moyen de paiement fourni.

En cas de refus, d’échec ou d’opposition, BoSéjour peut demander une régularisation ou annuler la réservation selon les conditions de l’offre.

Article 27 — Modification, annulation et non-présentation

Toute modification est soumise aux disponibilités et aux conditions du tarif réservé. Elle peut entraîner une différence de prix ou des frais.

L’annulation est réalisée selon les délais et conditions indiqués dans la confirmation. Selon le tarif, elle peut être gratuite, partiellement remboursable ou non remboursable.

La non-présentation du client ou du voyageur entraîne les conséquences indiquées dans les conditions particulières. Le client doit signaler toute arrivée tardive à l’hôtel et conserver la preuve de sa démarche.

Article 28 — Annulation par l’hôtel ou BoSéjour

En cas d’indisponibilité, d’erreur manifeste, de fraude, de force majeure ou de risque de sécurité, l’hôtel ou BoSéjour peut annuler une réservation.

Lorsque l’annulation n’est pas imputable au client, BoSéjour s’efforce de proposer une solution de remplacement ou le remboursement des sommes versées pour la prestation annulée, selon les disponibilités et les règles applicables.

Article 29 — Exécution du séjour

L’hôtel est responsable de l’accueil du client, de l’état de l’hébergement, des services fournis, de la sécurité et de la conformité de son exploitation.

Le client et les voyageurs doivent respecter les horaires, le règlement intérieur, le nombre de personnes prévu et les règles de sécurité. Ils répondent des dommages causés par leur fait.

Article 30 — Remboursement

Le remboursement dépend du tarif, du motif de l’annulation et des sommes effectivement encaissées. Il est effectué, dans la mesure du possible, sur le moyen de paiement d’origine.

Les délais de crédit peuvent dépendre de la banque, du prestataire de paiement ou du moyen utilisé. Les taxes dues, services consommés et frais non remboursables peuvent être exclus lorsque les conditions de l’offre le prévoient.

TITRE VIII — CONDITIONS DE PARTENARIAT AVEC LES HÔTELS

Article 31 — Adhésion de l’hôtel

L’hôtel qui adhère à BoSéjour fournit les informations nécessaires à son référencement : nom commercial, raison sociale, adresse, ville, responsable, fonction, téléphone, adresse électronique, documents administratifs et coordonnées bancaires.

L’hôtel garantit l’exactitude et la mise à jour de ces informations ainsi que son droit d’exploiter l’établissement.

L’adhésion est conclue pour une durée indéterminée à compter de la signature ou de l’activation du compte partenaire.

Article 32 — Rôle de BoSéjour

BoSéjour assure le référencement, la visibilité, la promotion et la gestion technique des réservations de l’hôtel sur la plateforme.

BoSéjour peut agir comme intermédiaire technique et mandataire transparent pour le compte de l’hôtel. Cette qualification ne fait pas de BoSéjour le propriétaire, l’exploitant, le co-exploitant ou le gérant de l’hôtel.

Article 33 — Obligations de BoSéjour envers l’hôtel

BoSéjour s’engage à :

1. assurer la visibilité de l’hôtel selon l’offre souscrite ;
2. gérer techniquement les réservations transmises par la plateforme ;
3. sécuriser le parcours de paiement selon les moyens disponibles ;
4. informer l’hôtel des réservations validées dans les meilleurs délais ;
5. rendre accessibles les informations de suivi prévues dans l’Extranet ;
6. transmettre les fonds selon l’article 35, sous réserve des opérations annulées, contestées ou bloquées pour des raisons légales ou de sécurité.

Article 34 — Obligations de l’hôtel partenaire

L’hôtel s’engage à :

1. maintenir ses tarifs, disponibilités, équipements et conditions à jour ;
2. honorer les réservations validées par BoSéjour ;
3. fournir les prestations correspondant à l’offre publiée ;
4. garantir la qualité, la sécurité, la salubrité et la conformité de son établissement ;
5. informer immédiatement BoSéjour de toute indisponibilité ou difficulté affectant une réservation ;
6. respecter les obligations fiscales, sociales, administratives et sectorielles applicables ;
7. traiter les clients issus de BoSéjour sans discrimination illicite ;
8. répondre des dommages causés par son activité ou ses préposés.

Article 35 — Hub de paiement et versement des fonds

BoSéjour centralise les paiements des clients lorsque le parcours de réservation le prévoit.

Les fonds collectés au cours d’une semaine sont versés par virement sur le compte bancaire communiqué par l’hôtel chaque lundi, sous réserve des délais bancaires, des jours fériés, des contrôles de sécurité, des remboursements, des contestations et des obligations légales.

Le montant collecté et le détail des opérations sont rendus visibles dans l’Extranet selon les fonctionnalités disponibles. Un courriel automatique peut informer l’hôtel de l’envoi des fonds.

L’hôtel doit maintenir ses coordonnées bancaires exactes. BoSéjour ne répond pas des retards ou erreurs résultant d’informations bancaires erronées, incomplètes ou non actualisées par l’hôtel.

Article 36 — Commissions

En rémunération des services de plateforme, une commission BoSéjour de 10 % du montant total TTC de la nuitée est prélevée à la source.

Lorsque le paiement utilise une solution Mobile Money, une commission de 1 % du montant total est également prélevée au titre de ce service, sauf conditions particulières convenues par écrit.

À titre d’exemple, pour une nuitée de 20 000 FCFA, la commission BoSéjour est de 2 000 FCFA et la commission Mobile Money de 200 FCFA. Le montant net versé à l’hôtel est donc de 17 800 FCFA.

Les commissions applicables, leur assiette et toute modification doivent être indiquées dans le contrat, l’Extranet ou une condition particulière acceptée par l’hôtel.

Article 37 — Responsabilité et indépendance des parties

L’hôtel demeure un établissement indépendant et conserve l’entière responsabilité civile, commerciale, administrative et pénale de son exploitation.

BoSéjour ne répond pas des conditions d’accueil, de la sécurité des locaux, des prestations fournies, des dommages, incidents ou litiges survenant dans l’établissement, sauf faute directement imputable à BoSéjour dans les limites du droit applicable.

Article 38 — Résiliation du partenariat

Chaque partie peut mettre fin au partenariat à tout moment, sans frais ni pénalité, moyennant un préavis de quinze jours notifié par écrit ou par voie électronique.

La résiliation ne libère pas les parties de leurs obligations relatives aux réservations déjà confirmées, aux paiements dus, aux réclamations en cours, à la confidentialité et à la conservation des preuves.

BoSéjour peut suspendre immédiatement la visibilité ou les accès de l’hôtel en cas de fraude, indisponibilité répétée, manquement grave, danger pour les clients, défaut de paiement ou non-respect des obligations légales.

TITRE IX — RÉCLAMATIONS ET LITIGES COMMERCIAUX

Article 39 — Réclamation du client

Le client doit signaler toute difficulté à l’hôtel et à BoSéjour dès que possible afin de permettre une résolution pendant le séjour.

Toute réclamation ultérieure doit préciser le numéro de réservation, les faits, la demande et les justificatifs disponibles.

Article 40 — Négociation amiable

En cas de différend entre BoSéjour et un hôtel partenaire relatif au partenariat, les parties s’engagent à rechercher une solution amiable pendant une période de trente jours à compter de la notification écrite du différend.

À défaut d’accord, le litige relève des juridictions compétentes du ressort du siège social de HCS Consulting, sous réserve des règles impératives applicables.

TITRE X — PREUVE ET DISPOSITIONS FINALES DES CGV

Article 41 — Preuve

Les confirmations, journaux techniques, échanges électroniques, relevés de paiement et données de l’Extranet peuvent constituer des éléments de preuve des opérations réalisées.

Article 42 — Droit applicable

Les CGV sont régies par le droit ivoirien, sous réserve des dispositions impératives applicables au client ou au partenaire.

Article 43 — Langue

Les CGV sont rédigées en français. En cas de traduction, la version française fait foi en cas de divergence, sauf disposition impérative contraire.
EOT,
            'confidentialite' => <<<'EOT'
TITRE XI — PRINCIPES DE PROTECTION DES DONNÉES

Article 44 — Objet de la Politique de Confidentialité

La présente PC explique quelles données BoSéjour collecte, pourquoi elles sont utilisées, avec qui elles peuvent être partagées, combien de temps elles sont conservées et comment les personnes concernées peuvent exercer leurs droits.

Elle est établie en tenant compte de la réglementation ivoirienne applicable à la protection des données à caractère personnel, notamment la loi n° 2013-450 du 19 juin 2013, sous réserve de toute évolution législative ou réglementaire.

Article 45 — Responsable du traitement

Le responsable du traitement est HCS Consulting, exploitant de BoSéjour.

Coordonnées du responsable du traitement : HCS Consulting — contact : support@bosejour.ci.
Contact relatif aux données personnelles : support@bosejour.ci (objet : « Protection des données »).
Correspondant ou délégué à la protection des données : non désigné à ce jour ; les demandes sont traitées par le service support.

Article 46 — Données collectées

Selon les services utilisés, BoSéjour peut collecter :

1. les données d’identification et de contact ;
2. les données de compte et d’authentification ;
3. les informations de réservation, de séjour et de préférences ;
4. les données de facturation et de transaction ;
5. les échanges avec le service client, les hôtels et les utilisateurs ;
6. les données relatives aux comptes corporate et aux utilisateurs autorisés ;
7. les données professionnelles et administratives des hôtels partenaires ;
8. les données techniques, journaux de connexion, adresse IP et informations relatives à l’appareil ;
9. les contenus publiés, avis, messages et documents transmis ;
10. les données nécessaires à la prévention de la fraude et à la sécurité.

BoSéjour ne demande pas de données sensibles sauf nécessité justifiée, base légale appropriée et information spécifique lorsque la loi l’exige.

Article 47 — Finalités des traitements

Les données sont traitées pour :

1. créer et gérer les comptes ;
2. rechercher, demander, confirmer et suivre les réservations ;
3. transmettre les informations nécessaires aux hôtels partenaires ;
4. traiter les paiements, remboursements et versements ;
5. assurer la relation client et le support ;
6. sécuriser la plateforme et prévenir la fraude ;
7. gérer le partenariat hôtelier et l’Extranet ;
8. mesurer l’utilisation et améliorer les services ;
9. envoyer des communications opérationnelles ;
10. envoyer des communications commerciales lorsque la personne y a consenti ou lorsque la loi l’autorise ;
11. respecter les obligations légales, comptables, fiscales et judiciaires ;
12. établir, exercer ou défendre des droits en justice.

Article 48 — Bases et principes de traitement

Les traitements sont fondés, selon le cas, sur l’exécution d’un contrat, le consentement, le respect d’une obligation légale, la sauvegarde des intérêts essentiels ou l’intérêt légitime de BoSéjour, sous réserve de ne pas porter une atteinte disproportionnée aux droits des personnes.

BoSéjour s’efforce de respecter les principes de finalité, minimisation, exactitude, sécurité, confidentialité et durée de conservation limitée.

Article 49 — Destinataires des données

Les données peuvent être communiquées, selon la nécessité du service, aux hôtels partenaires, prestataires de paiement, opérateurs Mobile Money, prestataires techniques, services d’hébergement, outils de communication, conseils professionnels, autorités compétentes et sous-traitants autorisés.

BoSéjour ne vend pas les données personnelles à des tiers à des fins étrangères aux finalités indiquées dans la présente PC.

Article 50 — Paiement et données bancaires

Les données de paiement peuvent être traitées par un prestataire spécialisé. Lorsque BoSéjour ne doit pas conserver les données complètes de carte, celles-ci sont directement traitées par le prestataire concerné.

BoSéjour peut conserver des informations limitées sur la transaction, telles que le montant, la date, le statut, le moyen utilisé et une référence de paiement.

Article 51 — Transferts et sous-traitance

Lorsque des prestataires sont situés hors de Côte d’Ivoire ou qu’un transfert de données est nécessaire, BoSéjour prend les mesures prévues par la réglementation applicable et informe les personnes lorsque cela est requis.

Les sous-traitants n’utilisent les données que pour les instructions et finalités convenues avec BoSéjour.

Article 52 — Conservation

Les données sont conservées pendant une durée proportionnée à leur finalité. Les données de compte sont conservées pendant la durée d’utilisation du compte, puis archivées ou supprimées selon les obligations applicables.

Les données de réservation, de paiement, de facturation et de preuve peuvent être conservées pendant les durées imposées par les obligations légales, fiscales, comptables ou de prescription.

Les durées de conservation par catégorie sont les suivantes :

1. compte utilisateur : pendant la durée d’utilisation du compte, puis jusqu’à 3 ans après la dernière activité en l’absence d’usage ;
2. réservation et facturation : 10 ans, conformément aux obligations comptables applicables (droit OHADA) ;
3. prospection commerciale : 3 ans à compter du dernier contact avec la personne concernée ;
4. journaux de sécurité : 1 an ;
5. comptes partenaires et pièces administratives : pendant la durée du partenariat, puis 5 ans après sa fin.

Article 53 — Cookies et technologies similaires

BoSéjour peut utiliser des cookies et technologies similaires nécessaires au fonctionnement, à la sécurité, à la mesure d’audience et, lorsque cela est requis, à la personnalisation ou à la prospection.

Un outil de gestion des préférences peut permettre à l’utilisateur d’accepter, de refuser ou de modifier certains cookies non essentiels. Les cookies strictement nécessaires peuvent rester actifs lorsque la loi l’autorise.

Article 54 — Sécurité

BoSéjour met en œuvre des mesures raisonnables de sécurité organisationnelle et technique, notamment la gestion des accès, la limitation des habilitations, la sécurisation des échanges et la surveillance des événements de sécurité.

Aucune transmission sur internet ne peut être garantie comme totalement sûre. L’utilisateur doit protéger ses identifiants et signaler rapidement tout incident.

TITRE XII — DROITS DES PERSONNES

Article 55 — Exercice des droits

Sous réserve des conditions et limites prévues par la réglementation, toute personne peut demander l’accès à ses données, leur rectification, leur mise à jour, leur suppression lorsque cela est possible, la limitation ou l’opposition à certains traitements, ainsi que la portabilité lorsque ce droit est applicable.

La personne peut retirer son consentement à tout moment lorsque le traitement repose sur celui-ci. Le retrait n’affecte pas la licéité des traitements antérieurs.

Les demandes doivent être adressées à support@bosejour.ci et peuvent nécessiter une vérification raisonnable de l’identité du demandeur.

Article 56 — Prospection commerciale

Les communications commerciales sont envoyées conformément aux règles applicables. Chaque message commercial comporte un moyen simple de désinscription lorsque cela est requis.
Le retrait de la prospection commerciale n’empêche pas l’envoi de messages nécessaires à l’exécution d’une réservation, à la sécurité du compte ou à une obligation légale.

Article 57 — Réclamation auprès de l’autorité compétente

Lorsqu’une personne estime que ses droits ne sont pas respectés, elle peut contacter BoSéjour en priorité. Elle peut également saisir l’autorité ivoirienne compétente en matière de protection des données, selon les modalités prévues par la réglementation.

TITRE XIII — MISE À JOUR DE LA POLITIQUE

Article 58 — Modification de la PC

BoSéjour peut mettre à jour la PC pour refléter l’évolution des traitements, des services ou de la réglementation. La version en vigueur est publiée sur la plateforme avec sa date de mise à jour.

Lorsque la modification est substantielle, BoSéjour peut en informer les personnes concernées par un moyen approprié et recueillir un consentement lorsque la loi l’exige.
EOT,
        ];

        foreach ($documents as $slug => $content) {
            LegalDocument::where('slug', $slug)->update([
                'content' => $content,
                'version' => '2.0',
            ]);
        }
    }

    public function down(): void
    {
        // Remplacement de contenu contractuel — pas de retour arrière automatique
        // (comme les autres migrations de correction de contenu juridique).
    }
};
