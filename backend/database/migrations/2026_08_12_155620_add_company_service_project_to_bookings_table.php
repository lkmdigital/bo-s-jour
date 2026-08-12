<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('bookings', function (Blueprint $table) {
            if (!Schema::hasColumn('bookings', 'company_service')) {
                $table->string('company_service')->nullable()->after('company_billing_email');
            }
            if (!Schema::hasColumn('bookings', 'company_project')) {
                $table->string('company_project')->nullable()->after('company_service');
            }
            // Si la réservation a été faite par un collaborateur au nom d'une entreprise,
            // on garde une référence au responsable (owner) pour les rapports de dépenses,
            // même si le voyageur possède son propre compte (booking.user_id = le collaborateur).
            if (!Schema::hasColumn('bookings', 'corporate_owner_id')) {
                $table->foreignId('corporate_owner_id')->nullable()->after('company_project')
                    ->constrained('users')->nullOnDelete();
            }
        });
    }

    public function down(): void
    {
        Schema::table('bookings', function (Blueprint $table) {
            $table->dropConstrainedForeignId('corporate_owner_id');
            $table->dropColumn(['company_service', 'company_project']);
        });
    }
};
