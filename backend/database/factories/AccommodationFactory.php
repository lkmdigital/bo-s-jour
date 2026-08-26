<?php

namespace Database\Factories;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Accommodation>
 */
class AccommodationFactory extends Factory
{
    public function definition(): array
    {
        $name = $this->faker->company() . ' ' . $this->faker->streetName();

        return [
            'host_id' => User::factory()->host(),
            'name' => $name,
            'slug' => Str::slug($name) . '-' . $this->faker->unique()->numberBetween(1000, 99999),
            'type' => 'hotel',
            'description' => $this->faker->paragraph(),
            'address' => $this->faker->streetAddress(),
            'city' => $this->faker->city(),
            'latitude' => $this->faker->latitude(4, 11),
            'longitude' => $this->faker->longitude(-9, -2),
            'price_per_night' => $this->faker->numberBetween(15000, 80000),
            'max_guests' => $this->faker->numberBetween(1, 8),
            'bedrooms' => $this->faker->numberBetween(1, 4),
            'bathrooms' => $this->faker->numberBetween(1, 3),
            'status' => 'published',
        ];
    }

    /** Établissement ayant rejoint le Programme de fidélité (doc §14). */
    public function loyaltyParticipant(): static
    {
        return $this->state(fn () => ['loyalty_program_joined_at' => now()]);
    }
}
