<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Accommodation extends Model
{
    use HasFactory;

    /** Code pays utilisé pour l'identifiant unique d'établissement (plateforme Côte d'Ivoire uniquement). */
    public const COUNTRY_CODE = '+225';

    /**
     * Sous-catégories par famille (`type`), cf. rapport de vérification point 5.
     * `type` sans `subtype` correspond à la catégorie "standard" de la famille.
     */
    public const SUBTYPES = [
        'hotel' => [
            'apart_hotel' => 'Appart-Hôtel',
            'motel' => 'Motel',
            'auberge' => 'Auberge',
        ],
        'apartment' => [
            'furnished' => 'Résidence Meublée',
            'luxury' => 'Résidence luxueuse',
        ],
    ];

    protected $fillable = [
        'host_id',
        'name',
        'whatsapp',
        'slug',
        'type',
        'subtype',
        'type_other_label',
        'establishment_code',
        'description',
        'description_en',
        'address',
        'city',
        'latitude',
        'longitude',
        'price_per_night',
        'max_guests',
        'bedrooms',
        'bathrooms',
        'amenities',
        'status',
        'submitted_for_review_at',
        'is_featured',
        'rating',
        'total_reviews',
        // Nouveaux champs
        'opening_year',
        'star_rating',
        'standing',
        'room_types',
        'room_type_pricing',
        'conference_rooms_count',
        'conference_capacity',
        'restaurant_capacity',
        'bar_capacity',
        'shuttle_service',
        'laundry',
        'breakfast_price',
        'reception_24h',
        'smoking_area',
        'pets_allowed',
        'other_amenities',
        'deposit_required',
        'deposit_amount',
        'cancellation_policy_hours',
        'payment_methods',
        'special_conditions',
        'breakfast_included',
        'breakfast_included_persons',
        'check_in_time',
        'check_out_time',
        'invoice_paid_before_hours',
        // Tarification : chaque plan est une option à cocher par l'hôte
        'pricing_auto_enabled',
        'pricing_non_refundable_enabled',
        'pricing_non_refundable_discount',
        'pricing_modifiable_enabled',
        'pricing_modifiable_surcharge',
        'pricing_long_stay_enabled',
        'pricing_long_stay_discount',
        'pricing_long_stay_nights',
        'pricing_long_stay_tiers',
        // Synchronisation externe (brief Extranet Partenaire, Étape 18)
        'ical_import_url',
        'ical_last_synced_at',
        'ical_last_sync_status',
        'ical_last_sync_error',
        'ical_last_sync_events_count',
        'channel_manager_interest_requested_at',
        'loyalty_program_joined_at',
    ];

    protected function casts(): array
    {
        return [
            'submitted_for_review_at' => 'datetime',
            'loyalty_program_joined_at' => 'datetime',
            'amenities' => 'array',
            'room_types' => 'array',
            'room_type_pricing' => 'array',
            'payment_methods' => 'array',
            'latitude' => 'decimal:8',
            'longitude' => 'decimal:8',
            'price_per_night' => 'decimal:2',
            'breakfast_price' => 'decimal:2',
            'is_featured' => 'boolean',
            'rating' => 'decimal:2',
            'shuttle_service' => 'boolean',
            'laundry' => 'boolean',
            'reception_24h' => 'boolean',
            'smoking_area' => 'boolean',
            'pets_allowed' => 'boolean',
            'deposit_required' => 'boolean',
            'breakfast_included' => 'boolean',
            'pricing_auto_enabled' => 'boolean',
            'pricing_non_refundable_enabled' => 'boolean',
            'pricing_modifiable_enabled' => 'boolean',
            'pricing_long_stay_enabled' => 'boolean',
            'pricing_non_refundable_discount' => 'decimal:2',
            'pricing_modifiable_surcharge' => 'decimal:2',
            'pricing_long_stay_discount' => 'decimal:2',
            'pricing_long_stay_tiers' => 'array',
            'ical_last_synced_at' => 'datetime',
            'channel_manager_interest_requested_at' => 'datetime',
        ];
    }

    public function host()
    {
        return $this->belongsTo(User::class, 'host_id');
    }

    public function bookings()
    {
        return $this->hasMany(Booking::class);
    }

    public function reviews()
    {
        return $this->hasMany(Review::class);
    }

    public function images()
    {
        return $this->hasMany(AccommodationImage::class);
    }

    public function rooms()
    {
        return $this->hasMany(Room::class);
    }

    public function subscriptions()
    {
        return $this->hasMany(Subscription::class);
    }

    public function activeSubscription()
    {
        return $this->hasOne(Subscription::class)->where('status', 'active')
            ->where('expires_at', '>=', now());
    }

    public function promotions()
    {
        return $this->hasMany(Promotion::class);
    }

    public function activePromotions()
    {
        return $this->hasMany(Promotion::class)->where('is_active', true);
    }

    public function scopePublished($query)
    {
        return $query->where('status', 'published');
    }

    public function scopeFeatured($query)
    {
        return $query->where('is_featured', true);
    }

    public function scopeByCity($query, $city)
    {
        return $query->where('city', $city);
    }

    public function scopeByType($query, $type)
    {
        return $query->where('type', $type);
    }

    public function scopeBySubtype($query, $subtype)
    {
        return $query->where('subtype', $subtype);
    }

    /**
     * Génère l'identifiant unique d'établissement.
     *
     * Retour client 2026-09-02 (Partie 4.2) : "format recommandé à valider :
     * BS-VILLE-XXX, par exemple BS-KGO-00O1." Confirmé avec l'utilisateur :
     * adopter ce format pour les NOUVEAUX établissements. Comme pour
     * generateBookingNumber() (même retour client, même logique), les codes
     * déjà attribués (ancien format Code pays-Séquence-Année, ex.
     * +225-00001-26) restent inchangés — un identifiant d'établissement doit
     * être stable, le renuméroter casserait toute référence externe déjà
     * distribuée (exports, API partenaires, communication avec l'hôte).
     *
     * Séquence par ville plutôt que globale : le doc donne un exemple à 4
     * chiffres par ville (BS-KGO-0001), pas un compteur unique toutes villes
     * confondues.
     */
    public static function generateEstablishmentCode(string $city): string
    {
        $cityCode = self::cityCodeFor($city);
        $prefix = "BS-{$cityCode}-";

        do {
            $maxSeq = (int) \Illuminate\Support\Facades\DB::table('accommodations')
                ->where('establishment_code', 'like', $prefix . '%')
                ->selectRaw('MAX(CAST(SUBSTRING(establishment_code, ?) AS UNSIGNED)) as max_seq', [strlen($prefix) + 1])
                ->value('max_seq');

            $sequence = str_pad((string) ($maxSeq + 1), 4, '0', STR_PAD_LEFT);
            $code = $prefix . $sequence;
        } while (self::where('establishment_code', $code)->exists());

        return $code;
    }

    /**
     * Code ville à 3 lettres pour generateEstablishmentCode() — dérivé du nom
     * de ville (pas de table de correspondance officielle type IATA) :
     * translittéré, majuscules, 3 premières lettres. "XXX" si la ville est
     * vide ou ne contient aucune lettre.
     */
    private static function cityCodeFor(string $city): string
    {
        $ascii = iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $city) ?: '';
        $letters = strtoupper(preg_replace('/[^a-zA-Z]/', '', $ascii));

        return $letters !== '' ? str_pad(substr($letters, 0, 3), 3, 'X') : 'XXX';
    }

    public function scopePriceRange($query, $min, $max)
    {
        return $query->whereBetween('price_per_night', [$min, $max]);
    }

    /**
     * Historique des modifications (audit logs)
     */
    public function auditLogs()
    {
        return $this->hasMany(AccommodationAuditLog::class);
    }

    /**
     * Notes internes admin
     */
    public function adminNotes()
    {
        return $this->morphMany(AdminNote::class, 'noteable');
    }

    /**
     * Inspections effectuées sur cet établissement
     */
    public function inspections()
    {
        return $this->hasMany(Inspection::class);
    }
}

