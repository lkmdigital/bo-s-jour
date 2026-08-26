<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\User>
 */
class UserFactory extends Factory
{
    public function definition(): array
    {
        return [
            'name' => $this->faker->name(),
            'email' => $this->faker->unique()->safeEmail(),
            'email_verified_at' => now(),
            'password' => 'password',
            'role' => 'user',
            'traveler_type' => 'individual',
        ];
    }

    public function host(): static
    {
        return $this->state(fn () => ['role' => 'host']);
    }

    public function admin(): static
    {
        return $this->state(fn () => ['role' => 'admin']);
    }

    public function corporate(): static
    {
        return $this->state(fn () => [
            'traveler_type' => 'corporate',
            'company_name' => $this->faker->company(),
        ]);
    }
}
