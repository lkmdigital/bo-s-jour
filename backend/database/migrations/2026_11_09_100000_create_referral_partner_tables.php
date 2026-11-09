<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Parrainage « ambassadeur » (cahier des charges du 2026-11-09) : un membre désigné par le Super Admin diffuse
 * un QR code / lien traçable ; on compte les clics, les inscriptions rattachées et les premières réservations.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('referral_partners', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained()->cascadeOnDelete();   // le compte membre qui reçoit les points
            $table->string('code', 20)->unique();                                       // code d'invitation (distinct des codes membres)
            $table->string('display_name')->nullable();                                 // ex. « Restaurant Chez Mama »
            $table->boolean('is_active')->default(true);
            $table->foreignId('created_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        Schema::create('referral_partner_clicks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('referral_partner_id')->constrained()->cascadeOnDelete();
            $table->string('visitor_hash', 64);          // empreinte salée IP + navigateur : aucune donnée personnelle brute conservée
            $table->timestamp('created_at')->useCurrent();
            $table->index(['referral_partner_id', 'visitor_hash']);
        });

        Schema::create('referral_partner_referrals', function (Blueprint $table) {
            $table->id();
            $table->foreignId('referral_partner_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();             // le filleul
            $table->timestamp('signup_validated_at')->nullable();                       // e-mail vérifié : palier 1
            $table->unsignedInteger('signup_points')->default(0);
            $table->unsignedBigInteger('first_booking_id')->nullable();                 // palier 2 (étape suivante)
            $table->timestamp('first_booking_at')->nullable();
            $table->unsignedInteger('booking_points')->default(0);
            $table->timestamps();
            $table->unique(['referral_partner_id', 'user_id']);   // un même parrain ne compte qu'une fois pour un même filleul
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('referral_partner_referrals');
        Schema::dropIfExists('referral_partner_clicks');
        Schema::dropIfExists('referral_partners');
    }
};
