<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Code de vérification</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f6f8;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f6f8;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="580" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
          <tr>
            <td style="background:linear-gradient(135deg,#0f766e,#0d9488);padding:32px 40px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:700;letter-spacing:-0.5px;">BosEjour</h1>
              <p style="margin:6px 0 0;color:rgba(255,255,255,0.85);font-size:13px;">bosejour.ci</p>
            </td>
          </tr>
          <tr>
            <td style="padding:40px 40px 32px;">
              <p style="margin:0 0 8px;font-size:15px;color:#374151;">Bonjour <strong>{{ $userName }}</strong>,</p>
              <p style="margin:0 0 28px;font-size:15px;color:#374151;line-height:1.6;">
                Voici votre code de vérification pour finaliser votre connexion à BosEjour.
              </p>
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                <tr>
                  <td align="center">
                    <div style="display:inline-block;background:#f0fdf4;border:2px solid #0d9488;border-radius:12px;padding:20px 48px;">
                      <p style="margin:0 0 4px;font-size:12px;color:#6b7280;letter-spacing:1px;text-transform:uppercase;">Votre code</p>
                      <p style="margin:0;font-size:42px;font-weight:800;color:#0f766e;letter-spacing:10px;font-family:'Courier New',monospace;">{{ $code }}</p>
                    </div>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 16px;font-size:14px;color:#6b7280;text-align:center;">
                Ce code expire dans <strong>10 minutes</strong>.
              </p>
              <p style="margin:0;font-size:13px;color:#9ca3af;text-align:center;">
                Si vous n'avez pas tenté de vous connecter, ignorez cet email.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background:#f9fafb;padding:20px 40px;border-top:1px solid #e5e7eb;text-align:center;">
              <p style="margin:0;font-size:12px;color:#9ca3af;">
                © 2026 BosEjour · <a href="https://bosejour.ci" style="color:#0d9488;text-decoration:none;">bosejour.ci</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
