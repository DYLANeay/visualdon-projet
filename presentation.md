---
marp: true
size: 16:9
paginate: true
backgroundColor: '#f5f1ea'
color: '#0a0a0a'
style: |
  @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600;9..144,700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');

  section {
    font-family: 'Inter', system-ui, sans-serif;
    background: #f5f1ea;
    color: #0a0a0a;
    padding: 70px 90px;
    font-size: 21px;
    line-height: 1.55;
    -webkit-font-smoothing: antialiased;
  }

  h1, h2, h3 {
    font-family: 'Fraunces', Georgia, serif;
    color: #0a0a0a;
    letter-spacing: -0.02em;
    line-height: 1.05;
    margin: 0 0 22px;
  }

  h1 {
    font-weight: 600;
    font-size: 56px;
  }

  h1 em, h2 em {
    font-style: italic;
    font-weight: 500;
  }

  h2 {
    font-weight: 600;
    font-size: 40px;
  }

  h3 {
    font-weight: 500;
    font-size: 22px;
    color: #0a0a0a;
    margin: 0 0 10px;
  }

  p, li {
    color: #4a4a4a;
    margin: 0 0 10px;
  }

  strong {
    color: #0a0a0a;
    font-weight: 600;
  }

  a {
    color: #c8102e;
    text-decoration: none;
  }

  ul, ol {
    margin: 12px 0;
    padding-left: 22px;
  }

  li {
    margin-bottom: 6px;
  }

  code {
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.85em;
    background: #ffffff;
    border: 1px solid #e5e0d5;
    border-radius: 4px;
    padding: 2px 6px;
    color: #0a0a0a;
  }

  .eyebrow {
    font-family: 'JetBrains Mono', monospace;
    font-size: 11px;
    font-weight: 500;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    color: #c8102e;
    margin: 0 0 22px;
    display: block;
  }

  .rule {
    width: 2px;
    height: 36px;
    background: #c8102e;
    margin: 0 0 22px;
  }

  .deck {
    font-family: 'Fraunces', Georgia, serif;
    font-style: italic;
    font-size: 22px;
    color: #4a4a4a;
    max-width: 820px;
    line-height: 1.45;
    margin: 0 0 18px;
  }

  .meta {
    font-family: 'JetBrains Mono', monospace;
    font-size: 11px;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    color: #8a8a8a;
    margin: 0;
  }

  .authors {
    font-family: 'Fraunces', serif;
    font-style: italic;
    font-size: 22px;
    color: #4a4a4a;
    margin: 0 0 24px;
  }

  .columns {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 48px;
    margin-top: 6px;
  }

  .col h3 {
    font-family: 'JetBrains Mono', monospace;
    font-size: 11px;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    color: #c8102e;
    margin: 0 0 12px;
    font-weight: 500;
  }

  .col p, .col li {
    font-size: 19px;
    line-height: 1.55;
  }

  .card {
    background: #ffffff;
    border: 1px solid #e5e0d5;
    border-radius: 8px;
    padding: 20px 24px;
    box-shadow: 0 1px 3px rgba(10,10,10,0.04);
  }

  .stack-grid {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 18px;
    margin-top: 64px;
  }

  .stack-item {
    background: #ffffff;
    border: 1px solid #e5e0d5;
    border-radius: 14px;
    padding: 36px 16px 28px;
    text-align: center;
    box-shadow: 0 1px 3px rgba(10,10,10,0.04);
  }

  .stack-item img {
    height: 72px;
    margin: 0 auto 24px;
    display: block;
  }

  .stack-item strong {
    font-size: 18px;
    display: block;
    margin-bottom: 4px;
  }

  .stack-item span {
    font-size: 13px;
    color: #8a8a8a;
  }

  /* Title slide */
  section.title {
    padding: 96px 110px;
  }

  section.title h1 {
    font-size: 76px;
    margin-bottom: 28px;
  }

  /* Section divider */
  section.divider h1 {
    font-size: 88px;
  }

  section.divider .deck {
    margin-top: 24px;
    font-size: 26px;
  }

  /* Demo slide (dark) */
  section.demo {
    background: #0a0a0a;
    color: #f5f1ea;
    text-align: center;
    padding: 90px 110px;
  }

  section.demo h1 {
    color: #0a0a0a;
    font-size: 88px;
  }

  section.demo h1 em {
    color: #c8102e;
  }

  section.demo .meta {
    color: rgba(245, 241, 234, 0.6);
    margin-top: 36px;
  }

  section.demo .eyebrow {
    color: #c8102e;
  }

  section.demo .rule {
    margin-left: auto;
    margin-right: auto;
  }

  /* Pagination */
  section::after {
    font-family: 'JetBrains Mono', monospace;
    font-size: 10px;
    letter-spacing: 0.1em;
    color: #8a8a8a;
  }

  section.title::after,
  section.demo::after,
  section.divider::after {
    color: transparent;
  }
---

<!-- _class: title -->

<div class="rule"></div>

<span class="eyebrow">VisualDon 2026 · M53-2</span>

# La montée de<br /><em>l'extrême droite</em>

<p class="authors">Dylan Eray &amp; Loic Peyramaure</p>

<p class="meta">HEIG-VD · Une enquête, 1900-2026</p>

---

<span class="eyebrow">Données · Sources</span>

## D'où viennent les chiffres ?

<div class="columns">
<div class="col">

### Europe (1900-2023)

- **ParlGov** : 1 700 partis, 9 800 résultats, 30+ pays
- **Manifesto Project (MPDS2025a)** : 5 285 programmes, positionnement gauche-droite via le code `parfam`
- **CShapes · ETHZ** : map de l'europe
- **Wikipedia** : événements 

### Suisse

- **admin.ch** : élections fédérales par canton
- **swisstopo** : frontières cantonales (GeoJSON)
- **Wall of Shame · nopasaran.ch** : registre citoyen des dérapages d'extrême droite


</div>
<div class="col">

### Trois natures de données

- Quantitatif électoral _(CSV)_
- Géographique _(GeoJSON)_
- Qualitatif événementiel _(scraping web)_

### Limite assumée

La notion d'**« extrême droite »** n'est pas universelle. Nous avons interviewé deux politiciens, du centre (La Tour-de-Peilz) et du PS (Montreux), pour définir cette notion. L'IA nous a aussi aidé à classifier certains partis.

</div>
</div>

---

<span class="eyebrow">Données · Manipulations</span>

## Du CSV brut à la visualisation

1. **Filtrage** : extraction des partis d'extrême droite via `parfam = 70` _(Manifesto)_
2. **Croisement** : fusion **ParlGov × Manifesto** par pays, année et parti
3. **Agrégation** : somme des `vote_pct` de tous les partis d'extrême droite par scrutin pour obtenir le **poids électoral national**
4. **Scraping** : 482 événements extraits de _nopasaran.ch_, regroupés par année et canton _(parsing du champ `party` : ex. « UDC - ZH »)_
5. **Simplification GeoJSON** : optimisation des maps qui étaient très lourdes au départ pour rendre l'application la plus fluide possible
6. **Export** : plusieurs fichiers consolidés alimentent les vues : `elections.json` (Europe), `cantons-elections.json` (Suisse), `cheflieux-2023.json` (clivage ville/campagne), `nopasaran/data.json` (Wall of Shame, Suisse), `wikipedia/events.json` (contexte historique) + les GeoJSON Europe & cantons

---

<span class="eyebrow">But du projet</span>

## Explorer _et_ expliquer

<div class="columns">
<div class="col">

### Explorer

Identifier les **tendances communes** ou divergentes entre la Suisse et ses voisins.

- Y a-t-il une vague de fond européenne ?
- Certains pays résistent-ils ?
- Comment se manifeste le clivage ville / campagne et linguistique ?

</div>
<div class="col">

### Expliquer

Raconter **visuellement l'évolution** du poids électoral et ses moments charnières.

- Crises migratoires
- Crises économiques
- Contexte sécuritaire
- Dérapages documentés

</div>
</div>

<p style="margin-top:22px;font-size:19px"><strong>Notre parti pris :</strong> l'extrême droite n'est pas une opinion comme une autre. Le projet documente sa progression pour rendre visible ce qui se joue derrière les pourcentages.</p>

---

<span class="eyebrow">Stack technique</span>

## Notre stack

<div class="stack-grid">

<div class="stack-item">
  <img src="https://cdn.jsdelivr.net/npm/simple-icons@latest/icons/javascript.svg" />
  <strong>JavaScript</strong>
  <span>ES modules</span>
</div>

<div class="stack-item">
  <img src="https://cdn.jsdelivr.net/npm/simple-icons@latest/icons/d3dotjs.svg" />
  <strong>D3.js</strong>
  <span>Cartes & charts</span>
</div>

<div class="stack-item">
  <img src="https://cdn.jsdelivr.net/npm/simple-icons@latest/icons/vite.svg" />
  <strong>Vite</strong>
  <span>Build & dev</span>
</div>

<div class="stack-item">
  <img src="https://cdn.jsdelivr.net/npm/simple-icons@latest/icons/tailwindcss.svg" />
  <strong>Tailwind</strong>
  <span>Styling</span>
</div>

<div class="stack-item">
  <img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/1f999.svg" />
  <strong>Scrollama</strong>
  <span>Scrollytelling</span>
</div>

</div>


---

<!-- _class: demo -->

<div class="rule"></div>

<span class="eyebrow">Démo</span>

# Place à la<br /><em>démo</em>

<p class="meta">npm run dev · localhost:5173</p>

---

<!-- _class: title -->

<div class="rule"></div>

<span class="eyebrow">Merci · Discussion</span>

# Questions ?

<p class="authors">Dylan Eray &amp; Loic Peyramaure · M53-2</p>

<p class="meta">github.com/DYLANeay/visualdon-projet</p>
