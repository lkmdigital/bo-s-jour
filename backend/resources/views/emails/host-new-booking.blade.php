<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Nouvelle réservation</title>
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
        .success {
            background: #d4edda;
            color: #155724;
            padding: 15px;
            border-radius: 5px;
            margin-bottom: 20px;
            text-align: center;
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

    <div class="success">
        <strong>🎉 Nouvelle réservation !</strong>
    </div>

    <h2>Nouvelle réservation reçue</h2>
    
    <p>Bonjour,</p>
    
    <p>Vous avez reçu une nouvelle réservation pour votre hébergement <strong>{{ $accommodation->name }}</strong>.</p>

    <div class="content">
        <div class="info-row">
            <span class="info-label">Numéro de réservation:</span>
            <span>#{{ $booking->id }}</span>
        </div>
        <div class="info-row">
            <span class="info-label">Client:</span>
            <span>{{ $guest->name }}</span>
        </div>
        <div class="info-row">
            <span class="info-label">Email du client:</span>
            <span>{{ $guest->email }}</span>
        </div>
        <div class="info-row">
            <span class="info-label">Téléphone:</span>
            <span>{{ $guest->phone ?? 'Non renseigné' }}</span>
        </div>
        <div class="info-row">
            <span class="info-label">Date d'arrivée:</span>
            <span>{{ \Carbon\Carbon::parse($booking->check_in)->format('d/m/Y') }}</span>
        </div>
        <div class="info-row">
            <span class="info-label">Date de départ:</span>
            <span>{{ \Carbon\Carbon::parse($booking->check_out)->format('d/m/Y') }}</span>
        </div>
        <div class="info-row">
            <span class="info-label">Nombre de voyageurs:</span>
            <span>{{ $booking->guests }}</span>
        </div>
        <div class="info-row">
            <span class="info-label">Prix total:</span>
            <span><strong>{{ number_format($booking->total_price, 0, ',', ' ') }} FCFA</strong></span>
        </div>
        @if($booking->special_requests)
        <div class="info-row">
            <span class="info-label">Demandes spéciales:</span>
            <span>{{ $booking->special_requests }}</span>
        </div>
        @endif
    </div>

    <p>Connectez-vous à votre espace hôte pour gérer cette réservation.</p>

    <div class="footer">
        <p><strong>Bosejour</strong> - <span style="font-family: 'Brush Script MT', cursive; font-style: italic;">Votre séjour commence ici...</span></p>
        <p>Plateforme de réservation d'hébergements en Côte d'Ivoire</p>
        <p>© {{ date('Y') }} Bosejour. Tous droits réservés.</p>
    </div>
</body>
</html>



