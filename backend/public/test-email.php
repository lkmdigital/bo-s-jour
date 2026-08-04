<?php
/**
 * Script de test d'envoi d'email
 * Accès: https://apimonbeaupays.loyerpay.ci/test-email.php
 * 
 * ⚠️ SUPPRIMEZ CE FICHIER APRÈS LES TESTS pour des raisons de sécurité
 */

require __DIR__.'/../vendor/autoload.php';

$app = require_once __DIR__.'/../bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Config;

// Email de test (modifiez avec votre email)
$testEmail = 'votre-email@test.com';

echo "<h1>Test d'envoi d'email - Bosejour</h1>";
echo "<pre>";

// Afficher la configuration actuelle (sans le mot de passe)
echo "Configuration actuelle:\n";
echo "MAIL_MAILER: " . Config::get('mail.mailers.smtp.transport') . "\n";
echo "MAIL_HOST: " . Config::get('mail.mailers.smtp.host') . "\n";
echo "MAIL_PORT: " . Config::get('mail.mailers.smtp.port') . "\n";
echo "MAIL_USERNAME: " . Config::get('mail.mailers.smtp.username') . "\n";
echo "MAIL_FROM_ADDRESS: " . Config::get('mail.from.address') . "\n";
echo "MAIL_FROM_NAME: " . Config::get('mail.from.name') . "\n";
echo "\n";

// Test d'envoi
try {
    echo "Envoi de l'email de test à: $testEmail\n";
    echo "...\n";
    
    Mail::raw('Ceci est un test d\'envoi d\'email depuis Bosejour. Si vous recevez ce message, la configuration email fonctionne correctement.', function ($message) use ($testEmail) {
        $message->to($testEmail)
                ->subject('Test Email - Bosejour');
    });
    
    echo "\n✅ Email envoyé avec succès !\n";
    echo "Vérifiez votre boîte de réception (et les spams).\n";
    
} catch (\Exception $e) {
    echo "\n❌ Erreur lors de l'envoi:\n";
    echo "Message: " . $e->getMessage() . "\n";
    echo "Fichier: " . $e->getFile() . "\n";
    echo "Ligne: " . $e->getLine() . "\n";
    
    echo "\n🔍 Vérifications:\n";
    echo "1. Vérifiez les credentials dans .env\n";
    echo "2. Vérifiez que le port SMTP est ouvert\n";
    echo "3. Vérifiez les logs: storage/logs/laravel.log\n";
}

echo "</pre>";
echo "<p><strong>⚠️ Important:</strong> Supprimez ce fichier après les tests pour des raisons de sécurité.</p>";



