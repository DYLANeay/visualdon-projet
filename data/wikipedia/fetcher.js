/**
 * Wikipedia events fetcher
 *
 * Récupère via l'API REST + Action API de Wikipedia (fr.wikipedia.org) :
 *   - Le résumé de chaque événement
 *   - Les liens internes (cross-références) entre événements de notre liste
 *
 * Catégories :
 *   1. global               — événements historiques mondiaux (contexte)
 *   2. extreme_droite       — extrême droite mondiale / Europe
 *   3. extreme_droite_suisse — extrême droite en Suisse
 *
 * Usage : node fetcher.js
 * Sortie : events.json
 */

const fs = require("fs");
const path = require("path");

const API_REST  = "https://fr.wikipedia.org/api/rest_v1/page/summary/";
const API_ACTION = "https://fr.wikipedia.org/w/api.php";
const OUTPUT_FILE = path.join(__dirname, "events.json");

const HEADERS = {
  "User-Agent": "VisualDon-Projet/1.0 (educational, HEIG-VD)",
  "Accept": "application/json",
};

// ──────────────────────────────────────────────
// LISTES D'ÉVÉNEMENTS PAR CATÉGORIE
// ──────────────────────────────────────────────

const GLOBAL_EVENTS = [
  { slug: "Première_Guerre_mondiale",                             annee: 1914, date: "1914-07-28" },
  { slug: "Grande_Dépression",                                    annee: 1929, date: "1929-10-24" },
  { slug: "Seconde_Guerre_mondiale",                              annee: 1939, date: "1939-09-01" },
  { slug: "Guerre_froide",                                        annee: 1947, date: "1947-03-12" },
  { slug: "Mai_68",                                               annee: 1968, date: "1968-05-03" },
  { slug: "Choc_pétrolier_de_1973",                              annee: 1973, date: "1973-10-17" },
  { slug: "Chute_du_mur_de_Berlin",                              annee: 1989, date: "1989-11-09" },
  { slug: "Attentats_du_11_septembre_2001",                      annee: 2001, date: "2001-09-11" },
  { slug: "Crise_financière_mondiale_de_2007-2008",              annee: 2008, date: "2008-09-15" },
  { slug: "Printemps_arabe",                                      annee: 2010, date: "2010-12-18" },
  { slug: "Crise_migratoire_en_Europe",                          annee: 2015 },
  { slug: "Brexit",                                               annee: 2016, date: "2016-06-23" },
  { slug: "Pandémie_de_Covid-19",                                annee: 2020, date: "2020-03-11" },
  { slug: "Invasion_de_l'Ukraine_par_la_Russie_en_2022",        annee: 2022, date: "2022-02-24" },
];

const EXTREME_DROITE_EVENTS = [
  { slug: "Marche_sur_Rome",                                              annee: 1922, date: "1922-10-28" },
  { slug: "Incendie_du_Reichstag",                                        annee: 1933, date: "1933-02-27" },
  { slug: "Nuit_de_Cristal",                                              annee: 1938, date: "1938-11-09" },
  { slug: "Shoah",                                                         annee: 1941 },
  { slug: "Procès_de_Nuremberg",                                          annee: 1945, date: "1945-11-20" },
  { slug: "Front_national_(parti_français)",                              annee: 1972, date: "1972-10-05" },
  { slug: "Jörg_Haider",                                                  annee: 1999 },
  { slug: "Élection_présidentielle_française_de_2002",                   annee: 2002, date: "2002-04-21" },
  { slug: "Attentats_de_2011_en_Norvège",                                annee: 2011, date: "2011-07-22" },
  { slug: "Alternative_für_Deutschland",                                  annee: 2013, date: "2013-02-06" },
  { slug: "Attentats_de_Christchurch",                                    annee: 2019, date: "2019-03-15" },
  { slug: "Attentats_de_Hanau",                                           annee: 2020, date: "2020-02-19" },
  { slug: "Assaut_du_Capitole_des_États-Unis_par_des_partisans_de_Donald_Trump", annee: 2021, date: "2021-01-06" },
  { slug: "Giorgia_Meloni",                                               annee: 2022, date: "2022-10-22" },
];

const EXTREME_DROITE_SUISSE_EVENTS = [
  { slug: "Action_nationale_(Suisse)",                                      annee: 1961 },
  { slug: "James_Schwarzenbach",                                            annee: 1970 },
  { slug: "Union_démocratique_du_centre",                                   annee: 1971 },
  { slug: "Christoph_Blocher",                                              annee: 1977 },
  { slug: "Parti_suisse_de_la_liberté",                                     annee: 1985 },
  { slug: "Parti_nationaliste_suisse",                                      annee: 2000 },
  { slug: "Jeunes_UDC",                                                     annee: 2008 },
  { slug: "Initiative_populaire_«_Contre_la_construction_de_minarets_»",  annee: 2009, date: "2009-11-29" },
  { slug: "Initiative_populaire_«_Pour_le_renvoi_des_étrangers_criminels_»", annee: 2010, date: "2010-11-28" },
  { slug: "Initiative_populaire_«_Contre_l'immigration_de_masse_»",       annee: 2014, date: "2014-02-09" },
];

// ──────────────────────────────────────────────
// HELPERS
// ──────────────────────────────────────────────

async function fetchSummary(slug) {
  const res = await fetch(API_REST + encodeURIComponent(slug), { headers: HEADERS });
  if (!res.ok) throw new Error(`HTTP ${res.status} pour ${slug}`);
  return res.json();
}

/** Récupère tous les liens internes d'un article Wikipedia (namespace 0). */
async function fetchLinks(title) {
  const params = new URLSearchParams({
    action: "query",
    titles: title,
    prop: "links",
    pllimit: "500",
    plnamespace: "0",
    format: "json",
    origin: "*",
  });
  const res = await fetch(`${API_ACTION}?${params}`, { headers: HEADERS });
  if (!res.ok) return [];
  const data = await res.json();
  const pages = Object.values(data.query?.pages || {});
  return pages.flatMap(p => (p.links || []).map(l => l.title));
}

function normalize(str) {
  return str.replace(/_/g, " ").toLowerCase().trim();
}

function toEvent(summary, meta, categorie) {
  return {
    id: meta.slug,
    categorie,
    annee: meta.annee,
    date: meta.date || null,
    titre: summary.title,
    description: summary.extract || "",
    image: summary.thumbnail?.source ?? null,
    url: summary.content_urls?.desktop?.page ?? `https://fr.wikipedia.org/wiki/${encodeURIComponent(meta.slug)}`,
    source: "Wikipedia",
    relations: [],
  };
}

async function fetchCategory(list, categorie) {
  const out = [];
  for (const meta of list) {
    try {
      const summary = await fetchSummary(meta.slug);
      out.push(toEvent(summary, meta, categorie));
      console.log(`  ✔  ${categorie} — ${summary.title}`);
    } catch (err) {
      console.warn(`  ✖  ${categorie} — ${meta.slug} : ${err.message}`);
    }
  }
  return out;
}

/** Enrichit chaque événement avec les IDs des autres événements qu'il cite. */
async function addRelations(allEvents) {
  const titleToId = new Map(allEvents.map(ev => [normalize(ev.titre), ev.id]));
  const slugToId  = new Map(allEvents.map(ev => [normalize(ev.id), ev.id]));

  console.log("\n→ Récupération des liens inter-articles...");
  for (const ev of allEvents) {
    try {
      const links = await fetchLinks(ev.titre);
      const related = new Set();
      for (const link of links) {
        const normLink = normalize(link);
        const id = titleToId.get(normLink) || slugToId.get(normLink);
        if (id && id !== ev.id) related.add(id);
      }
      ev.relations = Array.from(related);
      if (ev.relations.length > 0) {
        console.log(`  ↔  ${ev.titre} → ${ev.relations.join(", ")}`);
      }
    } catch (err) {
      console.warn(`  ✖  liens pour ${ev.titre} : ${err.message}`);
    }
  }
}

// ──────────────────────────────────────────────
// MAIN
// ──────────────────────────────────────────────

(async () => {
  console.log("📚 Récupération des événements depuis Wikipedia (fr)...\n");

  console.log("→ Événements globaux / historiques");
  const global = await fetchCategory(GLOBAL_EVENTS, "global");

  console.log("\n→ Événements liés à l'extrême droite");
  const extremeDroite = await fetchCategory(EXTREME_DROITE_EVENTS, "extreme_droite");

  console.log("\n→ Événements liés à l'extrême droite en Suisse");
  const extremeDroiteCH = await fetchCategory(EXTREME_DROITE_SUISSE_EVENTS, "extreme_droite_suisse");

  const byYear = (a, b) => (a.annee || 0) - (b.annee || 0);
  global.sort(byYear);
  extremeDroite.sort(byYear);
  extremeDroiteCH.sort(byYear);

  const allEvents = [...global, ...extremeDroite, ...extremeDroiteCH];
  await addRelations(allEvents);

  const output = {
    fetchedAt: new Date().toISOString(),
    source: "https://fr.wikipedia.org/api/rest_v1/page/summary/",
    note: "Événements pour la frise chronologique (colonne gauche). Relations = liens inter-articles Wikipedia.",
    global,
    extreme_droite: extremeDroite,
    extreme_droite_suisse: extremeDroiteCH,
  };

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2), "utf-8");

  const total = allEvents.length;
  const withRelations = allEvents.filter(ev => ev.relations.length > 0).length;
  console.log(`\n✅ Terminé ! ${total} événements sauvegardés dans ${OUTPUT_FILE}`);
  console.log(`   • global                 : ${global.length}`);
  console.log(`   • extreme_droite         : ${extremeDroite.length}`);
  console.log(`   • extreme_droite_suisse  : ${extremeDroiteCH.length}`);
  console.log(`   • avec relations         : ${withRelations}/${total}`);
})().catch(err => { console.error("❌ Erreur :", err); process.exit(1); });
