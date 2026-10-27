#!/usr/bin/env python3
# © 2026 Benjamin Daguier — Tous droits réservés.
"""Normalize source responses without creating geographic positions.

Usage: python scripts/prepare-data.py /absolute/path/to/raw-responses
The raw response filenames and provenance are documented in DATA.md.
Keep raw downloads outside the published directory.
"""
import collections, hashlib, json, math, pathlib, re, sys, xml.etree.ElementTree as ET

RAW = pathlib.Path(sys.argv[1])
OUT = pathlib.Path(__file__).resolve().parents[1] / 'dist/data'
DATE = '2026-10-26'
COPYRIGHT = '© 2026 Benjamin Daguier — Tous droits réservés.'
provenance = []

def read(filename):
    p = RAW / filename
    data = p.read_bytes()
    provenance.append({'file': filename, 'sha256': hashlib.sha256(data).hexdigest()})
    return json.loads(data)

def write(filename, value):
    (OUT / filename).write_text(json.dumps(value, ensure_ascii=False, separators=(',', ':')))

records = {}
for filename in ['fr-pk.json', 'fr-rest.json']:
    j = read(filename)
    for f in j['features']:
        p = f['properties']
        # Exclude calculated and non-numeric points; preserve carriageway/section.
        if p.get('statut') not in ['PR valide', 'PR0 valide'] or not re.fullmatch(r'\d+(?:\.\d+)?', p.get('numero', '')):
            continue
        lon, lat = f['geometry']['coordinates'][:2]
        record = {'id': 'ign-fr:' + p['cleabs'], 'country': 'FR', 'road': p['route'], 'value': float(p['numero']), 'unit': 'PR', 'lat': lat, 'lon': lon, 'direction': 'Côté ' + (p.get('cote') or 'non renseigné'), 'section': p.get('identifiant_de_section'), 'source': 'IGN France · BD TOPO · ' + (p.get('sources') or ''), 'status': p['statut'], 'kind': 'Point de repère officiel valide — lié à une section, précision de la source', 'sourceUpdated': p.get('date_modification') or p.get('date_creation'), 'retrieved': DATE, 'url': 'https://data.geopf.fr/wfs/ows?' + 'service=WFS&version=2.0.0&request=GetFeature&typeNames=BDTOPO_V3:point_de_repere&outputFormat=application/json&resourceID=' + f['id']}
        records[record['id']] = record

names = {}
for filename in [p.name for p in RAW.glob('es-road-join*.xml')]:
    data = (RAW / filename).read_bytes()
    provenance.append({'file': filename, 'sha256': hashlib.sha256(data).hexdigest()})
    root = ET.fromstring(data)
    for f in root.findall('.//{http://inspire.ec.europa.eu/schemas/tn-ro/4.0}Road'):
        name = f.find('.//{http://inspire.ec.europa.eu/schemas/gn/4.0}text')
        if name is not None:
            names[f.attrib['{http://www.opengis.net/gml/3.2}id']] = name.text

unmatched = 0
for filename in ['es-pk.json'] + [f'es-page-{i}.json' for i in [1000,2000,3000,4000,5000]]:
    for f in read(filename)['features']:
        p = f['properties']
        # Railway markers are excluded; route name comes from an explicit IGN join.
        if not f['id'].startswith('VIAL_PK'):
            continue
        road = names.get(p['href_vial'].lstrip('#'))
        if not road:
            unmatched += 1
            continue
        lon, lat = f['geometry']['coordinates'][:2]
        value = p['numero']
        if not isinstance(value, (int, float)):
            continue
        direction = (p.get('sentidopk') or '').split('/')[-1]
        direction = {'bothDirections':'Les deux sens', 'inDirection':'Sens de référence', 'inOppositeDirection':'Sens opposé'}.get(direction, 'Sens non renseigné')
        record = {'id': 'ign-es:' + f['id'], 'country': 'ES', 'road': road, 'value': value, 'unit': 'PK', 'lat': lat, 'lon': lon, 'direction': direction, 'section': p.get('localid_vial'), 'source': 'IGN / CNIG Espagne · IGR-RT', 'status': 'Borne officielle référencée', 'kind': 'Borne du référentiel officiel — précision de la source, présence de la personne non vérifiée', 'sourceUpdated': p.get('fecha_alta'), 'retrieved': DATE, 'url': 'https://api-features.idee.es/collections/markerpost/items/' + f['id'] + '?f=json'}
        records[record['id']] = record

write('official-pks.json', {'copyright': COPYRIGHT, 'pks': list(records.values()), 'unmatchedExcluded': unmatched})
cities = {}
KEEP_TAGS = {'name','brand','operator','amenity','shop','tourism','historic','junction','office','addr:street','addr:housenumber','addr:city'}
for city, bbox in [('Valencia', [39.45,-.402,39.49,-.35]), ('Angers', [47.46,-.58,47.49,-.53])]:
    c = read('valencia-city.json' if city == 'Valencia' else 'city-angers.json')[0]
    points = {}
    timestamps = []
    for filename in [f'osm-{city}-pois.json', f'osm-{city}-extra.json']:
        if not (RAW / filename).exists():
            continue
        j = read(filename)
        if j.get('remark'):
            raise ValueError('Incomplete OSM response: ' + j['remark'])
        timestamps.append(j['osm3s']['timestamp_osm_base'])
        for f in j['elements']:
            t = {k:v for k,v in f.get('tags',{}).items() if k in KEEP_TAGS}
            # Keep the requested useful landmarks; exclude benches/parking spaces etc.
            useful = t.get('amenity') in ['pharmacy','fuel','restaurant','fast_food','cafe','townhall','police','hospital','school','bank','place_of_worship','library','post_office','fire_station','bus_station'] or any(k in t for k in ['shop','historic']) or t.get('junction') == 'roundabout' or t.get('office') == 'government' or t.get('tourism') == 'museum'
            if not useful:
                continue
            pos = f if 'lat' in f else f.get('center', {})
            lat, lon = pos.get('lat'), pos.get('lon')
            if lat is None or lon is None or not (bbox[0] <= lat <= bbox[2] and bbox[1] <= lon <= bbox[3]):
                continue
            id_ = str(f['type']) + '/' + str(f['id'])
            points[id_] = {'id':id_, 'lat':lat, 'lon':lon, 'tags':t, 'url':'https://www.openstreetmap.org/'+id_, 'source':'OpenStreetMap', 'retrieved':DATE}
    j = read(f'osm-{city}-roads.json')
    if j.get('remark'):
        raise ValueError('Incomplete road response')
    roads = []
    for e in j['elements']:
        if e.get('geometry') and e.get('tags',{}).get('highway') in ['motorway', 'trunk']:
            roads.append({'id': 'way/'+str(e['id']), 'road':e['tags'].get('ref') or e['tags'].get('name') or 'Grand axe', 'geometry':[[x['lat'],x['lon']] for x in e['geometry']]})
    data = {'copyright':COPYRIGHT, 'pois':list(points.values()), 'roads':roads, 'osmTimestamp':timestamps, 'bbox':bbox}
    write(city+'.json', data)
    cities[city] = {'name':c['name'], 'lat':float(c['lat']), 'lon':float(c['lon']), 'countryName':'Espagne' if city=='Valencia' else 'France', 'source':'OpenStreetMap / Nominatim', 'sourceId':str(c['osm_type'])+'/'+str(c['osm_id']), 'retrieved':DATE, 'bbox':bbox, 'poiRadius':2000 if city=='Valencia' else 1500, 'poiCount':len(points), 'roadCount':len(roads)}

write('catalog.json', {'copyright':COPYRIGHT, 'retrieved':DATE, 'files':['official-pks.json','Valencia.json','Angers.json'], 'cities':cities})
write('provenance.json', {'copyright':COPYRIGHT, 'retrieved':DATE, 'sourceResponseHashes':provenance, 'officialCounts':dict(collections.Counter(x['country'] for x in records.values())), 'excludedSpanishUnmatched':unmatched})
print(json.dumps({'cities':cities,'officialCounts':dict(collections.Counter(x['country'] for x in records.values())), 'unmatchedExcluded':unmatched}, ensure_ascii=False, indent=2))
