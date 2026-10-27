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

## Extension nationale, 27 octobre 2026

`dist/national.js` interroge les inventaires nationaux sur la zone visible (zoom 10+) et sur une route saisie. Aucun serveur privé, aucun abonnement requis. Les requêtes sont différées et mises en cache en mémoire. Un inventaire national n'est pas un inventaire exhaustif de toutes les bornes physiques.

France : WFS IGN `BDTOPO_V3:point_de_repere`, toutes les routes du service national (autoroutes, nationales, départementales). EPSG:4326 demandé explicitement ; statut `PR valide` ou `PR0 valide` et numéro numérique uniquement. Section et côté préservés ; aucune borne voisine présentée comme appartenant à la même section si celle-ci manque.

Espagne : API officielle IGN/CNIG `markerpost`, identifiants `VIAL_PK` uniquement, ferroviaire exclu. Les pages intermédiaires peuvent contenir moins d'objets que la limite demandée tout en annonçant une page suivante : la pagination suit le lien `rel=next`. Noms associés à `href_vial` par le WFS officiel `Road`, sans déduire le nom d'une route à partir de coordonnées. Une route non résolue est signalée. Pour le placement sur la carte, les bornes sont affichées même si le nom de la route reste inconnu ; ce nom peut être résolu à la sélection. Pour une recherche de route, le filtre porte sur le nom géographique officiel.

Le catalogue compact `es-road-catalog.json` contient les deux références IGN AP-7 explicitement retournées par le filtre national (pas une association déduite). `es-ap7.json` conserve 1481 positions officielles AP-7 récupérées sur les deux références, 1324 et 157 objets, le 27 octobre 2026. Les numéros manquants ne sont pas interpolés ; ce fichier ne garantit pas chaque kilomètre de l'AP-7. Source : IGN/CNIG IGR-RT, CC-BY 4.0. Le XML brut est conservé hors du dossier publié, en `/tmp/pk-national/ap7-first.xml` pendant la préparation.

Allemagne : BKG POI-Open, kilométrage des Bundesautobahnen (autoroutes fédérales), millésime 03/2025 ; diffusion Esri Deutschland : `https://services2.arcgis.com/jUpNdisbWqRpMo35/arcgis/rest/services/KmBAB/FeatureServer/0`. L'inventaire national annonce 13211 positions. Licence Deutschland Namensnennung 2.0. Attribution : © Bundesamt für Kartographie und Geodäsie (2025). Le signe de stationnement n'est pas transformé en sens de circulation ; le référentiel ne garantit pas une borne physique ni une position sur une chaussée précise. Les routes allemandes autres que les autoroutes ne sont pas couvertes par cette source.

Les services FR / DE sont paginés, avec limite de 16000 / 20000 objets par demande ; ES limite à 16000 par référence. Une limite atteinte est explicitement signalée et invite à zoomer. Les erreurs de service sont affichées ; aucune absence de réponse ne devient une position supposée. Les repères OSM hors Valencia/Angers restent chargés par la commande de recherche des données de la zone ou lors de la sélection d'un point.

Les réponses nationales réelles utilisées pour les tests de normalisation sont dans `tests/fixtures`. Les tests vérifient aussi l'exclusion des points calculés, la conservation des coordonnées, la pagination espagnole avec page courte et la possibilité de retenter une requête échouée.

## Version 1.2.0 — téléchargement intégral et index statiques

Le 27 octobre 2026, `scripts/build-national.py` a récupéré l'intégralité des réponses nationales, sans restriction de ville ou de route. France : 471316 entrées de statut PR valide / PR0 valide ; 6 numéros non numériques exclus, 471310 conservées. Espagne : 190893 identifiants routiers `VIAL_PK`, filtre CQL `localid LIKE 'VIAL_PK%'` ; les références ferroviaires sont exclues à la source. Allemagne : 13211 positions BKG POI-Open du service de diffusion Esri Deutschland. Les totaux attendus sont lus dans les réponses des services ; la construction échoue si des pages manquent ou si des identifiants sont dupliqués.

Les 15456 références routières espagnoles sont résolues à partir de la classe WFS `tn-ro:RoadName`, bien plus légère que `Road`. Des identifiants de noms candidats servent uniquement aux requêtes ; chaque nom retourné est relié à la route par son véritable `net:networkRef/net:LinkReference/net:element` du document source. Cette relation explicite est contrôlée contre les références des bornes. Aucun nom n'est déduit de la forme d'un identifiant ou de coordonnées. Les éventuels noms absents déclenchent une consultation de la classe `Road`. Sur cet export, zéro borne espagnole ne reste sans nom résolu.

Le cas AP-1 PK 125 figure deux fois : VIAL_PK200130051658, sens de référence, longitude -2.51010256508124, latitude 43.03885201600781 ; VIAL_PK200130051667, sens opposé, longitude -2.510531832178288, latitude 43.03890752216449. Source IGN/CNIG, date d'objet 2020-02-28. Ces deux points sont confirmés par la référence routière VIAL_LI600000000018. Ils ne sont pas fusionnés.

Les données normalisées sont stockées sous `dist/data/national/` lors de la construction : une grille d'un degré pour la carte, 256 groupes de routes par pays pour les recherches, un aperçu à faible zoom, et un manifeste avec les comptes, les limites géographiques et SHA-256 des réponses brutes. Tous les champs de coordonnées conservent les valeurs sources. L'aperçu et l'espacement des étiquettes sélectionnent des points existants ; ils ne produisent pas de positions intermédiaires. Le rendu général affiche selon le zoom des multiples de 100, 50, 20, 10, 5 puis les bornes individuelles.

Les sources restent les mêmes et leurs licences ci-dessus s'appliquent. Allemagne : couverture nationale des autoroutes fédérales uniquement. France : les PR sont locaux à des sections et peuvent recommencer à zéro ; les secteurs ultramarins sont inclus lorsqu'ils existent dans le WFS. Espagne : péninsule, Baléares et Canaries. L'intégralité de l'inventaire public téléchargé ne signifie pas que le producteur documente physiquement chaque borne ou chaque route. Un numéro absent n'est jamais reconstruit.
