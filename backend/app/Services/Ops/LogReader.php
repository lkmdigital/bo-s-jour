<?php

namespace App\Services\Ops;

/**
 * Lecture incrémentale d'un fichier de log Laravel (format Monolog par défaut :
 * "[date] canal.NIVEAU: message {contexte-json}", une entrée par ligne physique —
 * un message contenant de vrais retours à la ligne est aplati par Monolog avant
 * écriture, donc chaque ligne du fichier est une entrée complète).
 *
 * Ne charge jamais le fichier entier en mémoire : positionne un curseur (offset en
 * octets) et ne lit que ce qui a été ajouté depuis, comme `tail -f`.
 */
class LogReader
{
    /** Au premier chargement (pas de curseur), combien d'octets relire en arrière. */
    private const INITIAL_BACKLOG_BYTES = 200_000;

    public function __construct(private string $path) {}

    public function exists(): bool
    {
        return is_file($this->path) && is_readable($this->path);
    }

    /**
     * @return array{cursor: int, rotated: bool, entries: array<int, array{datetime: ?string, level: string, message: string}>}
     */
    public function readSince(?int $cursor): array
    {
        if (!$this->exists()) {
            return ['cursor' => 0, 'rotated' => false, 'entries' => []];
        }

        $size = filesize($this->path);
        $rotated = false;

        if ($cursor === null) {
            $start = max(0, $size - self::INITIAL_BACKLOG_BYTES);
        } elseif ($cursor > $size) {
            // Le fichier a été tourné/vidé (rotation logrotate, redéploiement) entre deux
            // lectures : on repart de la fin, sans tenter de raccorder l'ancien curseur.
            $start = max(0, $size - self::INITIAL_BACKLOG_BYTES);
            $rotated = true;
        } else {
            $start = $cursor;
        }

        if ($start >= $size) {
            return ['cursor' => $size, 'rotated' => $rotated, 'entries' => []];
        }

        $handle = fopen($this->path, 'rb');
        if ($handle === false) {
            return ['cursor' => $cursor ?? $size, 'rotated' => $rotated, 'entries' => []];
        }

        fseek($handle, $start);
        $chunk = fread($handle, $size - $start);
        fclose($handle);

        if ($chunk === false || $chunk === '') {
            return ['cursor' => $start, 'rotated' => $rotated, 'entries' => []];
        }

        // Ne consomme que les lignes complètes : si la dernière ligne du chunk n'a pas
        // encore reçu son retour à la ligne final (lecture pendant une écriture), elle
        // reste dans le fichier pour le prochain appel plutôt que d'être coupée en deux.
        $lastNewline = strrpos($chunk, "\n");
        if ($lastNewline === false) {
            return ['cursor' => $start, 'rotated' => $rotated, 'entries' => []];
        }

        $usable = substr($chunk, 0, $lastNewline);
        $newCursor = $start + $lastNewline + 1;

        $lines = $usable === '' ? [] : explode("\n", $usable);
        $entries = [];
        foreach ($lines as $line) {
            if (trim($line) === '') {
                continue;
            }
            $entries[] = $this->parseLine($line);
        }

        return ['cursor' => $newCursor, 'rotated' => $rotated, 'entries' => $entries];
    }

    /**
     * @return array{datetime: ?string, level: string, message: string}
     */
    private function parseLine(string $line): array
    {
        // "[2026-09-24 16:01:27] production.WARNING: message {"a":1}"
        if (preg_match('/^\[(\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2})\]\s+\S+\.(\w+):\s?(.*)$/su', $line, $m)) {
            return ['datetime' => $m[1], 'level' => strtoupper($m[2]), 'message' => $m[3]];
        }

        // Ligne qui ne correspond pas au format attendu (rare : entrée corrompue,
        // sortie d'une commande artisan mêlée au fichier...) — affichée telle quelle.
        return ['datetime' => null, 'level' => 'INFO', 'message' => $line];
    }
}
