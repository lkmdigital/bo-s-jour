<?php

namespace Tests\Feature;

use App\Models\Accommodation;
use App\Models\Booking;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

/**
 * Constaté en production le 2026-11-17 : l'e-mail « Comment s'est passé votre séjour ? » contenait http://localhost:3000/review/booking/… .
 * Laravel 12 définit `app.frontend_url` avec « http://localhost:3000 » par défaut, et FRONTEND_URL n'est pas renseigné sur le serveur : tout lien
 * bâti avec `config('app.frontend_url')` pointait donc vers la machine de développement. Les liens utilisent `services.frontend_url` (bosejour.ci).
 */
class FrontendUrlInLinksTest extends TestCase
{
    use RefreshDatabase;

    public function test_no_code_builds_a_link_from_the_laravel_default_frontend_url(): void
    {
        $offenders = [];
        foreach (new \RecursiveIteratorIterator(new \RecursiveDirectoryIterator(app_path())) as $file) {
            if ($file->isFile() && $file->getExtension() === 'php' && str_contains((string) file_get_contents($file->getPathname()), "app.frontend_url")) {
                $offenders[] = str_replace(base_path() . '/', '', $file->getPathname());
            }
        }

        $this->assertSame([], $offenders, "Utiliser config('services.frontend_url') : « app.frontend_url » vaut http://localhost:3000 sans FRONTEND_URL.");
    }

    public function test_the_post_stay_review_email_links_to_the_real_site_even_when_the_laravel_default_is_localhost(): void
    {
        Http::fake();
        config([
            'app.frontend_url' => 'http://localhost:3000',        // valeur par défaut de Laravel 12 sans FRONTEND_URL
            'services.frontend_url' => 'https://bosejour.ci',     // valeur réellement utilisée
            'mail.default' => 'array',
        ]);
        $traveler = User::factory()->create(['role' => 'user', 'email' => 'voyageur@example.com']);
        Booking::factory()->for($traveler)->create([
            'accommodation_id' => Accommodation::factory()->create(['status' => 'published'])->id,
            'status' => 'confirmed', 'payment_status' => 'paid', 'review_link_sent_at' => null,
            'check_in' => now()->subDays(4)->toDateString(), 'check_out' => now()->subDays(2)->toDateString(),
        ]);

        $this->artisan('reviews:send-post-stay-links')->assertSuccessful();

        $messages = app('mail.manager')->mailer('array')->getSymfonyTransport()->messages();
        $this->assertCount(1, $messages);
        $body = $messages[0]->getOriginalMessage()->getTextBody();
        $this->assertStringContainsString('https://bosejour.ci/review/booking/', $body);
        $this->assertStringNotContainsString('localhost', $body);
    }
}
