<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Réservation annulée</title>
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
        .alert {
            background: #f8d7da;
            color: #721c24;
            padding: 15px;
            border-radius: 5px;
            margin-bottom: 20px;
            border-left: 4px solid #dc3545;
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

    <div class="alert">
        <strong>Réservation annulée</strong><br>
        Votre réservation a été annulée : {{ $reason }}
    </div>

    <h2>Réservation annulée</h2>
    
    <p>Bonjour {{ $user->name }},</p>
    
    <p>Nous vous informons que votre réservation #{{ $booking->id }} a été annulée.</p>

    <div class="content">
        <div class="info-row">
            <span class="info-label">Numéro de réservation:</span>
            <span>#{{ $booking->id }}</span>
        </div>
        <div class="info-row">
            <span class="info-label">Hébergement:</span>
            <span>{{ $accommodation->name }}</span>
        </div>
        <div class="info-row">
            <span class="info-label">Date d'arrivée prévue:</span>
            <span>{{ \Carbon\Carbon::parse($booking->check_in)->format('d/m/Y') }}</span>
        </div>
        <div class="info-row">
            <span class="info-label">Raison:</span>
            <span>{{ $reason }}</span>
        </div>
    </div>

    <p>Pour toute question ou pour effectuer une nouvelle réservation, n'hésitez pas à nous contacter.</p>

    <div class="footer">
        <p><strong>Bosejour</strong> - <span style="font-family: 'Brush Script MT', cursive; font-style: italic;">Votre séjour commence ici...</span></p>
        <p>Plateforme de réservation d'hébergements en Côte d'Ivoire</p>
        <p>© {{ date('Y') }} Bosejour. Tous droits réservés.</p>
    </div>
</body>
</html>



