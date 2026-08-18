<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Documents de conformité manquants</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f6f8;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f6f8;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="580" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
          <tr>
            <td style="background:#000000;padding:32px 40px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:700;letter-spacing:-0.5px;">
                <span style="color:#FF0000;">bo</span> séjour
              </h1>
              <p style="margin:6px 0 0;color:rgba(255,255,255,0.75);font-size:13px;">Espace Partenaire</p>
            </td>
          </tr>
          <tr>
            <td style="padding:40px 40px 32px;">
              <p style="margin:0 0 8px;font-size:15px;color:#374151;">Bonjour <strong>{{ $hostName }}</strong>,</p>

              @if ($stage >= 4)
                <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.6;">
                  Depuis {{ $days }} jours, le dossier de conformité de votre établissement reste incomplet.
                  Sans régularisation, vos établissements pourraient être suspendus de la plateforme.
                </p>
              @elseif ($stage == 3)
                <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.6;">
                  Cela fait {{ $days }} jours que certains documents obligatoires n'ont pas été transmis.
                  Merci de régulariser votre dossier rapidement pour éviter toute interruption de service.
                </p>
              @else
                <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.6;">
                  Votre dossier de conformité n'est pas encore complet. Quelques documents restent à
                  transmettre pour finaliser la vérification de votre compte partenaire.
                </p>
              @endif

              @if (count($missingLabels) > 0)
                <div style="margin:0 0 24px;font-size:14px;color:#374151;line-height:1.8;background:#fef2f2;border-radius:8px;padding:16px 20px;">
                  <strong>Documents / informations manquants :</strong>
                  <ul style="margin:8px 0 0;padding-left:18px;">
                    @foreach ($missingLabels as $label)
                      <li>{{ $label }}</li>
                    @endforeach
                  </ul>
                </div>
              @endif

              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                <tr>
                  <td align="center">
                    <a href="{{ $dashboardUrl }}"
                       style="display:inline-block;background:#FF0000;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;padding:14px 36px;border-radius:9999px;letter-spacing:0.3px;">
                      Compléter mon dossier
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 8px;font-size:13px;color:#6b7280;line-height:1.6;">
                Si le bouton ne fonctionne pas, copiez-collez ce lien dans votre navigateur&nbsp;:
              </p>
              <p style="margin:0 0 24px;font-size:13px;color:#FF0000;word-break:break-all;">
                {{ $dashboardUrl }}
              </p>

              <p style="margin:0;font-size:13px;color:#9ca3af;line-height:1.6;">
                Une question sur les documents demandés&nbsp;? Contactez notre équipe support.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background:#f9fafb;padding:20px 40px;text-align:center;border-top:1px solid #eef2f7;">
              <p style="margin:0;font-size:12px;color:#9ca3af;">bo séjour · bosejour.ci</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
