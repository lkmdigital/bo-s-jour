<?php

namespace App\Services;

use App\Models\Accommodation;
use App\Models\Review;
use App\Models\Room;

/**
 * Génération de contenu partenaire (doc client "MODULE IA BOSÉJOUR" §2.2
 * Génération de Contenus, §2.3 Traduction Automatique, §2.4 Optimisation
 * SEO, §2.10 Réponses Assistées — volet avis publics uniquement, le volet
 * messages privés voyageur reste hors périmètre, nécessite une décision de
 * confidentialité).
 *
 * Différent techniquement de AdminAiAssistantService/HostAiAssistantService :
 * pas de boucle d'outils, un seul appel `complete()` par génération — le
 * texte des établissements/chambres/avis est déjà connu de l'appelant (pas
 * besoin que le modèle "aille chercher" une donnée). Hérite de
 * AiAssistantService uniquement pour réutiliser la résolution du client
 * Anthropic ; les méthodes liées à ask() (boucle d'outils conversationnelle)
 * ne sont jamais appelées ici, implémentées au strict minimum pour satisfaire
 * le contrat abstrait.
 *
 * Principe constant du doc, appliqué à chaque méthode : l'IA génère un
 * brouillon, l'hôte reste seul responsable de le relire et de l'utiliser —
 * rien n'est jamais enregistré automatiquement en base par ce service.
 */
class HostContentAiService extends AiAssistantService
{
    protected function systemPrompt(): string
    {
        return 'Non utilisé — ce service n\'utilise que complete(), jamais ask().';
    }

    protected function toolDefinitions(): array
    {
        return [];
    }

    protected function executeTool(string $name, array $input): string
    {
        throw new \LogicException('HostContentAiService ne définit aucun outil — ask() ne doit jamais être appelé sur cette classe.');
    }

    private const WRITER_SYSTEM_PROMPT = <<<'PROMPT'
Tu es un rédacteur spécialisé dans la présentation d'hébergements
touristiques en Côte d'Ivoire pour la plateforme bo séjour. Rédige un texte
professionnel, chaleureux et concret à partir des informations fournies —
n'invente aucun équipement ni caractéristique absent des données transmises.
Réponds uniquement avec le texte final, sans titre ni commentaire autour.
PROMPT;

    public function generateAccommodationDescription(Accommodation $a, string $mode): string
    {
        $facts = $this->accommodationFacts($a);

        $instruction = $mode === 'improve' && $a->description
            ? "Améliore et corrige le texte existant suivant, en gardant les mêmes informations factuelles :\n\n{$a->description}"
            : "Rédige une présentation complète de cet établissement (4 à 6 phrases).";

        return $this->complete(
            self::WRITER_SYSTEM_PROMPT,
            "{$instruction}\n\nInformations sur l'établissement :\n{$facts}"
        );
    }

    public function generateRoomDescription(Room $r, string $mode): string
    {
        $facts = $this->roomFacts($r);

        $instruction = $mode === 'improve' && $r->description
            ? "Améliore et corrige le texte existant suivant, en gardant les mêmes informations factuelles :\n\n{$r->description}"
            : "Rédige une description de cette chambre (2 à 4 phrases).";

        return $this->complete(
            self::WRITER_SYSTEM_PROMPT,
            "{$instruction}\n\nInformations sur la chambre :\n{$facts}"
        );
    }

    /**
     * §2.3 — la plateforme ne gère que FR/EN (description_en déjà existant
     * sur Accommodation et Room) ; targetLang volontairement restreint à 'en'.
     */
    public function translateText(string $text): string
    {
        return $this->complete(
            'Tu traduis des textes de présentation d\'hébergements touristiques du français vers l\'anglais, pour la plateforme bo séjour. Traduction fidèle et naturelle, sans ajouter ni omettre d\'information. Réponds uniquement avec le texte traduit.',
            $text
        );
    }

    /**
     * §2.4 — suggestions textuelles, pas de champ meta_title/meta_description
     * dédié dans la plateforme : l'hôte s'en sert pour retravailler lui-même
     * le nom et la description de son établissement.
     */
    public function suggestSeo(Accommodation $a): string
    {
        $facts = $this->accommodationFacts($a);

        return $this->complete(
            "Tu es spécialiste en référencement pour des plateformes de réservation d'hébergements en Côte d'Ivoire. Propose des suggestions concrètes et réponds STRICTEMENT sous cette forme, en français :\nTITRE SUGGÉRÉ : ...\nDESCRIPTION SUGGÉRÉE (150-160 caractères) : ...\nMOTS-CLÉS STRATÉGIQUES : mot1, mot2, mot3...",
            "Établissement actuel :\n{$facts}\n\nDescription actuelle : " . ($a->description ?: '(aucune)')
        );
    }

    /**
     * §2.10 (volet avis publics) — l'avis et sa note sont déjà publics sur
     * la plateforme, aucune donnée privée transmise. Le brouillon généré
     * n'est jamais envoyé automatiquement : l'hôte le relit, le modifie si
     * besoin, puis valide lui-même via le flux de réponse existant.
     */
    public function draftReviewReply(Review $review): string
    {
        $rating = $review->rating;
        $comment = $review->comment;
        $establishment = $review->accommodation->name ?? 'l\'établissement';

        return $this->complete(
            "Tu rédiges, au nom d'un hôte de la plateforme bo séjour, une réponse professionnelle et courtoise à un avis de voyageur. Ton chaleureux mais sobre, 2 à 4 phrases, en français. Remercie, réponds aux points soulevés si pertinent, n'invente rien sur l'établissement. Réponds uniquement avec le texte de la réponse.",
            "Établissement : {$establishment}\nNote laissée : {$rating}/5\nAvis du voyageur : \"{$comment}\""
        );
    }

    private function accommodationFacts(Accommodation $a): string
    {
        $amenities = is_array($a->amenities) && count($a->amenities) > 0
            ? implode(', ', $a->amenities)
            : 'non renseignés';

        return implode("\n", [
            "Nom : {$a->name}",
            "Type : {$a->type}" . ($a->subtype ? " ({$a->subtype})" : ''),
            "Ville : {$a->city}",
            "Prix indicatif : " . ((float) $a->price_per_night) . ' FCFA/nuit',
            "Capacité max : {$a->max_guests} personnes",
            "Chambres : {$a->bedrooms}, Salles de bain : {$a->bathrooms}",
            "Équipements : {$amenities}",
        ]);
    }

    private function roomFacts(Room $r): string
    {
        $amenities = is_array($r->amenities) && count($r->amenities) > 0
            ? implode(', ', $r->amenities)
            : 'non renseignés';

        return implode("\n", [
            "Nom/type : {$r->name}",
            "Capacité : {$r->capacity} personnes",
            "Prix : " . ((float) $r->price_per_night) . ' FCFA/nuit',
            "Équipements : {$amenities}",
        ]);
    }
}
