#!/bin/bash
# =============================================================================
# Script de diagnostic pour bosejour.ci
# =============================================================================

set -euo pipefail

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log()   { echo -e "${GREEN}✓${NC} $*"; }
info()  { echo -e "${BLUE}ℹ${NC} $*"; }
warn()  { echo -e "${YELLOW}⚠${NC} $*"; }
error() { echo -e "${RED}✗${NC} $*" >&2; }

# Charger la configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_FILE="$SCRIPT_DIR/deploy.config"

if [[ ! -f "$CONFIG_FILE" ]]; then
    error "Fichier deploy.config introuvable."
    exit 1
fi

source "$CONFIG_FILE"

[[ -n "$SERVER" ]] || { error "SERVER non défini"; exit 1; }

# Setup SSH
setup_ssh() {
    if [[ -n "${SERVER_PASS:-}" ]]; then
        which sshpass > /dev/null 2>&1 || { error "sshpass non installé"; exit 1; }
        SSH_OPTS="-o StrictHostKeyChecking=no -o ConnectTimeout=15 -o PubkeyAuthentication=no"
        SSH_CMD="sshpass -p '$SERVER_PASS' ssh $SSH_OPTS"
    else
        SSH_CMD="ssh -o ConnectTimeout=15"
    fi
}

run_ssh() {
    eval "$SSH_CMD $SERVER \"$*\""
}

# =============================================================================
# DIAGNOSTIC
# =============================================================================

setup_ssh

echo ""
echo "========================================"
echo "  DIAGNOSTIC SERVEUR - bosejour.ci"
echo "========================================"
echo ""

# 1. Test ping
info "1. Test de connectivité..."
if ping -c 1 bosejour.ci > /dev/null 2>&1; then
    log "bosejour.ci est accessible (ping OK)"
else
    warn "bosejour.ci ne répond pas au ping"
fi

# 2. Vérifier le serveur web
echo ""
info "2. Vérification du serveur web..."
run_ssh "
    echo '--- Statut Apache ---'
    systemctl status apache2 2>/dev/null || echo 'Apache non trouvé'
    
    echo ''
    echo '--- Statut Nginx ---'
    systemctl status nginx 2>/dev/null || echo 'Nginx non trouvé'
"

# 3. Vérifier les logs Nginx
echo ""
info "3. Dernières erreurs Nginx (error.log)..."
run_ssh 'tail -20 /var/log/nginx/error.log 2>/dev/null || echo "Pas de logs error.log"'

echo ""
info "4. Dernières erreurs Nginx (access.log 404s)..."
run_ssh 'grep " 404 " /var/log/nginx/access.log 2>/dev/null | tail -10 || echo "Pas de 404 récents"'

# 5. Vérifier le dossier frontend
echo ""
info "5. Vérification du dossier frontend..."
run_ssh "ls -la ${FRONTEND_DIR:-/home/u698699576/bosejour.ci} 2>/dev/null || echo 'Dossier frontend introuvable'"

# 6. Vérifier le backend
echo ""
info "6. Vérification du backend..."
run_ssh "ls -la ${BACKEND_DIR:-/home/u698699576/apimonbeaupays} 2>/dev/null | head -20 || echo 'Dossier backend introuvable'"

# 7. Logs Laravel
echo ""
info "7. Dernières erreurs Laravel..."
LOG_FILE="${BACKEND_DIR:-/home/u698699576/apimonbeaupays}/storage/logs/laravel.log"
run_ssh "tail -30 $LOG_FILE 2>/dev/null || echo 'Pas de logs Laravel'"

# 8. Vérifier les migrations
echo ""
info "8. Vérification des migrations..."
run_ssh "cd ${BACKEND_DIR:-/home/u698699576/apimonbeaupays} && php artisan migrate:status 2>/dev/null || echo 'Erreur migrations'"

# 9. Vider les caches (optionnel - demander confirmation)
echo ""
echo "========================================"
echo "  DIAGNOSTIC TERMINÉ"
echo "========================================"
echo ""
info "Pour vider les caches et redémarrer:"
echo "  ./diagnose-server.sh --fix"
echo ""

# Si --fix est passé
if [[ "${1:-}" == "--fix" ]]; then
    warn "Vidage des caches et redémarrage..."
    BACKEND_DIR_FIX="${BACKEND_DIR:-/home/u698699576/apimonbeaupays}"
    run_ssh "cd $BACKEND_DIR_FIX && php artisan cache:clear 2>/dev/null; php artisan config:clear 2>/dev/null; php artisan route:clear 2>/dev/null; php artisan view:clear 2>/dev/null; echo 'Caches Laravel vidés'"
    run_ssh "sudo systemctl restart php8.2-fpm 2>/dev/null || sudo systemctl restart php-fpm 2>/dev/null || echo 'PHP-FPM restart skipped'"
    run_ssh "sudo systemctl restart nginx 2>/dev/null || echo 'Nginx restart skipped'"
    log "Opérations terminées!"
fi
