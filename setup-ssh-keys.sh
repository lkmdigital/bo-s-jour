#!/bin/bash
# =============================================================================
# Setup SSH Keys — MonBeauPays.com
# Copie votre clé SSH publique sur le VPS (à faire UNE SEULE FOIS)
# Après ça, deploy.sh fonctionne sans mot de passe
#
# Usage: ./setup-ssh-keys.sh
# =============================================================================

set -euo pipefail

SERVER="root@72.62.31.145"
IP="72.62.31.145"

echo ""
echo "══════════════════════════════════════════"
echo "  Configuration SSH — MonBeauPays.com"
echo "══════════════════════════════════════════"
echo ""

# 1. Créer la clé SSH si elle n'existe pas
if [ ! -f "$HOME/.ssh/id_ed25519" ] && [ ! -f "$HOME/.ssh/id_rsa" ]; then
    echo "Génération d'une clé SSH..."
    ssh-keygen -t ed25519 -C "monbeaupays-deploy" -f "$HOME/.ssh/id_ed25519" -N ""
    echo "✓ Clé SSH créée : ~/.ssh/id_ed25519"
else
    echo "✓ Clé SSH existante détectée"
fi

# 2. Copier la clé sur le serveur
echo ""
echo "Copie de la clé sur le serveur $IP..."
echo "(Entrez le mot de passe du serveur quand demandé)"
echo ""

ssh-copy-id -i "$HOME/.ssh/id_ed25519.pub" "$SERVER" 2>/dev/null || \
ssh-copy-id -i "$HOME/.ssh/id_rsa.pub" "$SERVER" 2>/dev/null || {
    echo ""
    echo "Si ssh-copy-id échoue, copiez manuellement :"
    echo ""
    PUB_KEY=$(cat "$HOME/.ssh/id_ed25519.pub" 2>/dev/null || cat "$HOME/.ssh/id_rsa.pub")
    echo "  ssh $SERVER"
    echo "  mkdir -p ~/.ssh && echo '$PUB_KEY' >> ~/.ssh/authorized_keys"
    echo "  chmod 600 ~/.ssh/authorized_keys"
    exit 1
}

# 3. Vérifier que la connexion sans mot de passe fonctionne
echo ""
echo "Vérification de la connexion sans mot de passe..."
if ssh -o BatchMode=yes -o ConnectTimeout=5 "$SERVER" "echo ok" > /dev/null 2>&1; then
    echo ""
    echo "✓ Connexion SSH sans mot de passe OPÉRATIONNELLE"
    echo ""
    echo "Vous pouvez maintenant utiliser :"
    echo "  ./deploy.sh           # Déploiement complet"
    echo "  ./deploy.sh --backend # Backend seulement"
    echo "  ./deploy.sh --frontend # Frontend seulement"
    echo ""
else
    echo "✗ La connexion sans mot de passe n'a pas fonctionné. Vérifiez manuellement."
    exit 1
fi
