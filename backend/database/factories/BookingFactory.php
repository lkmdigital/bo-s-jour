<?php

namespace Database\Factories;

use App\Models\Accommodation;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Booking>
 */
class BookingFactory extends Factory
{
    public function definition(): array
    {
        $checkIn = $this->faker->dateTimeBetween('-2 months', '-1 week');
        $checkOut = (clone $checkIn)->modify('+' . $this->faker->numberBetween(1, 5) . ' days');

        return [
            'user_id' => User::factory(),
            'accommodation_id' => Accommodation::factory(),
            'check_in' => $checkIn,
            'check_out' => $checkOut,
            'guests' => $this->faker->numberBetween(1, 4),
            'total_price' => $this->faker->numberBetween(30000, 300000),
            'status' => 'confirmed',
            'traveler_type' => 'individual',
        ];
    }

    /** Séjour terminé et éligible aux points (doc §2 : points attribués après check-out). */
    public function checkedOut(): static
    {
        return $this->state(fn () => [
            'check_in' => now()->subDays(5),
            'check_out' => now()->subDays(2),
            'status' => 'confirmed',
        ]);
    }

    public function cancelled(): static
    {
        return $this->state(fn () => ['status' => 'cancelled']);
    }

    public function corporate(): static
    {
        return $this->state(fn () => ['traveler_type' => 'corporate']);
    }
}
