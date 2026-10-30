<?php

namespace Database\Factories;

use App\Models\VideoFavorite;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<VideoFavorite>
 */
class VideoFavoriteFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'video_id' => fake()->uuid(),
            'actor_id' => fake()->uuid(),
        ];
    }
}
