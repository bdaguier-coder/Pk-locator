#!/usr/bin/env python3
# © 2026 Benjamin Daguier — Tous droits réservés.
"""Build complete, paginated country inventories and lightweight static indexes.
Raw public responses stay outside the published site. No interpolation.
"""
import argparse,collections,concurrent.futures,datetime,hashlib,json,math,re,subprocess,unicodedata,xml.etree.ElementTree as ET
from pathlib import Path
from urllib.parse import urlencode
A=argparse.ArgumentParser();A.add_argument('--cache',default='.national-cache');A.add_argument('--out',default='dist/data/national');args=A.parse_args()
CACHE=Path(args.cache);CACHE.mkdir(parents=True,exist_ok=True);OUT=Path(args.out);OUT.mkdir(parents=True,exist_ok=True)
DAY=datetime.date.today().isoformat();COPY='© 2026 Benjamin Daguier — Tous droits réservés.'
FR='https://data.geopf.fr/wfs/ows';ES='https://api-features.idee.es/collections/markerpost/items';WFS='https://servicios.idee.es/wfs-inspire/transportes';DE='https://services2.arcgis.com/jUpNdisbWqRpMo35/arcgis/rest/services/KmBAB/FeatureServer/0/query'
def request(name,url,body=None,xml=False):
 p=CACHE/(name+('.xml' if xml else '.json'))
 def parse(b):
  j=ET.fromstring(b) if xml else json.loads(b)
  if xml and 'Exception' in j.tag:raise ValueError('WFS exception')
  if not xml and isinstance(j,dict) and ('error' in j or 'code' in j):raise ValueError(str(j)[:200])
  return j
 if p.exists():
  try:return parse(p.read_bytes())
  except Exception:pass
 for attempt in range(3):
  cmd=['curl','-fsSL','--compressed','--max-time','120']
  if body is not None:
   q=CACHE/(name+'-query.xml');q.write_text(body);cmd+=['-H','Content-Type: text/xml','--data-binary','@'+str(q)]
  r=subprocess.run(cmd+[url],capture_output=True)
  try:
   if r.returncode:raise ValueError(r.stderr.decode()[:150])
   j=parse(r.stdout);p.write_bytes(r.stdout);print(name,'ok',len(r.stdout),flush=True);return j
  except Exception as e:print(name,'retry',attempt,str(e),flush=True)
 raise RuntimeError('Cannot retrieve complete source: '+name)
def url(base,q):return base+'?'+urlencode(q)
def parallel(tasks):
 with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:return list(pool.map(lambda t:request(*t),tasks))
def frq(start,count):return dict(service='WFS',version='2.0.0',request='GetFeature',typeNames='BDTOPO_V3:point_de_repere',outputFormat='application/json',srsName='EPSG:4326',count=count,startIndex=start,sortBy='cleabs',CQL_FILTER="statut IN ('PR valide','PR0 valide')",propertyName='cleabs,route,numero,statut,cote,identifiant_de_section,date_modification,sources,geometrie')
def esq(start,count):return {'f':'json','limit':count,'offset':start,'filter':"localid LIKE 'VIAL_PK%'",'filter-lang':'cql-text','sortby':'localid'}
def deq(start,count):return dict(f='json',where='1=1',outFields='*',outSR=4326,resultOffset=start,resultRecordCount=count,orderByFields='OBJECTID')
meta={'FR':request('FR-meta',url(FR,frq(0,1))),'ES':request('ES-meta',url(ES,esq(0,1))),'DE':request('DE-meta',url(DE,deq(0,1)))}
counts={'FR':int(meta['FR']['numberMatched']),'ES':int(meta['ES']['numberMatched']),'DE':int(request('DE-count',url(DE,dict(f='json',where='1=1',returnCountOnly='true')))['count'])}
features={};source_counts={}
for c,step,base,query in [('FR',5000,FR,frq),('ES',10000,ES,esq),('DE',2000,DE,deq)]:
 pages=parallel([(c+'-'+str(i),url(base,query(i,step))) for i in range(0,counts[c],step)])
 fs={}
 for page in pages:
  for f in page['features']:
   key=f.get('id') if c!='DE' else str(f['attributes']['OBJECTID'])
   if key in fs:raise RuntimeError(c+' unstable pagination: duplicate '+key)
   fs[key]=f
 if len(fs)!=counts[c]:raise RuntimeError(c+': incomplete national download '+str(len(fs))+' / '+str(counts[c]))
 features[c]=list(fs.values());source_counts[c]=len(fs);print(c,'COMPLETE',len(fs),flush=True)
# Query candidate RoadName identifiers, then validate every returned relation using
# its explicit net:networkRef. The name never comes from an identifier pattern.
refs=sorted({f['properties']['href_vial'].lstrip('#') for f in features['ES'] if f['properties'].get('href_vial')})
names=collections.defaultdict(list)
ns={'r':'http://inspire.ec.europa.eu/schemas/tn-ro/4.0','n':'http://inspire.ec.europa.eu/schemas/net/4.0','g':'http://inspire.ec.europa.eu/schemas/gn/4.0'}
def read_names(root):
 for f in root.findall('.//r:RoadName',ns):
  actual=[e.get('{http://www.w3.org/1999/xlink}href','').split('#')[-1] for e in f.findall('.//n:element',ns)]
  texts=[e.text for e in f.findall('.//g:text',ns) if e.text]
  for ref in actual:
   if ref not in refs_set:continue
   for text in texts:
    if text not in names[ref]:names[ref].append(text)
refs_set=set(refs);tasks=[]
for start in range(0,len(refs),500):
 part=refs[start:start+500];rid=['TN-RO_ROADNAME_NOM_VI'+r.removeprefix('TN-RO_ROAD_VIAL_LI') for r in part]
 body='<wfs:GetFeature xmlns:wfs="http://www.opengis.net/wfs/2.0" xmlns:fes="http://www.opengis.net/fes/2.0" xmlns:tn-ro="http://inspire.ec.europa.eu/schemas/tn-ro/4.0" service="WFS" version="2.0.0" count="1000"><wfs:Query typeNames="tn-ro:RoadName"><fes:Filter>'+''.join('<fes:ResourceId rid="'+r+'"/>' for r in rid)+'</fes:Filter></wfs:Query></wfs:GetFeature>'
 key='ES-names-'+hashlib.sha256(','.join(part).encode()).hexdigest()[:16];tasks.append((key,WFS,body,True))
for root in parallel(tasks):read_names(root)
# Some alternate names may use a different identifier. Resolve missing road IDs
# directly through the Road feature, retaining only its explicit geographicalName.
missing=[ref for ref in refs if ref not in names]
for start in range(0,len(missing),20):
 part=missing[start:start+20];q=dict(service='WFS',version='2.0.0',request='GetFeature',typeNames='Road',resourceID=','.join(part),count=len(part));root=request('ES-road-fallback-'+hashlib.sha256(','.join(part).encode()).hexdigest()[:16],url(WFS,q),xml=True)
 for f in root.findall('.//r:Road',ns):
  ref=f.get('{http://www.opengis.net/gml/3.2}id')
  for e in f.findall('.//g:text',ns):
   if ref in refs_set and e.text and e.text not in names[ref]:names[ref].append(e.text)
print('ES names',len(names),'/',len(refs),flush=True)
def key(s):return re.sub('[^a-z0-9]','',unicodedata.normalize('NFD',s).encode('ascii','ignore').decode().lower())
def bucket(s):
 h=0
 for c in key(s):h=(h*31+ord(c))%256
 return str(h)
def dump(path,obj):
 p=OUT/path;p.parent.mkdir(parents=True,exist_ok=True);p.write_text(json.dumps(obj,ensure_ascii=False,separators=(',',':')))
def valid(x,y):return isinstance(x,(float,int)) and isinstance(y,(float,int)) and abs(x)<=180 and abs(y)<=90
rows={c:[] for c in features};invalid=collections.Counter();unresolved=0
for f in features['FR']:
 p=f['properties'];xy=(f.get('geometry') or {}).get('coordinates',[])
 if len(xy)<2 or not valid(*xy[:2]) or not re.fullmatch(r'\d+(?:[.,]\d+)?',str(p.get('numero',''))) or not p.get('route'):invalid['FR']+=1;continue
 rows['FR'].append([p['cleabs'],p['route'],float(str(p['numero']).replace(',','.')),xy[1],xy[0],p.get('identifiant_de_section'),p.get('cote'),p.get('date_modification'),p.get('sources'),f['id'],p.get('statut')])
for f in features['ES']:
 p=f['properties'];xy=(f.get('geometry') or {}).get('coordinates',[]);ref=p.get('href_vial','').lstrip('#');labels=names.get(ref,[])
 if not f['id'].startswith('VIAL_PK') or len(xy)<2 or not valid(*xy[:2]) or not isinstance(p.get('numero'),(int,float)):invalid['ES']+=1;continue
 if not labels:unresolved+=1
 rows['ES'].append([f['id'],labels[0] if labels else None,p['numero'],xy[1],xy[0],p.get('localid_vial'),(p.get('sentidopk') or '').split('/')[-1],p.get('fecha_alta'),labels[1:]])
for f in features['DE']:
 p=f['attributes'];g=f.get('geometry',{})
 if not valid(g.get('x'),g.get('y')) or not isinstance(p.get('Kilometer'),(int,float)):invalid['DE']+=1;continue
 rows['DE'].append([str(p['OBJECTID']),p['Bez'],p['Kilometer'],g['y'],g['x'],None,p.get('Richtung'),'2025-03'])
manifest={'copyright':COPY,'version':2,'retrieved':DAY,'sourceCounts':source_counts,'countries':{},'invalidExcluded':dict(invalid),'spanishUnresolvedNames':unresolved,'gridDegrees':1,'routeBuckets':256,'sourceURLs':{'FR':FR,'ES':ES,'ESnames':WFS,'DE':DE}}
for c,data in rows.items():
 grid=collections.defaultdict(list);byroute=collections.defaultdict(list);roads={};overview=[]
 for row in data:
  cell=str(math.floor(row[3]))+'_'+str(math.floor(row[4]));grid[cell].append(row)
  aliases=[row[1]]+(row[8] if c=='ES' else [])
  buckets=set()
  for road in aliases:
   if road:roads.setdefault(key(road),road);buckets.add(bucket(road))
  for b in buckets:byroute[b].append(row)
  # This overview contains actual source points at multiples of ten only.
  if abs(row[2]/10-round(row[2]/10))<1e-7:overview.append(row)
 for cell,rs in grid.items():dump(Path(c)/'grid'/(cell+'.json'),{'country':c,'retrieved':DAY,'rows':rs})
 for b,rs in byroute.items():dump(Path(c)/'routes'/(b+'.json'),{'country':c,'retrieved':DAY,'rows':rs})
 dump(Path(c)/'overview.json',{'country':c,'retrieved':DAY,'rows':overview})
 manifest['countries'][c]={'count':len(data),'grid':sorted(grid),'buckets':sorted(byroute),'roads':roads,'overviewCount':len(overview),'extent':[min(x[3] for x in data),min(x[4] for x in data),max(x[3] for x in data),max(x[4] for x in data)]}
manifest['responseHashes']=[{'file':p.name,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in sorted(CACHE.glob('*')) if p.suffix in ['.json','.xml'] and not p.name.endswith('-query.xml')]
dump(Path('manifest.json'),manifest)
print('Published normalized national counts:',{c:len(r) for c,r in rows.items()},'ES unresolved',unresolved,flush=True)
