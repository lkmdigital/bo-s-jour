<?php

namespace App\Http\Controllers\Ops;

use App\Http\Controllers\Controller;
use App\Services\Ops\LogReader;
use App\Services\Ops\LogTranslator;
use Illuminate\Http\Request;

/**
 * Page "Flux de logs" du dashboard Ops : lit storage/logs/*.log par petits
 * incréments (jamais le fichier entier) et les traduit pour un affichage en
 * direct, à la manière d'un `tail -f` défilant à l'écran (voir resources/js/ops.js).
 */
class LogsController extends Controller
{
    /** Sources disponibles : clé exposée au client => chemin réel sur le disque. */
    private const SOURCES = [
        'app' => 'laravel.log',
        'security' => null, // résolu dynamiquement : security-{date du jour}.log
    ];

    public function index()
    {
        return view('ops.logs.index');
    }

    public function tail(Request $request)
    {
        $validated = $request->validate([
            'source' => 'nullable|string|in:app,security',
            'after' => 'nullable|integer|min:0',
        ]);

        $source = $validated['source'] ?? 'app';
        $reader = new LogReader($this->pathFor($source));
        $result = $reader->readSince($validated['after'] ?? null);

        $translator = new LogTranslator();
        $entries = array_values(array_map(
            fn (array $entry, int $i) => ['id' => $result['cursor'] . '-' . $i] + $translator->translate($entry),
            $result['entries'],
            array_keys($result['entries'])
        ));

        return response()->json([
            'cursor' => $result['cursor'],
            'rotated' => $result['rotated'],
            'exists' => $reader->exists(),
            'entries' => $entries,
        ]);
    }

    private function pathFor(string $source): string
    {
        $filename = $source === 'security'
            ? 'security-' . now()->format('Y-m-d') . '.log'
            : self::SOURCES['app'];

        return storage_path('logs/' . $filename);
    }
}
