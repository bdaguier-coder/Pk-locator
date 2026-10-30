# PK Locator

© 2026 Benjamin Daguier — Tous droits réservés.

Application statique et PWA de localisation pour l'assistance. Site : https://bdaguier-coder.github.io/Pk-locator/

## Version 1.2.0 : index nationaux préparés

La recherche PK/PR utilise des fichiers statiques couvrant l'intégralité des réponses des référentiels nationaux téléchargés. Elle est indépendante de la ville et de la zone affichées. Aucun appel à un WFS national n'est nécessaire pour une recherche de borne déjà indexée.

Au 27 octobre 2026, l'index comprend 675 414 positions : 190 893 bornes routières IGN/CNIG en Espagne (péninsule, Baléares et Canaries), 471 310 PR IGN BD TOPO en France (métropole et territoires ultramarins présents dans la source), et 13 211 positions de kilométrage des autoroutes fédérales allemandes BKG POI-Open. Six entrées françaises non numériques sont exclues explicitement. La pagination est vérifiée par les comptes nationaux et les identifiants uniques. Les 15 456 références de routes espagnoles utilisées par les bornes ont été reliées à leurs noms officiels par `RoadName` et son `networkRef`, sans association géographique supposée.

Des boutons Espagne, France et Allemagne affichent les vues générales. Un sélecteur donne accès aux Canaries, aux Baléares et aux territoires ultramarins français présents dans les sources. Les PK réellement présents dans les sources sont espacés selon le zoom, avec des étiquettes numériques compactes : bleu pour les autoroutes, rouge pour les nationales, orange pour les autres routes. Les amas d'étiquettes d'autoroutes des anciens secteurs préchargés sont supprimés à faible zoom.

Le cas AP-1 PK 125 retourne les deux positions et sens IGN au Pays basque. Les homonymes de PR français restent séparés par section et côté. Aucun point absent n'est interpolé. Un inventaire national complet ne garantit pas que chaque borne physique ou chaque route est documentée par le producteur ; l'Allemagne couvre les autoroutes fédérales, pas l'ensemble des autres routes allemandes.

## Autres fonctions

Recherche de ville dans cinq pays (France, Espagne, Allemagne, Portugal, Italie), carte et satellite, placement direct et déplacement d'un point, adresse proche, repères réels à proximité et distances à vol d'oiseau, copie GPS et fiche d'assistance, liens Maps / Earth dans un autre onglet. Recoupement d'indices par mots-clés et noms OSM : plusieurs hypothèses, concordances et éléments non retrouvés explicitement affichés.

Les points d'intérêt extérieurs aux secteurs OSM préchargés de Valencia et Angers sont consultés via Overpass lors d'une sélection ou d'une recherche de zone. Les bâtiments peuvent être représentés par leur centre, pas leur entrée. Les recherches de villes et d'adresses passent par Nominatim ; fournisseurs publics susceptibles de délais et limitations. Aucun compte, aucune publicité, aucun accès GPS automatique.

## Construire et vérifier

Python 3.12+, Node 22+, curl. Aucun paquet applicatif à installer.

```sh
python scripts/build-national.py
npm test
```

Le script récupère et vérifie toutes les pages des trois sources, les noms routiers espagnols, puis produit `dist/data/national/`. Les réponses brutes sont mises en cache dans `.national-cache/`, hors site publié. Les index sont répartis par grille géographique et par groupe de routes pour limiter le volume téléchargé par le téléphone. Les vues générales n'utilisent que des points réels du référentiel à des multiples de dix ; elles ne génèrent pas de nouvelles positions.

La procédure GitHub Actions construit ces données avant les tests et la publication de `dist/` sur GitHub Pages. Le cache évite de télécharger à nouveau les mêmes sources à chaque modification d'interface. Pour une actualisation des sources, changer la clé de cache dans `.github/workflows/pages.yml`. Les données générées (environ 207 Mo) ne sont pas commitées dans Git ; elles sont incluses dans l'artefact Pages. Les comptes, limites géographiques et empreintes des réponses se trouvent dans `data/national/manifest.json` publié.

Les tests vérifient l'exhaustivité de la pagination par rapport aux comptes sources, les associations de routes, les groupes d'index, l'absence d'interpolation, les deux positions AP-1 PK 125, les recherches nationales française et allemande, les recoupements réels Valencia/Angers et les fichiers PWA. Les interactions sont également vérifiées dans le navigateur. L'essai tactile et l'installation sur un iPhone physique restent à effectuer.

## Installation et disponibilité

Sur iPhone, ouvrir dans Safari puis Partager → Sur l'écran d'accueil. L'interface, le manifeste national et l'aperçu espagnol sont préchargés pour le cache ; les autres groupes consultés peuvent être mis en cache progressivement. Une première recherche dans une nouvelle région ou sur une nouvelle route nécessite Internet. Fonds de carte, imagerie, adresses et nouveaux POI nécessitent aussi Internet.

Fond principal OpenFreeMap / OpenStreetMap ; fond Esri Light Gray de secours sans WebGL2. Ce fond de secours peut être ancien. Satellite Esri World Imagery. Les données IGN France sont sous Licence Ouverte 2.0 ; IGN/CNIG Espagne sous CC-BY 4.0 ; BKG POI-Open sous Deutschland Namensnennung 2.0, attribution © Bundesamt für Kartographie und Geodäsie (2025) ; OpenStreetMap sous ODbL. Les licences de données et bibliothèques tierces restent applicables indépendamment du copyright de l'application. Voir DATA.md.


## Version 1.4.0 — navigation des zones candidates

Le bandeau rouge ouvre et ferme les résultats dès le premier clic. La vue générale cadre les périmètres réels de toutes les zones, avec les rayons de 50, 100, 300 ou 500 m. Les marqueurs, les étiquettes fléchées, la liste de résultats et le panneau flottant partagent le même recentrage, sans appel à la recherche de repères ou au géocodage. La sélection reste une hypothèse, jamais une position confirmée.

Sur mobile, le formulaire se replie et les raccourcis des zones défilent horizontalement. Les listes de résultats défilent dans leur propre panneau. La réouverture du formulaire replie les résultats pour éviter les superpositions. Les versions des modules et du service worker sont alignées sur 1.4.0 ; le cache précédent est retiré à l’activation et les applications déjà ouvertes se rechargent lors de la prise de contrôle du nouveau worker.

Validation : `npm test` couvre les résultats réels d’Angers aux quatre rayons, les accès équivalents aux zones, la sélection, les états zéro/une/plusieurs zones et le remplacement des résultats. Les contrôles de navigation ont aussi été exécutés dans le navigateur sur ordinateur et dans une fenêtre de 390 × 844 pixels. Ce dernier contrôle vérifie la mise en page responsive dans Chromium, sans remplacer un essai Safari sur un iPhone physique.
