// © 2026 Benjamin Daguier — Tous droits réservés.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {parsePK,roadKey,pkMatches,neighbors,distance,validPosition,extractClues,candidates,localizationText} from '../dist/core.js';
const data=name=>JSON.parse(fs.readFileSync(new URL('../dist/data/'+name,import.meta.url)));
const records=data('official-pks.json').pks;
test('Only sourced numeric road markers enter the catalog',()=>{
  assert.ok(records.length>1000);assert.equal(new Set(records.map(p=>p.id)).size,records.length);
  for(const p of records){assert.ok(validPosition(p));assert.ok(Number.isFinite(p.value));assert.ok(p.road);assert.ok(p.url.startsWith('https://'));assert.ok(p.sourceUpdated);assert.ok(!p.id.includes('FFCC'));assert.ok(p.status!=='Calculé');}
});
test('PK and PR exact lookup keeps country, section and carriageway differences',()=>{
  const fr=pkMatches(records,'FR','A 11',257);assert.ok(fr.length>=2);assert.ok(new Set(fr.map(p=>p.direction)).size>=2);
  assert.equal(pkMatches(records,'IT','A11',257).length,0);
  assert.equal(pkMatches(records,'FR','A11',257.123456).length,0);
  assert.ok(pkMatches(records,'ES','V-30',12).some(p=>Math.abs(p.lat-39.487852865)<1e-8));
  for(const n of neighbors(records,fr[0]))assert.equal(n.section,fr[0].section);
});
test('PK input handles decimal commas and meter suffixes without interpolation',()=>{
  assert.equal(parsePK('257+250'),257.25);assert.equal(parsePK('12,5'),12.5);assert.equal(parsePK('257+000'),257);assert.ok(Number.isNaN(parsePK('12-5')));assert.ok(Number.isNaN(parsePK('')));assert.equal(roadKey('AP 7'),roadKey('AP-7'));
});
test('Geographic distance is symmetric and zero at the same real position',()=>{
  const c=data('catalog.json').cities;assert.equal(distance(c.Angers,c.Angers),0);assert.ok(Math.abs(distance(c.Angers,c.Valencia)-distance(c.Valencia,c.Angers))<1e-6);assert.ok(distance(c.Angers,c.Valencia)>880000);assert.ok(distance(c.Angers,c.Valencia)<910000);
});
for(const city of ['Valencia','Angers']){
  test(`${city}: three real clues produce candidate evidence inside the requested radius`,()=>{
    const points=data(city+'.json').pois;const clues=extractClues('Je vois un McDonald’s, une pharmacie et un rond-point');assert.equal(clues.length,3);
    const found=candidates(points,clues,600);assert.ok(found.length>1);assert.equal(found[0].count,3);
    for(const c of found)for(const [i,p] of c.evidence.entries())if(p){assert.ok(points.some(q=>q.id===p.id));assert.ok(clues[i].test(p));assert.ok(distance(c,p)<=600)}
    const missing=extractClues('McDonald’s et PharmacieImaginaireSansResultatXYZ');const partial=candidates(points,missing,600);assert.ok(partial.every(p=>p.count<missing.length));
  });
}
test('The assistance sheet labels a hypothesis and includes actual evidence and distance',()=>{
  const points=data('Angers.json').pois;const p=points.find(p=>p.tags.name);const s={...p,kind:'HYPOTHÈSE — position de la personne inconnue',address:'Non disponible'};const text=localizationText(s,[p]);assert.ok(text.includes('HYPOTHÈSE'));assert.ok(text.includes('Non disponible'));assert.ok(text.includes('0 m'));assert.ok(text.includes(p.url));assert.ok(text.includes('© 2026 Benjamin Daguier — Tous droits réservés.'));
});
test('PWA shell assets and relative paths exist for a repository subpath',()=>{
  const dir=new URL('../dist/',import.meta.url);const manifest=JSON.parse(fs.readFileSync(new URL('manifest.webmanifest',dir)));assert.equal(manifest.start_url,'./');assert.equal(manifest.scope,'./');assert.equal(manifest.display,'standalone');
  for(const icon of manifest.icons)assert.ok(fs.existsSync(new URL(icon.src,dir)));
  const sw=fs.readFileSync(new URL('sw.js',dir),'utf8');for(const m of sw.matchAll(/'\.\/([^']*)'/g)){if(m[1])assert.ok(fs.existsSync(new URL(m[1],dir)),m[1])}
  assert.ok(fs.readFileSync(new URL('index.html',dir),'utf8').includes('© 2026 Benjamin Daguier — Tous droits réservés.'));
});
