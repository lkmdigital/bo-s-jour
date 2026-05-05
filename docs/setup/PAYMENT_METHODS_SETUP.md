# Configuration des méthodes de paiement

## Emplacement des images

Les images des méthodes de paiement doivent être placées dans le dossier suivant :

```
frontend/public/images/payment-methods/
```

## Images requises

Vous devez ajouter les images suivantes :

1. **wave-ci.png** - Logo de Wave CI
2. **visa-mastercard.png** - Logo de Visa/Mastercard
3. **orange-ci.png** - Logo d'Orange CI
4. **djamo.png** - Logo de Djamo

## Format recommandé

- Format : PNG avec fond transparent
- Taille : 200x100 pixels (ou ratio similaire)
- Résolution : 72-150 DPI

## Installation

1. Créez le dossier si nécessaire :
   ```bash
   mkdir -p frontend/public/images/payment-methods
   ```

2. Placez les images dans ce dossier avec les noms exacts mentionnés ci-dessus.

3. Exécutez les migrations et le seeder :
   ```bash
   cd backend
   php artisan migrate
   php artisan db:seed --class=PaymentMethodSeeder
   ```

## Configuration du taux de commission

Le taux de commission par défaut est de 10%. L'administrateur peut le modifier depuis la page de revenus admin (`/dashboard/admin/revenue`).

Le taux peut être configuré entre 0% et 100%.

## Notes

- Les méthodes de paiement sont automatiquement créées lors de l'exécution du seeder
- Vous pouvez activer/désactiver les méthodes depuis l'interface d'administration (à implémenter si nécessaire)
- Les images sont servies depuis le dossier public, donc elles sont accessibles directement via l'URL

