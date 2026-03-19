# Montée de l'extrême droite

Projet de visualisation de données — VisualDon 2026 - Dylan Eray & Loic Peyramaure

---

## Contexte

Les données utilisées dans ce projet proviennent de trois sources principales :

- **[ParlGov](https://parlgov.fly.dev/)** — Infrastructure de données sur les démocraties de l'UE et de l'OCDE (1900–2023), créée par les chercheurs Holger Döring et Philip Manow. Elle contient environ 1 700 partis, 1 000 élections (9 800 résultats) et 1 600 cabinets dans plus de 30 pays. Les données sont accessibles en CSV et via une API. Elles ont été collectées dans un cadre académique pour permettre la recherche comparative en science politique.

- **[Manifesto Project (MPDS2025a)](https://manifesto-project.wzb.eu/datasets/MPDS2025a)** — Jeu de données produit par le Wissenschaftszentrum Berlin für Sozialforschung (WZB) et l'Université de Göttingen, financé par la Deutsche Forschungsgemeinschaft (DFG). Il contient 5 285 programmes électoraux codés de 1 412 partis à travers 877 élections, permettant d'analyser le positionnement idéologique des partis sur un axe gauche-droite. Disponible en CSV, XLSX, Stata et SPSS.

- **[Wall of Shame](https://www.nopasaran.ch/fr-CH)** — Registre des dérapages de l'extrême droite en Suisse, maintenu par Rebel Suisse (licence Creative Commons BY-NC-SA 4.0). Ce site documente les incidents impliquant des politiciens et activistes d'extrême droite suisses (racisme, néonazisme, climatoscepticisme, sexisme, etc.), avec un focus particulier sur l'UDC/SVP.

Ces données ont été collectées dans des contextes différents : les deux premières sources relèvent de la recherche académique et visent à fournir des données électorales objectives et comparatives. La troisième est un projet militant qui documente des incidents concrets liés à l'extrême droite suisse.

### Biais et limites

- **Définition variable** : la notion d'« extrême droite » ou de « droite radicale » n'est pas universelle. Les classifications peuvent varier selon les chercheurs, les médias et les pays. Certains partis se situent à la frontière entre droite conservatrice et extrême droite.
- **Comparabilité** : les systèmes électoraux diffèrent d'un pays à l'autre (proportionnel, majoritaire, mixte), ce qui rend les comparaisons directes délicates.
- **Couverture temporelle** : les données ne remontent pas toujours aussi loin dans tous les pays, et les partis changent de nom, fusionnent ou se scindent au fil du temps.
- **Abstention** : les résultats électoraux ne reflètent que les votes exprimés et non l'opinion de l'ensemble de la population.

---

## Description

Ce projet s'appuie sur deux types de données distincts : des résultats électoraux quantitatifs (structurés au format **CSV**) et des événements socio-politiques qualitatifs (extraits de sources web). L'objectif est de combiner ces informations pour offrir une visualisation à la fois analytique et critique.

### 1. Données électorales (Fichiers CSV)

**A. ParlGov (`view_election.csv`)**
* **Toutes les colonnes :** `country`, `date`, `type`, `party`, `id`, `created_at`, `updated_at`, `party_id_source`, `seats`, `vote_share`, `votes`, `data_source`, `description`, `comment`, `data_json`, `election_id`, `party_id`, `alliance_id`.
* **Colonnes conservées :**
  * `country` : Code du pays.
  * `date` : Date de l'élection (pour extraction de l'année).
  * `party` : Nom du parti.
  * `vote_share` : Pourcentage des suffrages exprimés.

**B. Manifesto Project (`MPDataset_MPDS2025a.csv`)**
* **Toutes les colonnes :** `country`, `countryname`, `oecdmember`, `eumember`, `edate`, `date`, `party`, `partyname`, `partyabbrev`, `parfam`, `candidatename`, `coderid`, `manual`, `coderyear`, `testresult`, `testeditsim`, `pervote`, `voteest`, `presvote`, `absseat`, `totseats`, `progtype`, `datasetorigin`, `corpusversion`, `total`, `peruncod`, thématiques du programme (`per101` à `per706_2`), index politiques (`rile`, `planeco`, `markeco`, `welfare`, `intpeace`), `datasetversion`, `id_perm`.
* **Colonnes conservées :**
  * `countryname` : Nom du pays.
  * `date` / `edate` : Année de l'élection.
  * `parfam` : Famille politique (**le code `70` cible spécifiquement l'extrême droite**).
  * `pervote` : Pourcentage des votes obtenus.

### 2. Données contextuelles (Événements historiques et politiques)

Au-delà de la stricte évolution des courbes électorales, ce projet intègre une double dimension explicative. D'une part, nous superposons aux données quantitatives des **événements historiques majeurs** afin d'illustrer le contexte global dans lequel s'inscrivent ces élections (crises économiques, mouvements migratoires, etc.). D'autre part, nous recensons des **événements directement liés à l'extrême droite** (dérapages de personnalités politiques, controverses, actes documentés). L'objectif est de mettre en lumière à la fois le terreau historique qui favorise la montée de ce courant et les conséquences tangibles du climat socio-politique qu'il instaure.
* **Sources utilisées :** Wikipedia et le registre citoyen *Wall of Shame* (nopasaran.ch/fr-CH).

### 3. Croisement et traitement des données

Le but est de croiser nos différentes sources de données pour avoir un résultat aussi fidèle que possible à la réalité. Ce sera particulièrement fait sur les données provenant de **ParlGov** et **Manifesto Project**, qui traitent des données en Europe.

1. **Agrégation électorale** : Les données des deux fichiers CSV sont fusionnées. Le filtre `parfam == 70` permet d'isoler les partis d'extrême droite. Les scores de ces formations concourant lors d'un même scrutin sont ensuite additionnés pour obtenir le poids électoral national total par année.
2. **Contextualisation critique** : Extraction et intégration d'événements factuels permettant de lier la progression électorale à des répercussions politiques et sociales concrètes dans les différents pays.

### 4. Format de sortie (JSON unique)

L'ensemble des données traitées est exporté dans **un seul fichier JSON** consolidé. Ce format structure d'une part l'évolution électorale, et d'autre part la chronologie des événements, permettant d'alimenter directement la visualisation interactive.

**A. Format des données électorales :**
* `pays` : `String`
* `annee` : `Integer`
* `pourcentage_extreme_droite` : `Float`

**B. Format des événements contextuels :**
* `pays` : `String`
* `annee` : `Integer`
* `titre` : `String`
* `description` : `String`
* `image` : `String` (Optionnel, URL ou chemin de l'illustration)

**Exemple de la structure globale :**
```json
{
  "elections": [
    {
      "pays": "Suisse",
      "annee": 2019,
      "pourcentage_extreme_droite": 25.60
    }
  ],
  "evenements": [
    {
      "pays": "Suisse",
      "annee": 2019,
      "titre": "Campagne d'affichage controversée",
      "description": "Déploiement d'une campagne jugée xénophobe, marquant une radicalisation du discours public et suscitant de vives réactions de la société civile.",
      "image": "assets/img/affiche-2019.jpg"
    }
  ]
}
```

## But

Ce projet combine une approche **exploratoire** et **explicative** :

- **Explorer** : identifier des tendances communes ou divergentes entre la Suisse et ses pays limitrophes. Y a-t-il une progression simultanée dans toute la région ? Certains pays résistent-ils à cette tendance ?
- **Expliquer** : raconter visuellement l'évolution du poids électoral de l'extrême droite sur les dernières décennies, en mettant en lumière les moments charnières (crises migratoires, crises économiques, contexte sécuritaire).

### L'histoire à raconter

L'objectif est de montrer comment le vote d'extrême droite a évolué en Suisse et dans les pays voisins (France, Allemagne, Autriche, Italie), et mettre en lumière les dangers de ce courant politique par des exemples concrets.

## Wireframes 

Les wireframes de ce projet sont disponibles à l'adresse suivante (lien public) : [Wireframes sur Figma](https://www.figma.com/design/Wv2yKdhqnf0hsw7LLN4ZoO/Wireframe?node-id=0-1&p=f).

---

## Références

### Sources de données du projet

- **[ParlGov](https://parlgov.fly.dev/)** — Base de données sur les partis, élections et gouvernements dans les démocraties de l'UE/OCDE. Utilisée largement dans la recherche en science politique comparative.
- **[Manifesto Project](https://manifesto-project.wzb.eu/datasets/MPDS2025a)** — Analyse systématique des programmes électoraux pour mesurer le positionnement idéologique des partis. Projet de référence du WZB Berlin.
- **[Wall of Shame](https://www.nopasaran.ch/fr-CH)** — Registre citoyen documentant les dérapages de l'extrême droite en Suisse.

### Projets et travaux similaires

- **[Kincade Fire Origin](https://projects.sfchronicle.com/2019/kincade-fire-origin/) (San Francisco Chronicle)** : Récit immersif qui retrace, étape par étape, le déclenchement et la progression d’un incendie à l’aide d’une carte dynamique et de textes courts.
- **[Mapbox Storytelling](https://labs.mapbox.com/storytelling/)** : Gabarit de *scrollytelling* pensé pour lier le défilement de la page à l’évolution d’une carte (zoom, déplacement, changement de calques).
- **[The Great Flood of 2019](https://www.nytimes.com/interactive/2019/09/11/us/midwest-flooding.html) (The New York Times)** : Mise en scène très visuelle qui montre l’ampleur géographique et la chronologie d’une inondation à l’échelle d’une région.
- **[Detroit's Segregation Wall](https://www.nbcnews.com/specials/detroit-segregation-wall/) (NBC News)** : Enquête visuelle qui combine contexte historique, archives, témoignages et cartes pour éclairer un enjeu urbain et social.

---
