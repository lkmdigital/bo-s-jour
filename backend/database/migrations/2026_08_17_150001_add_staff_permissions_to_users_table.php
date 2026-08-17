<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            // Copie de host_staff.permissions sur le compte activé, pour que le frontend
            // n'ait qu'à lire le user courant (pas besoin de recharger l'enregistrement
            // host_staff à chaque affichage du menu).
            if (!Schema::hasColumn('users', 'staff_permissions')) {
                $table->json('staff_permissions')->nullable()->after('staff_role');
            }
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('staff_permissions');
        });
    }
};
