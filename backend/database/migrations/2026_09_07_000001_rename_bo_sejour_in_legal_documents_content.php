<?php

use App\Models\LegalDocument;
use Illuminate\Database\Migrations\Migration;

/**
 * Retour client 2026-09-02 (orthotypographie) : "bo séjour" -> "BoSéjour"
 * dans tout le texte visible du site. Le contenu CGU/CGV/Confidentialité a
 * été SEEDÉ en base par les migrations du 2026-08-27 (guardées sur
 * content IS NULL) — éditer ces anciennes migrations ne changerait rien en
 * prod, elles ne se rejouent pas. Il faut donc une correction de contenu
 * séparée, comme pour fix_cgv_refund_credit_clause.php.
 *
 * Contrairement à cette dernière (qui remplaçait un article entier), ici
 * c'est un simple str_replace de la sous-chaîne dans le contenu ACTUEL de
 * chaque document, quel qu'il soit : jamais de guard sur le texte complet
 * (on ne connaît pas l'état exact en prod, un admin a pu déjà éditer une
 * partie du contenu depuis le seed). str_replace est par nature sûr ici —
 * si "bo séjour" n'apparaît plus (déjà renommé, ou contenu totalement
 * réécrit par un admin), l'appel est un no-op ; tout le reste du texte
 * édité par l'admin est préservé tel quel.
 */
return new class extends Migration
{
    public function up(): void
    {
        LegalDocument::whereNotNull('content')->get()->each(function (LegalDocument $doc) {
            $updated = str_replace('bo séjour', 'BoSéjour', $doc->content);
            if ($updated !== $doc->content) {
                $doc->newQuery()->where('id', $doc->id)->update(['content' => $updated]);
            }
        });
    }

    public function down(): void
    {
        // Correction de texte — pas de retour arrière automatique (comme
        // fix_cgv_refund_credit_clause.php).
    }
};
