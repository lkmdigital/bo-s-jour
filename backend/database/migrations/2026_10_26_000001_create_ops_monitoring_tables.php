<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Supervision (espace Ops) : résultats des contrôles, incidents et alertes envoyées, plus le
 * marquage « synthétique » des comptes et établissements de test du moniteur (jamais visibles du public).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ops_check_results', function (Blueprint $table) {
            $table->id();
            $table->string('check_key', 80);
            $table->string('profile', 20);          // system | traveler | host | admin
            $table->string('kind', 20);             // api | browser | logs | business
            $table->string('status', 10);           // ok | warn | fail
            $table->unsignedInteger('duration_ms')->default(0);
            $table->text('message')->nullable();
            $table->json('details')->nullable();
            $table->string('screenshot')->nullable();
            $table->timestamp('created_at')->useCurrent()->index();
            $table->index(['check_key', 'created_at']);
        });

        Schema::create('ops_incidents', function (Blueprint $table) {
            $table->id();
            $table->string('check_key', 80)->index();
            $table->string('profile', 20);
            $table->string('severity', 10);         // critical | major | minor
            $table->string('title');
            $table->string('status', 10)->default('open')->index(); // open | resolved
            $table->unsignedInteger('failure_count')->default(1);
            $table->timestamp('first_seen_at');
            $table->timestamp('last_seen_at');
            $table->timestamp('resolved_at')->nullable();
            $table->text('last_message')->nullable();
            $table->json('details')->nullable();
            $table->string('screenshot')->nullable();
            $table->timestamp('opened_notified_at')->nullable();
            $table->timestamp('last_reminder_at')->nullable();
            $table->timestamp('resolved_notified_at')->nullable();
            $table->timestamps();
        });

        Schema::create('ops_alerts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('ops_incident_id')->nullable()->constrained('ops_incidents')->nullOnDelete();
            $table->string('type', 12);             // opened | reminder | resolved | digest | test
            $table->string('channel', 10);          // whatsapp | email
            $table->string('recipient');
            $table->string('status', 10);           // sent | failed | skipped
            $table->text('error')->nullable();
            $table->timestamp('created_at')->useCurrent()->index();
        });

        Schema::table('users', function (Blueprint $table) {
            $table->boolean('is_synthetic')->default(false)->after('status');
        });

        Schema::table('accommodations', function (Blueprint $table) {
            $table->boolean('is_synthetic')->default(false)->index();
        });
    }

    public function down(): void
    {
        Schema::table('accommodations', fn (Blueprint $t) => $t->dropColumn('is_synthetic'));
        Schema::table('users', fn (Blueprint $t) => $t->dropColumn('is_synthetic'));
        Schema::dropIfExists('ops_alerts');
        Schema::dropIfExists('ops_incidents');
        Schema::dropIfExists('ops_check_results');
    }
};
