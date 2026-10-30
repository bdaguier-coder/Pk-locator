// © 2026 Benjamin Daguier — Tous droits réservés.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createCandidateNavigation} from '../dist/candidate-navigation.js';
import {candidates,selectedClues,pointName} from '../dist/core.js';

// Small DOM/Leaflet boundary: exercise actual navigation with sourced search results.
class Element {
  constructor(){this.children=[];this.attrs={};this.dataset={};this.hidden=false;this.offsetHeight=90;this.offsetWidth=170;this.style={setProperty(){}};const values=new Set();this.classList={add:(...a)=>a.forEach(v=>values.add(v)),remove:(...a)=>a.forEach(v=>values.delete(v)),contains:v=>values.has(v),toggle:(v,on)=>{on??=!values.has(v);on?values.add(v):values.delete(v)}}}
  append(e){this.children.push(e)}
  replaceChildren(){this.children=[]}
  setAttribute(k,v){this.attrs[k]=v}
  getBoundingClientRect(){return this.rect??{left:0,top:0,bottom:100,width:1000,height:760}}
  querySelector(s){return s==='svg'?this.children.find(e=>e.svg):this.nodes?.[s]}
  querySelectorAll(){return this.children.filter(e=>e.dataset?.zoneIndex!==undefined)}
  addEventListener(){}
  contains(){return false}
  focus(){}
  remove(){this.removed=true}
}
function setup(isMobile=false){
  globalThis.document={createElement:()=>new Element(),createElementNS:()=>Object.assign(new Element(),{svg:true})};
  globalThis.matchMedia=q=>({matches:q.includes('680')&&isMobile});
  globalThis.requestAnimationFrame=()=>1;
  globalThis.ResizeObserver=class{observe(){}};globalThis.MutationObserver=class{observe(){}};
  globalThis.window={addEventListener(){}};
  const root=new Element(),sidebar=new Element(),results=new Element();sidebar.classList.add('collapsed');
  const names=['#candidate-results','#candidate-toggle','#candidate-list','#candidate-rail','#candidate-rail-list','#candidate-labels','#candidate-overview','#candidate-status','.country-bar','#point-preview','#candidate-summary','#candidate-rail-title'];
  root.nodes=Object.fromEntries(names.map(n=>[n,new Element()]));root.nodes['#point-preview'].hidden=true;
  root.nodes['#candidate-results'].rect={left:24,top:610,bottom:700};root.nodes['#candidate-toggle'].nodes={'.candidate-toggle-hint':new Element()};
  root.nodes['#candidate-rail'].rect={left:754,top:110,bottom:500};
  const fits=[],elements=[];
  const map={createPane:()=>({style:{}}),getSize:()=>({x:1000,y:760}),getContainer:()=>root,stop(){},invalidateSize(){},on(){},fitBounds:(b,o)=>fits.push({b,o}),latLngToContainerPoint:()=>({x:400,y:300})};
  const layer={clearLayers:()=>elements.splice(0),addLayer:e=>elements.push(e)};
  const L={divIcon:o=>o,latLngBounds:()=>({items:[],extend(x){this.items.push(x);return this}}),circle:(center,options)=>({center,options,addTo(l){l.addLayer(this);return this},getBounds(){return{center,radius:options.radius}},setStyle(style){Object.assign(this.options,style)}}),marker:(center,options)=>({center,options,events:{},el:new Element(),addTo(l){l.addLayer(this);return this},on(event,callback){this.events[event]=callback;return this},getElement(){return this.el}})};
  const navigation=createCandidateNavigation({L,map,layer,root,sidebar,results,pointName});
  return{navigation,root,sidebar,results,elements,fits};
}
const pois=JSON.parse(fs.readFileSync(new URL('../dist/data/Angers.json',import.meta.url))).pois;
const clues=selectedClues(['mcdonalds','pharmacy']);
for(const radius of [50,100,300,500])test(`Real results, ${radius} m: first click, every navigation entry, close and replace`,()=>{
  const h=setup(),found=candidates(pois,clues,radius);assert.ok(found.length>1);
  h.navigation.show(found,clues,radius);
  const n=h.root.nodes;
  assert.equal(n['#candidate-toggle'].attrs['aria-expanded'],'false');
  assert.equal(n['#candidate-rail-list'].children.length,found.length);
  assert.equal(n['#candidate-list'].children.length,found.length);
  const areas=h.elements.filter(e=>e.options.radius),markers=h.elements.filter(e=>e.events);
  assert.deepEqual(areas.map(c=>c.center),found.map(c=>[c.lat,c.lon]));
  assert.ok(areas.every(c=>c.options.radius===radius));
  assert.deepEqual(areas.slice(0,3).map(c=>c.options.color),['#146dc4','#079665','#e87509']);
  // Bounds are radius-aware, including a single zone, not just center coordinates.
  assert.equal(h.fits.at(-1).b.items.length,found.length);
  n['#candidate-toggle'].onclick();assert.equal(n['#candidate-toggle'].attrs['aria-expanded'],'true');
  assert.equal(n['#candidate-labels'].hidden,false);
  for(let i=0;i<found.length;i++){
    for(const click of [()=>n['#candidate-rail-list'].children[i].onclick(),()=>n['#candidate-list'].children[i].onclick(),()=>markers[i].events.click(),()=>n['#candidate-labels'].children[i+1].onclick(),()=>h.results.children[i].onclick()]){
      click();assert.deepEqual(h.fits.at(-1).b.items,[{center:[found[i].lat,found[i].lon],radius}]);assert.equal(areas[i].options.weight,4);
      assert.equal(h.elements.length,found.length*2);assert.ok(n['#candidate-status'].textContent.includes('non confirmée'));
    }
  }
  n['#candidate-overview'].onclick();assert.equal(h.fits.at(-1).b.items.length,found.length);
  n['#candidate-toggle'].onclick();assert.equal(n['#candidate-rail'].hidden,true);assert.equal(n['#candidate-toggle'].attrs['aria-expanded'],'false');
  h.navigation.show(found.slice(0,1),clues,radius);assert.equal(h.elements.length,2);assert.equal(n['#candidate-rail-list'].children.length,1);
  assert.equal(n['#candidate-summary'].textContent,'1 zone candidate.');
  h.navigation.show([],clues,radius);assert.equal(h.elements.length,0);assert.equal(n['#candidate-results'].hidden,true);
});
test('Mobile result navigation collapses the search drawer and retains every result',()=>{
  const h=setup(true);h.sidebar.classList.remove('collapsed');const found=candidates(pois,clues,300);
  h.navigation.show(found,clues,300);assert.ok(h.sidebar.classList.contains('collapsed'));
  h.root.nodes['#candidate-toggle'].onclick();h.navigation.focus(found.length-1);
  assert.equal(h.root.nodes['#candidate-list'].children.length,found.length);
  assert.ok(h.fits.at(-1).o.paddingTopLeft[1]>100);
});
test('The new PWA cache contains the navigation module and a single asset version',()=>{
  const sw=fs.readFileSync(new URL('../dist/sw.js',import.meta.url),'utf8');assert.ok(sw.includes('./candidate-navigation.js?v=1.4.0'));
  assert.ok(sw.includes("const VERSION='pk-locator-v1.4.0'"));
  for(const file of ['app.js','national.js','national-index.js','index.html'])assert.ok(!/\?v=1\.[123]\./.test(fs.readFileSync(new URL('../dist/'+file,import.meta.url),'utf8')));
});
