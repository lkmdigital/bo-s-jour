<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Confirmation de paiement</title>
    <style>
        body {
            font-family: 'DM Sans', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
        }
        .header {
            text-align: center;
            border-bottom: 3px solid #C1121F;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        .header h1 {
            color: #C1121F;
            margin: 0;
        }
        .slogan {
            font-family: 'Brush Script MT', cursive;
            font-style: italic;
            color: #666;
            font-size: 18px;
        }
        .content {
            background: #f9f9f9;
            padding: 20px;
            border-radius: 5px;
            margin-bottom: 20px;
        }
        .success {
            background: #d4edda;
            color: #155724;
            padding: 15px;
            border-radius: 5px;
            margin-bottom: 20px;
            text-align: center;
        }
        .info-row {
            display: flex;
            justify-content: space-between;
            padding: 10px 0;
            border-bottom: 1px solid #ddd;
        }
        .info-label {
            font-weight: bold;
            color: #666;
        }
        .footer {
            text-align: center;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #ddd;
            color: #666;
            font-size: 12px;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>Bosejour</h1>
        <p class="slogan">Votre séjour commence ici...</p>
    </div>

    <div class="success">
        <strong>✅ Paiement confirmé avec succès !</strong>
    </div>

    <h2>Confirmation de paiement</h2>
    
    <p>Bonjour {{ $booking->user->name }},</p>
    
    <p>Nous avons bien reçu votre paiement. Votre réservation est maintenant confirmée.</p>

    <div class="content">
        <div class="info-row">
            <span class="info-label">Numéro de réservation:</span>
            <span>#{{ $booking->id }}</span>
        </div>
        <div class="info-row">
            <span class="info-label">Montant payé:</span>
            <span><strong>{{ number_format($payment->amount, 0, ',', ' ') }} FCFA</strong></span>
        </div>
        <div class="info-row">
            <span class="info-label">Méthode de paiement:</span>
            <span>{{ $payment->payment_method->name ?? 'Non spécifiée' }}</span>
        </div>
        @if($payment->transaction_id)
        <div class="info-row">
            <span class="info-label">Transaction ID:</span>
            <span>{{ $payment->transaction_id }}</span>
        </div>
        @endif
        <div class="info-row">
            <span class="info-label">Date du paiement:</span>
            <span>{{ \Carbon\Carbon::parse($payment->created_at)->format('d/m/Y à H:i') }}</span>
        </div>
    </div>

    <p>Merci pour votre confiance. Nous vous souhaitons un excellent séjour !</p>

    <div class="footer">
        <p><strong>Bosejour</strong> - <span style="font-family: 'Brush Script MT', cursive; font-style: italic;">Votre séjour commence ici...</span></p>
        <p>Plateforme de réservation d'hébergements en Côte d'Ivoire</p>
        <p>© {{ date('Y') }} Bosejour. Tous droits réservés.</p>
    </div>
</body>
</html>



