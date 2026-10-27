<?php

namespace App\Services\Ops\MegaBo;

use App\Models\Ops\OpsMegaBoReport;
use App\Models\Setting;
use App\Services\AiModule;
use App\Services\Ops\Monitor\AlertService;
use App\Services\Ops\OpsMail;
use Carbon\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
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

    /** Un rapport rédigé depuis moins de ce délai est réutilisé par un envoi manuel : pas de seconde facture, et le même texte part à tous. */
    private const REUSE_MINUTES = 30;

    private static function manualCounterKey(): string
    {
        return 'ops:mega-bo:manual-sends:' . now('Africa/Abidjan')->toDateString();
    }

    public static function manualSendsLeft(): int
    {
        return max(0, (int) config('ops.max_manual_report_sends_per_day') - (int) Cache::get(self::manualCounterKey(), 0));
    }

    /** À qui partirait l'envoi, en une phrase : affichée avant la confirmation. */
    public function audienceSummary(string $audience, ?string $myEmail): string
    {
        if ($audience !== 'team') {
            return 'à vous seul, par e-mail' . ($myEmail ? " ($myEmail)" : '');
        }

        $parts = [];
        if ($n = count($this->alerts->emails())) {
            $parts[] = $n . ' adresse' . ($n > 1 ? 's' : '') . ' e-mail';
        }
        if ($n = count($this->alerts->phones())) {
            $parts[] = $n . ' numéro' . ($n > 1 ? 's' : '') . ' WhatsApp';
        }

        return 'à toute l\'équipe et au client : ' . ($parts ? implode(' et ', $parts) : 'aucun destinataire enregistré');
    }

    /**
     * Rédige (ou reprend, si elle date de moins de 30 minutes) le rapport du jour et l'envoie à la demande.
     * « team » : tous les destinataires enregistrés (WhatsApp et e-mail) ; « me » : un seul e-mail, pour relire avant.
     *
     * @return array{ok:bool,sent?:int,error?:string,url?:string,left?:int}
     */
    public function sendNow(string $audience, ?string $myEmail): array
    {
        $audience = $audience === 'team' ? 'team' : 'me';

        if ($audience === 'me' && !filter_var($myEmail, FILTER_VALIDATE_EMAIL)) {
            return ['ok' => false, 'error' => "Votre adresse e-mail est introuvable : envoyez le rapport à l'équipe, ou renseignez-la dans votre compte."];
        }
        if ($audience === 'team' && !$this->alerts->emails() && !$this->alerts->phones()) {
            return ['ok' => false, 'error' => "Aucun destinataire n'est enregistré : ajoutez-en dans Ops > Alertes."];
        }
        if (self::manualSendsLeft() <= 0) {
            return ['ok' => false, 'error' => 'Limite atteinte : ' . config('ops.max_manual_report_sends_per_day') . " envois manuels par jour. Le rapport reste lisible dans la liste, et l'envoi automatique de demain matin n'est pas concerné."];
        }

        $lock = Cache::lock('ops:mega-bo:manual-send', 180);
        if (!$lock->get()) {
            return ['ok' => false, 'error' => 'Un envoi est déjà en cours : patientez une minute.'];
        }

        try {
            $today = now('Africa/Abidjan');
            $report = OpsMegaBoReport::whereDate('report_date', $today->toDateString())->first();
            if (!$report || $report->updated_at->lt(now()->subMinutes(self::REUSE_MINUTES))) {
                $report = $this->generate($today);
            }

            // Un envoi « à moi » ne doit pas effacer la trace de l'envoi de l'équipe.
            $previousSentAt = $report->sent_at;
            $sent = $this->deliver($report, $audience === 'me' ? $myEmail : null);
            if ($audience === 'me' && $previousSentAt) {
                $report->update(['sent_at' => $previousSentAt]);
            }

            Cache::put(self::manualCounterKey(), (int) Cache::get(self::manualCounterKey(), 0) + 1, $today->copy()->endOfDay());
            Log::channel('single')->info('Mega Bo : rapport envoyé à la demande', ['destinataires' => $audience, 'envois' => $sent]);

            return $sent > 0
                ? ['ok' => true, 'sent' => $sent, 'url' => route('ops.megabo.report', $report), 'left' => self::manualSendsLeft()]
                : ['ok' => false, 'url' => route('ops.megabo.report', $report), 'error' => "Le rapport est rédigé, mais aucun message n'a pu partir : voir Ops > Alertes."];
        } catch (\Throwable $e) {
            Log::error('Mega Bo : envoi à la demande impossible', ['error' => $e->getMessage()]);

            return ['ok' => false, 'error' => "Mega Bo n'a pas pu rédiger le rapport pour le moment. Réessayez dans un instant."];
        } finally {
            $lock->release();
        }
    }

    /**
     * Envoie le rapport par WhatsApp et e-mail. Retourne le nombre d'envois réussis.
     *
     * @param string|null $onlyEmail si renseigné, un seul e-mail à cette adresse (relecture) : le rapport n'est pas marqué « envoyé »
     */
    public function deliver(OpsMegaBoReport $report, ?string $onlyEmail = null): int
    {
        $day = $report->report_date->format('d/m/Y');
        $sent = $this->alerts->deliverReport(
            'mega_bo',
            "[boséjour] Rapport Mega Bo — $day",
            $this->emailHtml($report),
            $this->emailText($report),
            self::TEMPLATE,
            [$day, $report->summary],
            "🤖 Mega Bo — rapport du $day\n{$report->summary}\n\nRapport complet : " . url('/ops/mega-bo/rapports/' . $report->id),
            $onlyEmail,
        );
        if ($sent > 0 && $onlyEmail === null) {
            $report->update(['sent_at' => now()]);
        }

        return $sent;
    }

    public function emailHtml(OpsMegaBoReport $report): string
    {
        $body = Str::markdown($report->body, ['html_input' => 'escape', 'allow_unsafe_links' => false]);

        return OpsMail::render([
            'tag' => 'Rapport quotidien',
            'tagStyle' => 'ok',
            'title' => $report->headline,
            'subtitle' => 'Rapport du ' . $report->report_date->format('d/m/Y') . ', rédigé par Mega Bo',
            'content' => OpsMail::styleMarkdown($body),
            'headerLabel' => 'Mega Bo',
            'orbUrl' => url('/images/mega-bo.png'),
            'preheader' => $report->summary,
            'button' => ['label' => 'Voir le rapport en ligne', 'url' => url('/ops/mega-bo/rapports/' . $report->id)],
            'note' => "Rédigé par Mega Bo à partir des chiffres de la plateforme. Il peut se tromper : les chiffres de référence sont dans l'espace Ops.",
        ]);
    }

    /** Version texte du même e-mail (le Markdown se lit très bien tel quel). */
    public function emailText(OpsMegaBoReport $report): string
    {
        return "Mega Bo — rapport du " . $report->report_date->format('d/m/Y') . "\n\n{$report->headline}\n\n{$report->body}\n\n"
            . 'Rapport en ligne : ' . url('/ops/mega-bo/rapports/' . $report->id) . "\n\n— Rédigé par Mega Bo. Il peut se tromper : les chiffres de référence sont dans l'espace Ops.";
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
