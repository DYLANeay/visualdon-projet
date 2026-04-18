const TOP_N = 5;
const FAR_RIGHT_CODE = '70';

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
}

export function showCountryDetail(iso2, feature, year) {
  if (!_elections[iso2]) return;
  _currentIso2 = iso2;
  _currentYear = year;

  _titleEl.textContent = _elections[iso2].name;
  _renderParties();

  // Zoom europe map first, then fade the panel in
  if (_onShow) _onShow(feature);
  requestAnimationFrame(() => {
    _panel.classList.add('is-visible');
  });
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

function _pickSnapshot(country, year) {
  const byParty = new Map();
  for (const [id, party] of Object.entries(country.parties)) {
    const past = party.elections
      .filter((e) => e.year <= year && e.vote_pct != null)
      .sort((a, b) => b.year - a.year);
    if (past.length > 0) {
      byParty.set(id, { party, election: past[0] });
    }
  }
  return byParty;
}

function _renderParties() {
  const country = _elections[_currentIso2];
  if (!country) {
    _partiesEl.innerHTML = '';
    _snapshotEl.textContent = '—';
    return;
  }

  const snapshot = _pickSnapshot(country, _currentYear);
  const rows = [...snapshot.values()]
    .sort((a, b) => b.election.vote_pct - a.election.vote_pct)
    .slice(0, TOP_N);

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
    const isFarRight = party.family_code === FAR_RIGHT_CODE;
    const pct = election.vote_pct;
    const widthPct = Math.min(100, (pct / scaleMax) * 100);

    const li = document.createElement('li');
    li.className = `party-row${isFarRight ? ' is-far-right' : ''}`;
    li.innerHTML = `
      <div class="party-top">
        <span class="party-label" title="${party.name}">${party.abbrev || party.name}</span>
        <span class="party-pct">${pct.toFixed(1)}%</span>
      </div>
      <div class="party-bar">
        <div class="party-bar-fill" style="width: ${widthPct}%"></div>
      </div>
    `;
    _partiesEl.appendChild(li);
  }
}
