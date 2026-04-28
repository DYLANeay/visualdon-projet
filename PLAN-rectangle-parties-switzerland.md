# Plan — Carte Suisse en rectangles de familles politiques

Branche : `rectangle-parties-switzerland` (déjà créée à partir de `main`).
Cible : remplacer le choroplèthe rouge de la carte Suisse par, pour chaque
canton, un **rectangle stacké** centré sur le centroïde, où chaque sous-rectangle
représente une **famille politique helvétique** dont la **largeur est
proportionnelle au % de voix** au scrutin du canton à l'année courante. Les
sous-rectangles sont ordonnés **de gauche à droite : extrême gauche → UDC**.
Une **légende couleur** est ajoutée à la page, positionnée de manière à ce que
les tuiles d'événements ne puissent pas la recouvrir.

---

## 1. Familles à représenter (ordre gauche → droite)

7 familles, dans cet ordre exact dans chaque rectangle :

| #   | Bucket         | Couleur officielle (CH) | Hex suggéré | Codes / partis sources                                  |
| --- | -------------- | ----------------------- | ----------- | ------------------------------------------------------- |
| 1   | Extrême gauche | Bordeaux / rouge foncé  | `#7A0E26`   | family `20` : PST, AVF, ASV, Sol., POCH                 |
| 2   | PS             | Rouge vif               | `#E2231A`   | family `30` : PS, PSA                                   |
| 3   | Écologistes    | Vert foncé              | `#1F7A3A`   | family `10` : VERT-E-S, PES                             |
| 4   | Centre         | Orange                  | `#F08A1F`   | family `50` (PDC, Le Centre, PEV, PCS, PSD) + PBD + AdI |
| 5   | Vert'libéraux  | Vert clair / jaune-vert | `#A6CE39`   | **PVL uniquement** (extrait de family `80`)             |
| 6   | PLR            | Bleu clair              | `#1E90C8`   | family `40` : PLR, PRD, PLS, PSL, "PLR (PRD)"           |
| 7   | UDC            | Vert moyen (CH)         | `#4F8F3A`   | family `70` : UDC, UDF, Lega, MCG, DS, Dém., Rép.       |

Note importante : le vert UDC est différent du vert écologiste ; bien choisir
deux verts distincts (un foncé saturé pour les Verts, un vert moyen un peu
plus jaunâtre pour l'UDC). Les hex ci-dessus sont suggérés ; ajuster si
nécessaire pour la lisibilité en mode sombre/clair.

Tout parti dont le `family_code` ne correspond à aucun bucket (régional `90`,
divers `98`) est **exclu** de la somme — on ne veut pas de "barre divers" qui
casserait la lecture.

---

## 2. Nouveau module : `src/modules/swiss-families.js`

Créer un module utilitaire (séparé pour ne pas alourdir `switzerland-map.js` ni
`canton-detail.js`) qui expose :

```js
// Liste ordonnée des buckets, gauche → droite
export const SWISS_FAMILIES = [
  { id: 'far-left', label: 'Extrême gauche', color: '#7A0E26' },
  { id: 'ps', label: 'PS', color: '#E2231A' },
  { id: 'greens', label: 'Écologistes', color: '#1F7A3A' },
  { id: 'centre', label: 'Centre', color: '#F08A1F' },
  { id: 'gl', label: "Vert'libéraux", color: '#A6CE39' },
  { id: 'plr', label: 'PLR', color: '#1E90C8' },
  { id: 'udc', label: 'UDC', color: '#4F8F3A' },
];

// abréviation parti (telle qu'elle apparaît dans cantons-elections.json)
//   → bucket id (ou null pour ignorer)
const PARTY_TO_FAMILY = {
  // Extrême gauche
  PST: 'far-left',
  AVF: 'far-left',
  ASV: 'far-left',
  'Sol.': 'far-left',
  POCH: 'far-left',
  // PS
  PS: 'ps',
  PSA: 'ps',
  // Écologistes
  'VERT-E-S': 'greens',
  PES: 'greens',
  // Centre (ancienne family 50 + PBD/AdI)
  'Le Centre': 'centre',
  PDC: 'centre',
  'PDC 3)': 'centre',
  PEV: 'centre',
  PCS: 'centre',
  PSD: 'centre',
  PBD: 'centre',
  AdI: 'centre',
  // Vert'libéraux
  PVL: 'gl',
  // PLR
  PLR: 'plr',
  PRD: 'plr',
  'PLR (PRD)': 'plr',
  PLS: 'plr',
  PSL: 'plr',
  // UDC
  UDC: 'udc',
  UDF: 'udc',
  Lega: 'udc',
  MCG: 'udc',
  DS: 'udc',
  'Dém.': 'udc',
  'Rép.': 'udc',
  // exclus
  JB: null,
  LS: null,
  Front: null,
  Grut: null,
  Autres: null,
};

// Renvoie l'élection au plus tard égale à `year`, ou null
export function pickElection(canton, year) {
  /* même logique que canton-detail.js */
}

// Renvoie un tableau ordonné [{ id, label, color, share }] où share est le
// pourcentage de sièges de la famille dans le total des sièges considérés
// (exclut "Autres"/régionaux/null). Les familles absentes ont share=0.
export function computeFamilyShares(canton, year) {
  /* ... */
}
```

`computeFamilyShares` doit :

1. Récupérer l'élection via `pickElection`.
2. Pour chaque parti dont `seats !== null` et `family !== null`, ajouter
   `seats` au bucket correspondant ; sommer le total considéré.
3. Diviser chaque bucket par le total considéré × 100 pour obtenir un %.
4. Retourner les 7 familles dans l'ordre `SWISS_FAMILIES`, avec `share=0` pour
   celles qui n'apparaissent pas.

Ne pas réutiliser `total_seats` du JSON pour le dénominateur — utiliser la
**somme effectivement attribuée** aux 7 buckets, sinon les rectangles ne
sommeront pas à 100 % et seront systématiquement plus courts qu'attendu.

---

## 3. Refonte de `src/modules/switzerland-map.js`

### 3a. Supprimer le système choroplèthe

- Retirer `import { colorScale } from './scales.js';`
- Retirer `_computeFarRightShare` et `_getCantonFill`.
- Les `<path>` cantons doivent désormais avoir un **fill neutre** (utiliser
  `var(--bg-elevated)` qui est déjà la couleur "no data") et garder le stroke
  existant. Conserver le hover (assombrir légèrement), mais sans dépendre de la
  donnée — utiliser une teinte fixe pour le hover.
- Conserver `FILL_OPACITY` (le watermark de l'année doit rester visible).

### 3b. Ajouter un groupe de rectangles par canton

Dans `initSwitzerlandMap`, après le bloc `cantons-group`, créer :

```js
const barsG = _svg.append('g').attr('class', 'cantons-bars-group');
```

Pour chaque feature, calculer le centroïde projeté **une seule fois** :

```js
const cantonRows = geoCantons.features.map((f) => {
  const [cx, cy] = _path.centroid(f);
  return { feature: f, cx, cy, kantonsnummer: f.properties.kantonsnummer };
});
```

Stocker dans une variable de module pour réutilisation au resize / update.

### 3c. Constantes de dimensions

```js
const BAR_WIDTH = 56; // largeur du rectangle global (en unités SVG, viewBox 900x560)
const BAR_HEIGHT = 12; // hauteur du rectangle global
const BAR_BORDER = 0.6; // contour du rectangle global
```

Quelques cantons sont visuellement collés (ZH/ZG, BS/BL, AR/AI). Le
chevauchement est accepté — c'est le compromis pour un visuel comparable.
Pour les deux Appenzell, vous pouvez **décaler manuellement** AI de quelques
unités vers le sud-est si la lisibilité l'exige (corriger via une table
d'overrides `kantonsnummer → { dx, dy }`).

### 3d. Rendu initial

```js
const bars = barsG
  .selectAll('g.canton-bar')
  .data(cantonRows, (d) => d.kantonsnummer)
  .join('g')
  .attr('class', 'canton-bar')
  .attr(
    'transform',
    (d) => `translate(${d.cx - BAR_WIDTH / 2}, ${d.cy - BAR_HEIGHT / 2})`,
  );

// fond + contour du rectangle global
bars
  .append('rect')
  .attr('class', 'canton-bar-bg')
  .attr('width', BAR_WIDTH)
  .attr('height', BAR_HEIGHT)
  .attr('fill', 'var(--bg-surface)')
  .attr('stroke', 'var(--border-strong)')
  .attr('stroke-width', BAR_BORDER);

// 7 segments empilés horizontalement
const segG = bars.append('g').attr('class', 'canton-bar-segments');
```

Puis appeler une fonction `_renderBars(year)` qui, pour chaque canton, met à
jour la largeur et la position x de chacun des 7 segments :

```js
function _renderBars(year) {
  barsG.selectAll('g.canton-bar').each(function (d) {
    const shares = computeFamilyShares(
      _cantonsElections.cantons[String(d.kantonsnummer)],
      year,
    );
    let xOffset = 0;
    const segs = d3
      .select(this)
      .select('.canton-bar-segments')
      .selectAll('rect.fam-seg')
      .data(shares, (f) => f.id)
      .join('rect')
      .attr('class', (f) => `fam-seg fam-${f.id}`)
      .attr('y', 0)
      .attr('height', BAR_HEIGHT)
      .attr('fill', (f) => f.color);

    segs
      .transition('t-rect')
      .duration(450)
      .ease(d3.easeCubicInOut)
      .attr('x', (f) => {
        const x = xOffset;
        xOffset += (f.share / 100) * BAR_WIDTH;
        return x;
      })
      .attr('width', (f) => (f.share / 100) * BAR_WIDTH);
  });
}
```

Attention : la closure sur `xOffset` ci-dessus est subtile parce que d3 itère
le selection en interne. Utilisez plutôt un **précalcul** par canton :

```js
// recommandé — précalcul des x avant d3.join
const segments = shares.reduce((acc, f) => {
  const last = acc[acc.length - 1];
  const x = last ? last.x + last.w : 0;
  const w = (f.share / 100) * BAR_WIDTH;
  acc.push({ ...f, x, w });
  return acc;
}, []);
```

Puis lier `segments` au selection et utiliser `f.x`, `f.w` directement.

### 3e. Aucune donnée pour cette année

Si `pickElection` renvoie `null` (avant 1971 pour la plupart des cantons), le
groupe de segments doit être **vide** (largeur 0 partout) et seul le rectangle
de fond est visible. Optionnellement, hachurer le fond (`stroke-dasharray`)
pour signaler "pas de donnée".

### 3f. Mise à jour annuelle

Remplacer le contenu actuel de `updateSwitzerlandMap(year)` par un appel à
`_renderBars(year)` (toujours en transition nommée `t-rect` pour ne pas
écraser `t-zoom` / `t-zoom-group`).

### 3g. Zoom canton

Lors de `zoomToCanton`, garder l'opacité de cohérence : les rectangles des
**autres** cantons doivent passer à opacity 0.15, comme les paths. Pour cela,
appliquer la même règle d'opacité sur le groupe `cantons-bars-group` que sur
`cantons-group` (sélectionner par `data-canton-id` côté bars aussi — ajouter
cet attribut sur le `g.canton-bar`).

`resetCantonZoom` doit aussi remettre l'opacité des rectangles à 1.

---

## 4. Légende — `#switzerland-legend`

### 4a. HTML

Dans `index.html`, à l'intérieur du `<div class="sticky">` de la section
`#switzerland`, **avant** `#event-tiles-switzerland-overlay`, ajouter :

```html
<aside
  id="switzerland-legend"
  class="switzerland-legend"
  aria-label="Légende familles politiques"
>
  <p class="switzerland-legend-title">Familles politiques</p>
  <ul class="switzerland-legend-list">
    <li>
      <span
        class="legend-swatch"
        style="background:#7A0E26"
      ></span>
      Extrême gauche
    </li>
    <li>
      <span
        class="legend-swatch"
        style="background:#E2231A"
      ></span>
      PS
    </li>
    <li>
      <span
        class="legend-swatch"
        style="background:#1F7A3A"
      ></span>
      Écologistes
    </li>
    <li>
      <span
        class="legend-swatch"
        style="background:#F08A1F"
      ></span>
      Centre
    </li>
    <li>
      <span
        class="legend-swatch"
        style="background:#A6CE39"
      ></span>
      Vert'libéraux
    </li>
    <li>
      <span
        class="legend-swatch"
        style="background:#1E90C8"
      ></span>
      PLR
    </li>
    <li>
      <span
        class="legend-swatch"
        style="background:#4F8F3A"
      ></span>
      UDC
    </li>
  </ul>
</aside>
```

Mieux : générer la liste par JS depuis `SWISS_FAMILIES` (single source of
truth — si une couleur change, un seul endroit à modifier). Exposer une
fonction `renderSwissLegend(container)` dans `swiss-families.js` ou créer
`src/modules/swiss-legend.js`. Appeler cette fonction depuis `bootSwitzerland`
dans `main.js`.

### 4b. CSS

Dans `src/style.css` (proche du bloc `.event-tiles-column`), ajouter :

```css
.switzerland-legend {
  position: absolute;
  top: 24px;
  left: 24px;
  z-index: 25; /* au-dessus de #event-tiles-switzerland-overlay (z-20) */
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: 6px;
  padding: 12px 14px;
  font-size: 12px;
  pointer-events: none;
  box-shadow: var(--shadow-sm);
  max-width: 220px;
}
.switzerland-legend-title {
  font-weight: 600;
  margin-bottom: 8px;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--text-secondary);
}
.switzerland-legend-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  list-style: none;
  margin: 0;
  padding: 0;
}
.switzerland-legend-list li {
  display: flex;
  align-items: center;
  gap: 8px;
}
.legend-swatch {
  display: inline-block;
  width: 12px;
  height: 12px;
  border-radius: 2px;
  flex-shrink: 0;
  border: 1px solid rgba(0, 0, 0, 0.15);
}
```

### 4c. Empêcher les tuiles d'événement de passer au-dessus

Deux protections complémentaires (ceinture + bretelles) :

1. **Z-index** : `.switzerland-legend` est à `z-index: 25`, l'overlay
   d'événements est à `z-20`. La légende est au-dessus.
2. **Layout** : on **réduit la zone des tuiles côté gauche** dans la section
   suisse pour qu'elles ne s'affichent pas derrière la légende. Ajouter en
   CSS :

   ```css
   #switzerland #event-tiles-switzerland-overlay .event-tiles-column-left {
     /* la légende occupe environ top:24px..210px à gauche — reculer la colonne */
     top: 220px;
   }
   ```

   Vérifier visuellement la hauteur réelle de la légende (7 lignes ~ 180–200
   px) et ajuster si besoin. Le `top:220px` laisse 10–20 px de marge.

   En mode focus (canton sélectionné), la colonne `-left` est déjà cachée
   (`display:none`), donc rien à faire de plus.

---

## 5. Bottom controls : "UDC Scale"

Le bandeau bas contient toujours `<p class="udc-scale-label">UDC Scale</p>`.
Avec le nouveau visuel (rectangles), cette légende n'est plus pertinente. La
**supprimer** dans `index.html` (et son CSS associé `.udc-scale-label` si
plus rien n'y pointe). Garder le bouton play et la timeline horizontale tels
quels.

---

## 6. `canton-detail.js` — à laisser en l'état

Le panneau de détail canton utilise déjà `FAMILY_META` et son propre rendu en
barres internes. **Ne pas le modifier** : il continue d'afficher les partis
individuels avec leurs tones. Pas de cohabitation problématique avec la
nouvelle représentation cantonale.

---

## 7. `scales.js`

`colorScale` est encore utilisé par `europe-map.js` (carte Europe choroplèthe
rouge). **Ne PAS le supprimer** — uniquement retirer son import depuis
`switzerland-map.js`.

---

## 8. Étapes d'implémentation suggérées

1. Créer `src/modules/swiss-families.js` (constantes + `pickElection` +
   `computeFamilyShares` + helper de rendu de légende).
2. Modifier `src/modules/switzerland-map.js` : retirer choroplèthe, ajouter
   groupe de barres, fonctions `_renderBars`, brancher l'opacity sur
   zoom/reset.
3. Ajouter `<aside id="switzerland-legend">` dans `index.html` (la peupler
   par JS depuis `swiss-families.js` au boot Suisse).
4. Ajouter le CSS `switzerland-legend.*` + override
   `#switzerland .event-tiles-column-left { top: 220px }` dans `style.css`.
5. Retirer `udc-scale-label` (HTML + CSS).
6. `npm run dev`, scroller jusqu'à la section Suisse, vérifier sur les 5
   années de la timeline (1999, 2007, 2015, 2019, 2026) :
   - Les rectangles évoluent visiblement (UDC s'élargit avec le temps).
   - L'ordre est cohérent gauche → droite.
   - La somme visuelle remplit ~le rectangle entier.
   - La légende est visible et les tuiles d'événement n'apparaissent
     jamais par-dessus.
   - Le clic sur un canton zoome et estompe les autres rectangles.
   - Le retour ramène l'opacité.
7. `npm run format` puis commit avec un message du style :
   `replace switzerland choropleth with per-canton family rectangles`.

---

## 9. Pièges connus

- **Centroïdes dégénérés** : certains polygones à trous peuvent renvoyer un
  centroïde NaN. Filtrer `Number.isFinite(cx) && Number.isFinite(cy)` avant
  d'append le groupe.
- **Sommation avec PVL** : `family_code 80` actuel mélange PBD/AdI/PVL. Bien
  isoler PVL → bucket `gl`, et basculer PBD/AdI → bucket `centre`. Sinon le
  bucket Vert'libéraux paraîtra trop gros pour la période 1971–1999 (où PVL
  n'existait pas mais où AdI pesait encore).
- **Élections antérieures à 1999** : la timeline visible va de 1999 à 2026,
  mais la donnée remonte à 1971. `pickElection` peut donc trouver une
  élection antérieure à 1999 — c'est le comportement souhaité.
- **Mode sombre** : tester les 7 couleurs en `.dark`. Le rouge PS et le
  bordeaux extrême-gauche peuvent fusionner visuellement ; ajuster si besoin
  (le bordeaux peut être éclairci en mode sombre).
- **Performance** : 26 cantons × 7 segments = 182 rects, transitions de
  450 ms. Aucun souci de perf attendu, mais ne pas réinstancier la selection
  à chaque update — `data().join()` doit réutiliser les nœuds.
