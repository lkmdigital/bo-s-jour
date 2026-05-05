# Installation SSL avec Let's Encrypt

Guide pour installer un certificat SSL sur le domaine avec Let's Encrypt.

## 📋 Prérequis

1. Le domaine doit pointer vers le serveur (DNS configuré)
2. Le port 80 doit être ouvert (pour la validation)
3. Nginx doit être installé et configuré

## 🚀 Installation Rapide

### Option 1 : Script Automatique

```bash
# Depuis votre machine locale
cat /Users/lkmdigital/monbeaupays.com/frontend/install-ssl.sh | ssh root@72.62.31.145 'bash -s' bosejour.ci
```

### Option 2 : Commandes Manuelles

```bash
# Se connecter au serveur
ssh root@72.62.31.145

# 1. Mise à jour et installation de Certbot
apt update
apt install certbot python3-certbot-nginx -y

# 2. Obtenir le certificat SSL
certbot --nginx -d bosejour.ci --non-interactive --agree-tos --email admin@bosejour.ci

# 3. Vérifier le renouvellement automatique
certbot renew --dry-run
```

## ⚙️ Configuration Nginx

Certbot modifie automatiquement la configuration Nginx pour :
- Ajouter la configuration HTTPS
- Configurer la redirection HTTP vers HTTPS
- Configurer les certificats SSL

### Configuration Générée

Après l'installation, votre configuration Nginx ressemblera à :

```nginx
# Redirection HTTP vers HTTPS
server {
    listen 80;
    server_name bosejour.ci;
    return 301 https://$server_name$request_uri;
}

# Configuration HTTPS
server {
    listen 443 ssl http2;
    server_name bosejour.ci;

    ssl_certificate /etc/letsencrypt/live/bosejour.ci/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/bosejour.ci/privkey.pem;

    # Configuration SSL recommandée
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    client_max_body_size 20M;
    access_log /var/log/nginx/monbeaupays-frontend-access.log;
    error_log /var/log/nginx/monbeaupays-frontend-error.log;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    location /_next/static {
        proxy_pass http://localhost:3000;
        proxy_cache_valid 200 60m;
        add_header Cache-Control "public, immutable";
    }
}
```

## ✅ Vérifications

### 1. Vérifier le certificat

```bash
# Vérifier que le certificat existe
ls -la /etc/letsencrypt/live/bosejour.ci/

# Vérifier les détails du certificat
openssl x509 -in /etc/letsencrypt/live/bosejour.ci/fullchain.pem -text -noout | grep -A 2 "Validity"
```

### 2. Tester HTTPS

```bash
# Depuis le serveur
curl https://bosejour.ci

# Depuis votre machine locale
curl -I https://bosejour.ci
```

### 3. Vérifier la redirection HTTP vers HTTPS

```bash
curl -I http://bosejour.ci
# Devrait retourner: HTTP/1.1 301 Moved Permanently
```

### 4. Tester dans le navigateur

Ouvrez `https://bosejour.ci` dans votre navigateur et vérifiez :
- Le cadenas vert (certificat valide)
- Pas d'avertissement de sécurité

## 🔄 Renouvellement Automatique

Let's Encrypt renouvelle automatiquement les certificats avant expiration (tous les 90 jours).

### Vérifier le renouvellement

```bash
certbot renew --dry-run
```

### Vérifier le timer systemd

```bash
systemctl status certbot.timer
```

## 🐛 Dépannage

### Erreur : "Failed to obtain certificate"

**Causes possibles :**
1. Le domaine ne pointe pas vers ce serveur
2. Le port 80 est bloqué
3. Nginx n'est pas configuré correctement

**Solutions :**
```bash
# Vérifier le DNS
nslookup bosejour.ci

# Vérifier que le port 80 est ouvert
netstat -tuln | grep 80

# Vérifier la configuration Nginx
nginx -t
```

### Erreur : "Domain does not point to this server"

Vérifiez que le DNS pointe vers `72.62.31.145` :
```bash
nslookup bosejour.ci
```

### Le certificat n'est pas renouvelé automatiquement

```bash
# Vérifier le timer
systemctl status certbot.timer

# Activer le timer
systemctl enable certbot.timer
systemctl start certbot.timer
```

## 📝 Commandes Utiles

```bash
# Voir les certificats installés
certbot certificates

# Renouveler manuellement un certificat
certbot renew

# Révoquer un certificat
certbot revoke --cert-path /etc/letsencrypt/live/bosejour.ci/cert.pem

# Supprimer un certificat
certbot delete --cert-name bosejour.ci
```

## 🔐 Sécurité SSL

Après l'installation, vous pouvez améliorer la sécurité SSL en ajoutant ces directives dans la configuration Nginx :

```nginx
# HSTS (HTTP Strict Transport Security)
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;

# Sécurité supplémentaire
ssl_session_cache shared:SSL:10m;
ssl_session_timeout 10m;
```

## ✅ Checklist

- [ ] Certbot installé
- [ ] DNS configuré (domaine pointe vers 72.62.31.145)
- [ ] Port 80 ouvert
- [ ] Nginx configuré pour le domaine
- [ ] Certificat SSL obtenu
- [ ] HTTPS fonctionne (https://bosejour.ci)
- [ ] Redirection HTTP → HTTPS fonctionne
- [ ] Renouvellement automatique vérifié

---

**Note :** Si vous avez plusieurs domaines (www et non-www), vous pouvez les inclure :
```bash
certbot --nginx -d bosejour.ci -d www.bosejour.ci
```

