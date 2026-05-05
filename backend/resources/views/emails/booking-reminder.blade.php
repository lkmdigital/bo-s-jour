<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Rappel de paiement</title>
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
        .warning {
            background: #fff3cd;
            color: #856404;
            padding: 15px;
            border-radius: 5px;
            margin-bottom: 20px;
            border-left: 4px solid #ffc107;
        }
        .content {
            background: #f9f9f9;
            padding: 20px;
            border-radius: 5px;
            margin-bottom: 20px;
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
        .amount-due {
            font-size: 24px;
            font-weight: bold;
            color: #C1121F;
            text-align: center;
            margin: 20px 0;
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

    <div class="warning">
        <strong>⚠️ Rappel important</strong><br>
        Votre réservation n'est pas encore soldée. Veuillez finaliser le paiement.
    </div>

    <h2>Rappel de paiement</h2>
    
    <p>Bonjour {{ $user->name }},</p>
    
    <p>Nous vous rappelons que votre réservation #{{ $booking->id }} n'est pas encore soldée.</p>

    <div class="content">
        <div class="info-row">
            <span class="info-label">Hébergement:</span>
            <span>{{ $accommodation->name }}</span>
        </div>
        <div class="info-row">
            <span class="info-label">Date d'arrivée:</span>
            <span>{{ \Carbon\Carbon::parse($booking->check_in)->format('d/m/Y') }}</span>
        </div>
        <div class="info-row">
            <span class="info-label">Date de départ:</span>
            <span>{{ \Carbon\Carbon::parse($booking->check_out)->format('d/m/Y') }}</span>
        </div>
    </div>

    <div class="amount-due">
        Montant dû : {{ number_format($amountDue, 0, ',', ' ') }} FCFA
    </div>

    <p>Pour finaliser votre réservation, veuillez effectuer le paiement dès que possible.</p>

    <div class="footer">
        <p><strong>Bosejour</strong> - <span style="font-family: 'Brush Script MT', cursive; font-style: italic;">Votre séjour commence ici...</span></p>
        <p>Plateforme de réservation d'hébergements en Côte d'Ivoire</p>
        <p>© {{ date('Y') }} Bosejour. Tous droits réservés.</p>
    </div>
</body>
</html>



