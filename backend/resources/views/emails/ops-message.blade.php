<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light only">
  <title>{{ $title }}</title>
</head>
{{-- E-mail de l'espace Ops (alertes, résumé, rapport de Mega Bo) à la charte boséjour : noir, rouge #FF0000, blanc.
     Mise en page en tableaux et styles en ligne, les seuls que les messageries respectent toutes. --}}
@php
    $tagColors = ['critical' => '#FF0000', 'major' => '#d97706', 'ok' => '#059669', 'info' => '#111111'];
    $tagBg = $tagColors[$tagStyle ?? 'info'] ?? '#111111';
@endphp
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,'Segoe UI',Helvetica,Arial,sans-serif;color:#111111;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:#f4f4f5;">{{ $preheader ?? $title }}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 12px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e5e7eb;">
        {{-- En-tête : le logotype boséjour, « bo » en blanc et « séjour » en rouge, sur fond noir --}}
        <tr>
          <td style="background:#0a0a0a;padding:22px 32px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
              <td style="font-size:26px;font-weight:800;letter-spacing:-0.5px;line-height:1;"><span style="color:#ffffff;">bo</span><span style="color:#FF0000;">séjour</span></td>
              <td align="right" style="font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#9ca3af;">{{ $headerLabel ?? 'Ops' }}</td>
            </tr></table>
          </td>
        </tr>
        <tr><td style="height:4px;background:#FF0000;font-size:0;line-height:0;">&nbsp;</td></tr>

        <tr>
          <td style="padding:32px 32px 8px;">
            @if (!empty($orbUrl))
              <img src="{{ $orbUrl }}" width="56" height="56" alt="Mega Bo" style="display:block;border:0;margin:0 0 16px;">
            @endif
            <span style="display:inline-block;background:{{ $tagBg }};color:#ffffff;font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;padding:5px 11px;border-radius:999px;">{{ $tag }}</span>
            <h1 style="margin:14px 0 4px;font-size:22px;line-height:1.3;font-weight:800;color:#111111;">{{ $title }}</h1>
            @if (!empty($subtitle))
              <p style="margin:0;font-size:13px;color:#6b7280;">{{ $subtitle }}</p>
            @endif
          </td>
        </tr>

        <tr>
          <td style="padding:12px 32px 8px;font-size:15px;line-height:1.65;color:#1f2937;">
            {!! $content !!}
          </td>
        </tr>

        @if (!empty($button))
          <tr>
            <td style="padding:16px 32px 8px;">
              <a href="{{ $button['url'] }}" style="display:inline-block;background:#FF0000;color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;padding:13px 28px;border-radius:10px;">{{ $button['label'] }}</a>
            </td>
          </tr>
        @endif

        @if (!empty($note))
          <tr>
            <td style="padding:20px 32px 0;">
              <p style="margin:0;padding:12px 14px;background:#f9fafb;border-left:3px solid #FF0000;border-radius:6px;font-size:12px;line-height:1.55;color:#6b7280;">{{ $note }}</p>
            </td>
          </tr>
        @endif

        <tr><td style="padding:28px 32px 0;"><div style="border-top:1px solid #e5e7eb;font-size:0;line-height:0;">&nbsp;</div></td></tr>
        <tr>
          <td style="padding:16px 32px 28px;font-size:12px;line-height:1.7;color:#6b7280;">
            <strong style="color:#111111;">boséjour</strong> · <a href="https://bosejour.ci" style="color:#6b7280;text-decoration:none;">bosejour.ci</a><br>
            Support WhatsApp : <a href="https://wa.me/2250706402929" style="color:#FF0000;text-decoration:none;font-weight:600;">07 06 40 29 29</a>
            · <a href="mailto:contact@bosejour.ci" style="color:#6b7280;text-decoration:none;">contact@bosejour.ci</a>
          </td>
        </tr>
      </table>
      <p style="margin:14px 0 0;font-size:11px;color:#9ca3af;">Message automatique de l'espace Ops de boséjour.</p>
    </td></tr>
  </table>
</body>
</html>
