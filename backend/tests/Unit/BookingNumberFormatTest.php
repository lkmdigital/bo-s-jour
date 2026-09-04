<?php

namespace Tests\Unit;

use App\Models\Booking;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Retour client 2026-09-02 : "Les numéros de confirmation générés sont trop
 * courts (ex: #12)... Format recommandé : BS-AAAA-XXXXXX". Vérifie le
 * nouveau format (préfixe BS-, 6 chiffres) et la séquence par année.
 */
class BookingNumberFormatTest extends TestCase
{
    use RefreshDatabase;

    public function test_generated_number_matches_bs_year_six_digits_format(): void
    {
        $number = Booking::generateBookingNumber();

        $this->assertMatchesRegularExpression('/^BS-\d{4}-\d{6}$/', $number);
    }

    public function test_sequence_increments_within_the_same_year(): void
    {
        $at = \Carbon\Carbon::create(2026, 6, 1);

        $first = Booking::generateBookingNumber($at);
        Booking::factory()->create(['booking_number' => $first]);
        $second = Booking::generateBookingNumber($at);

        $this->assertSame('BS-2026-000001', $first);
        $this->assertSame('BS-2026-000002', $second);
    }
}
