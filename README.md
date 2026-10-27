# PK Locator

© 2026 Benjamin Daguier — Tous droits réservés.

Application cartographique statique en français, conçue pour GitHub Pages et
préparée comme PWA. Identité Midnight Navigation éclaircie : panneaux blancs, carte claire, bleu nuit et vert menthe dans les accents.
Aucun serveur applicatif, aucun compte utilisateur et aucune API payante obligatoire.

## État réel au 26 octobre 2026

Le projet est construit et testé en prévisualisation. Le dépôt indépendant
`bdaguier-coder/pk-locator` n’a pas encore été créé. La publication GitHub Pages
est bloquée par la connexion au navigateur GitHub. Aucune adresse HTTPS publiée
n’a été vérifiée ; l’application ne doit pas être présentée comme déjà en ligne.

| Fonction | État et vérification |
|---|---|
| Ville Valencia / Angers | Testées dans le navigateur sur des centres Nominatim réellement récupérés ; grands axes OSM visibles, dont AP-7 à Valencia |
| PK / PR | V-30, PK 12, testé ; A11, PR 257, testé avec choix de section et de côté ; aucun PK interpolé |
| Localisation libre | Sélection du centre testée à Angers ; adresse Nominatim réelle, repères OSM, distances et copie GPS / fiche vérifiés |
| Indices | « McDonald’s, pharmacie, rond-point » testé dans les deux secteurs ; plusieurs hypothèses et concordances affichées |
| Carte | Fond Esri clair de secours affiché et testé ; fond OpenFreeMap configuré mais non vérifié visuellement, WebGL 2 absent du navigateur de test |
| Satellite | Imagerie Esri réellement affichée et contrôlée dans le navigateur |
| Google Maps / Earth | Liens construits sur les coordonnées sélectionnées, target=_blank ; ouverture effective externe non validée |
| Mobile | Présentation et sélection du centre contrôlées dans une fenêtre intégrée de 390 × 844 ; aucun test sur iPhone physique |
| PWA | Manifest, portée relative, icônes et fichiers du cache contrôlés ; installation réelle et mode hors ligne après publication HTTPS à valider |
| Portugal / Allemagne / Italie | Pays disponibles pour recherche de ville et requêtes OSM ; pas de référentiel officiel intégré ni de test terrain national |
| Services publics dynamiques | Adresse Nominatim vérifiée à Angers et sur V-30 ; Overpass parfois lent ou en erreur, couverture externe non garantie |

Le catalogue initial contient 2 459 PR valides IGN autour d’Angers et 574 bornes
espagnoles avec référence de route jointe au WFS officiel. Les 820 bornes
espagnoles sans correspondance de route vérifiable ont été exclues. Les bornes
ferroviaires et les points français au statut « Calculé » sont exclus.
Les secteurs OSM centraux contiennent 2 200 repères à Valencia et 744 à Angers.
Ces inventaires sont partiels ; l’absence d’un résultat ne prouve pas une absence
sur le terrain. Voir DATA.md et dist/data/provenance.json.

## Utilisation

Le mode Ville centre la carte ; les repères intégrés apparaissent au zoom 14.
Hors secteur intégré, le bouton de recherche de zone consulte Overpass.
Le mode PK / PR n’accepte qu’une borne référencée correspondant exactement au
pays, à la route et au numéro. Il propose un choix si la référence est ambiguë.
Pour la localisation libre : appui long, clic droit, activation du placement puis
clic, ou sélection du centre. L’appui long sur un iPhone physique reste à tester.

La recherche par indices est un recoupement déterministe de mots-clés et de noms
d’établissements dans une zone bornée. Il ne s’agit pas d’une compréhension
universelle du langage naturel. Le rayon de proximité est configurable ; aucune
analyse de visibilité, d’accès ou d’itinéraire n’est effectuée. Les coordonnées
d’une zone candidate désignent un repère d’ancrage, jamais la présence confirmée
d’une personne. Les distances sont à vol d’oiseau.

## Développement et vérification

Node 22 ou plus récent, sans installation de dépendances : `npm test`.
Les huit tests portent sur les données réelles, la séparation pays/sections,
l’absence d’interpolation, les concordances, les distances et les actifs PWA.
Pour une consultation locale, servir `dist/` avec un serveur HTTP ; l’ouverture
directe de index.html depuis le système de fichiers ne suffit pas.

Les bibliothèques cartographiques sont vendues localement dans dist/vendor,
avec leurs licences. Aucun secret n’est nécessaire dans le navigateur.
Nominatim se change dans Sources & couverture sans mise à jour du code ; les
services publics partagés ne garantissent pas un usage professionnel massif.

## Publication prévue sur GitHub Pages

Créer uniquement le dépôt public indépendant `pk-locator`, avec la branche main.
Importer les fichiers de ce projet sans .openai ni fichiers de prévisualisation.
Dans les paramètres Pages du dépôt, sélectionner GitHub Actions comme source.
Le workflow `.github/workflows/pages.yml` exécute les tests puis publie `dist/`.
Vérifier l’URL réellement retournée par le déploiement avant toute livraison.
Le compte connecté doit autoriser ce nouveau dépôt à l’application GitHub si son
installation n’a accès qu’à une liste de dépôts sélectionnés.

Après publication : vérifier le chargement sous le sous-chemin du dépôt,
l’installation PWA, le service worker, le cache, le tactile iPhone et les deux
liens externes. Ces étapes restent à faire et ne sont pas déclarées terminées.

## Licences

Le code original porte le copyright demandé. Les licences IGN France, IGN/CNIG
Espagne, OpenStreetMap, Leaflet, MapLibre et des fournisseurs d’imagerie restent
applicables à leurs données et composants. Les textes sont dans LICENSE et DATA.md.
