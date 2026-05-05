# Voir les logs dans Netdata sur ton VPS

Ce guide permet d’utiliser Netdata pour suivre les logs de ton VPS (système, Nginx, PHP-FPM, et optionnellement Laravel).

---

## 1. Prérequis : version Netdata et (optionnel) Netdata Cloud

- **Netdata Agent v1.44+** pour l’onglet **Logs** du dashboard.
- **Compte Netdata Cloud gratuit** : l’onglet Logs (vue structurée, recherche, filtres) est une “Netdata Function” et nécessite une connexion à Netdata Cloud.

Vérifier la version sur le serveur :

```bash
ssh root@72.62.31.145
netdata -v
```

Si tu es en dessous de 1.44, mettre à jour :

```bash
# Mise à jour Netdata (méthode kickstart)
curl https://get.netdata.cloud/kickstart.sh > /tmp/netdata-kickstart.sh
sh /tmp/netdata-kickstart.sh
```

---

## 2. Activer l’onglet Logs dans le dashboard (avec Netdata Cloud)

1. Crée un compte gratuit sur [https://app.netdata.cloud](https://app.netdata.cloud).
2. Connecte ton nœud (VPS) à Netdata Cloud si ce n’est pas déjà fait (l’installateur kickstart peut le proposer).
3. Dans le dashboard Netdata (via ton lien Nginx ou `http://IP:19999`), ouvre le menu de gauche et va dans l’onglet **Logs**.

L’onglet Logs affiche les entrées du **journal systemd** : tout ce qui est envoyé à `journald` (services systemd, syslog, noyau) est visible ici (recherche, filtres, temps réel).

---

## 3. S’assurer que Nginx et PHP-FPM loguent dans le journal

Pour que les logs Nginx et PHP-FPM apparaissent dans Netdata (onglet Logs), ils doivent aller dans **systemd journal**. Beaucoup d’installations les écrivent déjà en journal quand les services sont gérés par systemd.

Vérifier :

```bash
# Logs du service Nginx
journalctl -u nginx -f --no-pager -n 50

# Logs du service PHP-FPM (adapter le nom du service si besoin)
journalctl -u php8.2-fpm -f --no-pager -n 50
```

Si tu vois des lignes, elles sont déjà dans le journal et seront visibles dans l’onglet Logs de Netdata (une fois le nœud connecté à Netdata Cloud).

Si Nginx ou PHP-FPM écrivent uniquement dans des fichiers (ex. `/var/log/nginx/error.log`), tu peux les rediriger vers le journal en modifiant la config du service (par ex. `StandardError=journal` + `StandardOutput=journal`) ou en utilisant `log2journal` (voir section 5).

---

## 4. Voir les logs sans Netdata Cloud (directement sur le VPS)

Sans compte Cloud, tu n’as pas l’onglet Logs dans l’interface, mais tu peux suivre les mêmes logs en SSH :

```bash
# Tous les logs système (temps réel)
journalctl -f

# Nginx uniquement
journalctl -u nginx -f

# PHP-FPM
journalctl -u php8.2-fpm -f

# Netdata
journalctl -u netdata -f

# Dernières 200 lignes + filtre par priorité (erreurs)
journalctl -p err -n 200
```

---

## 5. (Optionnel) Faire apparaître les logs Laravel dans Netdata

Les logs Laravel sont dans `storage/logs/laravel.log`. Pour les voir dans l’onglet Logs de Netdata, il faut les envoyer dans le **journal systemd**, puis ils seront visibles comme le reste.

### Méthode : log2journal + service systemd

Sur le VPS, Netdata fournit l’outil `log2journal` (si le plugin logs est installé). Tu peux créer un petit service qui envoie en continu `laravel.log` vers le journal.

Exemple de script à placer dans `/usr/local/bin/laravel-log-to-journal.sh` :

```bash
#!/bin/bash
# Envoie les nouvelles lignes de laravel.log vers systemd journal
LARAVEL_LOG="/var/www/monbeaupays-backend/storage/logs/laravel.log"
if [ ! -f "$LARAVEL_LOG" ]; then
  echo "Fichier $LARAVEL_LOG introuvable"
  exit 1
fi
tail -F "$LARAVEL_LOG" | while read -r line; do
  echo "$line" | systemd-cat -t laravel
done
```

Puis un service systemd (ex. `/etc/systemd/system/laravel-log-journal.service`) :

```ini
[Unit]
Description=Stream Laravel log to systemd journal
After=netdata.service

[Service]
Type=simple
ExecStart=/usr/local/bin/laravel-log-to-journal.sh
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Activer et démarrer :

```bash
chmod +x /usr/local/bin/laravel-log-to-journal.sh
sudo systemctl daemon-reload
sudo systemctl enable laravel-log-journal
sudo systemctl start laravel-log-journal
```

Ensuite, dans l’onglet Logs de Netdata, filtre par `SYSLOG_IDENTIFIER=laravel` (ou le champ équivalent) pour ne voir que les lignes Laravel.

---

## 6. Résumé des commandes utiles sur le VPS

| Action | Commande |
|--------|----------|
| Version Netdata | `netdata -v` |
| Logs Nginx (temps réel) | `journalctl -u nginx -f` |
| Logs PHP-FPM (temps réel) | `journalctl -u php8.2-fpm -f` |
| Logs Netdata | `journalctl -u netdata -f` |
| Dernières erreurs système | `journalctl -p err -n 100` |
| Logs Laravel (fichier) | `tail -f /var/www/monbeaupays-backend/storage/logs/laravel.log` |

---

## 7. Sécurité (rappel)

- Netdata doit être en **bind 127.0.0.1** et exposé uniquement via Nginx avec **auth_basic**, comme décrit dans ta config de sécurisation.
- Ne pas exposer le port 19999 sur Internet.

Une fois Netdata à jour et (optionnellement) connecté à Netdata Cloud, tu peux suivre les logs de ton VPS directement depuis l’onglet **Logs** du dashboard.
