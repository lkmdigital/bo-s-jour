<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (!Schema::hasColumn('users', 'rccm_document_path')) {
                $table->string('rccm_document_path')->nullable()->after('business_license_path');
            }

            if (!Schema::hasColumn('users', 'tax_document_path')) {
                $table->string('tax_document_path')->nullable()->after('rccm_document_path');
            }
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (Schema::hasColumn('users', 'tax_document_path')) {
                $table->dropColumn('tax_document_path');
            }

            if (Schema::hasColumn('users', 'rccm_document_path')) {
                $table->dropColumn('rccm_document_path');
            }
        });
    }
};
