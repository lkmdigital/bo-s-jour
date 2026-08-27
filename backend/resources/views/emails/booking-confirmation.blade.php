<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Confirmation de réservation</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f6f8;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f6f8;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">

          {{-- Header --}}
          <tr>
            <td style="background:#000000;padding:32px 40px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:700;letter-spacing:-0.5px;">
                <span style="color:#FF0000;">bo</span> séjour
              </h1>
              <p style="margin:6px 0 0;color:rgba(255,255,255,0.75);font-size:13px;">bosejour.ci</p>
            </td>
          </tr>

          {{-- Titre --}}
          <tr>
            <td style="padding:32px 40px 0;text-align:center;">
              <p style="margin:0 0 6px;font-size:22px;font-weight:700;color:#111827;">Réservation confirmée ✓</p>
              <p style="margin:0;font-size:15px;color:#6b7280;">Bonjour <strong>{{ $user->name }}</strong>, voici le récapitulatif de votre séjour.</p>
            </td>
          </tr>

          {{-- Numéro de réservation --}}
          @if ($booking->booking_number)
          <tr>
            <td style="padding:24px 40px 0;text-align:center;">
              <p style="margin:0;font-size:13px;color:#6b7280;">
                N° de réservation : <strong style="color:#111827;">{{ $booking->booking_number }}</strong>
              </p>
            </td>
          </tr>
          @endif

          {{-- Code de confirmation --}}
          <tr>
            <td style="padding:24px 40px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <div style="background:#fef2f2;border:2px solid #FF0000;border-radius:12px;padding:20px 40px;display:inline-block;">
                      <p style="margin:0 0 4px;font-size:12px;color:#6b7280;letter-spacing:1px;text-transform:uppercase;text-align:center;">Code de confirmation</p>
                      <p style="margin:0;font-size:36px;font-weight:800;color:#FF0000;letter-spacing:8px;font-family:'Courier New',monospace;text-align:center;">{{ $booking->confirmation_code ?? '#'.$booking->id }}</p>
                      <p style="margin:6px 0 0;font-size:12px;color:#6b7280;text-align:center;">Présentez ce code à votre arrivée</p>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          {{-- Détails hébergement --}}
          <tr>
            <td style="padding:0 40px;">
              <div style="background:#f9fafb;border-radius:10px;padding:20px 24px;margin-bottom:16px;">
                <p style="margin:0 0 14px;font-size:13px;font-weight:700;color:#374151;text-transform:uppercase;letter-spacing:0.8px;">Hébergement</p>
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="padding:8px 0;border-bottom:1px solid #e5e7eb;">
                      <span style="font-size:13px;color:#6b7280;">Établissement</span>
                    </td>
                    <td style="padding:8px 0;border-bottom:1px solid #e5e7eb;text-align:right;">
                      <span style="font-size:14px;font-weight:600;color:#111827;">{{ $accommodation->name ?? '—' }}</span>
                    </td>
                  </tr>
                  @if($room)
                  <tr>
                    <td style="padding:8px 0;border-bottom:1px solid #e5e7eb;">
                      <span style="font-size:13px;color:#6b7280;">Chambre</span>
                    </td>
                    <td style="padding:8px 0;border-bottom:1px solid #e5e7eb;text-align:right;">
                      <span style="font-size:14px;font-weight:600;color:#111827;">{{ $room->name ?? $room->room_number ?? '—' }}</span>
                    </td>
                  </tr>
                  @endif
                  <tr>
                    <td style="padding:8px 0;">
                      <span style="font-size:13px;color:#6b7280;">Adresse</span>
                    </td>
                    <td style="padding:8px 0;text-align:right;">
                      <span style="font-size:14px;color:#111827;">{{ $accommodation->address ?? '' }}{{ $accommodation->city ? ', '.$accommodation->city : '' }}</span>
                    </td>
                  </tr>
                </table>
              </div>
            </td>
          </tr>

          {{-- Dates & voyageurs --}}
          <tr>
            <td style="padding:0 40px;">
              <div style="background:#f9fafb;border-radius:10px;padding:20px 24px;margin-bottom:16px;">
                <p style="margin:0 0 14px;font-size:13px;font-weight:700;color:#374151;text-transform:uppercase;letter-spacing:0.8px;">Séjour</p>
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="padding:8px 0;border-bottom:1px solid #e5e7eb;">
                      <span style="font-size:13px;color:#6b7280;">Arrivée</span>
                    </td>
                    <td style="padding:8px 0;border-bottom:1px solid #e5e7eb;text-align:right;">
                      <span style="font-size:14px;font-weight:600;color:#111827;">{{ \Carbon\Carbon::parse($booking->check_in)->translatedFormat('d F Y') }}</span>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:8px 0;border-bottom:1px solid #e5e7eb;">
                      <span style="font-size:13px;color:#6b7280;">Départ</span>
                    </td>
                    <td style="padding:8px 0;border-bottom:1px solid #e5e7eb;text-align:right;">
                      <span style="font-size:14px;font-weight:600;color:#111827;">{{ \Carbon\Carbon::parse($booking->check_out)->translatedFormat('d F Y') }}</span>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:8px 0;border-bottom:1px solid #e5e7eb;">
                      <span style="font-size:13px;color:#6b7280;">Durée</span>
                    </td>
                    <td style="padding:8px 0;border-bottom:1px solid #e5e7eb;text-align:right;">
                      <span style="font-size:14px;font-weight:600;color:#111827;">
                        {{ \Carbon\Carbon::parse($booking->check_in)->diffInDays(\Carbon\Carbon::parse($booking->check_out)) }} nuit(s)
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:8px 0;">
                      <span style="font-size:13px;color:#6b7280;">Voyageurs</span>
                    </td>
                    <td style="padding:8px 0;text-align:right;">
                      <span style="font-size:14px;font-weight:600;color:#111827;">{{ $booking->guests }} personne(s)</span>
                    </td>
                  </tr>
                </table>
              </div>
            </td>
          </tr>

          {{-- Total --}}
          <tr>
            <td style="padding:0 40px 24px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#000000;border-radius:10px;padding:18px 24px;">
                <tr>
                  <td style="padding:0;">
                    <span style="font-size:14px;color:rgba(255,255,255,0.85);">Montant total</span>
                  </td>
                  <td style="text-align:right;padding:0;">
                    <span style="font-size:22px;font-weight:800;color:#ffffff;">{{ number_format($booking->total_price, 0, ',', ' ') }} FCFA</span>
                  </td>
                </tr>
                @if(isset($booking->payment_status) && $booking->payment_status !== 'paid')
                <tr>
                  <td colspan="2" style="padding-top:8px;">
                    <span style="font-size:12px;color:rgba(255,255,255,0.75);">Paiement à finaliser pour confirmer définitivement votre réservation.</span>
                  </td>
                </tr>
                @endif
              </table>
            </td>
          </tr>

          {{-- Message --}}
          <tr>
            <td style="padding:0 40px 32px;">
              <p style="margin:0;font-size:14px;color:#6b7280;line-height:1.7;text-align:center;">
                Pour toute question, contactez-nous via <a href="https://bosejour.ci" style="color:#FF0000;text-decoration:none;">bosejour.ci</a>
                ou répondez directement à cet email.
              </p>
            </td>
          </tr>

          {{-- Footer --}}
          <tr>
            <td style="background:#f9fafb;padding:20px 40px;border-top:1px solid #e5e7eb;text-align:center;">
              <p style="margin:0;font-size:12px;color:#9ca3af;">
                © {{ date('Y') }} bo séjour · <a href="https://bosejour.ci" style="color:#FF0000;text-decoration:none;">bosejour.ci</a>
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
