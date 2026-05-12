<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Réinitialisation du mot de passe</title>
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
                Nous avons reçu une demande de réinitialisation du mot de passe associé à votre compte BosEjour.
                Cliquez sur le bouton ci-dessous pour créer un nouveau mot de passe.
              </p>
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                <tr>
                  <td align="center">
                    <a href="{{ $resetUrl }}"
                       style="display:inline-block;background:linear-gradient(135deg,#0f766e,#0d9488);color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;padding:14px 36px;border-radius:8px;letter-spacing:0.3px;">
                      Réinitialiser mon mot de passe
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 12px;font-size:13px;color:#6b7280;text-align:center;">
                Ce lien expire dans <strong>60 minutes</strong>.
              </p>
              <p style="margin:0 0 16px;font-size:13px;color:#9ca3af;text-align:center;">
                Si vous n'avez pas demandé de réinitialisation, ignorez cet email — votre mot de passe reste inchangé.
              </p>
              <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:14px;margin-top:8px;">
                <p style="margin:0 0 6px;font-size:12px;color:#6b7280;">Si le bouton ne fonctionne pas, copiez ce lien :</p>
                <p style="margin:0;font-size:11px;color:#0d9488;word-break:break-all;">{{ $resetUrl }}</p>
              </div>
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
