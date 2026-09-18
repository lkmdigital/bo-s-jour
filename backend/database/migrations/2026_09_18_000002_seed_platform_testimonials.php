<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Retour client 2026-09-18 : les 4 avis réels transmis par le client
 * n'existaient jusqu'ici que codés en dur côté frontend (section témoignages
 * de l'accueil) — absents de la table platform_testimonials, ils
 * n'apparaissaient donc jamais sur la page publique "Avis clients" (qui lit
 * cette table). Insérés ici comme de vraies lignes publiées, pour qu'ils
 * apparaissent partout de la même façon (accueil ET page "Avis clients").
 *
 * Noms : KONE Raïssa et FOFANA Azize fournis par le client ; DIABATÉ Fatou
 * et KOUAME Yannick choisis sur demande explicite du client pour les deux
 * avis restants (sans nom fourni) — voir historique du 2026-09-17/18.
 * Les deux derniers n'ont pas de photo (retour client 2026-09-18 : pas de
 * photo pour un nom que nous avons choisi).
 */
return new class extends Migration
{
    private function rows(): array
    {
        $now = now();

        return [
            [
                'first_name' => 'KONE Raïssa',
                'avatar_path' => 'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?auto=format&fit=facearea&facepad=3&w=200&h=200&q=80',
                'comment' => "Très bonne découverte ! Le site est simple à utiliser et surtout rapide pour trouver un hébergement. Je recommande.",
                'is_published' => true,
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'first_name' => 'FOFANA Azize',
                'avatar_path' => 'https://images.unsplash.com/photo-1531384441138-2736e62e0919?auto=format&fit=facearea&facepad=3&w=200&h=200&q=80',
                'comment' => "J'aime beaucoup le concept de BoSéjour. On retrouve facilement les établissements et les informations sont claires. C'est vraiment pratique.",
                'is_published' => true,
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'first_name' => 'DIABATÉ Fatou',
                'avatar_path' => null,
                'comment' => "Site très fluide et facile à utiliser. Ça fait plaisir d'avoir une plateforme qui permet de rechercher rapidement un hébergement en Côte d'Ivoire.",
                'is_published' => true,
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'first_name' => 'KOUAME Yannick',
                'avatar_path' => null,
                'comment' => "Franchement, belle plateforme ! Simple, rapide et rassurante. Je pense que je vais passer par BoSéjour pour mes prochaines réservations.",
                'is_published' => true,
                'created_at' => $now,
                'updated_at' => $now,
            ],
        ];
    }

    public function up(): void
    {
        foreach ($this->rows() as $row) {
            $exists = DB::table('platform_testimonials')
                ->where('first_name', $row['first_name'])
                ->where('comment', $row['comment'])
                ->exists();

            if (!$exists) {
                DB::table('platform_testimonials')->insert($row);
            }
        }
    }

    public function down(): void
    {
        foreach ($this->rows() as $row) {
            DB::table('platform_testimonials')
                ->where('first_name', $row['first_name'])
                ->where('comment', $row['comment'])
                ->whereNull('user_id')
                ->delete();
        }
    }
};
