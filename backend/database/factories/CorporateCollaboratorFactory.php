<?php

namespace Database\Factories;

use App\Models\CorporateCollaborator;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\CorporateCollaborator>
 */
class CorporateCollaboratorFactory extends Factory
{
    public function definition(): array
    {
        return [
            'owner_id' => User::factory()->corporate(),
            'collaborator_user_id' => User::factory(),
            'email' => $this->faker->unique()->safeEmail(),
            'name' => $this->faker->name(),
            'department' => null,
            'spending_limit' => null,
            'status' => CorporateCollaborator::STATUS_ACTIVE,
            'invited_at' => now(),
            'accepted_at' => now(),
        ];
    }
}
