#!/usr/bin/env bash
#
# healthcheck.sh — Vérification post-reboot du VPS MonBeauPays / BoSejour
# Usage : ./healthcheck.sh [--wait]
#   --wait : attend que le serveur réponde au SSH avant de lancer les tests
#
set -uo pipefail

VPS="root@72.62.31.145"
SITE="https://bosejour.ci"
API="https://api.bosejour.ci/api/accommodations"
SSH_OPTS="-o ConnectTimeout=10 -o StrictHostKeyChecking=no -o BatchMode=yes"

GREEN='\033[0;32m'; RED='\033[0;31m'; YEL='\033[0;33m'; NC='\033[0m'
ok()   { echo -e "${GREEN}✓${NC} $1"; }
ko()   { echo -e "${RED}✗${NC} $1"; }
warn() { echo -e "${YEL}!${NC} $1"; }

# ---------------------------------------------------------------------------
# 0. Attente optionnelle du retour SSH
# ---------------------------------------------------------------------------
if [[ "${1:-}" == "--wait" ]]; then
  echo "⏳ Attente du retour du serveur (ping SSH toutes les 10s, max 10 min)…"
  for i in $(seq 1 60); do
    if nc -z -G 8 72.62.31.145 22 2>/dev/null; then
      ok "Port SSH ouvert — le serveur répond."
      break
    fi
    sleep 10
    [[ $i -eq 60 ]] && { ko "Toujours injoignable après 10 min. Vérifie le panel hébergeur."; exit 1; }
  done
fi

echo "========================================================"
echo " VÉRIFICATION POST-REBOOT — $(date)"
echo "========================================================"

# ---------------------------------------------------------------------------
# 1. Connectivité réseau de base
# ---------------------------------------------------------------------------
echo -e "\n── Réseau ──"
ping -c 2 -t 5 72.62.31.145 >/dev/null 2>&1 && ok "Ping OK" || warn "Pas de réponse ICMP (ping parfois bloqué, pas bloquant)"
for p in 22 80 443; do
  nc -z -G 8 72.62.31.145 $p 2>/dev/null && ok "Port $p ouvert" || ko "Port $p fermé/timeout"
done

# ---------------------------------------------------------------------------
# 2. État du serveur (via SSH)
# ---------------------------------------------------------------------------
echo -e "\n── État serveur (SSH) ──"
if ! ssh $SSH_OPTS "$VPS" 'true' 2>/dev/null; then
  ko "SSH inaccessible — impossible de continuer le diagnostic interne."
  exit 1
fi
ok "SSH connecté"

ssh $SSH_OPTS "$VPS" 'bash -s' <<'REMOTE'
  G='\033[0;32m'; R='\033[0;31m'; Y='\033[0;33m'; N='\033[0m'
  rok(){ echo -e "${G}✓${N} $1"; }; rko(){ echo -e "${R}✗${N} $1"; }; rwarn(){ echo -e "${Y}!${N} $1"; }

  echo "  Uptime/charge : $(uptime | sed 's/.*up/up/')"

  # Mémoire
  echo "  Mémoire :"; free -h | sed 's/^/    /'
  avail=$(free -m | awk '/^Mem:/{print $7}')
  [[ ${avail:-0} -lt 150 ]] && rwarn "RAM dispo faible (${avail}MB) — risque OOM" || rok "RAM dispo OK (${avail}MB)"

  # Disque
  use=$(df / | awk 'NR==2{print $5}' | tr -d '%')
  [[ ${use:-0} -ge 90 ]] && rko "Disque / à ${use}% — CRITIQUE" || rok "Disque / à ${use}%"

  # Services
  for svc in nginx php8.2-fpm mysql; do
    st=$(systemctl is-active "$svc" 2>/dev/null)
    [[ "$st" == "active" ]] && rok "service $svc actif" || rko "service $svc = $st"
  done

  # PM2 (frontend Next.js)
  if command -v pm2 >/dev/null 2>&1; then
    pm2 jlist 2>/dev/null | grep -q '"name":"monbeaupays-frontend"' \
      && { st=$(pm2 jlist 2>/dev/null | grep -o '"status":"[^"]*"' | head -1); rok "PM2 monbeaupays-frontend présent ($st)"; } \
      || rko "PM2 : monbeaupays-frontend ABSENT — relancer server.js + pm2 save"
  else
    rwarn "pm2 introuvable dans le PATH SSH"
  fi

  # Port 3000 (Next.js standalone)
  (ss -ltn 2>/dev/null | grep -q ':3000') && rok "port local 3000 en écoute (Next.js)" || rko "port 3000 non écouté"

  # Dernières erreurs Laravel
  LOG=/var/www/monbeaupays-backend/storage/logs/laravel.log
  if [[ -f "$LOG" ]]; then
    n=$(grep -c "$(date +%Y-%m-%d)" "$LOG" 2>/dev/null || echo 0)
    echo "  Lignes log Laravel aujourd'hui : $n"
    tail -n 3 "$LOG" 2>/dev/null | sed 's/^/    /'
  fi
REMOTE

# ---------------------------------------------------------------------------
# 3. Tests HTTP externes (endpoints publics)
# ---------------------------------------------------------------------------
echo -e "\n── Endpoints publics ──"
code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 15 "$API")
t=$(curl -s -o /dev/null -w "%{time_total}" --max-time 15 "$API")
[[ "$code" =~ ^(200|401|422)$ ]] && ok "API répond (HTTP $code, ${t}s)" || ko "API HTTP $code (${t}s)"

code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 15 "$SITE")
t=$(curl -s -o /dev/null -w "%{time_total}" --max-time 15 "$SITE")
[[ "$code" =~ ^(200|301|302)$ ]] && ok "Site répond (HTTP $code, ${t}s)" || ko "Site HTTP $code (${t}s)"

echo -e "\n========================================================"
echo " Fin de la vérification."
echo "========================================================"
