// Event tiles overlay: 4 scenarios displayed as cards near the map,
// connected to their country with a dashed line. Tiles appear when
// the scroll reaches their year and fade out after LIFETIME_YEARS.

const LIFETIME_YEARS = 4;
const LIFETIME_YEARS_FOCUS = 7;
const MAX_VISIBLE = 4; // Cap: max tiles shown at once in overview (2 per column)

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

// Fallback events used when wikipedia dataset is unavailable.
// `country` is an ISO2 code matching the map; null = no connector line.
// `side` is 'left' or 'right' → which overlay column the tile sits in.
const FALLBACK_EVENTS = [
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
let _events = FALLBACK_EVENTS;
let _europeEvents = FALLBACK_EVENTS;
let _countryEvents = {};
let _eventById = new Map(FALLBACK_EVENTS.map((event) => [event.id, event]));

function _normalizeType(rawType) {
  if (TYPE_META[rawType]) return rawType;
  if (rawType === 'extreme_droite' || rawType === 'far_right') return 'far-right';
  if (rawType === 'global') return 'general';
  if (rawType === 'extreme_droite_suisse') return 'swiss-far-right';
  return 'general';
}

function _normalizeSide(rawSide, event) {
  if (rawSide === 'left' || rawSide === 'right') return rawSide;
  if (event.type === 'swiss-abroad') return 'right';
  const hash = Array.from(event.id).reduce((acc, ch) => acc + ch.charCodeAt(0), event.year || 0);
  return hash % 2 === 0 ? 'left' : 'right';
}

// Bug 3 — Runtime whitelist filter: the fetcher's scoring is broken (90/144 events
// tagged far-right with inflated scores), so we use a WHITELIST approach instead.
// Only events whose title explicitly mentions far-right movements/parties/ideology
// keep the 'far-right' type. Everything else demotes to 'general'.
const FAR_RIGHT_WHITELIST_RE = new RegExp([
  'extr[êe]me.?droite',
  'fascis',
  'n[ée]o.?nazi',
  'nazi',
  'n[ée]o.?fascis',
  'national.?socialis',
  'franquist',
  'carlisme',
  // Parties / movements
  'front national',
  'rassemblement national',
  'aube dor[ée]e',
  'casa.?pound',
  'forza nuova',
  'jobbik',
  'afd|alternative f[uü]r',
  'fp[öo]',
  'freiheitliche',
  'vlaams belang',
  'vlaams blok',
  'lega nord',
  'fratelli d.italia',
  'vox \\(',
  'fidesz',
  'ukip|ind[ée]pendance du royaume',
  'd[ée]mocrates de su[eè]de',
  'parti radical serbe',
  'chez nous \\(belg',
  'mouvement patriotique',
  'bloc nationaliste',
  'la droite \\(italie',
  'mouvement national \\(pologne',
  'parti populaire \\(belg',
  'front populaire national',
  'elam',
  'elections? legislatives? chypriotes? de 20(16|21)',
  // People
  'mussolini|hitler|le pen|salvini|meloni|orbán|orban|haider|blocher|wilders',
  // Strong signals
  'milice|squadris|chemises noires|march.{1,5}sur rome',
  'pleins pouvoirs.+1933',
  'grand conseil du fascisme',
  'licteur',
  'anti.?migrant',
  '[ée]meute.+royaume.?uni',
  'contr.+extr[êe]me.?droite',
  'manifesta.+anti.?ext',
  'relations.+extr[êe]me.?droite',
  'attentats? de hanau',
  'attentat.+halle',
].join('|'), 'i');

function _isLikelyFarRight(raw, normalizedType) {
  if (normalizedType !== 'far-right') return true; // keep as-is for other types
  const title = raw.title || raw.titre || '';
  // Only keep far-right if the title explicitly matches known far-right terms
  return FAR_RIGHT_WHITELIST_RE.test(title);
}

function _buildEventFromRaw(raw, idx = 0) {
  if (!raw) return null;

  const year = Number(raw.year ?? raw.annee);
  if (!Number.isFinite(year)) return null;

  const title = raw.title || raw.titre;
  const description = (raw.description || '').trim();
  if (!title || description.length < 20) return null;

  let type = _normalizeType(raw.type || raw.categorie || 'general');
  // Bug 3: demote false-positive far-right events
  if (!_isLikelyFarRight(raw, type)) type = 'general';

  const country = raw.country || raw.iso2 || (Array.isArray(raw.countries) ? raw.countries[0] : null) || null;
  const id = raw.id || `wiki-${year}-${idx}-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
  const event = {
    id,
    year,
    country,
    type,
    side: 'left',
    title,
    description,
    url: raw.url || null,
    image: raw.image || null,
  };

  event.side = _normalizeSide(raw.side, event);
  return event;
}

function _normalizeWikipediaEvents(dataset) {
  if (!dataset) return [];

  // New format produced by data/wikipedia/fetcher.js
  if (Array.isArray(dataset.europe_events)) {
    return dataset.europe_events
      .map((raw, idx) => _buildEventFromRaw(raw, idx))
      .filter(Boolean)
      .sort((a, b) => a.year - b.year);
  }

  // Legacy format: { global, extreme_droite, extreme_droite_suisse }
  const legacyEvents = [
    ...(dataset.global || []),
    ...(dataset.extreme_droite || []),
    ...(dataset.extreme_droite_suisse || []),
  ];

  return legacyEvents
    .map((raw, idx) => _buildEventFromRaw(raw, idx))
    .filter(Boolean)
    .sort((a, b) => a.year - b.year);
}

function _prepareEventsData(wikipediaEvents) {
  const normalized = _normalizeWikipediaEvents(wikipediaEvents);
  _europeEvents = normalized.length > 0 ? normalized : FALLBACK_EVENTS;
  _events = _europeEvents;
  _eventById = new Map(_events.map((event) => [event.id, event]));
}

function _normalizeCountryEventsArray(rawArray) {
  if (!Array.isArray(rawArray) || rawArray.length === 0) return [];
  return rawArray
    .map((raw, idx) => _buildEventFromRaw(raw, idx))
    .filter((event) => event && event.type !== 'general')
    .filter(Boolean)
    .sort((a, b) => a.year - b.year);
}

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

export function initEventTiles({ mapContainer, overlayLeft, overlayRight, svgLines, wikipediaEvents, countryEvents }) {
  _mapContainer = mapContainer;
  _overlayLeft = overlayLeft;
  _overlayRight = overlayRight;
  _svgLines = svgLines;
  _overlayRoot = svgLines?.parentElement || null;
  _countryEvents = countryEvents || {};
  _prepareEventsData(wikipediaEvents);

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

  // Switch event source: country-specific events when zoomed, europe-wide otherwise.
  if (_focusIso2) {
    const specific = _normalizeCountryEventsArray(_countryEvents[_focusIso2] || []);
    _events =
      specific.length > 0
        ? specific
        : _europeEvents.filter(
            (e) =>
              e.type !== 'general' &&
              (e.country === _focusIso2 ||
                (Array.isArray(e.countries) && e.countries.includes(_focusIso2)))
          );
  } else {
    _events = _europeEvents;
  }
  _eventById = new Map(_events.map((e) => [e.id, e]));

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
  let activeEvents = _events.filter((ev) => {
    if (ev.year > year || ev.year + lifetime < year) return false;
    return true;
  });

  // Bug 1 — Cap to MAX_VISIBLE in overview mode to prevent column overflow.
  // Keep the most relevant events (by score desc, then year desc).
  if (!_focusIso2 && activeEvents.length > MAX_VISIBLE) {
    activeEvents = activeEvents
      .slice()
      .sort((a, b) => {
        const scoreDiff = (b.score ?? b.year) - (a.score ?? a.year);
        return scoreDiff !== 0 ? scoreDiff : b.year - a.year;
      })
      .slice(0, MAX_VISIBLE);
  }

  const activeIds = new Set(activeEvents.map((ev) => ev.id));

  // Remove tiles that expired OR dropped out of the top-N cap.
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
    // Bug 2 — In focus mode, force all tiles to the right column (mirrors Switzerland behaviour).
    // In overview, honour the event's own side assignment.
    const useRightColumn = _focusIso2 ? true : (event.side === 'right');
    const parent = useRightColumn ? _overlayRight : _overlayLeft;
    parent.appendChild(tile);
    _activeTiles.set(event.id, tile);
    // Defer the visible state so the enter transition plays.
    requestAnimationFrame(() => tile.classList.add('is-visible'));
  }

  // Redraw lines continuously for the duration of the tile enter transition
  // so connector lines track tile positions in real-time.
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
    const event = _eventById.get(id);
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

export function openEventModal(event) {
  _openModal(event);
}
