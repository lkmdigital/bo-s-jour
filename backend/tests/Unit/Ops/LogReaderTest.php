<?php

namespace Tests\Unit\Ops;

use App\Services\Ops\LogReader;
use PHPUnit\Framework\TestCase;

class LogReaderTest extends TestCase
{
    private string $path;

    protected function setUp(): void
    {
        parent::setUp();
        $this->path = tempnam(sys_get_temp_dir(), 'ops-log-test-');
    }

    protected function tearDown(): void
    {
        @unlink($this->path);
        parent::tearDown();
    }

    public function test_missing_file_returns_empty_result(): void
    {
        $reader = new LogReader($this->path . '-inexistant');

        $this->assertFalse($reader->exists());
        $this->assertSame(['cursor' => 0, 'rotated' => false, 'entries' => []], $reader->readSince(null));
    }

    public function test_first_read_parses_lines_and_returns_a_cursor(): void
    {
        file_put_contents($this->path, "[2026-09-28 10:24:37] production.INFO: Paiement confirmé {\"payment_id\":1}\n[2026-09-28 10:24:38] production.WARNING: Autre événement\n");

        $result = (new LogReader($this->path))->readSince(null);

        $this->assertCount(2, $result['entries']);
        $this->assertSame('INFO', $result['entries'][0]['level']);
        $this->assertSame('2026-09-28 10:24:37', $result['entries'][0]['datetime']);
        $this->assertStringContainsString('Paiement confirmé', $result['entries'][0]['message']);
        $this->assertSame(filesize($this->path), $result['cursor']);
    }

    public function test_second_read_only_returns_lines_appended_since_the_cursor(): void
    {
        file_put_contents($this->path, "[2026-09-28 10:24:37] production.INFO: Première ligne\n");
        $first = (new LogReader($this->path))->readSince(null);

        file_put_contents($this->path, "[2026-09-28 10:24:40] production.INFO: Deuxième ligne\n", FILE_APPEND);
        $second = (new LogReader($this->path))->readSince($first['cursor']);

        $this->assertCount(1, $second['entries']);
        $this->assertStringContainsString('Deuxième ligne', $second['entries'][0]['message']);
    }

    public function test_a_partial_trailing_line_is_not_consumed_until_complete(): void
    {
        file_put_contents($this->path, "[2026-09-28 10:24:37] production.INFO: Ligne complète\n[2026-09-28 10:24:38] production.INFO: Ligne en cours d'écriture");

        $result = (new LogReader($this->path))->readSince(null);

        $this->assertCount(1, $result['entries']);
        $this->assertLessThan(filesize($this->path), $result['cursor']);

        // Une fois la ligne terminée, elle est bien récupérée au prochain appel.
        file_put_contents($this->path, "\n", FILE_APPEND);
        $next = (new LogReader($this->path))->readSince($result['cursor']);
        $this->assertCount(1, $next['entries']);
        $this->assertStringContainsString("en cours d'écriture", $next['entries'][0]['message']);
    }

    public function test_cursor_past_the_end_of_a_rotated_file_is_flagged_and_resets(): void
    {
        file_put_contents($this->path, "[2026-09-28 10:24:37] production.INFO: Ancien contenu, avant rotation\n");
        $huge = filesize($this->path) + 10_000;

        $result = (new LogReader($this->path))->readSince($huge);

        $this->assertTrue($result['rotated']);
        $this->assertCount(1, $result['entries']);
    }

    public function test_a_line_that_does_not_match_the_expected_format_is_still_returned(): void
    {
        file_put_contents($this->path, "sortie inattendue sans horodatage\n");

        $result = (new LogReader($this->path))->readSince(null);

        $this->assertCount(1, $result['entries']);
        $this->assertNull($result['entries'][0]['datetime']);
        $this->assertSame('sortie inattendue sans horodatage', $result['entries'][0]['message']);
    }
}
