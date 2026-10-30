// © 2026 Benjamin Daguier — Tous droits réservés.
// Navigation only: every center, radius and item of evidence comes from the search.
const COLORS=['#146dc4','#079665','#e87509','#8950b5','#bd3965','#137e8e'];
const escapeHTML=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function createCandidateNavigation({L,map,layer,root,sidebar,results,pointName}){
  const panel=root.querySelector('#candidate-results'),toggle=root.querySelector('#candidate-toggle');
  const list=root.querySelector('#candidate-list'),rail=root.querySelector('#candidate-rail');
  const railList=root.querySelector('#candidate-rail-list'),overlay=root.querySelector('#candidate-labels');
  const overview=root.querySelector('#candidate-overview'),status=root.querySelector('#candidate-status');
  let zones=[],opened=false,selected=-1,circles=[],markers=[],labelButtons=[],frame=0,mode='overview';
  const mobile=()=>matchMedia('(max-width:680px)').matches;
  const animate=()=>!matchMedia('(prefers-reduced-motion:reduce)').matches;
  map.createPane('candidateCenters').style.zIndex='620';
  map.createPane('candidateAreas').style.zIndex='410';
  const button=(html,className,index)=>{
    const b=document.createElement('button');b.type='button';b.className=className;
    b.innerHTML=html;b.dataset.zoneIndex=index;b.style.setProperty('--zone-color',COLORS[index%COLORS.length]);
    b.setAttribute('aria-label',`Recentrer sur la zone candidate ${index+1}`);
    b.onclick=()=>focus(index);return b;
  };
  const dot='<span class="zone-dot" aria-hidden="true"></span>';
  function layout(){
    frame=0;if(!zones.length)return;
    const rect=root.getBoundingClientRect(),size=map.getSize();
    const country=root.querySelector('.country-bar').getBoundingClientRect();
    let top=country.bottom-rect.top+10;
    const preview=root.querySelector('#point-preview');
    if(!preview.hidden)top=Math.max(top,preview.getBoundingClientRect().bottom-rect.top+10);
    rail.style.top=top+'px';
    if(opened&&mobile())top+=rail.offsetHeight+8;
    root.style.setProperty('--candidate-top',top+'px');
    root.style.setProperty('--candidate-bottom',panel.offsetHeight+72+'px');
    // Reserve actual panel space, including the mobile search drawer if reopened.
    let bottom=panel.getBoundingClientRect().top-rect.top-12;
    if(mobile()&&!sidebar.classList.contains('collapsed'))bottom=Math.min(bottom,sidebar.getBoundingClientRect().top-rect.top-12);
    const right=opened&&!mobile()?rail.getBoundingClientRect().left-rect.left-16:size.x-22;
    const safe={left:22,top:top+12,right,bottom:Math.max(top+55,bottom)};
    if(!opened)return safe;
    const visible=zones.map((z,i)=>({i,p:map.latLngToContainerPoint([z.lat,z.lon])})).filter(({p})=>p.x>=0&&p.x<=size.x&&p.y>=top&&p.y<=bottom);
    labelButtons.forEach(b=>b.hidden=true);
    // Label lanes move with the map and avoid each other. The arrows end at real centers.
    const used=[];let arrows='';
    for(const {i,p} of visible){
      const b=labelButtons[i],w=84,h=32;
      let x=Math.max(safe.left,Math.min(right-w,p.x+(p.x<(safe.left+right)/2?24:-w-24)));
      let y=Math.max(top+4,Math.min(bottom-h,p.y-55));
      for(let n=0;n<zones.length*2&&used.some(r=>x<r.x+w+6&&x+w+6>r.x&&y<r.y+h+6&&y+h+6>r.y);n++){
        y+=40;if(y+h>bottom){y=top+4;x=x<right/2?Math.max(safe.left,right-w):safe.left;}
      }
      used.push({x,y});b.hidden=false;b.style.transform=`translate(${x}px,${y}px)`;
      const sx=Math.max(x+9,Math.min(x+w-9,p.x)),sy=p.y>=y+h?y+h:y;
      const dx=p.x-sx,dy=p.y-sy,length=Math.hypot(dx,dy)||1;
      const ex=p.x-dx/length*17,ey=p.y-dy/length*17;
      arrows+=`<path d="M${sx},${sy} Q${sx},${ey} ${ex},${ey}" fill="none" stroke="white" stroke-width="6"/><path d="M${sx},${sy} Q${sx},${ey} ${ex},${ey}" fill="none" stroke="${COLORS[i%COLORS.length]}" stroke-width="2.5" marker-end="url(#zone-arrow-${i})"/>`;
    }
    overlay.querySelector('svg').innerHTML=`<defs>${zones.map((_,i)=>`<marker id="zone-arrow-${i}" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10" fill="${COLORS[i%COLORS.length]}"/></marker>`).join('')}</defs>${arrows}`;
    return safe;
  }
  function scheduleLayout(){if(!frame)frame=requestAnimationFrame(layout);}
  function fit(items,animated=true){
    map.stop();map.invalidateSize({pan:false});const safe=layout();if(!safe)return;
    const bounds=L.latLngBounds([]);items.forEach(z=>bounds.extend(z.circle.getBounds()));
    map.fitBounds(bounds,{paddingTopLeft:[safe.left+18,safe.top+35],paddingBottomRight:[map.getSize().x-safe.right+18,map.getSize().y-safe.bottom+20],maxZoom:18,animate:animated&&animate(),duration:.45});
    scheduleLayout();
  }
  function highlight(){
    circles.forEach((c,i)=>c.setStyle({weight:i===selected?4:2,fillOpacity:i===selected?.22:.1,dashArray:i===selected?null:'6 5'}));
    markers.forEach((m,i)=>m.getElement()?.classList.toggle('is-selected',i===selected));
    root.querySelectorAll('[data-zone-index]').forEach(b=>{
      const active=+b.dataset.zoneIndex===selected;b.classList.toggle('is-selected',active);b.setAttribute('aria-pressed',String(active));
    });
  }
  function setOpen(value,{fitView=true}={}){
    if(!zones.length)return;opened=value;panel.classList.toggle('is-open',opened);
    root.classList.toggle('candidates-open',opened);toggle.setAttribute('aria-expanded',String(opened));
    toggle.querySelector('.candidate-toggle-hint').textContent=opened?'Réduire les résultats':'Comparer les zones';
    list.hidden=!opened;rail.hidden=!opened;overlay.hidden=!opened;
    if(opened&&mobile())sidebar.classList.add('collapsed');
    if(opened&&fitView)showAll();else scheduleLayout();
  }
  function showAll(){
    selected=-1;mode='overview';highlight();status.textContent=`Vue générale · ${zones.length} zone${zones.length>1?'s':''} candidate${zones.length>1?'s':''} · aucune position confirmée`;
    fit(zones);
  }
  function focus(index){
    if(!zones[index])return;
    setOpen(true,{fitView:false});selected=index;mode='detail';highlight();
    status.textContent=`Zone ${index+1} · rayon ${zones[index].radius} m · position non confirmée`;
    fit([zones[index]]);
  }
  function clear(){
    const focused=panel.contains(document.activeElement)||rail.contains(document.activeElement)||overlay.contains(document.activeElement);
    zones=[];selected=-1;opened=false;status.textContent='';layer.clearLayers();circles=[];markers=[];labelButtons=[];
    list.replaceChildren();railList.replaceChildren();overlay.replaceChildren();panel.hidden=true;rail.hidden=true;overlay.hidden=true;
    results.querySelectorAll('[data-zone-index]').forEach(b=>b.remove());
    root.classList.remove('has-candidates','candidates-open');toggle.setAttribute('aria-expanded','false');
    if(focused)document.querySelector('#clue-form button[type=submit]').focus({preventScroll:true});
  }
  function show(found,clues,radius){
    clear();if(!found.length)return;
    zones=found.map((z,i)=>({...z,radius:z.radius??radius,color:COLORS[i%COLORS.length]}));
    panel.hidden=false;root.classList.add('has-candidates');if(mobile())sidebar.classList.add('collapsed');
    root.querySelector('#candidate-summary').textContent=`${zones.length} zone${zones.length>1?'s':''} candidate${zones.length>1?'s':''}.`;
    root.querySelector('#candidate-rail-title').textContent=`Zones candidates (${zones.length})`;
    const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('aria-hidden','true');overlay.append(svg);
    zones.forEach((z,i)=>{
      z.circle=L.circle([z.lat,z.lon],{pane:'candidateAreas',radius:z.radius,color:z.color,weight:2,dashArray:'6 5',fillOpacity:.1,interactive:false}).addTo(layer);
      circles.push(z.circle);
      const m=L.marker([z.lat,z.lon],{pane:'candidateCenters',bubblingMouseEvents:false,title:`Zone candidate ${i+1} — position non confirmée`,keyboard:true,icon:L.divIcon({className:'candidate-center',html:`<span style="--zone-color:${z.color}">${i+1}</span>`,iconSize:[30,30],iconAnchor:[15,15]})}).on('click',()=>focus(i)).addTo(layer);markers.push(m);
      const label=button(`Zone ${i+1}`,'candidate-label',i);overlay.append(label);labelButtons.push(label);
      railList.append(button(`${dot}<span>Zone ${i+1}</span><span class="zone-go" aria-hidden="true">›</span>`,'candidate-rail-row',i));
      const matched=clues.filter((_,k)=>z.evidence[k]).map(c=>c.label),missing=clues.filter((_,k)=>!z.evidence[k]).map(c=>c.label);
      const evidence=[...new Map(z.evidence.filter(Boolean).map(p=>[p.id,p])).values()];
      const html=`${dot}<span class="candidate-row-copy"><strong>Zone ${i+1}<span>Rayon ${z.radius} m · ${z.count}/${clues.length} indice${clues.length>1?'s':''}</span></strong><span>${evidence.map(p=>escapeHTML(pointName(p))).join(' · ')}</span><small>Concordants : ${escapeHTML(matched.join(', '))}</small>${missing.length?`<small class="missing">Non retrouvés : ${escapeHTML(missing.join(', '))}</small>`:''}</span><span class="zone-go" aria-hidden="true">›</span>`;
      list.append(button(html,'candidate-result-row',i));
      results.append(button(html+'<span class="candidate-hypothesis">Hypothèse de proximité · position non confirmée</span>','result-card candidate-sidebar-row',i));
    });
    if(mobile())toggle.focus({preventScroll:true});setOpen(false);showAll();
  }
  toggle.onclick=()=>setOpen(!opened);overview.onclick=()=>showAll();
  panel.addEventListener('keydown',e=>{if(e.key==='Escape'&&opened){setOpen(false);toggle.focus({preventScroll:true});}});
  map.on('move zoom moveend zoomend resize',scheduleLayout);
  const observer=new ResizeObserver(()=>{scheduleLayout();});
  [root,panel,root.querySelector('.country-bar'),root.querySelector('#point-preview')].forEach(e=>observer.observe(e));
  const drawerObserver=new MutationObserver(()=>{if(!zones.length)return;if(!sidebar.classList.contains('collapsed')&&opened)setOpen(false);scheduleLayout();if(sidebar.classList.contains('collapsed'))requestAnimationFrame(()=>fit(mode==='detail'?[zones[selected]]:zones,false));});
  drawerObserver.observe(sidebar,{attributes:true,attributeFilter:['class']});
  window.addEventListener('resize',()=>{if(zones.length)requestAnimationFrame(()=>fit(mode==='detail'?[zones[selected]]:zones,false));});
  return{show,clear,focus,showAll};
}
