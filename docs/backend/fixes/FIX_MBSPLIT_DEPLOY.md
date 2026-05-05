# Erreur : Call to undefined function mb_split()

## Cause

L’erreur apparaît lors de `php artisan migrate` (ou d’autres commandes Artisan) sur le serveur parce que l’extension PHP **mbstring** n’est pas installée ou pas activée. Laravel utilise `mb_split()` (via `Illuminate\Support\Str`) pour le traitement des chaînes.

## Solution : installer mbstring sur le serveur

Connectez-vous en SSH au serveur puis exécutez :

### Ubuntu / Debian

```bash
# Vérifier la version de PHP utilisée (ex: 8.2)
php -v

# Installer l’extension mbstring pour cette version (adapter 8.2 si besoin)
sudo apt update
sudo apt install -y php8.2-mbstring

# Si vous utilisez PHP 8.1 ou 8.3, remplacez par :
# sudo apt install -y php8.1-mbstring
# ou
# sudo apt install -y php8.3-mbstring

# Redémarrer le serveur web pour prendre en compte l’extension
sudo systemctl restart php8.2-fpm
# ou, si vous utilisez Apache avec mod_php :
sudo systemctl restart apache2
```

### Vérification

```bash
php -m | grep mbstring
```

Vous devez voir `mbstring` dans la liste.

Puis relancer les migrations :

```bash
cd /var/www/monbeaupays-backend
php artisan migrate --force
```

## En une seule commande (depuis votre machine)

Si vous déployez avec `ssh root@72.62.31.145` :

```bash
ssh root@72.62.31.145 'apt update && apt install -y php8.2-mbstring && systemctl restart php8.2-fpm 2>/dev/null || systemctl restart apache2 2>/dev/null; cd /var/www/monbeaupays-backend && php artisan migrate --force'
```

Adaptez `php8.2` et `php8.2-fpm` si votre serveur utilise une autre version de PHP (`php -v` sur le serveur).
