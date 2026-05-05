<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Ajoute les colonnes "enhance" à la table rooms si elles n'existent pas.
     * Sans risque si la migration a déjà été partiellement appliquée (SQL manuel).
     */
    public function up(): void
    {
        $add = function (\Closure $definition) {
            Schema::table('rooms', $definition);
        };

        if (!Schema::hasColumn('rooms', 'quantity')) {
            $add(fn (Blueprint $table) => $table->unsignedInteger('quantity')->default(1)->after('is_active')->comment('Nombre de chambres de ce type'));
        }
        if (!Schema::hasColumn('rooms', 'name_en')) {
            $add(fn (Blueprint $table) => $table->string('name_en')->nullable()->after('name'));
        }
        if (!Schema::hasColumn('rooms', 'room_category')) {
            $add(fn (Blueprint $table) => $table->string('room_category')->nullable()->after('type'));
        }
        if (!Schema::hasColumn('rooms', 'room_subcategory')) {
            $add(fn (Blueprint $table) => $table->string('room_subcategory')->nullable());
        }
        if (!Schema::hasColumn('rooms', 'bedding')) {
            $add(fn (Blueprint $table) => $table->json('bedding')->nullable());
        }
        if (!Schema::hasColumn('rooms', 'bedding_custom')) {
            $add(fn (Blueprint $table) => $table->string('bedding_custom')->nullable());
        }
        if (!Schema::hasColumn('rooms', 'surface_area')) {
            $add(fn (Blueprint $table) => $table->decimal('surface_area', 6, 2)->nullable());
        }
        if (!Schema::hasColumn('rooms', 'bathroom_features')) {
            $add(fn (Blueprint $table) => $table->json('bathroom_features')->nullable());
        }
        if (!Schema::hasColumn('rooms', 'has_guest_toilet')) {
            $add(fn (Blueprint $table) => $table->boolean('has_guest_toilet')->default(false));
        }
        if (!Schema::hasColumn('rooms', 'has_additional_bathroom')) {
            $add(fn (Blueprint $table) => $table->boolean('has_additional_bathroom')->default(false));
        }
        if (!Schema::hasColumn('rooms', 'basic_amenities')) {
            $add(fn (Blueprint $table) => $table->json('basic_amenities')->nullable());
        }
        if (!Schema::hasColumn('rooms', 'view_type')) {
            $add(fn (Blueprint $table) => $table->string('view_type')->nullable());
        }
        if (!Schema::hasColumn('rooms', 'view_price_modifier')) {
            $add(fn (Blueprint $table) => $table->integer('view_price_modifier')->default(0));
        }
        if (!Schema::hasColumn('rooms', 'outdoor_features')) {
            $add(fn (Blueprint $table) => $table->json('outdoor_features')->nullable());
        }
        if (!Schema::hasColumn('rooms', 'outdoor_area')) {
            $add(fn (Blueprint $table) => $table->decimal('outdoor_area', 6, 2)->nullable());
        }
        if (!Schema::hasColumn('rooms', 'storage_options')) {
            $add(fn (Blueprint $table) => $table->json('storage_options')->nullable());
        }
        if (!Schema::hasColumn('rooms', 'has_living_room')) {
            $add(fn (Blueprint $table) => $table->boolean('has_living_room')->default(false));
        }
        if (!Schema::hasColumn('rooms', 'living_room_features')) {
            $add(fn (Blueprint $table) => $table->json('living_room_features')->nullable());
        }
        if (!Schema::hasColumn('rooms', 'has_kitchen')) {
            $add(fn (Blueprint $table) => $table->boolean('has_kitchen')->default(false));
        }
        if (!Schema::hasColumn('rooms', 'kitchen_type')) {
            $add(fn (Blueprint $table) => $table->string('kitchen_type')->nullable());
        }
        if (!Schema::hasColumn('rooms', 'kitchen_equipment')) {
            $add(fn (Blueprint $table) => $table->json('kitchen_equipment')->nullable());
        }
        if (!Schema::hasColumn('rooms', 'has_dining_area')) {
            $add(fn (Blueprint $table) => $table->boolean('has_dining_area')->default(false));
        }
        if (!Schema::hasColumn('rooms', 'dining_capacity')) {
            $add(fn (Blueprint $table) => $table->integer('dining_capacity')->nullable());
        }
        if (!Schema::hasColumn('rooms', 'additional_bedrooms')) {
            $add(fn (Blueprint $table) => $table->integer('additional_bedrooms')->default(0));
        }
        if (!Schema::hasColumn('rooms', 'additional_bedrooms_config')) {
            $add(fn (Blueprint $table) => $table->json('additional_bedrooms_config')->nullable());
        }
        if (!Schema::hasColumn('rooms', 'premium_amenities')) {
            $add(fn (Blueprint $table) => $table->json('premium_amenities')->nullable());
        }
        if (!Schema::hasColumn('rooms', 'paid_options')) {
            $add(fn (Blueprint $table) => $table->json('paid_options')->nullable());
        }
        if (!Schema::hasColumn('rooms', 'has_private_pool')) {
            $add(fn (Blueprint $table) => $table->boolean('has_private_pool')->default(false));
        }
        if (!Schema::hasColumn('rooms', 'pool_heated')) {
            $add(fn (Blueprint $table) => $table->boolean('pool_heated')->default(false));
        }
        if (!Schema::hasColumn('rooms', 'has_parking')) {
            $add(fn (Blueprint $table) => $table->boolean('has_parking')->default(false));
        }
        if (!Schema::hasColumn('rooms', 'parking_type')) {
            $add(fn (Blueprint $table) => $table->string('parking_type')->nullable());
        }
        if (!Schema::hasColumn('rooms', 'parking_price')) {
            $add(fn (Blueprint $table) => $table->decimal('parking_price', 10, 2)->nullable());
        }
        if (!Schema::hasColumn('rooms', 'is_pmr_accessible')) {
            $add(fn (Blueprint $table) => $table->boolean('is_pmr_accessible')->default(false));
        }
        if (!Schema::hasColumn('rooms', 'pmr_features')) {
            $add(fn (Blueprint $table) => $table->json('pmr_features')->nullable());
        }
        if (!Schema::hasColumn('rooms', 'single_occupancy_price')) {
            $add(fn (Blueprint $table) => $table->decimal('single_occupancy_price', 10, 2)->nullable());
        }
        if (!Schema::hasColumn('rooms', 'extra_bed_price')) {
            $add(fn (Blueprint $table) => $table->decimal('extra_bed_price', 10, 2)->nullable());
        }
        if (!Schema::hasColumn('rooms', 'max_extra_beds')) {
            $add(fn (Blueprint $table) => $table->integer('max_extra_beds')->default(0));
        }
        if (!Schema::hasColumn('rooms', 'custom_tags')) {
            $add(fn (Blueprint $table) => $table->json('custom_tags')->nullable());
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        $columns = [
            'quantity', 'name_en', 'room_category', 'room_subcategory', 'bedding', 'bedding_custom',
            'surface_area', 'bathroom_features', 'has_guest_toilet', 'has_additional_bathroom',
            'basic_amenities', 'view_type', 'view_price_modifier', 'outdoor_features', 'outdoor_area',
            'storage_options', 'has_living_room', 'living_room_features', 'has_kitchen', 'kitchen_type',
            'kitchen_equipment', 'has_dining_area', 'dining_capacity', 'additional_bedrooms',
            'additional_bedrooms_config', 'premium_amenities', 'paid_options', 'has_private_pool',
            'pool_heated', 'has_parking', 'parking_type', 'parking_price', 'is_pmr_accessible',
            'pmr_features', 'single_occupancy_price', 'extra_bed_price', 'max_extra_beds', 'custom_tags',
        ];
        Schema::table('rooms', function (Blueprint $table) use ($columns) {
            foreach ($columns as $col) {
                if (Schema::hasColumn('rooms', $col)) {
                    $table->dropColumn($col);
                }
            }
        });
    }
};
