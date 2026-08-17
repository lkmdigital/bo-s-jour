<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Étape "Synchronisation (Channel Manager)" du configurateur guidé — brief Extranet
 * Partenaire, Étape 18. Import iCal réel (URL, parsing, blocage des disponibilités) ;
 * la "connexion API XML bidirectionnelle" avec Booking.com/Airbnb n'est volontairement
 * PAS simulée ici (aucun partenariat API réel avec ces plateformes) — seul l'intérêt du
 * partenaire est enregistré (channel_manager_interest_requested_at), affiché comme
 * "Bientôt disponible" côté frontend.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('accommodations', function (Blueprint $table) {
            if (!Schema::hasColumn('accommodations', 'ical_import_url')) {
                $table->string('ical_import_url', 2048)->nullable()->after('whatsapp');
            }
            if (!Schema::hasColumn('accommodations', 'ical_last_synced_at')) {
                $table->timestamp('ical_last_synced_at')->nullable()->after('ical_import_url');
            }
            if (!Schema::hasColumn('accommodations', 'ical_last_sync_status')) {
                $table->enum('ical_last_sync_status', ['success', 'error'])->nullable()->after('ical_last_synced_at');
            }
            if (!Schema::hasColumn('accommodations', 'ical_last_sync_error')) {
                $table->text('ical_last_sync_error')->nullable()->after('ical_last_sync_status');
            }
            if (!Schema::hasColumn('accommodations', 'ical_last_sync_events_count')) {
                $table->unsignedInteger('ical_last_sync_events_count')->nullable()->after('ical_last_sync_error');
            }
            if (!Schema::hasColumn('accommodations', 'channel_manager_interest_requested_at')) {
                $table->timestamp('channel_manager_interest_requested_at')->nullable()->after('ical_last_sync_events_count');
            }
        });
    }

    public function down(): void
    {
        Schema::table('accommodations', function (Blueprint $table) {
            $table->dropColumn([
                'ical_import_url',
                'ical_last_synced_at',
                'ical_last_sync_status',
                'ical_last_sync_error',
                'ical_last_sync_events_count',
                'channel_manager_interest_requested_at',
            ]);
        });
    }
};
