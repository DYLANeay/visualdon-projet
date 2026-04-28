export const SWISS_FAMILIES = [
  { id: 'far-left', label: 'Extrême gauche', color: '#7A0E26' },
  { id: 'ps', label: 'PS', color: '#E2231A' },
  { id: 'greens', label: 'Écologistes', color: '#1F7A3A' },
  { id: 'centre', label: 'Centre', color: '#F08A1F' },
  { id: 'gl', label: "Vert'libéraux", color: '#A6CE39' },
  { id: 'plr', label: 'PLR', color: '#1E90C8' },
  { id: 'udc', label: 'UDC', color: '#4F8F3A' },
];

const PARTY_TO_FAMILY = {
  PST: 'far-left',
  AVF: 'far-left',
  ASV: 'far-left',
  'Sol.': 'far-left',
  POCH: 'far-left',
  PS: 'ps',
  PSA: 'ps',
  'VERT-E-S': 'greens',
  PES: 'greens',
  'Le Centre': 'centre',
  PDC: 'centre',
  'PDC 3)': 'centre',
  PEV: 'centre',
  PCS: 'centre',
  PSD: 'centre',
  PBD: 'centre',
  AdI: 'centre',
  PVL: 'gl',
  PLR: 'plr',
  PRD: 'plr',
  'PLR (PRD)': 'plr',
  PLS: 'plr',
  PSL: 'plr',
  UDC: 'udc',
  UDF: 'udc',
  Lega: 'udc',
  MCG: 'udc',
  DS: 'udc',
  'Dém.': 'udc',
  'Rép.': 'udc',
  JB: null,
  LS: null,
  Front: null,
  Grut: null,
  Autres: null,
};

export function pickElection(canton, year) {
  if (!canton) return null;
  const past = canton.elections.filter((e) => e.year <= year);
  return past.length > 0 ? past[past.length - 1] : null;
}

export function computeFamilyShares(canton, year) {
  const election = pickElection(canton, year);

  if (!election) {
    return SWISS_FAMILIES.map((f) => ({ ...f, share: 0 }));
  }

  const buckets = Object.fromEntries(SWISS_FAMILIES.map((f) => [f.id, 0]));
  let total = 0;

  for (const [name, seats] of Object.entries(election.parties)) {
    if (seats === null || seats === 0) continue;
    const familyId = PARTY_TO_FAMILY[name];
    if (familyId === undefined || familyId === null) continue;
    buckets[familyId] += seats;
    total += seats;
  }

  if (total === 0) {
    return SWISS_FAMILIES.map((f) => ({ ...f, share: 0 }));
  }

  return SWISS_FAMILIES.map((f) => ({
    ...f,
    share: (buckets[f.id] / total) * 100,
  }));
}

export function renderSwissLegend(container) {
  container.innerHTML = '';

  const title = document.createElement('p');
  title.className = 'switzerland-legend-title';
  title.textContent = 'Familles politiques';
  container.appendChild(title);

  const list = document.createElement('ul');
  list.className = 'switzerland-legend-list';

  for (const family of SWISS_FAMILIES) {
    const li = document.createElement('li');
    const swatch = document.createElement('span');
    swatch.className = 'legend-swatch';
    swatch.style.background = family.color;
    li.appendChild(swatch);
    li.appendChild(document.createTextNode(family.label));
    list.appendChild(li);
  }

  container.appendChild(list);
}
