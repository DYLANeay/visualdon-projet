const LIFETIME_MS = 30 * 24 * 60 * 60 * 1000;
const LIFETIME_MS_FOCUS = 60 * 24 * 60 * 60 * 1000;

const CANTON_MAP = {
  ZH: 1, BE: 2, LU: 3, UR: 4, SZ: 5, OW: 6, NW: 7, GL: 8, ZG: 9, FR: 10,
  SO: 11, BS: 12, BL: 13, SH: 14, AR: 15, AI: 16, SG: 17, GR: 18, AG: 19, TG: 20,
  TI: 21, VD: 22, VS: 23, NE: 24, GE: 25, JU: 26
};

function extractKanton(party) {
  if (!party) return null;
  const match = party.match(/ - ([A-Z]{2})$/);
  if (match) {
    return CANTON_MAP[match[1]] || null;
  }
  return null;
}

function getCategoryMeta(category) {
  const toneMap = {
    'Antisémitisme': 'red',
    'Racisme': 'red',
    'Négationnisme': 'red',
    'Néonazisme': 'red',
    'Violence / Menaces': 'red',
    'Islamophobie': 'red',
    'Sexisme': 'red'
  };
  const tone = toneMap[category] || 'yellow';
  return {
    badges: [{ text: category || 'Événement', tone }],
    lineColor: tone === 'red' ? '#ef4444' : '#eab308'
  };
}

let _events = [];
let _overlayLeft = null;
let _overlayRight = null;
let _svgLines = null;
let _overlayRoot = null;
let _mapContainer = null;
let _modal = null;
let _activeTiles = new Map();
let _currentTime = new Date("1999-01-01").getTime();
let _focusKanton = null;

function _scheduleLineRedraw(duration = 350) {
  const start = performance.now();
  function tick() {
    _redrawLines();
    if (performance.now() - start < duration) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

export function initSwissEventTiles({ mapContainer, overlayLeft, overlayRight, svgLines, nopasaranData }) {
  _mapContainer = mapContainer;
  _overlayLeft = overlayLeft;
  _overlayRight = overlayRight;
  _svgLines = svgLines;
  _overlayRoot = svgLines?.parentElement || null;

  let idCounter = 0;
  for (const yearStr in nopasaranData.eventsByYear) {
    for (const ev of nopasaranData.eventsByYear[yearStr]) {
      const kantonsnummer = extractKanton(ev.party);
      _events.push({
        ...ev,
        time: new Date(ev.date).getTime(),
        id: 'np-' + (idCounter++),
        kantonsnummer,
        side: kantonsnummer ? (kantonsnummer % 2 === 0 ? 'left' : 'right') : 'left'
      });
    }
  }

  window.addEventListener('resize', () => _redrawLines());
  _setupModal();
}

export function setSwissEventTilesFocus(kantonsnummer) {
  _focusKanton = kantonsnummer || null;
  if (_overlayRoot) {
    _overlayRoot.classList.toggle('is-focus-mode', Boolean(_focusKanton));
  }

  for (const tile of _activeTiles.values()) tile.remove();
  _activeTiles.clear();

  updateSwissEventTiles(_currentTime);

  if (!_focusKanton) _scheduleLineRedraw(700);
}

function _setupModal() {
  _modal = document.querySelector('#event-modal');
  if (!_modal) return;
  // listeners for close are already attached by event-tiles.js
}

function _openModal(event) {
  if (!_modal) return;
  const meta = getCategoryMeta(event.category);

  _modal.querySelector('[data-event-year]').textContent = event.year;
  _modal.querySelector('[data-event-title]').textContent = event.title;

  const img = _modal.querySelector('[data-event-image]');
  if (event.image) {
    img.innerHTML = `<img src="${event.image}" alt="${event.title}" />`;
    img.classList.remove('hidden');
    img.classList.add('has-image');
  } else {
    img.innerHTML = '';
    img.classList.add('hidden');
    img.classList.remove('has-image');
  }

  const badgesEl = _modal.querySelector('[data-event-badges]');
  badgesEl.innerHTML = meta.badges
    .map((b) => `<span class="event-badge badge-${b.tone}">${b.text}</span>`)
    .join('');

  const prDiv = _modal.querySelector('[data-event-person-role]');
  if (prDiv) {
    if (event.person || event.role) {
      prDiv.classList.remove('hidden');
      prDiv.querySelector('[data-event-person]').textContent = event.person || '';
      prDiv.querySelector('[data-event-role]').textContent = event.role || '';
    } else {
      prDiv.classList.add('hidden');
    }
  }

  const descEl = _modal.querySelector('[data-event-description]');
  const longDesc = event.longDescription || event.description;
  descEl.innerHTML = `<p>${longDesc}</p>`;

  const consDiv = _modal.querySelector('[data-event-consequences]');
  if (consDiv) {
    if (event.consequences) {
      consDiv.classList.remove('hidden');
      consDiv.querySelector('[data-event-consequences-text]').textContent = event.consequences;
    } else {
      consDiv.classList.add('hidden');
    }
  }

  const srcDiv = _modal.querySelector('[data-event-sources]');
  if (srcDiv) {
    if (event.sources && event.sources.length > 0) {
      srcDiv.classList.remove('hidden');
      srcDiv.querySelector('[data-event-sources-list]').innerHTML = event.sources.map(s => 
        `<li><a href="${s.url}" target="_blank" rel="noopener" class="underline hover:text-red-600 transition-colors">${s.name}</a></li>`
      ).join('');
    } else {
      srcDiv.classList.add('hidden');
    }
  }

  const link = _modal.querySelector('[data-event-link]');
  const url = event.url || (event.sources && event.sources[0]?.url);
  if (url) {
    link.href = url;
    link.classList.remove('is-disabled');
    const linkText = link.querySelector('[data-event-link-text]');
    if (linkText) linkText.textContent = "Lien de la source";
  } else {
    link.href = '#';
    link.classList.add('is-disabled');
  }

  _modal.showModal();
}

function _createTile(event) {
  const meta = getCategoryMeta(event.category);
  const wrapper = document.createElement('div');
  wrapper.className = 'event-tile-wrapper';
  wrapper.dataset.id = event.id;
  wrapper.innerHTML = `
    <article class="event-tile">
      <header class="event-tile-header">
        <h4 class="event-tile-title">${event.title}</h4>
        <div class="event-tile-badges">
          ${meta.badges
            .map((b) => `<span class="event-badge badge-${b.tone}">${b.text}</span>`)
            .join('')}
        </div>
      </header>
      <div class="event-tile-body">
        <p class="clamp-3">${event.description ? event.description.substring(0, 150) + '...' : ''}</p>
      </div>
    </article>
  `;
  return wrapper;
}

export function updateSwissEventTiles(time) {
  _currentTime = time;
  if (!_overlayLeft || !_overlayRight) return;

  const lifetime = _focusKanton ? LIFETIME_MS_FOCUS : LIFETIME_MS;
  let activeEvents = _events.filter((ev) => {
    if (ev.time > time || ev.time + lifetime < time) return false;
    if (_focusKanton && ev.kantonsnummer !== _focusKanton) return false;
    return true;
  });

  const maxEvents = _focusKanton ? 8 : 5;
  if (activeEvents.length > maxEvents) {
    // If there is a huge density, naturally expire the oldest ones.
    activeEvents = activeEvents.slice(activeEvents.length - maxEvents);
  }

  const activeIds = new Set(activeEvents.map((ev) => ev.id));

  for (const [id, tile] of _activeTiles) {
    if (!activeIds.has(id)) {
      tile.classList.remove('is-visible');
      const toRemove = tile;
      setTimeout(() => toRemove.remove(), 300);
      _activeTiles.delete(id);
    }
  }

  for (const event of activeEvents) {
    if (_activeTiles.has(event.id)) continue;
    const tile = _createTile(event);
    tile.querySelector('.event-tile').addEventListener('click', () => _openModal(event));
    
    const useRightColumn = _focusKanton ? true : (event.side === 'right');
    const parent = useRightColumn ? _overlayRight : _overlayLeft;
    parent.appendChild(tile);
    _activeTiles.set(event.id, tile);

    requestAnimationFrame(() => tile.classList.add('is-visible'));
  }

  _scheduleLineRedraw(350);
}

function _redrawLines() {
  if (!_svgLines) return;
  _svgLines.innerHTML = '';
  if (_focusKanton) return;

  const hostRect = _svgLines.getBoundingClientRect();

  for (const [id, tile] of _activeTiles) {
    const event = _events.find((e) => e.id === id);
    if (!event || !event.kantonsnummer) continue;

    const pathSelector = `path[data-canton-id="${event.kantonsnummer}"]`;
    const countryPath = _mapContainer.querySelector(pathSelector);
    if (!countryPath) continue;

    const card = tile.querySelector('.event-tile');
    if (!card) continue;

    const tileRect = card.getBoundingClientRect();
    const countryRect = countryPath.getBoundingClientRect();

    const tileIsLeft = event.side !== 'right';
    const x1 = tileIsLeft ? tileRect.right : tileRect.left;
    const y1 = tileRect.top + tileRect.height / 2;

    const x2 = countryRect.left + countryRect.width / 2;
    const y2 = countryRect.top + countryRect.height / 2;

    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', x1 - hostRect.left);
    line.setAttribute('y1', y1 - hostRect.top);
    line.setAttribute('x2', x2 - hostRect.left);
    line.setAttribute('y2', y2 - hostRect.top);
    const mutedColor = getComputedStyle(document.documentElement).getPropertyValue('--text-muted').trim() || '#8A8A8A';
    line.setAttribute('stroke', mutedColor);
    line.setAttribute('stroke-width', 1);
    line.setAttribute('stroke-dasharray', '2 3');
    line.setAttribute('stroke-linecap', 'round');
    _svgLines.appendChild(line);

    const marker = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    const size = 6;
    marker.setAttribute('x', x2 - hostRect.left - size / 2);
    marker.setAttribute('y', y2 - hostRect.top - size / 2);
    marker.setAttribute('width', size);
    marker.setAttribute('height', size);
    marker.setAttribute('fill', mutedColor);
    marker.setAttribute(
      'transform',
      `rotate(45 ${x2 - hostRect.left} ${y2 - hostRect.top})`,
    );
    _svgLines.appendChild(marker);
  }
}
