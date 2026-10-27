<?php

namespace App\Services\Ops;

use Illuminate\Support\Facades\Mail;

/**
 * E-mails de l'espace Ops (alertes, résumé quotidien, rapport de Mega Bo) à la charte boséjour.
 * Chaque message part en HTML avec sa version texte : un message HTML seul est un signal de courrier indésirable.
 */
class OpsMail
{
    /** Couleur de l'étiquette selon le niveau affiché (CRITIQUE, IMPORTANT…). */
    public static function styleForLevel(string $level, bool $resolved = false): string
    {
        if ($resolved) {
            return 'ok';
        }

        return match (mb_strtoupper($level)) {
            'CRITIQUE' => 'critical',
            'IMPORTANT' => 'major',
            'RÉSUMÉ', 'RAPPORT' => 'ok',
            default => 'info',
        };
    }

    /**
     * @param array{tag:string,title:string,content:string,tagStyle?:string,subtitle?:string,preheader?:string,headerLabel?:string,button?:array{label:string,url:string},note?:string,orbUrl?:string} $data
     *        « content » est du HTML déjà sûr (utiliser e() pour tout texte qui ne l'est pas).
     */
    public static function render(array $data): string
    {
        return view('emails.ops-message', $data)->render();
    }

    /** Texte brut → HTML sûr : échappé, retours à la ligne conservés, listes à puces lisibles. */
    public static function textToHtml(string $text): string
    {
        $lines = array_map(function (string $line) {
            $line = e(rtrim($line));
            $line = preg_replace('/^(•|-)\s+(.*)$/u', '<span style="color:#FF0000;">•</span>&nbsp;$2', $line) ?? $line;

            return $line === '' ? '<div style="height:10px;line-height:10px;">&nbsp;</div>' : '<div>' . $line . '</div>';
        }, preg_split('/\R/u', trim($text)) ?: []);

        return implode('', $lines);
    }

    /** HTML produit par le Markdown de Mega Bo → mêmes balises avec les styles en ligne que les messageries respectent. */
    public static function styleMarkdown(string $html): string
    {
        return str_replace(
            ['<h2>', '<h3>', '<p>', '<ul>', '<ol>', '<li>', '<strong>', '<a '],
            [
                '<h2 style="margin:26px 0 8px;font-size:17px;font-weight:800;color:#111111;border-left:4px solid #FF0000;padding-left:10px;line-height:1.3;">',
                '<h3 style="margin:18px 0 6px;font-size:15px;font-weight:700;color:#111111;">',
                '<p style="margin:8px 0;">',
                '<ul style="margin:8px 0;padding-left:22px;">',
                '<ol style="margin:8px 0;padding-left:22px;">',
                '<li style="margin:4px 0;">',
                '<strong style="color:#111111;">',
                '<a style="color:#FF0000;" ',
            ],
            $html
        );
    }

    public static function send(string $to, string $subject, string $html, string $text): void
    {
        Mail::send([], [], function ($message) use ($to, $subject, $html, $text) {
            $message->to($to)->subject($subject)->html($html)->text($text);
        });
    }
}
