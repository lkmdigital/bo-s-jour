<?php

namespace Tests\Feature;

use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Process;
use Tests\TestCase;

/**
 * Sauvegarde de la base de données (audit de sécurité externe, 2026-09-27, Phase 6) :
 * jusqu'ici, aucune sauvegarde régulière n'existait (seuls des instantanés des fichiers
 * applicatifs avant chaque déploiement). Le process mysqldump|gzip réel n'est jamais
 * exécuté en test (Process::fake) : on simule sa sortie en pré-écrivant, à l'horodatage
 * figé, le fichier que la commande s'attend à trouver une fois le process terminé.
 *
 * La connexion par défaut en test est sqlite (:memory:, voir phpunit.xml) : chaque test
 * force explicitement database.default sur 'mysql' (la config existe toujours, même non
 * sélectionnée) pour exercer réellement le chemin MySQL de la commande.
 */
class BackupDatabaseTest extends TestCase
{
    private string $backupDir;

    protected function setUp(): void
    {
        parent::setUp();
        $this->backupDir = storage_path('app/backups/database');
        File::deleteDirectory($this->backupDir);
        Carbon::setTestNow('2026-09-28 15:39:15');
        Config::set('database.default', 'mysql');
    }

    protected function tearDown(): void
    {
        File::deleteDirectory($this->backupDir);
        Carbon::setTestNow();
        parent::tearDown();
    }

    private function expectedDumpPath(): string
    {
        return $this->backupDir . '/' . config('database.connections.mysql.database') . '_2026-09-28_153915.sql.gz';
    }

    public function test_refuses_a_non_mysql_connection(): void
    {
        Config::set('database.default', 'sqlite');

        $this->artisan('backup:database')->assertFailed();
    }

    public function test_a_successful_dump_is_written_and_reported(): void
    {
        Process::fake(['*' => Process::result(exitCode: 0)]);
        File::ensureDirectoryExists($this->backupDir);
        File::put($this->expectedDumpPath(), 'dump-simule');

        $this->artisan('backup:database')->assertSuccessful();
    }

    public function test_missing_mysqldump_binary_fails_cleanly(): void
    {
        Process::fake(['command -v mysqldump' => Process::result(exitCode: 1)]);

        $this->artisan('backup:database')->assertFailed();
        $this->assertFileDoesNotExist($this->expectedDumpPath());
    }

    public function test_a_process_failure_does_not_leave_an_empty_file_behind(): void
    {
        Process::fake(['command -v mysqldump' => Process::result(exitCode: 0), '*' => Process::result(exitCode: 1, errorOutput: 'access denied')]);

        $this->artisan('backup:database')->assertFailed();

        $this->assertFileDoesNotExist($this->expectedDumpPath());
    }

    public function test_old_backups_beyond_the_retention_are_purged(): void
    {
        File::ensureDirectoryExists($this->backupDir);
        $old = $this->backupDir . '/monbeaupays_old.sql.gz';
        File::put($old, 'x');
        touch($old, now()->subDays(30)->getTimestamp());

        Process::fake(['*' => Process::result(exitCode: 0)]);
        File::put($this->expectedDumpPath(), 'dump-simule');

        $this->artisan('backup:database --keep-days=14')->assertSuccessful();

        $this->assertFileDoesNotExist($old);
        $this->assertFileExists($this->expectedDumpPath());
    }
}
