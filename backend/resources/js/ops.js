// Espace Ops (Blade) — JS minimal, ajouté au besoin page par page.
// Pas de framework front : les interactions ponctuelles utilisent Alpine-like
// data-attributes gérés ici, ou du JS inline dans les vues.

document.addEventListener('DOMContentLoaded', () => {
  // Ferme automatiquement les bannières flash après quelques secondes.
  document.querySelectorAll('[data-flash]').forEach((el) => {
    setTimeout(() => {
      el.style.transition = 'opacity 300ms ease';
      el.style.opacity = '0';
      setTimeout(() => el.remove(), 300);
    }, 5000);
  });

  initLogsFeed();
});

/**
 * Page "Flux de logs" (/ops/logs) : interroge périodiquement le serveur pour les
 * nouvelles lignes (voir Ops\LogsController::tail) et les fait défiler à l'écran,
 * comme un `tail -f` traduit. N'a d'effet que sur cette page (le conteneur
 * #logs-feed est absent partout ailleurs).
 */
function initLogsFeed() {
  const feed = document.getElementById('logs-feed');
  const config = document.getElementById('logs-config');
  if (!feed || !config) return;

  const tailUrl = config.dataset.tailUrl;
  const emptyMsg = document.getElementById('logs-empty');
  const statusEl = document.getElementById('logs-status');
  const toggleBtn = document.getElementById('logs-toggle');
  const levelFilter = document.getElementById('logs-level-filter');
  const searchInput = document.getElementById('logs-search');
  const tabs = document.querySelectorAll('.ops-log-tab');

  const MAX_ROWS = 400;
  const POLL_MS = 2500;

  // Tailwind ne peut détecter que des noms de classes écrits en toutes lettres dans un
  // fichier scanné (voir tailwind.config.js) : une classe reconstruite par interpolation
  // (`ops-badge-${color}`) serait invisible pour lui et purgée du CSS compilé. Ces tables
  // exposent donc chaque variante en clair, une seule fois, ici.
  const BADGE_CLASS = {
    red: 'ops-badge-red', amber: 'ops-badge-amber', blue: 'ops-badge-blue', gray: 'ops-badge-gray',
    emerald: 'ops-badge-emerald', teal: 'ops-badge-teal', indigo: 'ops-badge-indigo',
    sky: 'ops-badge-sky', rose: 'ops-badge-rose',
  };
  const DOT_CLASS = {
    red: 'ops-dot-red', amber: 'ops-dot-amber', blue: 'ops-dot-blue', gray: 'ops-dot-gray',
  };

  let source = 'app';
  let cursor = null;
  let running = true;
  let timer = null;
  let totalReceived = 0;

  function setActiveTab() {
    tabs.forEach((t) => t.classList.toggle('is-active', t.dataset.source === source));
  }

  function setStatus(text) {
    statusEl.textContent = text;
  }

  function isNearBottom() {
    return feed.scrollTop + feed.clientHeight >= feed.scrollHeight - 60;
  }

  function matchesFilters(row) {
    const level = levelFilter.value;
    const search = searchInput.value.trim().toLowerCase();
    if (level && row.dataset.level !== level) return false;
    if (search && !row.dataset.searchText.includes(search)) return false;
    return true;
  }

  function applyFilters() {
    feed.querySelectorAll('.ops-log-row').forEach((row) => {
      row.classList.toggle('hidden', !matchesFilters(row));
    });
  }

  function trimOverflow() {
    const rows = feed.querySelectorAll('.ops-log-row');
    for (let i = 0; i < rows.length - MAX_ROWS; i++) {
      rows[i].remove();
    }
  }

  function renderContext(chips) {
    if (!chips || chips.length === 0) return '';
    const items = chips
      .map((c) => `<span><span class="ops-log-context-label">${escapeHtml(c.label)}</span> ${escapeHtml(String(c.value))}</span>`)
      .join('');
    return `<div class="ops-log-context">${items}</div>`;
  }

  function formatTime(datetime) {
    if (!datetime) return '';
    // "2026-09-28 10:24:37" -> "28/09 10:24:37"
    const m = datetime.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}:\d{2}:\d{2})$/);
    return m ? `${m[3]}/${m[2]} ${m[4]}` : datetime;
  }

  function appendEntry(entry) {
    const row = document.createElement('div');
    row.className = 'ops-log-row is-new';
    row.dataset.level = entry.level;
    row.dataset.category = entry.category;
    row.dataset.searchText = `${entry.title} ${entry.category} ${(entry.context || []).map((c) => c.value).join(' ')}`.toLowerCase();

    const title = escapeHtml(entry.truncatedTitle || entry.title);
    const hasMore = !!entry.truncatedTitle;

    const levelDot = DOT_CLASS[entry.badgeColor] || DOT_CLASS.gray;
    const levelBadge = BADGE_CLASS[entry.badgeColor] || BADGE_CLASS.gray;
    const categoryBadge = BADGE_CLASS[entry.categoryColor] || BADGE_CLASS.gray;

    row.innerHTML = `
      <span class="ops-dot ${levelDot}"></span>
      <div class="ops-log-body">
        <div class="ops-log-head">
          <span class="ops-badge ${levelBadge}">${escapeHtml(entry.level)}</span>
          <span class="ops-badge ${categoryBadge}">${escapeHtml(entry.category)}</span>
          <span class="ops-log-time">${escapeHtml(formatTime(entry.datetime))}</span>
        </div>
        <p class="ops-log-title" data-full="${hasMore ? escapeHtml(entry.title) : ''}">${title}${hasMore ? ' <button type="button" class="ops-log-expand">voir plus</button>' : ''}</p>
        ${renderContext(entry.context)}
      </div>
    `;

    row.classList.toggle('hidden', !matchesFilters(row));
    feed.appendChild(row);
    setTimeout(() => row.classList.remove('is-new'), 500);
  }

  function escapeHtml(value) {
    const div = document.createElement('div');
    div.textContent = value ?? '';
    return div.innerHTML;
  }

  async function poll() {
    if (!running) return;

    try {
      const params = new URLSearchParams({ source });
      if (cursor !== null) params.set('after', cursor);

      const res = await fetch(`${tailUrl}?${params.toString()}`, { headers: { Accept: 'application/json' } });
      if (!res.ok) throw new Error('http-' + res.status);
      const data = await res.json();

      if (!data.exists) {
        setStatus('Fichier de log introuvable sur le serveur.');
      } else {
        setStatus(running ? 'En direct' : 'En pause');
      }

      cursor = data.cursor;

      if (data.rotated && totalReceived > 0) {
        appendEntry({
          level: 'INFO', badgeColor: 'gray', category: 'Ops', categoryColor: 'indigo',
          datetime: null, title: '— Rotation ou redémarrage du fichier de log détecté —', context: [],
        });
      }

      const shouldStick = isNearBottom();
      (data.entries || []).forEach((entry) => {
        appendEntry(entry);
        totalReceived++;
      });
      trimOverflow();
      emptyMsg.classList.toggle('hidden', totalReceived > 0);
      if (shouldStick) feed.scrollTop = feed.scrollHeight;
    } catch (e) {
      setStatus('Connexion interrompue, nouvelle tentative…');
    } finally {
      if (running) timer = setTimeout(poll, POLL_MS);
    }
  }

  function switchSource(next) {
    source = next;
    cursor = null;
    totalReceived = 0;
    feed.innerHTML = '';
    emptyMsg.classList.remove('hidden');
    setActiveTab();
    clearTimeout(timer);
    poll();
  }

  tabs.forEach((tab) => tab.addEventListener('click', () => switchSource(tab.dataset.source)));

  toggleBtn.addEventListener('click', () => {
    running = !running;
    toggleBtn.textContent = running ? 'Pause' : 'Reprendre';
    setStatus(running ? 'En direct' : 'En pause');
    if (running) poll();
    else clearTimeout(timer);
  });

  levelFilter.addEventListener('change', applyFilters);
  searchInput.addEventListener('input', applyFilters);

  feed.addEventListener('click', (e) => {
    if (!e.target.classList.contains('ops-log-expand')) return;
    const p = e.target.closest('p');
    p.innerHTML = escapeHtml(p.dataset.full);
  });

  setActiveTab();
  poll();
}
