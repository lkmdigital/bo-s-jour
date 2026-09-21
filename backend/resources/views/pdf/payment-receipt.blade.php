<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Reçu de paiement {{ $reference }}</title>
  <style>
    body { font-family: DejaVu Sans, sans-serif; font-size: 12px; color: #111827; margin: 0; }
    .head { background: #000; color: #fff; padding: 22px 30px; }
    .head h1 { margin: 0; font-size: 22px; }
    .head h1 span { color: #ff0000; }
    .head p { margin: 4px 0 0; font-size: 11px; color: #d1d5db; }
    .body { padding: 26px 30px; }
    h2 { font-size: 15px; margin: 0 0 4px; }
    .muted { color: #6b7280; }
    .box { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 12px 16px; margin: 14px 0; }
    table { width: 100%; border-collapse: collapse; }
    td { padding: 6px 0; vertical-align: top; }
    td.r { text-align: right; font-weight: bold; }
    .line td { border-bottom: 1px solid #e5e7eb; }
    .total td { border-top: 2px solid #111827; padding-top: 10px; font-size: 13px; }
    .green { color: #15803d; }
    .foot { margin-top: 26px; font-size: 10px; color: #6b7280; text-align: center; }
  </style>
</head>
<body>
  <div class="head">
    <h1><span>bo</span>séjour</h1>
    <p>Reçu de paiement · bosejour.ci</p>
  </div>
  <div class="body">
    <h2>Réservation {{ $reference }}</h2>
    <p class="muted" style="margin:0 0 4px;">Émis le {{ now()->translatedFormat('d F Y à H:i') }}</p>
    @if($booking->confirmation_code)
      <p style="margin:0;">Code boséjour (à présenter à l'arrivée) : <strong>{{ $booking->confirmation_code }}</strong></p>
    @endif

    <div class="box">
      <table>
        <tr class="line"><td class="muted">Établissement</td><td class="r">{{ $accommodation->name ?? '—' }}</td></tr>
        @if(!empty($accommodation->address) || !empty($accommodation->city))
        <tr class="line"><td class="muted">Adresse</td><td class="r">{{ trim(($accommodation->address ?? '') . ' ' . ($accommodation->city ?? '')) }}</td></tr>
        @endif
        @if($booking->room)
        <tr class="line"><td class="muted">Chambre</td><td class="r">{{ $booking->room->name }}@if($booking->assigned_room_number) — n° {{ $booking->assigned_room_number }}@endif</td></tr>
        @endif
        <tr class="line"><td class="muted">Arrivée</td><td class="r">{{ \Carbon\Carbon::parse($booking->check_in)->translatedFormat('d F Y') }}</td></tr>
        <tr class="line"><td class="muted">Départ</td><td class="r">{{ \Carbon\Carbon::parse($booking->check_out)->translatedFormat('d F Y') }}</td></tr>
        <tr><td class="muted">Voyageurs</td><td class="r">{{ $booking->guests }}</td></tr>
      </table>
    </div>

    <div class="box">
      <table>
        <tr class="line"><td class="muted">Client</td><td class="r">{{ $booking->user->name ?? '—' }}</td></tr>
        <tr><td class="muted">E-mail</td><td class="r">{{ $booking->user->email ?? '—' }}</td></tr>
      </table>
    </div>

    <h2 style="margin-top:18px;">Paiements effectués</h2>
    <table>
      @forelse($payments as $i => $p)
      <tr class="line">
        <td>
          Paiement {{ $i + 1 }} — {{ $p->purpose === 'balance' ? 'Solde' : ($booking->payment_type === 'full' ? 'Paiement intégral' : 'Acompte / garantie') }}<br>
          <span class="muted">{{ $p->payment_method }}@if($p->paid_at) · {{ $p->paid_at->format('d/m/Y H:i') }}@endif @if($p->transaction_id) · {{ $p->transaction_id }}@endif</span>
        </td>
        <td class="r green">{{ number_format((float) $p->amount, 0, ',', ' ') }} FCFA</td>
      </tr>
      @empty
      <tr><td class="muted">Aucun paiement enregistré.</td><td></td></tr>
      @endforelse
    </table>

    <table style="margin-top:14px;">
      <tr><td class="muted">Montant total de la réservation</td><td class="r">{{ number_format((float) $booking->total_price, 0, ',', ' ') }} FCFA</td></tr>
      @if($discount > 0)
      <tr><td class="muted">Réduction paiement en ligne</td><td class="r green">− {{ number_format($discount, 0, ',', ' ') }} FCFA</td></tr>
      @endif
      <tr class="total"><td>Montant total payé</td><td class="r green">{{ number_format($paid, 0, ',', ' ') }} FCFA</td></tr>
      <tr><td class="muted">Solde restant{{ $remaining > 0 ? ' (à régler à l\'établissement)' : '' }}</td><td class="r">{{ number_format($remaining, 0, ',', ' ') }} FCFA</td></tr>
    </table>

    <p class="foot">Ce document fait foi de paiement.<br>boséjour — Votre séjour commence ici...</p>
  </div>
</body>
</html>
