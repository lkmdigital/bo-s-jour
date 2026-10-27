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

    public function index()
    {
        return view('ops.mega-bo.index', [
            'available' => AiModule::configured(),
            'suggestions' => self::SUGGESTIONS,
            'reports' => OpsMegaBoReport::orderByDesc('report_date')->limit(14)->get(['id', 'report_date', 'headline', 'sent_at']),
            'sending' => MegaBoReport::sendingEnabled(),
        ]);
    }

    public function ask(Request $request, MegaBoService $bo)
    {
        $data = $request->validate([
            'question' => 'required|string|max:1000',
            'history' => 'nullable|array|max:10',
            'history.*.role' => 'required|string|in:user,assistant',
            'history.*.content' => 'required|string|max:4000',
        ]);

        if (!$bo->isConfigured()) {
            return response()->json(['error' => "Mega Bo n'est pas encore activé : la clé API Anthropic est absente."], 503);
        }

        // Les outils enchaînent plusieurs lectures puis une rédaction : on laisse le temps de finir.
        set_time_limit(150);

        try {
            return response()->json(['answer' => $bo->ask($data['question'], $data['history'] ?? [])]);
        } catch (\Throwable $e) {
            Log::error('Mega Bo : réponse impossible', ['error' => $e->getMessage()]);

            return response()->json(['error' => "Mega Bo n'a pas pu répondre pour le moment. Réessayez dans un instant."], 502);
        }
    }

    public function report(OpsMegaBoReport $report)
    {
        return view('ops.mega-bo.report', [
            'report' => $report,
            'html' => Str::markdown($report->body, ['html_input' => 'escape', 'allow_unsafe_links' => false]),
        ]);
    }
}
