<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Réservation acceptée</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f6f8;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f6f8;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">

          <tr>
            <td style="background:#000000;padding:32px 40px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:700;letter-spacing:-0.5px;">
                <span style="color:#FF0000;">bo</span> séjour
              </h1>
              <p style="margin:6px 0 0;color:rgba(255,255,255,0.75);font-size:13px;">bosejour.ci</p>
            </td>
          </tr>

          <tr>
            <td style="padding:32px 40px 0;text-align:center;">
              <p style="margin:0 0 6px;font-size:22px;font-weight:700;color:#111827;">Votre demande est acceptée !</p>
              <p style="margin:0;font-size:15px;color:#6b7280;">
                <strong>{{ $accommodation->name ?? "L'établissement" }}</strong> a confirmé la disponibilité pour vos dates.
                Il ne reste plus qu'à régler le paiement pour finaliser votre réservation.
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding:24px 40px 0;">
              <div style="background:#f9fafb;border-radius:10px;padding:20px 24px;margin-bottom:16px;">
                <p style="margin:0 0 14px;font-size:13px;font-weight:700;color:#374151;text-transform:uppercase;letter-spacing:0.8px;">Séjour</p>
                <table width="100%" cellpadding="0" cellspacing="0">
                  @if($room)
                  <tr>
                    <td style="padding:8px 0;border-bottom:1px solid #e5e7eb;"><span style="font-size:13px;color:#6b7280;">Chambre</span></td>
                    <td style="padding:8px 0;border-bottom:1px solid #e5e7eb;text-align:right;"><span style="font-size:14px;font-weight:600;color:#111827;">{{ $room->name ?? $room->room_number ?? '—' }}</span></td>
                  </tr>
                  @endif
                  <tr>
                    <td style="padding:8px 0;border-bottom:1px solid #e5e7eb;"><span style="font-size:13px;color:#6b7280;">Arrivée</span></td>
                    <td style="padding:8px 0;border-bottom:1px solid #e5e7eb;text-align:right;"><span style="font-size:14px;font-weight:600;color:#111827;">{{ \Carbon\Carbon::parse($booking->check_in)->translatedFormat('d F Y') }}</span></td>
                  </tr>
                  <tr>
                    <td style="padding:8px 0;"><span style="font-size:13px;color:#6b7280;">Départ</span></td>
                    <td style="padding:8px 0;text-align:right;"><span style="font-size:14px;font-weight:600;color:#111827;">{{ \Carbon\Carbon::parse($booking->check_out)->translatedFormat('d F Y') }}</span></td>
                  </tr>
                </table>
              </div>
            </td>
          </tr>

          <tr>
            <td style="padding:0 40px 24px;text-align:center;">
              <p style="margin:0;font-size:13px;color:#6b7280;">
                Merci de finaliser votre paiement avant le
                <strong style="color:#111827;">{{ optional($booking->expires_at)->translatedFormat('d F Y à H:i') }}</strong>
                — passé ce délai, votre demande sera automatiquement annulée et la chambre libérée.
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding:0 40px 32px;text-align:center;">
              <a href="{{ $paymentUrl }}" style="display:inline-block;background:#FF0000;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;padding:14px 36px;border-radius:9999px;">
                Payer maintenant
              </a>
            </td>
          </tr>

          <tr>
            <td style="background:#f9fafb;padding:20px 40px;border-top:1px solid #e5e7eb;text-align:center;">
              <p style="margin:0;font-size:12px;color:#9ca3af;">
                © {{ date('Y') }} BoSéjour · <a href="https://bosejour.ci" style="color:#FF0000;text-decoration:none;">bosejour.ci</a>
                · Plateforme de réservation d'hébergements en Côte d'Ivoire
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
