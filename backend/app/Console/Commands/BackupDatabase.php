<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Process;

/**
 * Sauvegarde MySQL (audit de sécurité externe, 2026-09-27, Phase 6) : jusqu'ici, seuls des
 * instantanés des fichiers applicatifs existaient (avant chaque déploiement, voir
 * deploy.sh) — aucune sauvegarde régulière de la base de données elle-même.
 *
 * Écrit un dump compressé dans storage/app/backups/database (hors du disque public, jamais
 * servi par Nginx) et supprime les sauvegardes plus vieilles que la rétention configurée.
 * Le mot de passe passe par la variable d'environnement MYSQL_PWD du process, jamais en
 * argument de ligne de commande : un argument reste visible dans `ps aux` pour n'importe
 * quel autre utilisateur du serveur pendant toute la durée du dump.
 */
class BackupDatabase extends Command
{
    protected $signature = 'backup:database {--keep-days=14 : Nombre de jours de sauvegardes à conserver}';

    protected $description = 'Sauvegarde la base de données MySQL (dump compressé) et purge les sauvegardes trop anciennes.';

    public function handle(): int
    {
        $connection = config('database.default');
        $config = config("database.connections.{$connection}");

        if (($config['driver'] ?? null) !== 'mysql') {
            $this->error("Connexion '{$connection}' non supportée (pilote : " . ($config['driver'] ?? 'inconnu') . ") — seul MySQL est géré par cette commande.");
            return self::FAILURE;
        }

        if (!Process::run('command -v mysqldump')->successful()) {
            $this->error('mysqldump est introuvable sur ce serveur. Installez le client MySQL (paquet mysql-client / mariadb-client) pour activer les sauvegardes.');
            return self::FAILURE;
        }

        $dir = storage_path('app/backups/database');
        File::ensureDirectoryExists($dir);

        $filename = sprintf('%s_%s.sql.gz', $config['database'], now()->format('Y-m-d_His'));
        $path = $dir . '/' . $filename;

        $this->info("Sauvegarde de la base « {$config['database']} »…");

        $dumpCommand = array_filter([
            'mysqldump',
            '--host=' . ($config['host'] ?? '127.0.0.1'),
            '--port=' . ($config['port'] ?? 3306),
            '--user=' . ($config['username'] ?? 'root'),
            '--single-transaction',
            '--quick',
            '--routines',
            '--triggers',
            $config['database'],
        ]);

        $commandLine = implode(' ', array_map('escapeshellarg', $dumpCommand)) . ' | gzip > ' . escapeshellarg($path);

        $result = Process::timeout(600)
            ->env(['MYSQL_PWD' => $config['password'] ?? ''])
            ->run($commandLine);

        if (!$result->successful() || !is_file($path) || filesize($path) === 0) {
            @unlink($path);
            $this->error('Échec de la sauvegarde : ' . (trim($result->errorOutput()) ?: 'sortie vide.'));
            return self::FAILURE;
        }

        $this->info('Sauvegarde écrite : ' . $path . ' (' . $this->humanSize(filesize($path)) . ')');

        $this->purgeOldBackups($dir, (int) $this->option('keep-days'));

        return self::SUCCESS;
    }

    private function purgeOldBackups(string $dir, int $keepDays): void
    {
        $threshold = now()->subDays(max(1, $keepDays))->getTimestamp();
        $removed = 0;

        foreach (glob($dir . '/*.sql.gz') ?: [] as $file) {
            if (filemtime($file) < $threshold) {
                @unlink($file);
                $removed++;
            }
        }

        if ($removed > 0) {
            $this->info("{$removed} ancienne(s) sauvegarde(s) supprimée(s) (plus de {$keepDays} jours).");
        }
    }

    private function humanSize(int $bytes): string
    {
        return $bytes >= 1_000_000
            ? round($bytes / 1_000_000, 1) . ' Mo'
            : round($bytes / 1000, 1) . ' Ko';
    }
}
