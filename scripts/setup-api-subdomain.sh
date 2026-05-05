#!/bin/bash
# Script à exécuter SUR LE SERVEUR pour configurer api.bosejour.ci
# Usage: ssh root@72.62.31.145 'bash -s' < scripts/setup-api-subdomain.sh
# Ou: scp scripts/setup-api-subdomain.sh root@72.62.31.145:/tmp/ && ssh root@72.62.31.145 'bash /tmp/setup-api-subdomain.sh'

set -e

# Vérifier que le fichier nginx est présent (ou le créer)
NGINX_CONF="/etc/nginx/sites-available/bosejour-api"

if [ ! -f "$NGINX_CONF" ]; then
    echo "Création de la config Nginx..."
    cat > "$NGINX_CONF" << 'NGINX_EOF'
server {
    listen 80;
    server_name api.bosejour.ci;

    root /var/www/monbeaupays-backend/public;
    index index.php index.html;

    client_max_body_size 20M;

    access_log /var/log/nginx/bosejour-api-access.log;
    error_log /var/log/nginx/bosejour-api-error.log;

    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    location ~ \.php$ {
        fastcgi_pass unix:/var/run/php/php8.2-fpm.sock;
        fastcgi_param SCRIPT_FILENAME $realpath_root$fastcgi_script_name;
        include fastcgi_params;
        fastcgi_hide_header X-Powered-By;
    }

    location ~ /\.(?!well-known).* {
        deny all;
    }

    location /storage {
        alias /var/www/monbeaupays-backend/storage/app/public;
    }
}
NGINX_EOF
fi

# Activer le site
ln -sf /etc/nginx/sites-available/bosejour-api /etc/nginx/sites-enabled/

# Tester et recharger Nginx
nginx -t && systemctl reload nginx

echo "✅ Nginx configuré pour api.bosejour.ci"
echo ""
echo "Prochaine étape (SSL) :"
echo "  sudo certbot --nginx -d api.bosejour.ci"
echo ""
echo "Test : curl http://api.bosejour.ci/api/accommodations"
