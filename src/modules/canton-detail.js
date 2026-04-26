import { TOP_N, FAR_RIGHT_CODE, FAMILY_META } from './family-meta.js';

// Maps canton party abbreviations (as they appear in cantons-elections.json) to
// Manifesto Project family_code strings, for consistent color/label tagging.
const PARTY_FAMILIES = {
  UDC: '70',
  UDF: '70',
  Lega: '70',
  MCG: '70',
  DS: '70',
  'Dém.': '70',
  'Rép.': '70',
  'Le Centre': '50',
  PDC: '50',
  'PDC 3)': '50',
  PEV: '50',
  PCS: '50',
  PSD: '50',
  PBD: '80',
  AdI: '80',
  PVL: '80',
  PLR: '40',
  PRD: '40',
  'PLR (PRD)': '40',
  PLS: '40',
  PSL: '40',
  'VERT-E-S': '10',
  PES: '10',
  PS: '30',
  PSA: '30',
  PST: '20',
  AVF: '20',
  ASV: '20',
  'Sol.': '20',
  POCH: '20',
  JB: '90',
  LS: '90',
  Autres: '98',
  Front: '98',
  Grut: '98',
};

let _panel = null;
let _titleEl = null;
let _snapshotEl = null;
let _partiesEl = null;
let _cantonsElections = null;
let _currentKantonsnummer = null;
let _currentYear = 1999;
let _onClose = null;

export function initCantonDetail({ panel, cantonsElections, onClose }) {
  _panel = panel;
  _cantonsElections = cantonsElections;
  _onClose = onClose;

  _titleEl = panel.querySelector('[data-canton-name]');
  _snapshotEl = panel.querySelector('[data-canton-snapshot]');
  _partiesEl = panel.querySelector('[data-canton-parties]');

  panel.querySelector('[data-canton-close]').addEventListener('click', hideCantonDetail);

  requestAnimationFrame(() => {
    panel.classList.add('is-visible', 'is-priming');
    requestAnimationFrame(() => {
      panel.classList.remove('is-visible', 'is-priming');
    });
  });
}

export function showCantonDetail(kantonsnummer, feature, year) {
  _currentKantonsnummer = kantonsnummer;
  _currentYear = year;

  const canton = _cantonsElections?.cantons[String(kantonsnummer)];
  _titleEl.textContent = canton?.name || feature?.properties?.name || 'Canton inconnu';
  _renderParties();

  _panel.classList.add('is-visible');
}

export function hideCantonDetail() {
  _currentKantonsnummer = null;
  _panel.classList.remove('is-visible');
  if (_onClose) _onClose();
}

export function updateCantonDetail(year) {
  _currentYear = year;
  if (_currentKantonsnummer === null) return;
  _renderParties();
}

// Returns the election entry at or before year, or null.
function _pickElection(kantonsnummer, year) {
  const canton = _cantonsElections?.cantons[String(kantonsnummer)];
  if (!canton) return null;
  const past = canton.elections.filter((e) => e.year <= year);
  return past.length > 0 ? past[past.length - 1] : null;
}

function _renderParties() {
  if (_currentKantonsnummer === null) return;

  const election = _pickElection(_currentKantonsnummer, _currentYear);

  if (!election) {
    _partiesEl.innerHTML =
      '<li class="text-xs text-gray-500">Aucune donnée avant cette année.</li>';
    _snapshotEl.textContent = '—';
    return;
  }

  // Build rows: party name → { pct, familyCode }
  // Exclude null values and parties named "Autres".
  const rows = [];
  for (const [name, seats] of Object.entries(election.parties)) {
    if (seats === null || name === 'Autres') continue;
    if (election.total_seats === null || election.total_seats === 0) continue;
    const pct = (seats / election.total_seats) * 100;
    if (pct === 0) continue;
    const familyCode = PARTY_FAMILIES[name] || '98';
    rows.push({ name, seats, pct, familyCode });
  }

  // Sort descending by seat share.
  rows.sort((a, b) => b.pct - a.pct);

  // Take top N, but always surface the leading far-right party.
  const topN = rows.slice(0, TOP_N);
  const hasFarRight = topN.some((r) => r.familyCode === FAR_RIGHT_CODE);
  if (!hasFarRight) {
    const topFarRight = rows.find((r) => r.familyCode === FAR_RIGHT_CODE);
    if (topFarRight) {
      topN[topN.length - 1] = topFarRight;
      topN.sort((a, b) => b.pct - a.pct);
    }
  }

  if (topN.length === 0) {
    _partiesEl.innerHTML =
      '<li class="text-xs text-gray-500">Aucune donnée disponible.</li>';
    _snapshotEl.textContent = '—';
    return;
  }

  const max = Math.max(...topN.map((r) => r.pct));
  const scaleMax = Math.max(max * 1.15, 10);
  _snapshotEl.textContent = `scrutin ${election.year}`;

  _partiesEl.innerHTML = '';
  for (const row of topN) {
    const meta = FAMILY_META[row.familyCode] || { label: 'Divers', tone: 'gray' };
    const isFarRight = row.familyCode === FAR_RIGHT_CODE;
    const widthPct = Math.min(100, (row.pct / scaleMax) * 100);

    const li = document.createElement('li');
    li.className = `party-row${isFarRight ? ' is-far-right' : ''}`;
    li.innerHTML = `
      <div class="party-top">
        <span class="party-label" title="${row.name}">${row.name}</span>
        <span class="party-tag tone-${meta.tone}">${meta.label}</span>
        <span class="party-pct">${row.pct.toFixed(1)}%</span>
      </div>
      <div class="party-bar">
        <div class="party-bar-fill tone-${meta.tone}" style="width: ${widthPct}%"></div>
      </div>
    `;
    _partiesEl.appendChild(li);
  }
}
