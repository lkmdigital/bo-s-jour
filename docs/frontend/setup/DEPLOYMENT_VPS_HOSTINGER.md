# Guide de Déploiement VPS Hostinger - Next.js

Ce guide vous accompagne étape par étape pour déployer votre application Next.js sur un VPS Hostinger.

## 📋 Prérequis

- VPS Hostinger avec accès SSH
- Accès root ou utilisateur avec sudo
- Informations de connexion SSH (IP, utilisateur, mot de passe ou clé SSH)
- Votre projet Next.js prêt pour la production

---

## 🚀 ÉTAPE 1 : Connexion au Serveur VPS

### 1.1 Connexion SSH

```bash
# IP VPS : 72.62.16.236
# Remplacez UTILISATEUR par votre utilisateur (par défaut 'root' sur Hostinger)
ssh UTILISATEUR@72.62.16.236

# Si vous utilisez une clé SSH :
ssh -i /chemin/vers/votre/cle.pem UTILISATEUR@72.62.16.236
```

### 1.2 Mise à jour du système

```bash
# Pour Ubuntu/Debian
sudo apt update && sudo apt upgrade -y

# Pour CentOS/RHEL
sudo yum update -y
```

---

## 🔧 ÉTAPE 2 : Installation des Dépendances

### 2.1 Installation de Node.js (version 20 LTS recommandée)

```bash
# Méthode 1 : Via NodeSource (recommandé)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Vérifier l'installation
node --version  # Doit afficher v20.x.x
npm --version   # Doit afficher 10.x.x
```

### 2.2 Installation de PM2 (Gestionnaire de processus)

```bash
sudo npm install -g pm2

# Vérifier l'installation
pm2 --version
```

### 2.3 Installation de Nginx (Reverse Proxy)

```bash
sudo apt install nginx -y

# Démarrer et activer Nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# Vérifier le statut
sudo systemctl status nginx
```

### 2.4 Installation de Git (si nécessaire)

```bash
sudo apt install git -y
```

---

## 🔒 ÉTAPE 3 : Configuration de la Sécurité

### 3.1 Configuration du Firewall (UFW)

```bash
# Activer UFW
sudo ufw enable

# Autoriser SSH (IMPORTANT : faites-le avant de fermer les autres ports)
sudo ufw allow 22/tcp

# Autoriser HTTP et HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Vérifier le statut
sudo ufw status
```

### 3.2 Configuration SSH (Optionnel mais recommandé)

```bash
# Éditer la configuration SSH
sudo nano /etc/ssh/sshd_config

# Modifier ces lignes :
# PermitRootLogin no (si vous n'utilisez pas root)
# PasswordAuthentication no (si vous utilisez des clés SSH)
# Port 22 (vous pouvez changer le port pour plus de sécurité)

# Redémarrer SSH
sudo systemctl restart sshd
```

---

## 📁 ÉTAPE 4 : Préparation du Projet Local

### 4.1 Créer un build de production localement

Sur votre machine locale, dans le dossier `/Users/lkmdigital/monbeaupays.com/frontend` :

```bash
# Installer les dépendances
npm install

# Créer le build de production
npm run build

# Vérifier que le dossier .next existe
ls -la .next
```

### 4.2 Créer un fichier .env.production

Créez un fichier `.env.production` avec vos variables d'environnement :

```bash
# Dans le dossier frontend
cat > .env.production << EOF
NEXT_PUBLIC_API_URL=https://apimonbeaupays.loyerpay.ci/api
# Si vous avez une IP backend dédiée : NEXT_PUBLIC_API_URL=http://72.62.16.236:8000/api
EOF
```

---

## 📤 ÉTAPE 5 : Transfert des Fichiers via SCP

### 5.1 Créer le dossier de l'application sur le serveur

```bash
# Sur le serveur VPS
sudo mkdir -p /var/www/monbeaupays
sudo chown -R $USER:$USER /var/www/monbeaupays
```

### 5.2 Transfert des fichiers depuis votre machine locale

**Depuis votre machine locale** (dans un nouveau terminal, gardez la connexion SSH ouverte) :

```bash
# Aller dans le dossier frontend
cd /Users/lkmdigital/monbeaupays.com/frontend

# Créer un fichier avec les fichiers à exclure pour le transfert
cat > .rsyncignore << EOF
node_modules
.next
.git
.DS_Store
*.log
.env.local
EOF

# Transfert via SCP (méthode 1 : fichiers essentiels uniquement)
scp -r \
  app \
  components \
  lib \
  messages \
  public \
  stores \
  *.json \
  *.js \
  *.ts \
  *.tsx \
  *.css \
  next-env.d.ts \
  UTILISATEUR@72.62.16.236:/var/www/monbeaupays/

# OU méthode 2 : via rsync (plus efficace)
rsync -avz --exclude 'node_modules' \
           --exclude '.next' \
           --exclude '.git' \
           --exclude '.DS_Store' \
           --exclude '*.log' \
           --exclude '.env.local' \
           ./ UTILISATEUR@72.62.16.236:/var/www/monbeaupays/
```

### 5.3 Vérifier les fichiers transférés

```bash
# Sur le serveur VPS
cd /var/www/monbeaupays
ls -la
```

---

## ⚙️ ÉTAPE 6 : Configuration sur le Serveur

### 6.1 Installation des dépendances sur le serveur

```bash
cd /var/www/monbeaupays

# Installer les dépendances de production uniquement
npm ci --production=false

# OU installer toutes les dépendances
npm install
```

### 6.2 Créer le fichier .env.production sur le serveur

```bash
cd /var/www/monbeaupays

# Créer le fichier .env.production
nano .env.production
```

Ajoutez le contenu suivant (adaptez selon votre configuration) :

```env
NEXT_PUBLIC_API_URL=https://apimonbeaupays.loyerpay.ci/api
# Ou (backend auto-hébergé) : http://72.62.16.236:8000/api

NODE_ENV=production
```

Sauvegardez avec `Ctrl+O`, puis `Enter`, puis `Ctrl+X`.

### 6.3 Créer le build de production

```bash
cd /var/www/monbeaupays

# Créer le build
npm run build

# Vérifier que le build est réussi
ls -la .next
```

---

## 🔄 ÉTAPE 7 : Configuration PM2

### 7.1 Créer le fichier de configuration PM2

```bash
cd /var/www/monbeaupays
nano ecosystem.config.js
```

Ajoutez le contenu suivant :

```javascript
module.exports = {
  apps: [{
    name: 'monbeaupays-frontend',
    script: 'node_modules/next/dist/bin/next',
    args: 'start',
    cwd: '/var/www/monbeaupays',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: '/var/log/pm2/monbeaupays-error.log',
    out_file: '/var/log/pm2/monbeaupays-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    autorestart: true,
    max_memory_restart: '1G',
    watch: false
  }]
};
```

### 7.2 Créer le dossier de logs

```bash
sudo mkdir -p /var/log/pm2
sudo chown -R $USER:$USER /var/log/pm2
```

### 7.3 Démarrer l'application avec PM2

```bash
cd /var/www/monbeaupays

# Démarrer l'application
pm2 start ecosystem.config.js

# Sauvegarder la configuration PM2
pm2 save

# Configurer PM2 pour démarrer au boot
pm2 startup
# Suivez les instructions affichées (généralement une commande sudo à exécuter)
```

### 7.4 Vérifier le statut

```bash
# Vérifier que l'application tourne
pm2 status

# Voir les logs
pm2 logs monbeaupays-frontend

# Vérifier que l'application répond sur le port 3000
curl http://localhost:3000
```

---

## 🌐 ÉTAPE 8 : Configuration Nginx

### 8.1 Créer la configuration Nginx

```bash
sudo nano /etc/nginx/sites-available/monbeaupays
```

Ajoutez le contenu suivant (remplacez `VOTRE_IP` par votre IP) :

```nginx
server {
    listen 80;
    server_name 72.62.16.236;  # IP actuelle du VPS (à remplacer par le domaine si disponible)

    # Taille maximale des uploads
    client_max_body_size 20M;

    # Logs
    access_log /var/log/nginx/monbeaupays-access.log;
    error_log /var/log/nginx/monbeaupays-error.log;

    # Proxy vers Next.js
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
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Cache pour les assets statiques
    location /_next/static {
        proxy_pass http://localhost:3000;
        proxy_cache_valid 200 60m;
        add_header Cache-Control "public, immutable";
    }

    # Gestion des erreurs
    error_page 500 502 503 504 /50x.html;
    location = /50x.html {
        root /usr/share/nginx/html;
    }
}
```

### 8.2 Activer la configuration

```bash
# Créer le lien symbolique
sudo ln -s /etc/nginx/sites-available/monbeaupays /etc/nginx/sites-enabled/

# Supprimer la configuration par défaut (optionnel)
sudo rm /etc/nginx/sites-enabled/default

# Tester la configuration Nginx
sudo nginx -t

# Redémarrer Nginx
sudo systemctl restart nginx
```

### 8.3 Vérifier l'accès

Ouvrez votre navigateur et allez à : `http://72.62.16.236`

Vous devriez voir votre application Next.js !

---

## 🔐 ÉTAPE 9 : Configuration SSL avec Let's Encrypt (Optionnel)

Si vous avez un nom de domaine, vous pouvez installer SSL :

```bash
# Installer Certbot
sudo apt install certbot python3-certbot-nginx -y

# Obtenir un certificat SSL (remplacez votre-domaine.com)
sudo certbot --nginx -d votre-domaine.com

# Vérifier le renouvellement automatique
sudo certbot renew --dry-run
```

---

## 📝 ÉTAPE 10 : Commandes Utiles

### Gestion PM2

```bash
# Voir le statut
pm2 status

# Voir les logs
pm2 logs monbeaupays-frontend

# Redémarrer l'application
pm2 restart monbeaupays-frontend

# Arrêter l'application
pm2 stop monbeaupays-frontend

# Supprimer l'application
pm2 delete monbeaupays-frontend

# Monitorer en temps réel
pm2 monit
```

### Gestion Nginx

```bash
# Tester la configuration
sudo nginx -t

# Redémarrer Nginx
sudo systemctl restart nginx

# Voir les logs
sudo tail -f /var/log/nginx/monbeaupays-access.log
sudo tail -f /var/log/nginx/monbeaupays-error.log
```

### Mise à jour de l'application

```bash
# 1. Sur votre machine locale, créer un nouveau build
cd /Users/lkmdigital/monbeaupays.com/frontend
npm run build

# 2. Transférer les nouveaux fichiers
rsync -avz --exclude 'node_modules' \
           --exclude '.next' \
           --exclude '.git' \
           ./ UTILISATEUR@72.62.16.236:/var/www/monbeaupays/

# 3. Sur le serveur, reconstruire et redémarrer
ssh UTILISATEUR@72.62.16.236
cd /var/www/monbeaupays
npm run build
pm2 restart monbeaupays-frontend
```

---

## 🐛 Dépannage

### L'application ne démarre pas

```bash
# Vérifier les logs PM2
pm2 logs monbeaupays-frontend --lines 50

# Vérifier que le port 3000 n'est pas utilisé
sudo netstat -tulpn | grep 3000

# Vérifier les permissions
ls -la /var/www/monbeaupays
```

### Nginx ne fonctionne pas

```bash
# Vérifier la configuration
sudo nginx -t

# Vérifier les logs
sudo tail -f /var/log/nginx/error.log

# Vérifier que Nginx tourne
sudo systemctl status nginx
```

### Erreur 502 Bad Gateway

- Vérifiez que PM2 tourne : `pm2 status`
- Vérifiez que l'application écoute sur le port 3000 : `curl http://localhost:3000`
- Vérifiez les logs Nginx : `sudo tail -f /var/log/nginx/monbeaupays-error.log`

### Erreur de connexion à l'API

- Vérifiez la variable `NEXT_PUBLIC_API_URL` dans `.env.production`
- Vérifiez que votre backend est accessible depuis le serveur
- Vérifiez les règles du firewall

---

## 📚 Ressources Additionnelles

- [Documentation Next.js - Déploiement](https://nextjs.org/docs/deployment)
- [Documentation PM2](https://pm2.keymetrics.io/docs/usage/quick-start/)
- [Documentation Nginx](https://nginx.org/en/docs/)

---

## ✅ Checklist de Déploiement

- [ ] Serveur VPS configuré et accessible
- [ ] Node.js et npm installés
- [ ] PM2 installé et configuré
- [ ] Nginx installé et configuré
- [ ] Firewall configuré (ports 22, 80, 443)
- [ ] Fichiers transférés sur le serveur
- [ ] Dépendances installées (`npm install`)
- [ ] Fichier `.env.production` créé
- [ ] Build de production créé (`npm run build`)
- [ ] Application démarrée avec PM2
- [ ] Nginx configuré et redémarré
- [ ] Application accessible via `http://VOTRE_IP`
- [ ] Logs vérifiés (pas d'erreurs)

---

**Bon déploiement ! 🚀**

