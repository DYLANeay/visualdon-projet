const TOP_N = 5;
const FAR_RIGHT_CODE = '70';

// family_code -> { short French label, tone token (color class) }
// Based on Manifesto Project / ParlGov party family coding used in elections.json.
const FAMILY_META = {
  10: { label: 'Écologiste', tone: 'green' },
  20: { label: 'Extrême gauche', tone: 'burgundy' },
  30: { label: 'Gauche', tone: 'rose' },
  40: { label: 'Libéral', tone: 'amber' },
  50: { label: 'Centre-droit', tone: 'orange' },
  60: { label: 'Droite', tone: 'blue' },
  70: { label: 'Extrême droite', tone: 'red' },
  80: { label: 'Centre', tone: 'lime' },
  90: { label: 'Régional', tone: 'purple' },
  95: { label: 'Islamiste', tone: 'teal' },
  98: { label: 'Divers', tone: 'gray' },
};

let _panel = null;
let _titleEl = null;
let _snapshotEl = null;
let _partiesEl = null;
let _elections = null;
let _currentIso2 = null;
let _currentYear = 1900;
let _onShow = null;
let _onClose = null;

export function initCountryDetail({ panel, elections, onShow, onClose }) {
  _panel = panel;
  _elections = elections;
  _onShow = onShow;
  _onClose = onClose;

  _titleEl = panel.querySelector('[data-country-name]');
  _snapshotEl = panel.querySelector('[data-country-snapshot]');
  _partiesEl = panel.querySelector('[data-country-parties]');

  panel.querySelector('[data-country-close]').addEventListener('click', hideCountryDetail);

  // Pre-warm the panel so the first reveal doesn't pay the cost of initial
  // paint (backdrop/transition compile). Flashes in/out before any click.
  requestAnimationFrame(() => {
    panel.classList.add('is-visible', 'is-priming');
    requestAnimationFrame(() => {
      panel.classList.remove('is-visible', 'is-priming');
    });
  });
}

export function showCountryDetail(iso2, feature, year) {
  _currentIso2 = iso2 && _elections[iso2] ? iso2 : null;
  _currentYear = year;

  _titleEl.textContent =
    (_currentIso2 && _elections[_currentIso2].name) ||
    feature?.properties?.Name ||
    'Pays inconnu';
  _renderParties();

  if (_onShow) _onShow(feature);
  _panel.classList.add('is-visible');
}

export function hideCountryDetail() {
  _currentIso2 = null;
  _panel.classList.remove('is-visible');
  if (_onClose) _onClose();
}

export function updateCountryDetail(year) {
  _currentYear = year;
  if (!_currentIso2) return;
  _renderParties();
}

// Merge duplicate parties (same abbrev in data from multiple sources) and
// pick the most recent election <= year.
function _pickSnapshot(country, year) {
  const byKey = new Map();
  for (const party of Object.values(country.parties)) {
    const past = party.elections
      .filter((e) => e.year <= year && e.vote_pct != null)
      .sort((a, b) => b.year - a.year);
    if (past.length === 0) continue;
    const election = past[0];
    const key = (party.abbrev || party.name).toUpperCase();
    const existing = byKey.get(key);
    // Keep the newer election; tie-break on vote_pct.
    if (
      !existing ||
      election.year > existing.election.year ||
      (election.year === existing.election.year &&
        election.vote_pct > existing.election.vote_pct)
    ) {
      byKey.set(key, { party, election });
    }
  }
  return byKey;
}

function _renderParties() {
  const country = _currentIso2 ? _elections[_currentIso2] : null;
  if (!country) {
    _partiesEl.innerHTML =
      '<li class="text-xs text-gray-500">Aucune donnée électorale disponible pour ce pays.</li>';
    _snapshotEl.textContent = '—';
    return;
  }

  const snapshot = _pickSnapshot(country, _currentYear);
  const sorted = [...snapshot.values()].sort(
    (a, b) => b.election.vote_pct - a.election.vote_pct,
  );
  const rows = sorted.slice(0, TOP_N);
  // Always surface the top far-right party (core subject of the viz) even if
  // smaller parties or coalition entries bump it out of the top N.
  const hasFarRight = rows.some((r) => r.party.family_code === FAR_RIGHT_CODE);
  if (!hasFarRight) {
    const topFarRight = sorted.find((r) => r.party.family_code === FAR_RIGHT_CODE);
    if (topFarRight) {
      rows[rows.length - 1] = topFarRight;
      rows.sort((a, b) => b.election.vote_pct - a.election.vote_pct);
    }
  }

  if (rows.length === 0) {
    _partiesEl.innerHTML =
      '<li class="text-xs text-gray-500">Aucune donnée avant cette année.</li>';
    _snapshotEl.textContent = '—';
    return;
  }

  const max = Math.max(...rows.map((r) => r.election.vote_pct));
  const scaleMax = Math.max(max * 1.15, 10);
  const latest = Math.max(...rows.map((r) => r.election.year));
  _snapshotEl.textContent = `scrutin ${latest}`;

  _partiesEl.innerHTML = '';
  for (const { party, election } of rows) {
    const meta = FAMILY_META[party.family_code] || { label: 'Divers', tone: 'gray' };
    const isFarRight = party.family_code === FAR_RIGHT_CODE;
    const pct = election.vote_pct;
    const widthPct = Math.min(100, (pct / scaleMax) * 100);

    const li = document.createElement('li');
    li.className = `party-row${isFarRight ? ' is-far-right' : ''}`;
    li.innerHTML = `
      <div class="party-top">
        <span class="party-label" title="${party.name}">${party.abbrev || party.name}</span>
        <span class="party-tag tone-${meta.tone}">${meta.label}</span>
        <span class="party-pct">${pct.toFixed(1)}%</span>
      </div>
      <div class="party-bar">
        <div class="party-bar-fill tone-${meta.tone}" style="width: ${widthPct}%"></div>
      </div>
    `;
    _partiesEl.appendChild(li);
  }
}
