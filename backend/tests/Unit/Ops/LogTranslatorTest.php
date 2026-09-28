<?php

namespace Tests\Unit\Ops;

use App\Services\Ops\LogTranslator;
use PHPUnit\Framework\TestCase;

class LogTranslatorTest extends TestCase
{
    private LogTranslator $translator;

    protected function setUp(): void
    {
        parent::setUp();
        $this->translator = new LogTranslator();
    }

    public function test_splits_message_from_its_trailing_json_context(): void
    {
        $result = $this->translator->translate([
            'datetime' => '2026-09-28 10:24:37',
            'level' => 'INFO',
            'message' => 'Paiement confirmé (source: webhook_verifie) {"payment_id":42,"reference":"REF-1"}',
        ]);

        $this->assertSame('Paiement confirmé (source: webhook_verifie)', $result['title']);
        $this->assertSame([
            ['label' => 'Paiement #', 'value' => '42'],
            ['label' => 'Réf.', 'value' => 'REF-1'],
        ], $result['context']);
    }

    public function test_message_without_context_is_left_untouched(): void
    {
        $result = $this->translator->translate([
            'datetime' => '2026-09-28 10:24:37',
            'level' => 'INFO',
            'message' => 'Aucun contexte ici',
        ]);

        $this->assertSame('Aucun contexte ici', $result['title']);
        $this->assertSame([], $result['context']);
    }

    public function test_known_prefixes_are_categorized(): void
    {
        $cases = [
            'Webhook malia-pay: paiement échoué' => 'Paiement',
            'WhatsApp message accepté par Meta' => 'WhatsApp',
            'Ops : connexion admin' => 'Ops',
            'Profil mis à jour avec succès' => 'Compte',
        ];

        foreach ($cases as $message => $expectedCategory) {
            $result = $this->translator->translate(['datetime' => null, 'level' => 'INFO', 'message' => $message]);
            $this->assertSame($expectedCategory, $result['category'], "message: {$message}");
        }
    }

    public function test_uncategorized_errors_fall_back_to_erreur_systeme(): void
    {
        $result = $this->translator->translate([
            'datetime' => null,
            'level' => 'ERROR',
            'message' => 'SQLSTATE[22003]: Numeric value out of range',
        ]);

        $this->assertSame('Erreur système', $result['category']);
        $this->assertSame('red', $result['badgeColor']);
    }

    public function test_sensitive_context_values_are_redacted(): void
    {
        $result = $this->translator->translate([
            'datetime' => null,
            'level' => 'INFO',
            'message' => 'Jeton généré {"api_key":"sk_live_abcdef","id_number":"CI00337"}',
        ]);

        $this->assertSame([
            ['label' => 'api_key', 'value' => '••••••'],
            ['label' => 'id_number', 'value' => '••••••'],
        ], $result['context']);
    }

    public function test_nested_arrays_are_summarized_not_dumped(): void
    {
        $result = $this->translator->translate([
            'datetime' => null,
            'level' => 'WARNING',
            'message' => 'Webhook malia-pay: échec {"webhook_body":{"phone":"0700000000","name":"X"}}',
        ]);

        $this->assertStringContainsString('champ(s)', $result['context'][0]['value']);
        $this->assertStringNotContainsString('0700000000', $result['context'][0]['value']);
    }

    public function test_very_long_titles_are_truncated_with_the_full_text_kept_available(): void
    {
        $long = str_repeat('a', 400);

        $result = $this->translator->translate(['datetime' => null, 'level' => 'ERROR', 'message' => $long]);

        $this->assertSame($long, $result['title']);
        $this->assertNotNull($result['truncatedTitle']);
        $this->assertLessThan(strlen($long), mb_strlen($result['truncatedTitle']));
    }

    public function test_warning_and_info_levels_get_distinct_badge_colors(): void
    {
        $warning = $this->translator->translate(['datetime' => null, 'level' => 'WARNING', 'message' => 'x']);
        $info = $this->translator->translate(['datetime' => null, 'level' => 'INFO', 'message' => 'x']);

        $this->assertSame('amber', $warning['badgeColor']);
        $this->assertSame('blue', $info['badgeColor']);
    }
}
