// © 2026 Benjamin Daguier — Tous droits réservés.
export const normalize = s => String(s??'').normalize('NFD').replace(/\p{Diacritic}/gu,'').toLowerCase().replace(/[’']/g,'').replace(/[^a-z0-9]+/g,' ').trim();
export const roadKey = s => normalize(s).replaceAll(' ','');
export function parsePK(s){const v=String(s).trim().replace(',','.').replace(/\s/g,'');if(/^\d+\+\d{1,3}$/.test(v)){const [a,b]=v.split('+');return +a+(+b)/1000}return /^\d+(\.\d+)?$/.test(v)?+v:NaN}
export function distance(a,b){const r=Math.PI/180,dlat=(b.lat-a.lat)*r,dlon=(b.lon-a.lon)*r;const x=Math.sin(dlat/2)**2+Math.cos(a.lat*r)*Math.cos(b.lat*r)*Math.sin(dlon/2)**2;return 6371008.8*2*Math.atan2(Math.sqrt(x),Math.sqrt(Math.max(0,1-x)))}
export function validPosition(p){return Number.isFinite(p.lat)&&Number.isFinite(p.lon)&&Math.abs(p.lat)<=90&&Math.abs(p.lon)<=180}
export function pkMatches(records,country,road,pk){return records.filter(p=>p.country===country&&(roadKey(p.road)===roadKey(road)||(p.aliases||[]).some(a=>roadKey(a)===roadKey(road)))&&Math.abs(p.value-pk)<0.00001)}
export function neighbors(records,p){if(!p.section)return [];return records.filter(n=>n.country===p.country&&roadKey(n.road)===roadKey(p.road)&&n.id!==p.id&&(!p.section||n.section===p.section)).sort((a,b)=>Math.abs(a.value-p.value)-Math.abs(b.value-p.value)).slice(0,6).sort((a,b)=>a.value-b.value)}
export function osmPoint(e){const lat=e.lat??e.center?.lat,lon=e.lon??e.center?.lon;return validPosition({lat,lon})?{id:`${e.type}/${e.id}`,lat,lon,tags:e.tags||{},source:'OpenStreetMap',url:`https://www.openstreetmap.org/${e.type}/${e.id}`}:null}
export function category(p){const t=p.tags||{};return t.junction==='roundabout'?'Rond-point':t.amenity==='pharmacy'?'Pharmacie':t.amenity==='fuel'?'Station-service':t.amenity==='townhall'?'Mairie':t.amenity==='police'?'Police':t.amenity==='hospital'?'Hôpital':t.amenity==='school'?'École':t.tourism==='museum'?'Musée':t.historic?'Monument':t.shop?'Commerce':t.office==='government'?'Bâtiment public':t.amenity==='restaurant'?'Restaurant':t.amenity==='fast_food'?'Restauration':t.amenity==='cafe'?'Café':t.amenity==='bank'?'Banque':t.amenity==='place_of_worship'?'Lieu de culte':'Point d’intérêt'}
export function pointName(p){return p.tags.name||p.tags.brand||p.tags.operator||category(p)}
const concepts=[
 ['mcdonalds',/mc\s?donalds?/,p=>normalize(Object.values(p.tags).join(' ')).replaceAll(' ','').includes('mcdonald')],
 ['pharmacie',/pharmac(?:ie|y|ia|ien)/,p=>p.tags.amenity==='pharmacy'],
 ['rond-point',/rond point|giratoire|roundabout|rotonda/,p=>p.tags.junction==='roundabout'],
 ['station-service',/station service|station essence|gasolinera|fuel/,p=>p.tags.amenity==='fuel'],
 ['restaurant',/restaurant/,p=>['restaurant','fast_food'].includes(p.tags.amenity)],
 ['café',/\bcafe\b/,p=>p.tags.amenity==='cafe'],
 ['mairie',/mairie|hotel de ville|ayuntamiento/,p=>p.tags.amenity==='townhall'],
 ['église',/eglise|cathedrale|iglesia/,p=>p.tags.amenity==='place_of_worship'],
 ['hôpital',/hopital|hospital/,p=>p.tags.amenity==='hospital'],
 ['musée',/musee|museo|museum/,p=>p.tags.tourism==='museum'],
 ['banque',/banque|banco|bank/,p=>p.tags.amenity==='bank'],
 ['école',/ecole|school|colegio/,p=>p.tags.amenity==='school'],
 ['monument',/monument|statue/,p=>!!p.tags.historic]
];
export function extractClues(text){let remainder=normalize(text);const found=[];for(const[label,re,test]of concepts){if(re.test(remainder)){found.push({label,test});remainder=remainder.replace(re,' ')}}const pieces=remainder.replace(/\b(je|vois|un|une|des|du|de|la|le|les|il|y|a|et|avec|pres|proche|cote|dun|dune|au|sur|se|trouve|qui|est|en|face|jai|nous|on)\b/g,' ').split(/\s{2,}|,|;/).map(s=>s.trim()).filter(s=>s.length>=3);for(const name of pieces){const words=name.split(' ').filter(Boolean);found.push({label:name,test:p=>words.every(w=>normalize([p.tags.name,p.tags.brand,p.tags.operator].filter(Boolean).join(' ')).includes(w))})}return found.slice(0,8)}
export function candidates(points,clues,radius){if(!clues.length)return[];const matching=points.map(p=>({p,m:clues.map(c=>c.test(p))})).filter(x=>x.m.some(Boolean));const out=[];for(const anchor of matching){const evidence=clues.map((c,i)=>matching.filter(x=>x.m[i]&&distance(anchor.p,x.p)<=radius).sort((a,b)=>distance(anchor.p,a.p)-distance(anchor.p,b.p))[0]?.p||null);const count=evidence.filter(Boolean).length;const spread=evidence.filter(Boolean).reduce((s,p)=>s+distance(anchor.p,p),0);out.push({lat:anchor.p.lat,lon:anchor.p.lon,anchor:anchor.p,evidence,count,spread})}out.sort((a,b)=>b.count-a.count||a.spread-b.spread);const distinct=[];for(const c of out){if(!distinct.some(x=>distance(x,c)<radius*.6))distinct.push(c);if(distinct.length===6)break}return distinct}
export function localizationText(s,pois,meta={}){return ['PK LOCATOR — FICHE DE LOCALISATION',`Nature : ${s.kind||'Point choisi sur la carte — position déclarée, non vérifiée sur place'}`,`Coordonnées WGS84 : ${s.lat.toFixed(6)}, ${s.lon.toFixed(6)}`,`Adresse proche (ne confirme pas le point exact) : ${s.address||'Non disponible'}`,s.road?`Route / borne : ${s.road} · ${s.value} ${s.section?'· section '+s.section:''}`:'',`Source : ${s.source||'Point sélectionné manuellement'}${s.retrieved?' · récupéré le '+s.retrieved:''}`,`Repères proches — distances à vol d’oiseau :`,...pois.slice(0,8).map(p=>`- ${pointName(p)} (${category(p)}) : ${Math.round(distance(s,p))} m — ${p.url||'OpenStreetMap'}`),`Couverture : ${meta.coverage||'OpenStreetMap partiel ; absence de donnée ≠ absence sur le terrain.'}`,`Google Maps : https://www.google.com/maps/search/?api=1&query=${s.lat},${s.lon}`,`Établi le ${new Date().toISOString()}`,'© 2026 Benjamin Daguier — Tous droits réservés.'].filter(Boolean).join('\n')}
