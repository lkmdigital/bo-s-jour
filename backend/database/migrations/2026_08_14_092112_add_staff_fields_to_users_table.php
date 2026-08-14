<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            // Brief Extranet Partenaire, Phase 13 — Gestion des utilisateurs (collaborateurs).
            // Un compte "staff" est un compte host normal (mêmes login/2FA) rattaché au
            // véritable propriétaire via staff_owner_id : il n'a aucun établissement à lui,
            // il opère sur ceux du propriétaire (voir User::hostScopeId()).
            if (!Schema::hasColumn('users', 'staff_owner_id')) {
                $table->foreignId('staff_owner_id')->nullable()->after('role')
                    ->constrained('users')->nullOnDelete();
            }
            if (!Schema::hasColumn('users', 'staff_role')) {
                $table->enum('staff_role', [
                    'administrateur', 'receptionniste', 'comptabilite', 'commercial', 'housekeeping', 'maintenance',
                ])->nullable()->after('staff_owner_id');
            }
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropConstrainedForeignId('staff_owner_id');
            $table->dropColumn('staff_role');
        });
    }
};
