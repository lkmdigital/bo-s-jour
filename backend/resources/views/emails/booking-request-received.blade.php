<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Demande de réservation enregistrée</title>
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
              <p style="margin:0;font-size:22px;font-weight:700;color:#111827;">Votre demande de réservation a bien été enregistrée !</p>
            </td>
          </tr>

          <tr>
            <td style="padding:20px 40px 0;font-size:15px;line-height:1.6;color:#374151;">
              <p style="margin:0 0 14px;">Merci d’avoir choisi <strong>boséjour</strong>.</p>
              <p style="margin:0 0 14px;">Votre demande a été transmise à l’établissement pour confirmation de disponibilité.</p>
              <p style="margin:0 0 14px;">Dès validation, vous recevrez votre confirmation de disponibilité ainsi qu’un lien de paiement sécurisé pour finaliser votre réservation.</p>
              <p style="margin:0;">Encore quelques instants… votre séjour prend déjà forme.</p>
            </td>
          </tr>

          <tr>
            <td style="padding:24px 40px 0;">
              <div style="background:#f9fafb;border-radius:10px;padding:20px 24px;">
                <p style="margin:0 0 14px;font-size:13px;font-weight:700;color:#374151;text-transform:uppercase;letter-spacing:0.8px;">Votre demande</p>
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="padding:8px 0;border-bottom:1px solid #e5e7eb;"><span style="font-size:13px;color:#6b7280;">Établissement</span></td>
                    <td style="padding:8px 0;border-bottom:1px solid #e5e7eb;text-align:right;"><span style="font-size:14px;font-weight:600;color:#111827;">{{ $accommodation->name ?? '—' }}</span></td>
                  </tr>
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
            <td style="padding:28px 40px 32px;text-align:center;">
              <p style="margin:0;font-size:14px;font-weight:600;color:#111827;"><span style="color:#FF0000;">bo</span>séjour — Votre séjour commence ici...</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
