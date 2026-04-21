// Event tiles overlay: 4 scenarios displayed as cards near the map,
// connected to their country with a dashed line. Tiles appear when
// the scroll reaches their year and fade out after LIFETIME_YEARS.

const LIFETIME_YEARS = 4;

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
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Pellentesque sollicitudin ultrices odio quis dignissim. Nunc dignissim pharetra scelerisque.",
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
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Pellentesque sollicitudin ultrices odio quis dignissim. Nunc dignissim pharetra scelerisque.",
  },
  {
    id: 'fr-1933-hitler',
    year: 1933,
    country: 'DE',
    type: 'far-right',
    side: 'left',
    title: 'Hitler chancelier',
    description:
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Pellentesque sollicitudin ultrices odio quis dignissim. Nunc dignissim pharetra scelerisque.",
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
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Pellentesque sollicitudin ultrices odio quis dignissim. Nunc dignissim pharetra scelerisque.",
  },
  {
    id: 'gen-1939-wwii',
    year: 1939,
    country: 'PL',
    type: 'general',
    side: 'left',
    title: 'Seconde Guerre mondiale',
    description:
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Pellentesque sollicitudin ultrices odio quis dignissim. Nunc dignissim pharetra scelerisque.",
  },
  {
    id: 'sfr-1970-schwarzenbach',
    year: 1970,
    country: 'CH',
    type: 'swiss-far-right',
    side: 'left',
    title: 'Initiative Schwarzenbach',
    description:
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Pellentesque sollicitudin ultrices odio quis dignissim. Nunc dignissim pharetra scelerisque.",
  },
  {
    id: 'gen-1989-mur',
    year: 1989,
    country: 'DE',
    type: 'general',
    side: 'left',
    title: 'Chute du mur de Berlin',
    description:
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Pellentesque sollicitudin ultrices odio quis dignissim. Nunc dignissim pharetra scelerisque.",
  },
  {
    id: 'sfr-1995-blocher',
    year: 1995,
    country: 'CH',
    type: 'swiss-far-right',
    side: 'left',
    title: "Montée de l'UDC sous Blocher",
    description:
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Pellentesque sollicitudin ultrices odio quis dignissim. Nunc dignissim pharetra scelerisque.",
  },
  {
    id: 'fr-2002-le-pen',
    year: 2002,
    country: 'FR',
    type: 'far-right',
    side: 'left',
    title: "Le Pen au second tour",
    description:
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Pellentesque sollicitudin ultrices odio quis dignissim. Nunc dignissim pharetra scelerisque.",
  },
  {
    id: 'sfr-2007-moutons',
    year: 2007,
    country: 'CH',
    type: 'swiss-far-right',
    side: 'left',
    title: 'Affiches « moutons noirs »',
    description:
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Pellentesque sollicitudin ultrices odio quis dignissim. Nunc dignissim pharetra scelerisque.",
  },
  {
    id: 'fr-2017-afd',
    year: 2017,
    country: 'DE',
    type: 'far-right',
    side: 'left',
    title: "L'AfD entre au Bundestag",
    description:
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Pellentesque sollicitudin ultrices odio quis dignissim. Nunc dignissim pharetra scelerisque.",
  },
  {
    id: 'sa-2017-afd-financement',
    year: 2017,
    country: 'DE',
    type: 'swiss-abroad',
    side: 'right',
    title: "Fonds suisses pour l'AfD",
    description:
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Pellentesque sollicitudin ultrices odio quis dignissim. Nunc dignissim pharetra scelerisque.",
  },
  {
    id: 'fr-2022-meloni',
    year: 2022,
    country: 'IT',
    type: 'far-right',
    side: 'left',
    title: 'Meloni au pouvoir',
    description:
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Pellentesque sollicitudin ultrices odio quis dignissim. Nunc dignissim pharetra scelerisque.",
  },
];

let _overlayLeft = null;
let _overlayRight = null;
let _svgLines = null;
let _mapContainer = null;
let _modal = null;
let _activeTiles = new Map(); // id → DOM element
let _currentYear = 1900;

export function initEventTiles({ mapContainer, overlayLeft, overlayRight, svgLines }) {
  _mapContainer = mapContainer;
  _overlayLeft = overlayLeft;
  _overlayRight = overlayRight;
  _svgLines = svgLines;

  // Redraw connector lines on resize (tile + country positions shift with the viewport).
  window.addEventListener('resize', () => _redrawLines());

  _setupModal();
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
  img.innerHTML = event.image
    ? `<img src="${event.image}" alt="${event.title}" />`
    : '<span>Image</span>';
  img.classList.toggle('has-image', Boolean(event.image));

  const badgesEl = _modal.querySelector('[data-event-badges]');
  badgesEl.innerHTML = meta.badges
    .map((b) => `<span class="event-badge badge-${b.tone}">${b.text}</span>`)
    .join('');

  const descEl = _modal.querySelector('[data-event-description]');
  const longDesc = event.longDescription || event.description;
  descEl.innerHTML = `<p>${longDesc}</p>`;

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

  const activeEvents = FAKE_EVENTS.filter(
    (ev) => ev.year <= year && ev.year + LIFETIME_YEARS >= year,
  );
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
    const parent = event.side === 'right' ? _overlayRight : _overlayLeft;
    parent.appendChild(tile);
    _activeTiles.set(event.id, tile);
    // Defer the visible state so the enter transition plays.
    requestAnimationFrame(() => tile.classList.add('is-visible'));
  }

  // Lines depend on layout being settled. Wait a frame so new tiles have a size.
  requestAnimationFrame(() => _redrawLines());
}

function _redrawLines() {
  if (!_svgLines) return;
  _svgLines.innerHTML = '';

  const hostRect = _svgLines.getBoundingClientRect();

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
    line.setAttribute('stroke', TYPE_META[event.type].lineColor);
    line.setAttribute('stroke-width', 2);
    line.setAttribute('stroke-dasharray', '6 4');
    line.setAttribute('stroke-linecap', 'round');
    _svgLines.appendChild(line);

    // Small diamond marker at the country end, like the mockup
    const marker = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    const size = 6;
    marker.setAttribute('x', x2 - hostRect.left - size / 2);
    marker.setAttribute('y', y2 - hostRect.top - size / 2);
    marker.setAttribute('width', size);
    marker.setAttribute('height', size);
    marker.setAttribute('fill', TYPE_META[event.type].lineColor);
    marker.setAttribute(
      'transform',
      `rotate(45 ${x2 - hostRect.left} ${y2 - hostRect.top})`,
    );
    _svgLines.appendChild(marker);
  }
}
