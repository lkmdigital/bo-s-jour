
#<!/bin/bash
# =============================================================================
# MonBeauPays.com — Script de déploiement unifié
# Usage: ./deploy.sh [OPTIONS]
#
# Options:
#   --backend     Déployer uniquement le backend (Laravel)
#   --frontend    Déployer uniquement le frontend (Next.js)
#   --full        Déployer backend + frontend (par défaut)
#   --first-run   Premier déploiement (génère la clé APP_KEY, exécute seeders)
#   --rollback    Restaurer le dernier backup disponible
#   --build-local Compiler le frontend localement avant envoi (moins de RAM sur VPS)
#   -h, --help    Afficher cette aide
#
# Exemples:
#   ./deploy.sh                    # Déploiement complet (backend + frontend)
#   ./deploy.sh --frontend         # Frontend seulement
#   ./deploy.sh --backend          # Backend seulement
#   ./deploy.sh --first-run        # Premier déploiement
#   ./deploy.sh --rollback         # Rollback
#   ./deploy.sh --build-local      # Build local puis envoi (si VPS < 2GB RAM)
# =============================================================================

set -euo pipefail

# ─── Couleurs ────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

log()     { echo -e "${GREEN}[$(date '+%H:%M:%S')] ✓${NC} $*"; }
info()    { echo -e "${BLUE}[$(date '+%H:%M:%S')] ℹ${NC} $*"; }
warn()    { echo -e "${YELLOW}[$(date '+%H:%M:%S')] ⚠${NC} $*"; }
error()   { echo -e "${RED}[$(date '+%H:%M:%S')] ✗ ERREUR:${NC} $*" >&2; }
section() { echo -e "\n${BOLD}${CYAN}══ $* ══${NC}\n"; }
die()     { error "$*"; exit 1; }

# ─── Charger la configuration ─────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_FILE="$SCRIPT_DIR/deploy.config"

[[ -f "$CONFIG_FILE" ]] || die "Fichier deploy.config introuvable."

# Valeurs par défaut
SERVER=""
SERVER_PASS=""
BACKEND_DIR=""
FRONTEND_DIR=""
API_URL=""
FRONTEND_URL=""
PHP_SERVICE="php8.2-fpm"
NGINX_SERVICE="nginx"
PM2_APP="monbeaupays-frontend"

source "$CONFIG_FILE"

[[ -n "$SERVER" ]]       || die "SERVER non défini dans deploy.config"
[[ -n "$BACKEND_DIR" ]]  || die "BACKEND_DIR non défini dans deploy.config"
[[ -n "$FRONTEND_DIR" ]] || die "FRONTEND_DIR non défini dans deploy.config"

LOCAL_BACKEND="$SCRIPT_DIR/backend"
LOCAL_FRONTEND="$SCRIPT_DIR/frontend"

# ─── Commandes SSH/Rsync (avec ou sans mot de passe) ─────────────────────────
# SSH_CMD et RSYNC_CMD wrappent automatiquement sshpass si SERVER_PASS est défini
setup_ssh_cmd() {
    if [[ -n "$SERVER_PASS" ]]; then
        which sshpass > /dev/null 2>&1 || die "sshpass non installé. Lancez: brew install sshpass"
        SSH_OPTS="-o StrictHostKeyChecking=no -o ConnectTimeout=15 -o PubkeyAuthentication=no -o PasswordAuthentication=yes"
        SSH_CMD="sshpass -p '$SERVER_PASS' ssh $SSH_OPTS"
        RSYNC_CMD="sshpass -p '$SERVER_PASS' rsync -e 'ssh $SSH_OPTS'"
    else
        SSH_CMD="ssh -o ConnectTimeout=15"
        RSYNC_CMD="rsync"
    fi
}

# Helpers pour exécuter ssh/rsync avec ou sans password
run_ssh() {
    eval "$SSH_CMD $SERVER \"$*\""
}

run_rsync() {
    # $@ = les arguments rsync (src, dest, options)
    eval "$RSYNC_CMD $*"
}

# ─── Parsing des arguments ────────────────────────────────────────────────────
DEPLOY_BACKEND=false
DEPLOY_FRONTEND=false
FIRST_RUN=false
DO_ROLLBACK=false
BUILD_LOCAL=false

if [[ $# -eq 0 ]]; then
    DEPLOY_BACKEND=true
    DEPLOY_FRONTEND=true
fi

for arg in "$@"; do
    case $arg in
        --backend)     DEPLOY_BACKEND=true ;;
        --frontend)    DEPLOY_FRONTEND=true ;;
        --full)        DEPLOY_BACKEND=true; DEPLOY_FRONTEND=true ;;
        --first-run)   DEPLOY_BACKEND=true; DEPLOY_FRONTEND=true; FIRST_RUN=true ;;
        --rollback)    DO_ROLLBACK=true ;;
        --build-local) DEPLOY_BACKEND=true; DEPLOY_FRONTEND=true; BUILD_LOCAL=true ;;
        -h|--help)
            sed -n '2,20p' "$0" | sed 's/^# \?//'
            exit 0
            ;;
        *) die "Option inconnue: $arg (utilisez --help)" ;;
    esac
done

# ─── Vérification SSH ─────────────────────────────────────────────────────────
check_ssh() {
    section "Vérification de la connexion SSH"
    info "Connexion à $SERVER..."

    if [[ -n "$SERVER_PASS" ]]; then
        sshpass -p "$SERVER_PASS" ssh \
            -o StrictHostKeyChecking=no \
            -o ConnectTimeout=15 \
            -o PubkeyAuthentication=no \
            -o PasswordAuthentication=yes \
            "$SERVER" "echo ok" > /dev/null 2>&1 \
            || die "Connexion échouée. Vérifiez SERVER et SERVER_PASS dans deploy.config"
    else
        ssh -o BatchMode=yes -o ConnectTimeout=10 "$SERVER" "echo ok" > /dev/null 2>&1 \
            || die "Connexion SSH échouée. Vérifiez votre clé SSH."
    fi

    log "Connexion SSH OK → $SERVER"
}

# ─── Exécuter une commande ssh proprement ─────────────────────────────────────
ssh_exec() {
    if [[ -n "$SERVER_PASS" ]]; then
        sshpass -p "$SERVER_PASS" ssh \
            -o StrictHostKeyChecking=no \
            -o ConnectTimeout=30 \
            -o PubkeyAuthentication=no \
            -o PasswordAuthentication=yes \
            "$SERVER" "$@"
    else
        ssh "$SERVER" "$@"
    fi
}

# ─── Exécuter rsync proprement ────────────────────────────────────────────────
rsync_exec() {
    if [[ -n "$SERVER_PASS" ]]; then
        sshpass -p "$SERVER_PASS" rsync \
            -e "ssh -o StrictHostKeyChecking=no -o PubkeyAuthentication=no -o PasswordAuthentication=yes" \
            "$@"
    else
        rsync "$@"
    fi
}

# ─── ROLLBACK ────────────────────────────────────────────────────────────────
do_rollback() {
    section "ROLLBACK"
    warn "Restauration du dernier backup..."
    ssh_exec bash << ENDSSH
        set -e
        LATEST_BACKEND=\$(ls -td /var/www/backups/backend-* 2>/dev/null | head -1)
        if [[ -n "\$LATEST_BACKEND" ]]; then
            rsync -a --delete "\$LATEST_BACKEND/" $BACKEND_DIR/
            cd $BACKEND_DIR
            php artisan config:cache && php artisan route:cache
            systemctl reload $PHP_SERVICE
            echo "✓ Backend restauré depuis \$LATEST_BACKEND"
        else
            echo "⚠ Aucun backup backend trouvé"
        fi

        LATEST_FRONTEND=\$(ls -td /var/www/backups/frontend-* 2>/dev/null | head -1)
        if [[ -n "\$LATEST_FRONTEND" ]]; then
            rsync -a --delete "\$LATEST_FRONTEND/" $FRONTEND_DIR/
            pm2 restart $PM2_APP || true
            echo "✓ Frontend restauré depuis \$LATEST_FRONTEND"
        else
            echo "⚠ Aucun backup frontend trouvé"
        fi
ENDSSH
    log "Rollback terminé"
}

# ─── BACKUP sur le serveur ────────────────────────────────────────────────────
backup_on_server() {
    local type="$1"
    local dir="$2"
    local TIMESTAMP
    TIMESTAMP=$(date '+%Y%m%d_%H%M%S')
    local BACKUP_PATH="/var/www/backups/${type}-${TIMESTAMP}"

    info "Backup $type → $BACKUP_PATH"
    ssh_exec "
        mkdir -p /var/www/backups
        if [ -d '$dir' ]; then
            rsync -a --exclude='storage/logs' --exclude='storage/framework/cache' \
                  '$dir/' '$BACKUP_PATH/'
            ls -dt /var/www/backups/${type}-* 2>/dev/null | tail -n +4 | xargs rm -rf 2>/dev/null || true
        fi
    "
}

# ─── DÉPLOIEMENT BACKEND ─────────────────────────────────────────────────────
deploy_backend() {
    section "Déploiement Backend (Laravel)"

    [[ -d "$LOCAL_BACKEND" ]] || die "Dossier backend introuvable: $LOCAL_BACKEND"

    backup_on_server "backend" "$BACKEND_DIR"

    info "Transfert des fichiers backend..."
    rsync_exec -az --delete \
        --exclude='vendor/' \
        --exclude='.git/' \
        --exclude='storage/app/' \
        --exclude='storage/logs/' \
        --exclude='storage/framework/cache/' \
        --exclude='storage/framework/sessions/' \
        --exclude='storage/framework/views/' \
        --exclude='bootstrap/cache/' \
        --exclude='.env' \
        --exclude='*.tar.gz' \
        --exclude='*.md' \
        --exclude='*.sh' \
        --exclude='.DS_Store' \
        --exclude='2fa-files-to-upload/' \
        --exclude='email-files-to-upload/' \
        --exclude='files-to-upload/' \
        "$LOCAL_BACKEND/" "$SERVER:$BACKEND_DIR/"

    log "Fichiers backend transférés"

    info "Configuration du backend sur le serveur..."
    ssh_exec bash << ENDSSH
        set -e
        cd $BACKEND_DIR

        mkdir -p storage/framework/{sessions,views,cache} storage/logs bootstrap/cache
        chown -R www-data:www-data storage bootstrap/cache
        chmod -R 775 storage bootstrap/cache

        echo "→ Installation Composer..."
        composer install --optimize-autoloader --no-dev --no-interaction --quiet

        if [ "$FIRST_RUN" = "true" ]; then
            echo "→ Génération APP_KEY (premier déploiement)..."
            php artisan key:generate --force
        fi

        echo "→ Migrations..."
        php artisan migrate --force

        php artisan storage:link 2>/dev/null || true

        echo "→ Mise en cache..."
        php artisan config:clear --quiet
        php artisan route:clear --quiet
        php artisan view:clear --quiet
        php artisan config:cache
        php artisan route:cache
        php artisan view:cache
        php artisan optimize

        systemctl reload $PHP_SERVICE
        echo "✓ Backend OK"
ENDSSH

    log "Backend déployé"

    if [ "$FIRST_RUN" = "true" ]; then
        section "Seeders (premier déploiement)"
        ssh_exec "
            cd $BACKEND_DIR
            php artisan db:seed --class=RolePermissionSeeder --force 2>/dev/null || true
            php artisan db:seed --class=PaymentMethodSeeder --force 2>/dev/null || true
            php artisan db:seed --class=AdminUserSeeder --force 2>/dev/null || true
        "
        log "Seeders exécutés"
    fi
}

# ─── DÉPLOIEMENT FRONTEND ────────────────────────────────────────────────────
deploy_frontend() {
    section "Déploiement Frontend (Next.js)"

    [[ -d "$LOCAL_FRONTEND" ]] || die "Dossier frontend introuvable: $LOCAL_FRONTEND"

    backup_on_server "frontend" "$FRONTEND_DIR"

    if [ "$BUILD_LOCAL" = "true" ]; then
        # Build sur votre Mac (recommandé si VPS < 2GB RAM)
        section "Build local du frontend"
        info "Installation des dépendances npm..."
        (cd "$LOCAL_FRONTEND" && npm ci --silent)

        info "Build de production..."
        (cd "$LOCAL_FRONTEND" && npm run build)
        log "Build local terminé"

        info "Transfert du build standalone vers le serveur..."
        rsync_exec -az --delete \
            "$LOCAL_FRONTEND/.next/standalone/" "$SERVER:$FRONTEND_DIR/"
        rsync_exec -az \
            "$LOCAL_FRONTEND/.next/static/" "$SERVER:$FRONTEND_DIR/.next/static/"
        rsync_exec -az \
            "$LOCAL_FRONTEND/public/" "$SERVER:$FRONTEND_DIR/public/"

        info "Redémarrage PM2..."
        ssh_exec "
            mkdir -p /var/log/pm2
            pm2 restart $PM2_APP 2>/dev/null || \
            pm2 start $FRONTEND_DIR/server.js --name '$PM2_APP' \
                --env production \
                -e /var/log/pm2/$PM2_APP-error.log \
                -o /var/log/pm2/$PM2_APP-out.log
            pm2 save
        "
    else
        # Build sur le serveur
        info "Transfert des sources frontend..."
        rsync_exec -az --delete \
            --exclude='node_modules/' \
            --exclude='.next/' \
            --exclude='.git/' \
            --exclude='.DS_Store' \
            --exclude='*.log' \
            --exclude='.env.local' \
            --exclude='.env.development' \
            --exclude='*.tar.gz' \
            --exclude='*.sh' \
            --exclude='*.md' \
            "$LOCAL_FRONTEND/" "$SERVER:$FRONTEND_DIR/"

        log "Fichiers frontend transférés"

        info "Build + redémarrage sur le serveur..."
        ssh_exec bash << ENDSSH
            set -e
            cd $FRONTEND_DIR
            mkdir -p /var/log/pm2

            echo "→ Installation npm..."
            npm ci --silent

            echo "→ Build de production..."
            npm run build

            echo "→ Redémarrage PM2..."
            pm2 restart $PM2_APP 2>/dev/null || pm2 start ecosystem.config.js
            pm2 save
            echo "✓ Frontend OK"
ENDSSH
    fi

    log "Frontend déployé"
}

# ─── HEALTH CHECK ────────────────────────────────────────────────────────────
health_check() {
    section "Vérification de santé"
    sleep 3

    if [ "$DEPLOY_BACKEND" = "true" ] && [ -n "${API_URL:-}" ]; then
        info "Test API: $API_URL/accommodations"
        HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 \
            "$API_URL/accommodations" 2>/dev/null || echo "000")
        if [[ "$HTTP_CODE" =~ ^(200|401|403|422)$ ]]; then
            log "API répond (HTTP $HTTP_CODE)"
        else
            warn "API: HTTP $HTTP_CODE — vérifiez les logs Laravel"
        fi
    fi

    if [ "$DEPLOY_FRONTEND" = "true" ] && [ -n "${FRONTEND_URL:-}" ]; then
        info "Test Frontend: $FRONTEND_URL"
        HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 \
            "$FRONTEND_URL" 2>/dev/null || echo "000")
        if [[ "$HTTP_CODE" =~ ^(200|301|302)$ ]]; then
            log "Frontend répond (HTTP $HTTP_CODE)"
        else
            warn "Frontend: HTTP $HTTP_CODE — vérifiez PM2 et Nginx"
        fi
    fi

    if [ "$DEPLOY_FRONTEND" = "true" ]; then
        info "Statut PM2:"
        ssh_exec "pm2 list --no-color 2>/dev/null | grep -E 'name|$PM2_APP' || true"
    fi
}

# ─── RÉSUMÉ ──────────────────────────────────────────────────────────────────
print_summary() {
    echo ""
    echo -e "${BOLD}${GREEN}══════════════════════════════════════════${NC}"
    echo -e "${BOLD}${GREEN}  Déploiement terminé avec succès ! 🎉${NC}"
    echo -e "${BOLD}${GREEN}══════════════════════════════════════════${NC}"
    echo ""
    [[ -n "${API_URL:-}" ]]      && echo -e "  API      : ${CYAN}$API_URL${NC}"
    [[ -n "${FRONTEND_URL:-}" ]] && echo -e "  Frontend : ${CYAN}$FRONTEND_URL${NC}"
    echo ""
    echo -e "  Logs backend  : ${YELLOW}ssh $SERVER 'tail -f $BACKEND_DIR/storage/logs/laravel.log'${NC}"
    echo -e "  Logs frontend : ${YELLOW}ssh $SERVER 'pm2 logs $PM2_APP'${NC}"
    echo -e "  Rollback      : ${YELLOW}./deploy.sh --rollback${NC}"
    echo ""
}

# ─── MAIN ─────────────────────────────────────────────────────────────────────
main() {
    echo -e "\n${BOLD}${CYAN}MonBeauPays.com — Déploiement [$(date '+%d/%m/%Y %H:%M')]${NC}\n"
    echo -e "  Serveur  : ${BOLD}$SERVER${NC}"
    echo -e "  Backend  : $([ "$DEPLOY_BACKEND" = "true" ] && echo "${GREEN}✓${NC}" || echo "–")"
    echo -e "  Frontend : $([ "$DEPLOY_FRONTEND" = "true" ] && echo "${GREEN}✓${NC}" || echo "–")"
    echo -e "  Mode     : $([ "$FIRST_RUN" = "true" ] && echo 'Premier déploiement' || echo 'Mise à jour')"
    echo -e "  Auth SSH : $([ -n "$SERVER_PASS" ] && echo 'mot de passe' || echo 'clé SSH')"
    echo ""

    check_ssh

    if [ "$DO_ROLLBACK" = "true" ]; then
        do_rollback
        exit 0
    fi

    [ "$DEPLOY_BACKEND" = "true" ]  && deploy_backend
    [ "$DEPLOY_FRONTEND" = "true" ] && deploy_frontend

    health_check
    print_summary
}

main
