<?php

namespace App\Http\Controllers\Ops;

use App\Http\Controllers\Controller;
use App\Models\Ops\OpsMegaBoReport;
use App\Services\AiModule;
use App\Services\Ops\MegaBo\MegaBoReport;
use App\Services\Ops\MegaBo\MegaBoService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

/** Page « Mega Bo » d'Ops : poser des questions à l'assistant et relire ses rapports quotidiens. */
class MegaBoController extends Controller
{
    public const SUGGESTIONS = [
        'Combien de visiteurs cette semaine, et est-ce mieux que la semaine dernière ?',
        "Quelles sont les pages les plus consultées ?",
        "D'où viennent nos visiteurs ?",
        "La plateforme a-t-elle eu des problèmes ces derniers jours ?",
        'Où en sont les réservations et les paiements cette semaine ?',
        'Quelles actions me conseilles-tu cette semaine ?',
    ];

    /** Page d'Ops où se trouve la personne : indiquée à Mega Bo pour qu'il comprenne « ici », « cette page ». */
    private const CONTEXTS = [
        'audience' => "l'Audience", 'supervision' => 'la Supervision', 'incidents' => 'les Incidents', 'errors' => 'les Erreurs regroupées',
        'alerts' => 'les Alertes', 'payments' => 'les Paiements', 'logs' => 'le Flux de logs', 'dashboard' => "la Vue d'ensemble",
    ];

    public function index(MegaBoReport $reports)
    {
        $email = auth('web')->user()?->email;

        return view('ops.mega-bo.index', [
            'sendOptions' => [
                'team' => $reports->audienceSummary('team', $email),
                'me' => $reports->audienceSummary('me', $email),
            ],
            'sendsLeft' => MegaBoReport::manualSendsLeft(),
            'available' => AiModule::configured(),
            'suggestions' => self::SUGGESTIONS,
            'reports' => OpsMegaBoReport::orderByDesc('report_date')->limit(14)->get(['id', 'report_date', 'headline', 'sent_at']),
            'sending' => MegaBoReport::sendingEnabled(),
        ]);
    }

    public function ask(Request $request, MegaBoService $bo, MegaBoReport $reports)
    {
        $data = $request->validate([
            'question' => 'required|string|max:1000',
            'history' => 'nullable|array|max:10',
            'history.*.role' => 'required|string|in:user,assistant',
            'history.*.content' => 'required|string|max:4000',
            'context' => 'nullable|string|in:' . implode(',', array_merge(array_keys(self::CONTEXTS), ['other'])),
        ]);

        if (!$bo->isConfigured()) {
            return response()->json(['error' => "Mega Bo n'est pas encore activé : la clé API Anthropic est absente."], 503);
        }

        // Les outils enchaînent plusieurs lectures puis une rédaction : on laisse le temps de finir.
        set_time_limit(150);

        try {
            $question = $data['question'];
            if (isset(self::CONTEXTS[$data['context'] ?? ''])) {
                $question = '(La personne consulte la page « ' . self::CONTEXTS[$data['context']] . " » de l'espace Ops.)\n" . $question;
            }

            $answer = $bo->ask($question, $data['history'] ?? []);

            // Proposition d'envoi du rapport : la personne la confirme d'un clic, rien n'est envoyé d'ici.
            $action = null;
            if ($proposal = $bo->proposedAction()) {
                $action = $proposal + ['summary' => $reports->audienceSummary($proposal['audience'], auth('web')->user()?->email)];
            }

            return response()->json(['answer' => $answer, 'action' => $action]);
        } catch (\Throwable $e) {
            Log::error('Mega Bo : réponse impossible', ['error' => $e->getMessage()]);

            return response()->json(['error' => "Mega Bo n'a pas pu répondre pour le moment. Réessayez dans un instant."], 502);
        }
    }

    /** Envoi du rapport à la demande (bouton de la page, ou confirmation d'une proposition de Mega Bo dans le chat). */
    public function send(Request $request, MegaBoReport $reports)
    {
        $data = $request->validate(['audience' => 'required|string|in:team,me']);

        if (!AiModule::configured()) {
            return response()->json(['ok' => false, 'error' => "Mega Bo n'est pas encore activé : la clé API Anthropic est absente."], 503);
        }

        // Rédaction par l'IA puis envois : on laisse le temps de finir.
        set_time_limit(170);

        $result = $reports->sendNow($data['audience'], auth('web')->user()?->email);

        return response()->json($result, $result['ok'] ? 200 : 422);
    }

    public function report(OpsMegaBoReport $report)
    {
        return view('ops.mega-bo.report', [
            'report' => $report,
            'html' => Str::markdown($report->body, ['html_input' => 'escape', 'allow_unsafe_links' => false]),
        ]);
    }
}
