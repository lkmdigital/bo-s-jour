<?php

namespace App\Services\Ops\MegaBo;

use App\Models\Ops\OpsMegaBoReport;
use App\Models\Setting;
use App\Services\AiModule;
use App\Services\Ops\Monitor\AlertService;
use Carbon\Carbon;
use Illuminate\Support\Str;

/**
 * Rapport quotidien de Mega Bo : les chiffres sont rassemblés par le code (MegaBoData), l'IA les met en mots.
 * Le rapport et les chiffres qui l'ont nourri sont conservés, pour pouvoir vérifier ce qu'il affirme.
 */
class MegaBoReport
{
    /** Modèle WhatsApp : {{1}} = date, {{2}} = résumé court. À faire approuver par Meta (catégorie Utilitaire). */
    public const TEMPLATE = 'bosejour_rapport_megabo';

    public function __construct(private MegaBoService $bo, private MegaBoData $data, private AlertService $alerts) {}

    public static function sendingEnabled(): bool
    {
        return (bool) Setting::get('mega_bo_report_enabled', false);
    }

    /** Rédige (ou rédige à nouveau) le rapport du jour et l'enregistre. */
    public function generate(?Carbon $date = null): OpsMegaBoReport
    {
        $date ??= now('Africa/Abidjan');
        $snapshot = $this->data->snapshot();

        $raw = $this->bo->complete($this->systemPrompt(), "Voici les chiffres du jour, au format JSON :\n\n" . json_encode($snapshot, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT), 3000);
        [$headline, $summary, $body] = $this->parse($raw, $date);

        return OpsMegaBoReport::updateOrCreate(
            ['report_date' => $date->toDateString()],
            ['headline' => $headline, 'summary' => $summary, 'body' => $body, 'snapshot' => $snapshot, 'model' => AiModule::model(), 'sent_at' => null],
        );
    }

    /** Envoie le rapport par WhatsApp et e-mail. Retourne le nombre d'envois réussis. */
    public function deliver(OpsMegaBoReport $report): int
    {
        $day = $report->report_date->format('d/m/Y');
        $sent = $this->alerts->deliverReport(
            'mega_bo',
            "[boséjour] Rapport Mega Bo — $day",
            $this->emailHtml($report),
            self::TEMPLATE,
            [$day, $report->summary],
            "🤖 Mega Bo — rapport du $day\n{$report->summary}\n\nRapport complet : " . url('/ops/mega-bo/rapports/' . $report->id),
        );
        if ($sent > 0) {
            $report->update(['sent_at' => now()]);
        }

        return $sent;
    }

    public function emailHtml(OpsMegaBoReport $report): string
    {
        $html = Str::markdown($report->body, ['html_input' => 'escape', 'allow_unsafe_links' => false]);
        $link = url('/ops/mega-bo/rapports/' . $report->id);

        return '<div style="font-family:-apple-system,Segoe UI,Arial,sans-serif;max-width:640px;margin:0 auto;color:#111;line-height:1.55">'
            . '<p style="font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:#888;margin:0 0 4px">Mega Bo · rapport du ' . e($report->report_date->format('d/m/Y')) . '</p>'
            . '<h1 style="font-size:20px;margin:0 0 16px">' . e($report->headline) . '</h1>'
            . $html
            . '<hr style="border:none;border-top:1px solid #e5e5e5;margin:24px 0 12px">'
            . '<p style="font-size:12px;color:#888">Rédigé par Mega Bo à partir des chiffres de la plateforme. Il peut se tromper : les chiffres de référence sont dans l\'espace Ops. '
            . '<a href="' . e($link) . '" style="color:#c00">Voir le rapport en ligne</a></p></div>';
    }

    private function systemPrompt(): string
    {
        return MegaBoService::rules() . <<<'TXT'


Tu rédiges le rapport quotidien envoyé chaque matin à l'équipe boséjour et à son client, par e-mail et WhatsApp.

Réponds UNIQUEMENT avec un objet JSON valide (sans texte autour, sans bloc de code), de cette forme :
{"headline": "...", "whatsapp": "...", "report": "..."}

- "headline" : une phrase de 90 caractères maximum qui donne l'essentiel du jour (ex. « Tout va bien, 42 visiteurs hier (+12 %) »).
- "whatsapp" : 280 caractères maximum, sur une seule ligne, sans retour à la ligne ni mise en forme. L'essentiel : l'état de la plateforme, un chiffre d'audience, et le point à retenir.
- "report" : le rapport en Markdown, 250 à 400 mots, avec ces sections dans cet ordre :
  ## En bref (2 à 3 phrases)
  ## Audience (visiteurs et pages vues d'hier et de la semaine, évolution, d'où ils viennent, ce qu'ils consultent)
  ## Santé de la plateforme (disponibilité, incidents, lenteurs notables, erreurs récurrentes)
  ## Activité commerciale (demandes, paiements, nouveaux comptes)
  ## Suggestions (2 à 3 maximum, chacune avec le chiffre qui la justifie et l'action proposée ; si rien ne se justifie, écris-le)
Les chiffres d'« hier » se lisent dans la série quotidienne de l'audience ; « last_24h » couvre les dernières 24 heures. S'il n'y a rien à signaler dans une section, une phrase suffit.
TXT;
    }

    /** @return array{0:string,1:string,2:string} titre, résumé court, corps du rapport */
    private function parse(string $raw, Carbon $date): array
    {
        $json = null;
        if (($start = strpos($raw, '{')) !== false && ($end = strrpos($raw, '}')) !== false && $end > $start) {
            $json = json_decode(substr($raw, $start, $end - $start + 1), true);
        }

        if (is_array($json) && is_string($json['report'] ?? null) && trim($json['report']) !== '') {
            $headline = trim((string) ($json['headline'] ?? ''));
            $summary = trim((string) ($json['whatsapp'] ?? ''));
            $body = trim($json['report']);
        } else {
            // Réponse qui n'est pas du JSON : on garde le texte tel quel plutôt que de perdre le rapport.
            $body = trim($raw);
            $headline = '';
            $summary = '';
        }

        $headline = mb_substr($headline !== '' ? $headline : 'Rapport quotidien du ' . $date->format('d/m/Y'), 0, 160);
        $summary = mb_substr(trim(preg_replace('/\s+/', ' ', $summary !== '' ? $summary : $headline)), 0, 400);

        return [$headline, $summary, $body];
    }
}
