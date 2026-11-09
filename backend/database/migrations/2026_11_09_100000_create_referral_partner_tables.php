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
            // Le compte membre qui reçoit les points. Vide tant que l'ambassadeur désigné par e-mail ou WhatsApp n'a pas créé
            // son compte : il le retrouve alors tel quel (voir PartnerReferralService::claimPending).
            $table->foreignId('user_id')->nullable()->unique()->constrained()->cascadeOnDelete();
            $table->string('invited_email')->nullable()->index();
            $table->string('invited_phone', 30)->nullable();
            $table->string('invited_phone_key', 12)->nullable()->index();   // 9 derniers chiffres : +225 07…, 07… et 225 07… se retrouvent
            $table->timestamp('claimed_at')->nullable();
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
            $table->timestamp('signup_credited_at')->nullable();                        // vide tant que l'ambassadeur n'a pas de compte
            $table->unsignedBigInteger('first_booking_id')->nullable();                 // palier 2 : 1re réservation confirmée
            $table->timestamp('first_booking_at')->nullable();
            $table->unsignedInteger('booking_points')->default(0);
            $table->timestamp('booking_credited_at')->nullable();
            // Remise de bienvenue du filleul : available → reserved (posée sur une réservation non payée) → used (payée)
            // ou forfeited (annulée par le voyageur après paiement). Elle redevient available si la réservation tombe sans faute du voyageur.
            $table->string('discount_state', 12)->default('available');
            $table->unsignedBigInteger('discount_booking_id')->nullable();
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
