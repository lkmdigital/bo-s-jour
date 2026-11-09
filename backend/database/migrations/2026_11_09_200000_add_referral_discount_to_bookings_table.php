<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** Remise de bienvenue du parrainage ambassadeur : 5 % de la première nuitée, financée par boséjour (base_price reste le tarif plein de l'hôte). */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('bookings', function (Blueprint $table) {
            $table->unsignedBigInteger('partner_referral_id')->nullable()->after('loyalty_voucher_id')->index();
            $table->decimal('referral_discount_amount', 10, 2)->default(0)->after('partner_referral_id');
        });
    }

    public function down(): void
    {
        Schema::table('bookings', function (Blueprint $table) {
            $table->dropColumn(['partner_referral_id', 'referral_discount_amount']);
        });
    }
};
