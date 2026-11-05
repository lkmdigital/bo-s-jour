<?php

use App\Support\CityName;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

/**
 * Une seule écriture par ville : « KORHOGO », « San pedro » et « SAN PEDRO » deviennent « Korhogo » et « San Pedro »
 * (voir App\Support\CityName). Les anciennes valeurs sont conservées dans un fichier de sauvegarde pour pouvoir
 * revenir en arrière (down).
 */
return new class extends Migration
{
    private const BACKUP_DIR = 'backups';

    public function up(): void
    {
        $changes = [];

        DB::table('accommodations')->select('id', 'city')->whereNotNull('city')->orderBy('id')->each(function ($row) use (&$changes) {
            $normalized = CityName::normalize($row->city);
            if ($normalized !== $row->city) {
                $changes[$row->id] = ['avant' => $row->city, 'apres' => $normalized];
            }
        });

        if ($changes === []) {
            return;
        }

        Storage::disk('local')->put(
            self::BACKUP_DIR . '/villes-avant-normalisation-' . date('Ymd-His') . '.json',
            json_encode($changes, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT)
        );

        foreach ($changes as $id => $change) {
            DB::table('accommodations')->where('id', $id)->update(['city' => $change['apres']]);
        }
    }

    public function down(): void
    {
        $files = collect(Storage::disk('local')->files(self::BACKUP_DIR))
            ->filter(fn ($f) => str_contains($f, 'villes-avant-normalisation-'))
            ->sort();

        $latest = $files->last();
        if (!$latest) {
            return;
        }

        foreach (json_decode(Storage::disk('local')->get($latest), true) ?: [] as $id => $change) {
            DB::table('accommodations')->where('id', $id)->update(['city' => $change['avant']]);
        }
    }
};
