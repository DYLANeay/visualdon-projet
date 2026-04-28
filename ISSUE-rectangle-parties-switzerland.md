# Carte Suisse : remplacer le choroplèthe par des rectangles de familles politiques

## Contexte

La carte de la Suisse (chapitre 2) utilise actuellement un choroplèthe rouge
basé sur le score UDC (`colorScale` thresholdée). Cette représentation
écrase tout le paysage politique cantonal en une seule mesure et ne permet
pas de comparer la composition globale d'un canton.

## Objectif

Au lieu d'un fond coloré, afficher **dans chaque canton un rectangle centré
sur son centroïde**, contenant 7 sous-rectangles correspondant aux
familles politiques helvétiques. La **largeur** de chaque sous-rectangle est
proportionnelle au % de voix de la famille au scrutin du canton à l'année
courante. L'ordre est fixe, **gauche → droite : extrême gauche → UDC**.

## Familles et codes couleurs (officiels CH)

| Ordre | Famille        | Couleur                 |
| ----- | -------------- | ----------------------- |
| 1     | Extrême gauche | Rouge foncé / bordeaux  |
| 2     | PS             | Rouge vif               |
| 3     | Écologistes    | Vert foncé              |
| 4     | Centre         | Orange                  |
| 5     | Vert'libéraux  | Vert clair / jaune-vert |
| 6     | PLR            | Bleu clair              |
| 7     | UDC            | Vert moyen (CH)         |

À noter : le vert UDC (racines paysannes) ne doit pas être confondu avec le
vert des écologistes.

## Critères d'acceptation

- [ ] Plus aucune dépendance à `colorScale` dans `switzerland-map.js`.
- [ ] Chaque canton affiche un rectangle stacké de 7 segments ordonnés
      gauche → droite.
- [ ] La largeur des segments évolue de manière fluide à chaque changement
      d'année (transitions ~450 ms).
- [ ] Une **légende de couleurs** est visible dans la section Suisse, avec
      les 7 familles et leur libellé.
- [ ] Les **tuiles d'événements** ne peuvent pas s'afficher par-dessus la
      légende (z-index + ajustement du `top` de la colonne gauche).
- [ ] Le zoom canton estompe les rectangles des autres cantons (cohérent
      avec le comportement actuel des paths).
- [ ] La carte se met à jour pour 1999, 2007, 2015, 2019 et 2026 en
      reflétant l'évolution de l'UDC et des autres familles.

## Travail à faire

Voir `PLAN-rectangle-parties-switzerland.md` (à la racine de la branche
`rectangle-parties-switzerland`) pour le détail :

- Nouveau module `src/modules/swiss-families.js` (mapping parti → famille,
  calcul des % par famille).
- Refonte de `src/modules/switzerland-map.js` (suppression du choroplèthe,
  ajout d'un groupe `cantons-bars-group`).
- Nouvel élément `#switzerland-legend` dans `index.html` + CSS.
- Suppression du label "UDC Scale" devenu obsolète.

## Branche

`rectangle-parties-switzerland` (basée sur `main`).
