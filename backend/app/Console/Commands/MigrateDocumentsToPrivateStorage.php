<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Storage;

/**
 * Migre les documents d'identité/conformité déjà présents sur le disque "public" (déployés
 * avant le correctif du 2026-09-28, audit de sécurité externe Phase 6) vers le disque privé
 * "local" — jamais servi statiquement par Nginx, contrairement au disque public.
 *
 * Non destructif par défaut : copie le fichier puis, seulement si la copie est confirmée
 * identique, supprime l'original du disque public. Idempotent : un fichier déjà absent du
 * disque public (déjà migré, ou jamais uploadé) est simplement ignoré.
 */
class MigrateDocumentsToPrivateStorage extends Command
{
    protected $signature = 'documents:migrate-to-private {--dry-run : Liste ce qui serait fait, sans rien modifier}';

    protected $description = "Déplace les documents d'identité/conformité du disque public vers le disque privé.";

    private const FIELDS = [
        'id_document_path', 'id_document_recto_path', 'id_document_verso_path',
        'proof_of_address_path', 'business_license_path', 'rccm_document_path', 'tax_document_path',
    ];

    public function handle(): int
    {
        $dryRun = (bool) $this->option('dry-run');
        $public = Storage::disk('public');
        $private = Storage::disk('local');

        $moved = 0;
        $alreadyDone = 0;
        $missing = 0;

        User::query()
            ->where(function ($q) {
                foreach (self::FIELDS as $field) {
                    $q->orWhereNotNull($field);
                }
            })
            ->select(array_merge(['id'], self::FIELDS))
            ->chunkById(100, function ($users) use (&$moved, &$alreadyDone, &$missing, $public, $private, $dryRun) {
                foreach ($users as $user) {
                    foreach (self::FIELDS as $field) {
                        $path = $user->getAttribute($field);
                        if (!$path) {
                            continue;
                        }

                        if (!$public->exists($path)) {
                            // Déjà migré lors d'un précédent passage, ou jamais présent côté public.
                            if ($private->exists($path)) {
                                $alreadyDone++;
                            } else {
                                $missing++;
                                $this->warn("Introuvable (ni public ni privé) : user #{$user->id} {$field} = {$path}");
                            }
                            continue;
                        }

                        $this->line(($dryRun ? '[dry-run] ' : '') . "user #{$user->id} {$field} : {$path}");
                        if ($dryRun) {
                            $moved++;
                            continue;
                        }

                        $contents = $public->get($path);
                        $private->put($path, $contents);

                        if ($private->exists($path) && $private->size($path) === $public->size($path)) {
                            $public->delete($path);
                            $moved++;
                        } else {
                            $this->error("Échec de la copie, original conservé : user #{$user->id} {$field} = {$path}");
                        }
                    }
                }
            });

        $this->newLine();
        $this->info(($dryRun ? '[dry-run] ' : '') . "{$moved} fichier(s) migré(s), {$alreadyDone} déjà en place, {$missing} introuvable(s).");

        return self::SUCCESS;
    }
}
