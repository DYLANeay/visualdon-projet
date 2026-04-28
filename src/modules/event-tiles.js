// Event tiles overlay: 4 scenarios displayed as cards near the map,
// connected to their country with a dashed line. Tiles appear when
// the scroll reaches their year and fade out after LIFETIME_YEARS.

const LIFETIME_YEARS = 4;
const LIFETIME_YEARS_FOCUS = 7;

// Types:
// - 'far-right'        → red badge only
// - 'general'          → yellow badge only
// - 'swiss-abroad'     → blue badge only (Swiss involved in a foreign far-right event)
// - 'swiss-far-right'  → red + blue badges (Swiss far-right event in Switzerland)
const TYPE_META = {
  'far-right': {
    badges: [{ text: 'Extrême Droite', tone: 'red' }],
    lineColor: '#f97316',
  },
  general: {
    badges: [{ text: 'Général', tone: 'yellow' }],
    lineColor: '#eab308',
  },
  'swiss-abroad': {
    badges: [{ text: 'Suisse', tone: 'blue' }],
    lineColor: '#3b82f6',
  },
  'swiss-far-right': {
    badges: [
      { text: 'Extrême Droite', tone: 'red' },
      { text: 'Suisse', tone: 'blue' },
    ],
    lineColor: '#f97316',
  },
};

// Fake events spread over the century so the mechanic is visible while scrolling.
// `country` is an ISO2 code matching the map; null = no connector line.
// `side` is 'left' or 'right' → which overlay column the tile sits in.
const FAKE_EVENTS = [
  {
    id: 'fr-1922-march-rome',
    year: 1922,
    country: 'IT',
    type: 'far-right',
    side: 'left',
    title: 'Marche sur Rome',
    description:
      'En octobre 1922, les fascistes de Mussolini convergent vers Rome et obtiennent la nomination du Duce à la tête du gouvernement italien.',
    url: 'https://fr.wikipedia.org/wiki/Marche_sur_Rome',
    image: null,
  },
  {
    id: 'gen-1929-krach',
    year: 1929,
    country: 'DE',
    type: 'general',
    side: 'left',
    title: 'Krach de Wall Street',
    description:
      'Le krach boursier de 1929 déclenche une crise économique mondiale qui fragilise les démocraties européennes et nourrit les mouvements autoritaires.',
  },
  {
    id: 'fr-1933-hitler',
    year: 1933,
    country: 'DE',
    type: 'far-right',
    side: 'left',
    title: 'Hitler chancelier',
    description:
      "Le 30 janvier 1933, Adolf Hitler est nommé chancelier d'Allemagne, ouvrant la voie à la dictature nazie et à la répression politique.",
    url: 'https://fr.wikipedia.org/wiki/Adolf_Hitler',
    image: null,
  },
  {
    id: 'sa-1933-financement',
    year: 1933,
    country: 'DE',
    type: 'swiss-abroad',
    side: 'right',
    title: 'Soutien financier helvétique',
    description:
      "Des réseaux économiques suisses sont parfois cités dans les débats historiographiques sur les soutiens transfrontaliers aux mouvements d'extrême droite.",
  },
  {
    id: 'gen-1939-wwii',
    year: 1939,
    country: 'PL',
    type: 'general',
    side: 'left',
    title: 'Seconde Guerre mondiale',
    description:
      "L'invasion de la Pologne en 1939 déclenche la Seconde Guerre mondiale, conflit majeur qui redessine l'Europe politique jusqu'en 1945.",
  },
  {
    id: 'sfr-1970-schwarzenbach',
    year: 1970,
    country: 'CH',
    type: 'swiss-far-right',
    side: 'left',
    title: 'Initiative Schwarzenbach',
    description:
      "En Suisse, l'initiative Schwarzenbach de 1970 vise à limiter la présence étrangère et marque durablement le débat public sur l'immigration.",
  },
  {
    id: 'gen-1989-mur',
    year: 1989,
    country: 'DE',
    type: 'general',
    side: 'left',
    title: 'Chute du mur de Berlin',
    description:
      'La chute du mur en 1989 met fin à la division symbolique Est-Ouest, mais ouvre aussi une période de recomposition politique en Europe.',
  },
  {
    id: 'sfr-1995-blocher',
    year: 1995,
    country: 'CH',
    type: 'swiss-far-right',
    side: 'left',
    title: "Montée de l'UDC sous Blocher",
    description:
      "Dans les années 1990, l'UDC renforce son ancrage électoral avec un discours national-conservateur plus offensif sous Christoph Blocher.",
  },
  {
    id: 'fr-2002-le-pen',
    year: 2002,
    country: 'FR',
    type: 'far-right',
    side: 'left',
    title: "Le Pen au second tour",
    description:
      "En 2002, Jean-Marie Le Pen atteint le second tour de la présidentielle française, signalant une percée électorale majeure de l'extrême droite.",
  },
  {
    id: 'sfr-2007-moutons',
    year: 2007,
    country: 'CH',
    type: 'swiss-far-right',
    side: 'left',
    title: 'Affiches « moutons noirs »',
    description:
      "La campagne des 'moutons noirs' de 2007 devient un symbole de la communication visuelle anti-immigration en Suisse.",
  },
  {
    id: 'fr-2017-afd',
    year: 2017,
    country: 'DE',
    type: 'far-right',
    side: 'left',
    title: "L'AfD entre au Bundestag",
    description:
      "En 2017, l'Alternative für Deutschland entre au Bundestag avec un score historique pour un parti d'extrême droite dans l'Allemagne d'après-guerre.",
  },
  {
    id: 'sa-2017-afd-financement',
    year: 2017,
    country: 'DE',
    type: 'swiss-abroad',
    side: 'right',
    title: "Fonds suisses pour l'AfD",
    description:
      "Plusieurs enquêtes de presse évoquent des circuits de financement transnationaux autour de l'AfD, avec des liens discutés vers la Suisse.",
  },
  {
    id: 'fr-2022-meloni',
    year: 2022,
    country: 'IT',
    type: 'far-right',
    side: 'left',
    title: 'Meloni au pouvoir',
    description:
      "En 2022, Giorgia Meloni devient présidente du Conseil en Italie, marquant l'accès au pouvoir d'une droite radicale post-fasciste.",
  },
];

let _overlayLeft = null;
let _overlayRight = null;
let _svgLines = null;
let _overlayRoot = null;
let _mapContainer = null;
let _modal = null;
let _activeTiles = new Map(); // id → DOM element
let _currentYear = 1900;
let _focusIso2 = null;

function _getConnectorColor() {
  return getComputedStyle(document.documentElement).getPropertyValue('--border-strong').trim() || '#1A1A1A';
}

// Continuously redraw connector lines for `duration` ms.
// Used both for tile enter transitions (Bug 1) and map un-zoom (Bug 2).
function _scheduleLineRedraw(duration = 350) {
  const start = performance.now();
  function tick() {
    _redrawLines();
    if (performance.now() - start < duration) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

export function initEventTiles({ mapContainer, overlayLeft, overlayRight, svgLines }) {
  _mapContainer = mapContainer;
  _overlayLeft = overlayLeft;
  _overlayRight = overlayRight;
  _svgLines = svgLines;
  _overlayRoot = svgLines?.parentElement || null;

  // Redraw connector lines on resize (tile + country positions shift with the viewport).
  window.addEventListener('resize', () => _redrawLines());

  _setupModal();
}

// Focus mode: show only events for the given country, hide connector lines,
// and restyle the column so it doesn't fight the country-detail panel layout.
// Pass null to return to the scroll-driven overview.
export function setEventTilesFocus(iso2) {
  _focusIso2 = iso2 || null;
  if (_overlayRoot) {
    _overlayRoot.classList.toggle('is-focus-mode', Boolean(_focusIso2));
  }

  // Reset the tiles so the new filtered set enters cleanly.
  for (const tile of _activeTiles.values()) tile.remove();
  _activeTiles.clear();

  updateEventTiles(_currentYear);

  // When leaving focus mode the map un-zooms over ~650ms — keep redrawing
  // connector lines so they track the moving country paths (Bug 2).
  if (!_focusIso2) _scheduleLineRedraw(700);
}

function _setupModal() {
  _modal = document.querySelector('#event-modal');
  if (!_modal) return;

  _modal
    .querySelector('[data-event-close]')
    ?.addEventListener('click', () => _modal.close());

  // Click on the backdrop (outside the inner card) closes the modal.
  _modal.addEventListener('click', (e) => {
    if (e.target === _modal) _modal.close();
  });
}

function _openModal(event) {
  if (!_modal) return;
  const meta = TYPE_META[event.type];

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

  const descEl = _modal.querySelector('[data-event-description]');
  const longDesc = event.longDescription || event.description;
  descEl.innerHTML = `<p>${longDesc}</p>`;

  // Hide Nopasaran specifics (in case the modal was previously used for Switzerland)
  _modal.querySelector('[data-event-person-role]')?.classList.add('hidden');
  _modal.querySelector('[data-event-consequences]')?.classList.add('hidden');
  _modal.querySelector('[data-event-sources]')?.classList.add('hidden');
  const linkText = _modal.querySelector('[data-event-link-text]');
  if (linkText) linkText.textContent = "Voir sur Wikipédia";

  const link = _modal.querySelector('[data-event-link]');
  if (event.url) {
    link.href = event.url;
    link.classList.remove('is-disabled');
  } else {
    link.href = '#';
    link.classList.add('is-disabled');
  }

  _modal.showModal();
}

function _createTile(event) {
  const meta = TYPE_META[event.type];
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
        <p>${event.description}</p>
      </div>
    </article>
  `;
  return wrapper;
}

export function updateEventTiles(year) {
  _currentYear = year;
  if (!_overlayLeft || !_overlayRight) return;

  const lifetime = _focusIso2 ? LIFETIME_YEARS_FOCUS : LIFETIME_YEARS;
  const activeEvents = FAKE_EVENTS.filter((ev) => {
    if (ev.year > year || ev.year + lifetime < year) return false;
    if (_focusIso2 && ev.country !== _focusIso2) return false;
    return true;
  });
  const activeIds = new Set(activeEvents.map((ev) => ev.id));

  // Remove tiles that expired
  for (const [id, tile] of _activeTiles) {
    if (!activeIds.has(id)) {
      tile.classList.remove('is-visible');
      const toRemove = tile;
      setTimeout(() => toRemove.remove(), 300);
      _activeTiles.delete(id);
    }
  }

  // Add new tiles
  for (const event of activeEvents) {
    if (_activeTiles.has(event.id)) continue;
    const tile = _createTile(event);
    tile.querySelector('.event-tile').addEventListener('click', () => _openModal(event));
    // In focus mode, every tile is about the same country so the two-column
    // layout stops carrying meaning — stack them in the left column instead.
    const useRightColumn = !_focusIso2 && event.side === 'right';
    const parent = useRightColumn ? _overlayRight : _overlayLeft;
    parent.appendChild(tile);
    _activeTiles.set(event.id, tile);
    // Defer the visible state so the enter transition plays.
    requestAnimationFrame(() => tile.classList.add('is-visible'));
  }

  // Redraw lines continuously for the duration of the tile enter transition
  // so connector lines track tile positions in real-time (Bug 1).
  _scheduleLineRedraw(350);
}

function _redrawLines() {
  if (!_svgLines) return;
  _svgLines.innerHTML = '';
  // In focus mode the relation between tile and country is already obvious
  // (the country is zoomed, the tiles are all about it).
  if (_focusIso2) return;

  const hostRect = _svgLines.getBoundingClientRect();
  const connectorColor = _getConnectorColor();

  for (const [id, tile] of _activeTiles) {
    const event = FAKE_EVENTS.find((e) => e.id === id);
    if (!event || !event.country) continue;

    const countryPath = _mapContainer.querySelector(
      `path[data-iso2="${event.country}"]`,
    );
    if (!countryPath) continue;

    const card = tile.querySelector('.event-tile');
    if (!card) continue;

    const tileRect = card.getBoundingClientRect();
    const countryRect = countryPath.getBoundingClientRect();

    // Start point: inner edge of the tile (right edge if tile on left, etc.)
    const tileIsLeft = event.side !== 'right';
    const x1 = tileIsLeft ? tileRect.right : tileRect.left;
    const y1 = tileRect.top + tileRect.height / 2;

    // End point: centre of the country's bounding box
    const x2 = countryRect.left + countryRect.width / 2;
    const y2 = countryRect.top + countryRect.height / 2;

    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', x1 - hostRect.left);
    line.setAttribute('y1', y1 - hostRect.top);
    line.setAttribute('x2', x2 - hostRect.left);
    line.setAttribute('y2', y2 - hostRect.top);
    line.setAttribute('stroke', connectorColor);
    line.setAttribute('stroke-width', 1.35);
    line.setAttribute('stroke-dasharray', '4 3');
    line.setAttribute('stroke-opacity', 0.72);
    line.setAttribute('stroke-linecap', 'round');
    _svgLines.appendChild(line);

    // Small diamond marker at the country end, like the mockup
    const marker = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    const size = 6;
    marker.setAttribute('x', x2 - hostRect.left - size / 2);
    marker.setAttribute('y', y2 - hostRect.top - size / 2);
    marker.setAttribute('width', size);
    marker.setAttribute('height', size);
    marker.setAttribute('fill', connectorColor);
    marker.setAttribute('fill-opacity', 0.86);
    marker.setAttribute(
      'transform',
      `rotate(45 ${x2 - hostRect.left} ${y2 - hostRect.top})`,
    );
    _svgLines.appendChild(marker);
  }
}
