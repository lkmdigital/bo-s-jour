<?php

namespace Tests\Feature;

use App\Models\Setting;
use App\Services\WhatsAppService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class WhatsAppTemplateSendingTest extends TestCase
{
    use RefreshDatabase;

    private function configure(bool $useTemplates): void
    {
        Setting::set('whatsapp_enabled', true, 'boolean', 'test');
        Setting::set('whatsapp_token', 'tok', 'string', 'test');
        Setting::set('whatsapp_phone_id', '123', 'string', 'test');
        Setting::set('whatsapp_use_templates', $useTemplates, 'boolean', 'test');
    }

    public function test_send_template_builds_body_and_url_button_components(): void
    {
        $this->configure(true);
        Http::fake(['graph.facebook.com/*' => Http::response(['messages' => [['id' => 'x']]], 200)]);

        $ok = app(WhatsAppService::class)->sendTemplate(
            '+225 07 06 40 29 29',
            WhatsAppService::TPL_APPROVED_PLEASE_PAY,
            ["Résidence\nLe Balafon", '12/10/2026', '15/10/2026'],
            'jeton123'
        );

        $this->assertTrue($ok);
        Http::assertSent(function ($request) {
            $t = $request['template'];
            return $request['to'] === '2250706402929'
                && $request['type'] === 'template'
                && $t['name'] === 'bosejour_demande_acceptee'
                && $t['language']['code'] === 'fr'
                // Retour à la ligne aplati : Meta rejette les \n dans une variable.
                && $t['components'][0]['parameters'][0]['text'] === 'Résidence Le Balafon'
                && count($t['components'][0]['parameters']) === 3
                && $t['components'][1]['sub_type'] === 'url'
                && $t['components'][1]['index'] === '0'
                && $t['components'][1]['parameters'][0]['text'] === 'jeton123';
        });
    }

    public function test_template_without_variables_has_no_components(): void
    {
        $this->configure(true);
        Http::fake(['graph.facebook.com/*' => Http::response([], 200)]);

        app(WhatsAppService::class)->sendTemplate('2250706402929', WhatsAppService::TPL_REQUEST_RECEIVED);

        Http::assertSent(fn ($r) => !isset($r['template']['components']));
    }

    public function test_verification_code_uses_template_with_copy_code_button(): void
    {
        $this->configure(true);
        Http::fake(['graph.facebook.com/*' => Http::response([], 200)]);

        $this->assertTrue(app(WhatsAppService::class)->sendVerificationCode('2250706402929', '123456'));

        Http::assertSent(function ($r) {
            $c = $r['template']['components'];
            return $r['template']['name'] === 'bosejour_code_verification'
                && $c[0]['parameters'][0]['text'] === '123456'
                && $c[1]['parameters'][0]['text'] === '123456';
        });
    }

    public function test_falls_back_to_free_text_when_meta_rejects_the_template(): void
    {
        $this->configure(true);
        Http::fake([
            'graph.facebook.com/*' => Http::sequence()
                ->push(['error' => ['message' => 'Template not found']], 404)
                ->push(['messages' => [['id' => 'x']]], 200),
        ]);

        $this->assertTrue(app(WhatsAppService::class)->sendVerificationCode('2250706402929', '654321'));

        Http::assertSentCount(2);
        Http::assertSent(fn ($r) => ($r['type'] ?? null) === 'text' && str_contains($r['text']['body'], '654321'));
    }

    public function test_sends_free_text_only_when_templates_are_disabled(): void
    {
        $this->configure(false);
        Http::fake(['graph.facebook.com/*' => Http::response([], 200)]);

        app(WhatsAppService::class)->sendVerificationCode('2250706402929', '111111');

        Http::assertSentCount(1);
        Http::assertSent(fn ($r) => $r['type'] === 'text');
    }
}
