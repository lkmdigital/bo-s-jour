<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('host_staff', function (Blueprint $table) {
            // Menus précis auxquels ce collaborateur a droit, choisis individuellement par
            // le propriétaire à l'invitation (liste de clés, ex. ["rooms","calendar"]) —
            // remplace le mapping fixe par rôle (HostStaff::ROLES ne sert plus qu'à qualifier
            // le poste et à autoriser la gestion du personnel pour "administrateur").
            if (!Schema::hasColumn('host_staff', 'permissions')) {
                $table->json('permissions')->nullable()->after('role');
            }
        });
    }

    public function down(): void
    {
        Schema::table('host_staff', function (Blueprint $table) {
            $table->dropColumn('permissions');
        });
    }
};
