import * as d3 from 'd3';

export async function loadEvents() {
  return d3.json('/data/wikipedia/events.json');
}

const CAT_META = {
  global:                { icon: '🌐', color: '#3b82f6', label: 'Contexte' },
  extreme_droite:        { icon: '⚠️',  color: '#ef4444', label: 'Extrême droite' },
  extreme_droite_suisse: { icon: '🇨🇭', color: '#be123c', label: 'Suisse' },
};

function allEvents(data) {
  return [
    ...(data.global ?? []),
    ...(data.extreme_droite ?? []),
    ...(data.extreme_droite_suisse ?? []),
  ].sort((a, b) => (a.annee ?? 0) - (b.annee ?? 0));
}

function createTile(ev) {
  const meta = CAT_META[ev.categorie] ?? CAT_META.global;
  const desc = ev.description
    ? ev.description.length > 100 ? ev.description.slice(0, 100) + '…' : ev.description
    : '';

  const tile = document.createElement('button');
  tile.className = 'event-tile';
  tile.dataset.id = ev.id;
  tile.dataset.annee = ev.annee ?? 0;
  tile.innerHTML = `
    <div class="tile-stripe" style="background:${meta.color}"></div>
    <div class="tile-body">
      <div class="tile-meta">
        <span class="tile-icon">${meta.icon}</span>
        <span class="tile-label">${meta.label}</span>
        <span class="tile-year">${ev.annee ?? '–'}</span>
      </div>
      <div class="tile-title">${ev.titre}</div>
      <div class="tile-desc">${desc}</div>
    </div>
  `;
  return tile;
}

export function initEventsPanel(container, data) {
  const events = allEvents(data);
  const indexById = new Map(events.map(ev => [ev.id, ev]));

  container.innerHTML = `
    <div class="events-header">Événements</div>
    <div id="events-list" class="events-list"></div>
  `;
  const list = container.querySelector('#events-list');

  events.forEach(ev => list.appendChild(createTile(ev)));

  // ── Modal ──────────────────────────────────────────────────────────────
  const dialog = document.querySelector('dialog');

  list.addEventListener('click', e => {
    const tile = e.target.closest('.event-tile');
    if (!tile || !dialog) return;
    const ev = indexById.get(tile.dataset.id);
    if (!ev) return;

    dialog.querySelector('h3').textContent = ev.titre;
    const img = dialog.querySelector('img');
    if (ev.image) { img.src = ev.image; img.alt = ev.titre; img.style.display = 'block'; }
    else { img.style.display = 'none'; }
    dialog.querySelector('p').textContent = ev.description ?? '';
    const link = dialog.querySelector('a');
    link.href = ev.url; link.textContent = 'Voir sur Wikipedia';
    dialog.showModal();
  });

  dialog?.addEventListener('click', e => { if (e.target === dialog) dialog.close(); });

  // ── Sync année ─────────────────────────────────────────────────────────
  return {
    setYear(year) {
      const activeIds = new Set(
        events.filter(ev => Math.abs((ev.annee ?? 0) - year) <= 5).map(ev => ev.id)
      );
      const relatedIds = new Set();
      for (const id of activeIds) {
        (indexById.get(id)?.relations ?? []).forEach(r => {
          if (!activeIds.has(r)) relatedIds.add(r);
        });
      }

      list.querySelectorAll('.event-tile').forEach(tile => {
        const id = tile.dataset.id;
        tile.classList.remove('tile-active', 'tile-related', 'tile-dim');
        if (activeIds.has(id))       tile.classList.add('tile-active');
        else if (relatedIds.has(id)) tile.classList.add('tile-related');
        else                         tile.classList.add('tile-dim');
      });

      const first = list.querySelector('.tile-active');
      if (first) first.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    },
  };
}
