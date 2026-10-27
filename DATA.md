# Provenance des données

© 2026 Benjamin Daguier — Tous droits réservés.
Les licences des données ouvertes restent applicables indépendamment de ce copyright.

Date de récupération : 26 octobre 2026. Les dates de mise à jour des objets sont
conservées séparément ; une récupération récente ne signifie pas un relevé récent.

## France

IGN BD TOPO, couche `BDTOPO_V3:point_de_repere`, WFS
`https://data.geopf.fr/wfs/ows`. Requête GetFeature version 2.0.0,
outputFormat application/json, srsName EPSG:4326. BBOX transmis en ordre
latitude/longitude EPSG:4326 : `47.25,-0.9,47.7,-0.2`.
Pagination count=3000 puis startIndex=3000, count=1000.
Réponses brutes : fr-pk.json, fr-rest.json.

Seuls les statuts « PR valide » et « PR0 valide » portant un numéro numérique
sont retenus. Les points calculés sont exclus. Section, côté, statut, numéro,
source DGITM et dates sont conservés. Les PR ne sont pas convertis en distance
kilométrique continue. Licence Ouverte 2.0.

## Espagne

IGN / CNIG IGR-RT :
`https://api-features.idee.es/collections/markerpost/items?f=json&bbox=-0.8,39.2,0,39.8&limit=1000`
Offsets 0, 1000, 2000, 3000, 4000, 5000. Réponses brutes : es-pk.json et
es-page-1000.json à es-page-5000.json. L’API peut renvoyer moins d’éléments que
limit tout en exposant une page suivante : toutes les pages annoncées ont été consultées.

Seules les entités `VIAL_PK` sont admises ; les bornes ferroviaires `FFCC` sont
exclues. Les références de route sont jointes par `href_vial` à l’identifiant GML
de `tn-ro:Road` dans le WFS officiel
`https://servicios.idee.es/wfs-inspire/transportes` ; le nom de route est extrait
du `geographicalName`, pas déduit du code interne nationalRoadCode.
Réponses : es-road-join.xml, es-road-join-2.xml à es-road-join-4.xml.
Les routes sans jointure vérifiable sont exclues, avec leur compte dans provenance.json.
Couverture volontairement partielle. Obra derivada de IGR-RT CC-BY 4.0 ign.es.

## OpenStreetMap

Géocodage de Valencia et Angers : Nominatim, search, format=jsonv2, limit=1.
Identifiants OSM et coordonnées des centres conservés dans catalog.json.
Fichiers bruts : valencia-city.json, city-angers.json.

Overpass : `https://overpass-api.de/api/interpreter`, requêtes bornées par BBOX.
Valencia : sud 39.45, ouest -0.402, nord 39.49, est -0.35.
Angers : sud 47.46, ouest -0.58, nord 47.49, est -0.53.
Groupes : nwr[amenity], nwr[historic], way[junction=roundabout], sortie center tags.
Un sous-ensemble utile d’amenity et les repères nommés sont conservés ; centres
de polygones conservés tels quels, pas transformés en entrées de bâtiments.
Les tentatives additionnelles sur les commerces n’ayant pas abouti ne sont pas
présentées comme une couverture complète.

Axes : way[highway~"^(motorway|trunk)$"], out geom. Valencia :
BBOX 39.3,-0.65,39.65,-0.22 ; Angers : rayon 30 km autour de
47.4739884,-0.5515588. Tous les sommets géographiques conservés sans interpolation.
Fichiers : osm-Valencia-pois.json, osm-Angers-pois.json,
osm-Valencia-roads.json, osm-Angers-roads.json.

© OpenStreetMap contributors, ODbL 1.0. Les identifiants, liens d’entité et dates
de base OSM sont conservés. Les données normalisées sont distribuées sous ODbL.

## Fonds de carte

OpenFreeMap (OpenMapTiles / OpenStreetMap), style Positron, sans clé et usage
commercial autorisé par le fournisseur. Si WebGL 2 n’est pas disponible,
fond Esri Light Gray de secours, explicitement signalé comme potentiellement
ancien ; service annoncé en retrait en décembre 2029. Satellite : Esri World
Imagery, attributions visibles. Aucun téléchargement massif de tuiles.

## Reproduction

`python scripts/prepare-data.py /chemin/des/reponses/brutes` normalise les
réponses sans inventer de positions. `dist/data/provenance.json` contient les
empreintes SHA-256 des réponses utilisées. Les fichiers bruts volumineux ne sont
pas nécessaires à l’exécution du site. `npm test` vérifie les règles avec les
vraies données intégrées.
