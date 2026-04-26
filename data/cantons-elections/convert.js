/**
 * OFS xlsx → JSON (Élections parlements cantonaux suisses)
 *
 * INPUT  : data/cantons-elections/je-f-17.02.05.01.03.xlsx
 *   OFS T 17.02.05.01.03 — répartition des mandats par parti et par canton
 *   30 feuilles, fenêtres glissantes de 4 ans (1968-2026)
 *
 * OUTPUT : data/cantons-elections/cantons-elections.json
 *
 * Partis extrême droite retenus (famille 70, cohérence avec data/elections/convert.js l.107) :
 *   UDC (= SVP), UDF (= EDU), Lega (Lega dei Ticinesi), MCG (= MCR, Mouvement Citoyens Genevois)
 *   SD/DS et BDP absents de ce dataset (aucun siège cantonal significatif).
 *
 * Note : le xlsx recense les sièges (mandats), pas les votes en %.
 *   far_right_pct = (sièges ER / total sièges) × 100  (proxy de représentation).
 *
 * Usage : node data/cantons-elections/convert.js
 */

const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const INPUT = path.join(__dirname, 'je-f-17.02.05.01.03.xlsx');
const OUTPUT = path.join(__dirname, 'cantons-elections.json');

// ──────────────────────────────────────────────
// CONFIG
// ──────────────────────────────────────────────

const FAR_RIGHT_PARTY_KEYS = ['UDC', 'UDF', 'Lega', 'MCG'];

// Mapping nom français normalisé → kantonsnummer OFS (1-26)
const CANTON_NAME_TO_NUM = {
  Zurich: 1,
  Berne: 2,
  Lucerne: 3,
  Uri: 4,
  Schwyz: 5,
  Schwytz: 5, // ancienne orthographe dans les vieilles feuilles
  Obwald: 6,
  Nidwald: 7,
  Glaris: 8,
  Zoug: 9,
  Fribourg: 10,
  Soleure: 11,
  'Bâle-Ville': 12,
  'Bâle-Campagne': 13,
  Schaffhouse: 14,
  'Appenzell Rh. Ext.': 15,
  'Appenzell Rh. Int.': 16,
  'St. Gall': 17,
  Grisons: 18,
  Argovie: 19,
  Thurgovie: 20,
  Tessin: 21,
  Vaud: 22,
  Valais: 23,
  Neuchâtel: 24,
  Genève: 25,
  Jura: 26,
};

// Noms officiels (natifs) des cantons pour le JSON de sortie — jointure avec cantons.geojson
const CANTON_OFFICIAL_NAMES = {
  1: 'Zürich',
  2: 'Bern',
  3: 'Luzern',
  4: 'Uri',
  5: 'Schwyz',
  6: 'Obwalden',
  7: 'Nidwalden',
  8: 'Glarus',
  9: 'Zug',
  10: 'Fribourg',
  11: 'Solothurn',
  12: 'Basel-Stadt',
  13: 'Basel-Landschaft',
  14: 'Schaffhausen',
  15: 'Appenzell Ausserrhoden',
  16: 'Appenzell Innerrhoden',
  17: 'St. Gallen',
  18: 'Graubünden',
  19: 'Aargau',
  20: 'Thurgau',
  21: 'Ticino',
  22: 'Vaud',
  23: 'Valais',
  24: 'Neuchâtel',
  25: 'Genève',
  26: 'Jura',
};

// ──────────────────────────────────────────────
// HELPERS
// ──────────────────────────────────────────────

function round2(n) {
  return Math.round(n * 100) / 100;
}

// Normalise un intitulé de colonne : supprime espaces + mentions de note de bas de page "2)"
function normLabel(raw) {
  return String(raw)
    .trim()
    .replace(/\s*\d+\)\s*$/, '')
    .trim();
}

// Déduit la clé parti canonique ; MCG et MCR sont le même parti
function partyKey(rawLabel) {
  const n = normLabel(rawLabel);
  if (n.includes('MCG') || n.includes('MCR')) return 'MCG';
  return n;
}

// Normalise le nom de canton : trim + suppression des notes de bas de page
function normCantonName(raw) {
  return String(raw)
    .trim()
    .replace(/\s*\d+\)\s*$/, '')
    .trim();
}

// Parse une valeur de siège : "*" / "…" / vide → null ; sinon entier
function parseSeat(v) {
  if (v === '' || v === undefined || v === null) return null;
  const s = String(v).trim();
  if (s === '*' || s === '…' || s === '...') return null;
  const n = parseInt(s, 10);
  return isNaN(n) ? null : n;
}

// ──────────────────────────────────────────────
// LECTURE XLSX
// ──────────────────────────────────────────────

console.log('📂 Lecture du fichier xlsx...');
const wb = XLSX.readFile(INPUT);
console.log(`   ${wb.SheetNames.length} feuilles trouvées.`);

// Structure de sortie : kantonsnummer → { name, elections: Map<year, entry> }
const cantonData = {};
for (let i = 1; i <= 26; i++) {
  cantonData[i] = { name: CANTON_OFFICIAL_NAMES[i], elections: new Map() };
}

let sheetsProcessed = 0;
let rowsAdded = 0;
let duplicatesSkipped = 0;
let unknownCantons = new Set();

// ──────────────────────────────────────────────
// TRAITEMENT DES FEUILLES
// ──────────────────────────────────────────────

for (const sheetName of wb.SheetNames) {
  // Feuille "actuel" = doublon exact de "2021-2025" → ignorer
  if (sheetName.startsWith('actuel')) {
    console.log(`   ⏭️  Skip "${sheetName}" (doublon de 2021-2025)`);
    continue;
  }

  const ws = wb.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

  // ── Trouver la ligne d'en-tête (contient "Année") ──
  let hdrIdx = -1;
  for (let i = 0; i < Math.min(10, rows.length); i++) {
    if (rows[i].some((v) => String(v).includes('Année'))) {
      hdrIdx = i;
      break;
    }
  }
  if (hdrIdx === -1) {
    console.log(`   ⚠️  Feuille "${sheetName}" : en-tête introuvable, ignorée.`);
    continue;
  }

  const hdr = rows[hdrIdx];

  // ── Construire la map col → clé parti + repérer la colonne Total ──
  const colToParty = {};
  let totalCol = -1;

  for (let j = 0; j < hdr.length; j++) {
    const raw = String(hdr[j]);
    if (!raw || raw === '') continue;
    const label = normLabel(raw);
    if (label === 'Total') {
      totalCol = j;
      continue;
    }
    if (j <= 2) continue; // col 0 = canton, col 1 = vide, col 2 = année
    colToParty[j] = partyKey(raw);
  }

  // ── Itérer les lignes de données (cantons) ──
  for (let i = hdrIdx + 1; i < rows.length; i++) {
    const row = rows[i];

    // Ignorer les lignes vides ou sans nom de canton
    const rawName = row[0];
    if (!rawName || String(rawName).trim() === '') continue;

    const normed = normCantonName(String(rawName));
    if (normed === 'Total') continue; // ligne Total national

    const kantonsnummer = CANTON_NAME_TO_NUM[normed];
    if (!kantonsnummer) {
      unknownCantons.add(normed);
      continue;
    }

    const year = parseInt(String(row[2]), 10);
    if (isNaN(year) || year < 1900) continue;

    // Déduplication : garder la première occurrence (les feuilles se chevauchent)
    if (cantonData[kantonsnummer].elections.has(year)) {
      duplicatesSkipped++;
      continue;
    }

    // ── Agréger les sièges ──
    const parties = {};
    let farRightSeats = 0;
    let anyPartyData = false; // false si toutes les valeurs sont "…" (ex: Appenzell Int.)

    for (const [colStr, key] of Object.entries(colToParty)) {
      const col = parseInt(colStr, 10);
      const val = parseSeat(row[col]);
      parties[key] = val;
      if (val !== null) anyPartyData = true;
      if (FAR_RIGHT_PARTY_KEYS.includes(key) && val !== null) {
        farRightSeats += val;
      }
    }

    const totalSeats = totalCol >= 0 ? parseSeat(row[totalCol]) : null;
    // far_right_pct = null si la distribution par parti est inconnue (toutes valeurs "…")
    const farRightPct =
      anyPartyData && totalSeats !== null && totalSeats > 0
        ? round2((farRightSeats / totalSeats) * 100)
        : null;

    cantonData[kantonsnummer].elections.set(year, {
      year,
      total_seats: totalSeats,
      parties,
      far_right_seats: farRightSeats,
      far_right_pct: farRightPct,
    });

    rowsAdded++;
  }

  sheetsProcessed++;
}

// ──────────────────────────────────────────────
// CONSTRUCTION DU JSON DE SORTIE
// ──────────────────────────────────────────────

const output = {
  far_right_parties: FAR_RIGHT_PARTY_KEYS,
  cantons: {},
};

for (const [num, data] of Object.entries(cantonData)) {
  const elections = Array.from(data.elections.values()).sort((a, b) => a.year - b.year);
  output.cantons[num] = { name: data.name, elections };
}

console.log('\n💾 Écriture cantons-elections.json...');
fs.writeFileSync(OUTPUT, JSON.stringify(output, null, 2), 'utf-8');

// ── Stats ──
let totalElections = 0;
for (const c of Object.values(output.cantons)) totalElections += c.elections.length;

console.log('\n✅ Terminé !');
console.log(`   📋 ${sheetsProcessed} feuilles traitées`);
console.log(`   🏛️  26 cantons`);
console.log(`   🗳️  ${totalElections} entrées électorales`);
console.log(`   ⏭️  ${duplicatesSkipped} doublons ignorés`);
if (unknownCantons.size > 0) {
  console.log(`   ⚠️  Noms de canton non reconnus : ${[...unknownCantons].join(', ')}`);
}
