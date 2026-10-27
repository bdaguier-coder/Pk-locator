// © 2026 Benjamin Daguier — Tous droits réservés.
// Static country-wide indexes built from complete paginated source responses.
import {roadKey,pkMatches} from './core.js?v=1.2.0';
import {FR,ES,DE} from './national.js?v=1.2.0';
export function routeBucket(road){let n=0;for(const ch of roadKey(road))n=(n*31+ch.charCodeAt(0))%256;return String(n)}
export function unpackNational(j){const retrieved=j.retrieved;return j.rows.map(r=>{const shared={country:j.country,road:r[1]||'Route non renseignée',value:r[2],lat:r[3],lon:r[4],section:r[5],sourceUpdated:r[7],retrieved};if(j.country==='FR')return{...shared,id:'ign-fr:'+r[0],unit:'PR',direction:'Côté '+(r[6]||'inconnu'),source:'IGN France · BD TOPO · '+(r[8]||''),status:r[10]||'PR valide',kind:'PR officiel valide — section et côté du référentiel',url:FR+'?'+new URLSearchParams({service:'WFS',version:'2.0.0',request:'GetFeature',typeNames:'BDTOPO_V3:point_de_repere',outputFormat:'application/json',resourceID:r[9]})};if(j.country==='ES')return{...shared,id:'ign-es:'+r[0],unit:'PK',roadUnknown:!r[1],roadRef:'TN-RO_ROAD_'+r[5],aliases:r[8]||[],direction:({bothDirections:'Les deux sens',inDirection:'Sens de référence',inOppositeDirection:'Sens opposé'})[r[6]]||'Sens inconnu',source:'IGN / CNIG Espagne · IGR-RT · CC-BY 4.0',status:r[1]?'Borne officielle référencée':'Borne officielle · nom de route non résolu',kind:'Borne officielle du référentiel IGN / CNIG',url:ES+'/'+r[0]+'?f=json'};return{...shared,id:'bkg-de:'+r[0],unit:'PK',direction:'Sens de kilométrage : '+(r[6]||'inconnu')+' (ne précise pas le sens de circulation)',source:'© Bundesamt für Kartographie und Geodäsie (2025) · POI-Open',status:'Kilométrage BKG · millésime 03/2025',kind:'Position du kilométrage BKG — précision du référentiel',url:DE+'/'+r[0]+'?f=pjson'}})}
export function createCountryIndex(getJSON,onData=()=>{}){
 let manifest;const cache=new Map();
 async function file(path){if(!cache.has(path)){const p=getJSON('./data/national/'+path).catch(e=>{cache.delete(path);throw e});cache.set(path,p)}return cache.get(path)}
 async function loadFile(path){const j=await file(path);const pks=unpackNational(j);onData({pks});return pks}
 return{
  async init(){manifest=await file('manifest.json');if(manifest.version!==2)throw new Error('Index national incompatible.');return manifest},
  get manifest(){return manifest},
  async overview(c){return loadFile(c+'/overview.json')},
  async bounds(c,bbox,zoom){if(!manifest?.countries[c])return{pks:[],complete:false};const country=manifest.countries[c];if(zoom<9){await loadFile(c+'/overview.json');return{pks:[],complete:true}}const cells=country.grid.filter(id=>{const[a,b]=id.split('_').map(Number);return a<=bbox[2]&&a+1>=bbox[0]&&b<=bbox[3]&&b+1>=bbox[1]});if(cells.length>36){await loadFile(c+'/overview.json');return{pks:[],complete:false,warning:'Vue étendue : bornes espacées. Zoomez pour tous les détails.'}}for(let i=0;i<cells.length;i+=4)await Promise.all(cells.slice(i,i+4).map(id=>loadFile(c+'/grid/'+id+'.json')));return{pks:[],complete:true}},
  async road(c,road){if(!manifest?.countries[c])throw new Error('Aucun index national préparé pour ce pays.');const b=routeBucket(road);if(!manifest.countries[c].buckets.includes(b))return{pks:[],complete:true};const pks=await loadFile(c+'/routes/'+b+'.json');return{pks:pks.filter(p=>roadKey(p.road)===roadKey(road)||(p.aliases||[]).some(a=>roadKey(a)===roadKey(road))),complete:true}}
 };
}
export function markerInterval(zoom){return zoom<=5?100:zoom<=7?50:zoom===8?20:zoom<=10?10:zoom<=12?5:1}
export function roadClass(road,country){const r=road.trim().toUpperCase();if(country==='DE')return /^A\s*\d/.test(r)?'motorway':'other';if(country==='FR')return /^A\d/.test(r)?'motorway':/^N\d/.test(r)?'national':'other';return /^(AP|A)-\d/.test(r)?'motorway':/^N-/.test(r)?'national':'other'}
