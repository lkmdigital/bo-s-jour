<?php

namespace Tests\Feature;

use App\Services\WhatsAppService;
use Tests\TestCase;

/**
 * Cas réel du 2026-10-16 : le numéro d'un hôte enregistré en local (« 0709779922 ») était envoyé
 * sans indicatif, et Meta le transformait en « 22509779922 » (autre numéro).
 */
class WhatsAppPhoneNormalizationTest extends TestCase
{
    private function normalize(?string $phone): ?string
    {
        $m = new \ReflectionMethod(WhatsAppService::class, 'normalize');

        return $m->invoke(new WhatsAppService(), $phone);
    }

    public function test_local_ivorian_numbers_get_the_country_code(): void
    {
        $this->assertSame('2250709779922', $this->normalize('0709779922'));
        $this->assertSame('2250709779922', $this->normalize('07 09 77 99 22'));
        $this->assertSame('22567316124', $this->normalize('67316124')); // ancien format à 8 chiffres
    }

    public function test_numbers_already_international_are_left_alone(): void
    {
        $this->assertSame('2250161133466', $this->normalize('+225 0161133466'));
        $this->assertSame('2250161133466', $this->normalize('2250161133466'));
        $this->assertSame('22567316124', $this->normalize('22567316124'));
        $this->assertSame('33612345678', $this->normalize('+33 6 12 34 56 78'));
        $this->assertSame('2250709779922', $this->normalize('00225 0709779922'));
    }

    public function test_empty_numbers_are_refused(): void
    {
        $this->assertNull($this->normalize(null));
        $this->assertNull($this->normalize('  '));
    }
}
