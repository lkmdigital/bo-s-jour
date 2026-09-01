<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Paiements en attente à vérifier</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f6f8;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f6f8;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="640" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
          <tr>
            <td style="background:#000000;padding:32px 40px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:700;letter-spacing:-0.5px;">
                <span style="color:#FF0000;">bo</span> séjour
              </h1>
              <p style="margin:6px 0 0;color:rgba(255,255,255,0.75);font-size:13px;">Alerte admin — paiements</p>
            </td>
          </tr>
          <tr>
            <td style="padding:40px 40px 32px;">
              <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.6;">
                <strong>{{ $payments->count() }} paiement(s)</strong> sont restés en statut
                <strong>« pending »</strong> depuis plus de {{ $thresholdHours }}h. Le webhook Malia Pay
                n'a peut-être jamais confirmé ces transactions — <strong>vérifiez chaque référence
                dans le dashboard marchand Malia Pay</strong> avant toute action : si l'argent a bien
                été encaissé, confirmez manuellement depuis le back-office ; sinon, il s'agit
                probablement d'un abandon de paiement normal, à ignorer.
              </p>

              <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;font-size:13px;border-collapse:collapse;">
                <thead>
                  <tr style="background:#f9fafb;">
                    <th align="left" style="padding:10px 12px;color:#6b7280;font-weight:600;border-bottom:1px solid #eef2f7;">Référence</th>
                    <th align="left" style="padding:10px 12px;color:#6b7280;font-weight:600;border-bottom:1px solid #eef2f7;">Réservation</th>
                    <th align="right" style="padding:10px 12px;color:#6b7280;font-weight:600;border-bottom:1px solid #eef2f7;">Montant</th>
                    <th align="left" style="padding:10px 12px;color:#6b7280;font-weight:600;border-bottom:1px solid #eef2f7;">Depuis</th>
                  </tr>
                </thead>
                <tbody>
                  @foreach ($payments as $payment)
                    <tr>
                      <td style="padding:10px 12px;color:#374151;border-bottom:1px solid #f3f4f6;">{{ $payment->payment_reference }}</td>
                      <td style="padding:10px 12px;color:#374151;border-bottom:1px solid #f3f4f6;">
                        #{{ $payment->booking->id ?? '?' }} — {{ $payment->booking->accommodation->name ?? 'N/A' }}
                      </td>
                      <td align="right" style="padding:10px 12px;color:#374151;border-bottom:1px solid #f3f4f6;">{{ number_format($payment->amount, 0, ',', ' ') }} FCFA</td>
                      <td style="padding:10px 12px;color:#374151;border-bottom:1px solid #f3f4f6;">{{ $payment->created_at->diffForHumans() }}</td>
                    </tr>
                  @endforeach
                </tbody>
              </table>

              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:12px;">
                <tr>
                  <td align="center">
                    <a href="{{ $dashboardUrl }}"
                       style="display:inline-block;background:#FF0000;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;padding:14px 36px;border-radius:9999px;letter-spacing:0.3px;">
                      Ouvrir les transactions
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0;font-size:12px;color:#9ca3af;line-height:1.6;">
                Ce message est envoyé automatiquement chaque jour tant que des paiements restent
                bloqués au-delà du seuil. Il ne confirme rien de lui-même.
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
