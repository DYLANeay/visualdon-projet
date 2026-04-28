// Run-once Node script. Downloads BFS National Council 2023 party-strength
// dataset (per commune) and extracts the 26 cantonal capitals, mapping
// partei_id to the same family_code scheme as data/elections/elections.json.
//
// Usage: node data/communes/extract-cheflieux.js
//
// Source: https://www.bfs.admin.ch/asset/de/sd-t-17.02-NRW2023-parteien
// Master JSON: https://dam-api.bfs.admin.ch/hub/api/dam/assets/28845352/master

import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const SRC =
  'https://dam-api.bfs.admin.ch/hub/api/dam/assets/28845352/master';

// Cantonal capitals: BFS commune number -> { canton, name }.
const CHEFS_LIEUX = {
  261: { canton: 'ZH', name: 'Zürich' },
  351: { canton: 'BE', name: 'Bern' },
  1061: { canton: 'LU', name: 'Luzern' },
  1201: { canton: 'UR', name: 'Altdorf' },
  1372: { canton: 'SZ', name: 'Schwyz' },
  1407: { canton: 'OW', name: 'Sarnen' },
  1509: { canton: 'NW', name: 'Stans' },
  1630: { canton: 'GL', name: 'Glarus' },
  1711: { canton: 'ZG', name: 'Zug' },
  2196: { canton: 'FR', name: 'Fribourg' },
  2601: { canton: 'SO', name: 'Solothurn' },
  2701: { canton: 'BS', name: 'Basel' },
  2829: { canton: 'BL', name: 'Liestal' },
  2939: { canton: 'SH', name: 'Schaffhausen' },
  3001: { canton: 'AR', name: 'Herisau' },
  3101: { canton: 'AI', name: 'Appenzell' },
  3203: { canton: 'SG', name: 'St. Gallen' },
  3901: { canton: 'GR', name: 'Chur' },
  4001: { canton: 'AG', name: 'Aarau' },
  4566: { canton: 'TG', name: 'Frauenfeld' },
  5002: { canton: 'TI', name: 'Bellinzona' },
  5586: { canton: 'VD', name: 'Lausanne' },
  6266: { canton: 'VS', name: 'Sion' },
  6458: { canton: 'NE', name: 'Neuchâtel' },
  6621: { canton: 'GE', name: 'Genève' },
  6711: { canton: 'JU', name: 'Delémont' },
};

// BFS partei_id -> family_code (aligned with data/elections/elections.json).
// family_code legend: 10 ecolo, 20 ext-gauche, 30 socialiste, 40 liberal,
// 50 chretien-demo, 60 conservateur, 70 ext-droite, 90 regionaliste, 98 divers.
const PARTY_MAP = {
// Verified against BFS sd-t-17.02-NRW2023-listen (asset 28845354).
// `wing` groups parties into 5 political camps for the city-vs-rural chart.
  1: { abbrev: 'FDP/PLR', family_code: 40, family: 'Libéral', wing: 'droite' },
  3: { abbrev: 'SP/PS', family_code: 30, family: 'Socialiste/Social-démocrate', wing: 'gauche' },
  4: { abbrev: 'SVP/UDC', family_code: 70, family: 'Nationaliste/Extrême droite', wing: 'ext_droite' },
  5: { abbrev: 'LDP/PLS', family_code: 40, family: 'Libéral', wing: 'droite' },
  7: { abbrev: 'EVP/PEV', family_code: 50, family: 'Chrétien-démocrate', wing: 'centre' },
  8: { abbrev: 'CSP/PCS', family_code: 50, family: 'Chrétien-démocrate', wing: 'centre' },
  9: { abbrev: 'PdA/EàG/POP', family_code: 20, family: 'Communiste/Extrême gauche', wing: 'ext_gauche' },
  12: { abbrev: 'AL', family_code: 20, family: 'Communiste/Extrême gauche', wing: 'ext_gauche' },
  13: { abbrev: 'Verts/Grüne', family_code: 10, family: 'Ecologiste', wing: 'gauche' },
  14: { abbrev: 'SD/DS', family_code: 70, family: 'Nationaliste/Extrême droite', wing: 'ext_droite' },
  16: { abbrev: 'EDU/UDF', family_code: 70, family: 'Nationaliste/Extrême droite', wing: 'ext_droite' },
  18: { abbrev: 'Lega', family_code: 90, family: 'Régionaliste/Ethnique', wing: 'ext_droite' },
  31: { abbrev: 'GLP/pvL', family_code: 10, family: 'Ecologiste', wing: 'centre' },
  33: { abbrev: 'MCG', family_code: 90, family: 'Régionaliste/Ethnique', wing: 'droite' },
  34: { abbrev: 'Le Centre', family_code: 50, family: 'Chrétien-démocrate', wing: 'centre' },
  35: { abbrev: 'Autres', family_code: 98, family: 'Divers/Non classifié', wing: null },
};

// kanton_nummer (BFS) -> ISO canton code, used to match level_kantone with chef-lieu.
const KANTON_CODE = {
  1: 'ZH', 2: 'BE', 3: 'LU', 4: 'UR', 5: 'SZ', 6: 'OW', 7: 'NW',
  8: 'GL', 9: 'ZG', 10: 'FR', 11: 'SO', 12: 'BS', 13: 'BL',
  14: 'SH', 15: 'AR', 16: 'AI', 17: 'SG', 18: 'GR', 19: 'AG',
  20: 'TG', 21: 'TI', 22: 'VD', 23: 'VS', 24: 'NE', 25: 'GE', 26: 'JU',
};

const WINGS = ['ext_gauche', 'gauche', 'centre', 'droite', 'ext_droite'];

function rowToParty(r) {
  const p = PARTY_MAP[r.partei_id];
  return {
    partei_id: r.partei_id,
    abbrev: p?.abbrev ?? `id_${r.partei_id}`,
    family_code: p?.family_code ?? 98,
    family: p?.family ?? 'Divers/Non classifié',
    wing: p?.wing ?? null,
    vote_pct: r.partei_staerke,
    vote_pct_2019: r.letzte_wahl_partei_staerke,
    diff: r.differenz_partei_staerke,
  };
}

// Returns { ext_gauche, gauche, centre, droite, ext_droite } summed % per wing.
function aggregateByWing(parties) {
  const out = Object.fromEntries(WINGS.map((w) => [w, 0]));
  for (const p of parties) {
    if (!p.wing || p.vote_pct == null) continue;
    out[p.wing] += p.vote_pct;
  }
  return out;
}

async function main() {
  console.log('Fetching BFS dataset...');
  const res = await fetch(SRC);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const raw = await res.json();

  // Index commune rows by BFS number.
  const wanted = new Set(Object.keys(CHEFS_LIEUX).map(Number));
  const communeRows = raw.level_gemeinden.filter((r) =>
    wanted.has(r.gemeinde_nummer),
  );

  // Group commune rows by canton.
  const cheflieuByCanton = {};
  for (const r of communeRows) {
    const meta = CHEFS_LIEUX[r.gemeinde_nummer];
    const c = (cheflieuByCanton[meta.canton] ||= {
      bfs: r.gemeinde_nummer,
      name: r.gemeinde_bezeichnung,
      parties: [],
    });
    c.parties.push(rowToParty(r));
  }

  // Group canton rows by canton code.
  const cantonByCode = {};
  for (const r of raw.level_kantone) {
    const code = KANTON_CODE[r.kanton_nummer];
    if (!code) continue;
    const c = (cantonByCode[code] ||= {
      kanton_nummer: r.kanton_nummer,
      name: r.kanton_bezeichnung,
      parties: [],
    });
    c.parties.push(rowToParty(r));
  }

  // Build unified output: one entry per canton with both levels + wing diffs.
  const cantons = {};
  for (const code of Object.keys(KANTON_CODE).map((n) => KANTON_CODE[n])) {
    const cl = cheflieuByCanton[code];
    const ct = cantonByCode[code];
    if (!cl || !ct) {
      console.warn(`MISSING data for ${code}`);
      continue;
    }
    const cheflieuWings = aggregateByWing(cl.parties);
    const cantonWings = aggregateByWing(ct.parties);
    const diffWings = Object.fromEntries(
      WINGS.map((w) => [w, cheflieuWings[w] - cantonWings[w]]),
    );
    cantons[code] = {
      canton: code,
      canton_name: ct.name,
      cheflieu: { bfs: cl.bfs, name: cl.name, parties: cl.parties, wings: cheflieuWings },
      canton_level: { parties: ct.parties, wings: cantonWings },
      diff_wings: diffWings,
    };
  }

  // Sanity check.
  for (const { canton, name } of Object.values(CHEFS_LIEUX)) {
    if (!cantons[canton]) console.warn(`MISSING: ${canton} ${name}`);
  }

  const out = {
    year: raw.wahl_jahr,
    source: SRC,
    wings: WINGS,
    cantons,
  };
  const outPath = join(
    dirname(fileURLToPath(import.meta.url)),
    'cheflieux-2023.json',
  );
  await writeFile(outPath, JSON.stringify(out, null, 2));
  console.log(`Wrote ${outPath} (${Object.keys(cantons).length} cantons)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
