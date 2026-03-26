/**
 * Pipeline CSV → JSON (Manifesto Project → Carte Europe)
 *
 * INPUT  : MPDataset_MPDS2025a.csv
 * OUTPUT : elections.json
 *
 * Usage : node convert.js
 */

const fs = require("fs");
const path = require("path");

// ──────────────────────────────────────────────
// CONFIG
// ──────────────────────────────────────────────
const INPUT_FILE = path.join(__dirname, "MPDataset_MPDS2025a.csv");
const OUTPUT_FILE = path.join(__dirname, "elections.json");

// Colonnes à conserver
const KEEP_COLS = [
  "country", "countryname", "edate", "date", "party", "partyname",
  "partyabbrev", "parfam", "pervote", "absseat", "totseats", "rile"
];

// Mapping country_code Manifesto → ISO2 (pays européens uniquement)
const COUNTRY_MAP = {
  11: "SE", 12: "NO", 13: "DK", 14: "FI", 15: "IS",
  21: "BE", 22: "NL", 23: "LU", 24: "FR", 25: "IT",
  26: "ES", 27: "GR", 28: "PT",
  31: "DE", 32: "AT", 33: "CH", 34: "CY", 35: "MT",
  41: "GB", 42: "IE", 43: "GB", // Northern Ireland fusionné avec GB
  61: "PL", 62: "CZ", 63: "SK", 64: "HU", 65: "RO",
  66: "BG", 67: "EE", 68: "LV", 69: "LT",
  72: "HR", 73: "SI", 74: "RS", 76: "UA", 77: "AL",
  78: "MK", 79: "BA", 80: "ME", 83: "MD"
};

// Mapping country_code → nom du pays
const COUNTRY_NAMES = {
  11: "Sweden", 12: "Norway", 13: "Denmark", 14: "Finland", 15: "Iceland",
  21: "Belgium", 22: "Netherlands", 23: "Luxembourg", 24: "France", 25: "Italy",
  26: "Spain", 27: "Greece", 28: "Portugal",
  31: "Germany", 32: "Austria", 33: "Switzerland", 34: "Cyprus", 35: "Malta",
  41: "United Kingdom", 42: "Ireland", 43: "United Kingdom",
  61: "Poland", 62: "Czech Republic", 63: "Slovakia", 64: "Hungary", 65: "Romania",
  66: "Bulgaria", 67: "Estonia", 68: "Latvia", 69: "Lithuania",
  72: "Croatia", 73: "Slovenia", 74: "Serbia", 76: "Ukraine", 77: "Albania",
  78: "North Macedonia", 79: "Bosnia", 80: "Montenegro", 83: "Moldova"
};

// Mapping parfam → label
const FAMILY_MAP = {
  "10": "Ecologiste",
  "20": "Communiste/Extrême gauche",
  "30": "Socialiste/Social-démocrate",
  "40": "Libéral",
  "50": "Chrétien-démocrate",
  "60": "Conservateur",
  "70": "Nationaliste/Extrême droite",
  "80": "Agraire/Centre",
  "90": "Régionaliste/Ethnique",
  "95": "Islamiste",
  "98": "Divers/Non classifié",
  "999": "Inconnu"
};

// ──────────────────────────────────────────────
// ÉTAPE 1 — PARSING CSV
// ──────────────────────────────────────────────

/**
 * Parse un CSV avec guillemets et virgules.
 * Gère les valeurs entre guillemets contenant des virgules.
 */
function parseCSV(text) {
  const lines = text.split("\n");
  const headers = parseCSVLine(lines[0]);
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const values = parseCSVLine(line);
    const row = {};
    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = values[j] ?? "";
    }
    rows.push(row);
  }

  return { headers, rows };
}

function parseCSVLine(line) {
  const result = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        result.push(current);
        current = "";
      } else {
        current += ch;
      }
    }
  }
  result.push(current);
  return result;
}

// ──────────────────────────────────────────────
// HELPERS
// ──────────────────────────────────────────────

/** Convertit "NA" ou vide en null, sinon retourne la string. */
function cleanVal(v) {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  return s === "NA" || s === "" ? null : s;
}

/** Parse en nombre, retourne null si non parsable. */
function toNumber(v) {
  const s = cleanVal(v);
  if (s === null) return null;
  const n = Number(s);
  return isNaN(n) ? null : n;
}

/** Arrondi à 2 décimales. */
function round2(n) {
  return Math.round(n * 100) / 100;
}

// ──────────────────────────────────────────────
// MAIN
// ──────────────────────────────────────────────

console.log("📂 Lecture du CSV...");
const raw = fs.readFileSync(INPUT_FILE, "utf-8");

console.log("🔍 Parsing...");
const { rows } = parseCSV(raw);
console.log(`   ${rows.length} lignes lues.`);

// Filtrer colonnes (garder uniquement KEEP_COLS)
const filtered = rows.map(row => {
  const obj = {};
  for (const col of KEEP_COLS) {
    obj[col] = row[col];
  }
  return obj;
});

// ──────────────────────────────────────────────
// ÉTAPE 2 — FILTRAGE PAYS EUROPÉENS
// ──────────────────────────────────────────────
console.log("🌍 Filtrage pays européens...");
const european = filtered.filter(row => {
  const code = parseInt(row.country, 10);
  return COUNTRY_MAP.hasOwnProperty(code);
});
console.log(`   ${european.length} lignes retenues (Europe).`);

// ──────────────────────────────────────────────
// ÉTAPES 3-5 — NETTOYAGE + CONSTRUCTION JSON
// ──────────────────────────────────────────────
console.log("🔧 Nettoyage & construction JSON...");

const result = {};

for (const row of european) {
  const countryCode = parseInt(row.country, 10);
  const iso2 = COUNTRY_MAP[countryCode];
  const countryName = COUNTRY_NAMES[countryCode];

  // Parse numériques
  const pervote = toNumber(row.pervote);
  const absseat = toNumber(row.absseat);
  const totseats = toNumber(row.totseats);
  const rile = toNumber(row.rile);

  // seats_pct
  let seatsPct = null;
  if (absseat !== null && totseats !== null && totseats > 0) {
    seatsPct = round2(absseat / totseats * 100);
  }

  // year depuis date (format : 194409 → 1944)
  const dateRaw = cleanVal(row.date);
  const year = dateRaw ? parseInt(String(dateRaw).substring(0, 4), 10) : null;

  // election_date depuis edate
  const electionDate = cleanVal(row.edate);

  // party
  const partyId = cleanVal(row.party);
  const partyName = cleanVal(row.partyname);
  const partyAbbrev = cleanVal(row.partyabbrev);

  // famille politique
  const parfamRaw = cleanVal(row.parfam);
  const familyCode = parfamRaw;
  const familyLabel = FAMILY_MAP[parfamRaw] || "Inconnu";

  // Initialiser le pays s'il n'existe pas
  if (!result[iso2]) {
    result[iso2] = {
      name: countryName,
      parties: {}
    };
  }

  // Initialiser le parti s'il n'existe pas
  if (!result[iso2].parties[partyId]) {
    result[iso2].parties[partyId] = {
      name: partyName,
      abbrev: partyAbbrev,
      family_code: familyCode,
      family: familyLabel,
      elections: []
    };
  }

  // Mettre à jour les métadonnées du parti (dernière valeur rencontrée)
  const party = result[iso2].parties[partyId];
  if (partyName) party.name = partyName;
  if (partyAbbrev) party.abbrev = partyAbbrev;
  if (familyCode) {
    party.family_code = familyCode;
    party.family = familyLabel;
  }

  // Ajouter l'élection
  party.elections.push({
    year: year,
    date: electionDate,
    vote_pct: pervote,
    seats_won: absseat !== null ? Math.round(absseat) : null,
    total_seats: totseats !== null ? Math.round(totseats) : null,
    seats_pct: seatsPct,
    rile_score: rile
  });
}

// Trier les élections par year ASC pour chaque parti
for (const iso2 of Object.keys(result)) {
  for (const partyId of Object.keys(result[iso2].parties)) {
    result[iso2].parties[partyId].elections.sort((a, b) => {
      return (a.year || 0) - (b.year || 0);
    });
  }
}

// ──────────────────────────────────────────────
// ÉTAPE 6 — EXPORT
// ──────────────────────────────────────────────
const output = {
  elections: result,
  evenements: []
};

console.log("💾 Écriture de elections.json...");
fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2), "utf-8");

// Stats
const nbCountries = Object.keys(result).length;
let nbParties = 0;
let nbElections = 0;
for (const iso2 of Object.keys(result)) {
  const parties = Object.keys(result[iso2].parties);
  nbParties += parties.length;
  for (const pid of parties) {
    nbElections += result[iso2].parties[pid].elections.length;
  }
}

console.log(`\n✅ Terminé !`);
console.log(`   📊 ${nbCountries} pays`);
console.log(`   🏛️  ${nbParties} partis`);
console.log(`   🗳️  ${nbElections} entrées électorales`);
console.log(`   📄 ${OUTPUT_FILE}`);
