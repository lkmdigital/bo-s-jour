<?php
/**
 * Script de nettoyage de cache Laravel
 * À uploader à la racine du backend et exécuter via le navigateur
 * URL: https://apimonbeaupays.loyerpay.ci/clear-cache.php
 * 
 * ⚠️ SUPPRIMER CE FICHIER APRÈS UTILISATION !
 */

// Charger Laravel
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';

// Clear config cache
Artisan::call('config:clear');
echo "✅ Config cache cleared<br>";

// Clear application cache
Artisan::call('cache:clear');
echo "✅ Application cache cleared<br>";

// Clear route cache
Artisan::call('route:clear');
echo "✅ Route cache cleared<br>";

// Clear view cache
Artisan::call('view:clear');
echo "✅ View cache cleared<br>";

echo "<br><strong>🎉 Cache nettoyé avec succès !</strong><br>";
echo "<br><strong>⚠️ N'oubliez pas de SUPPRIMER ce fichier maintenant !</strong>";
