// Map key used by every Site Viewer tab: explains the colors and symbols drawn on the map.
// mapKey(host, id, groups) where groups = [[title, [[swatchHtml, label], ...]], ...]; returns the element.
(()=>{
const css=`
.key{position:absolute;left:max(10px,env(safe-area-inset-left));bottom:28px;z-index:4;background:rgba(14,21,27,.92);color:#e8eef3;border:1px solid #35444f;border-radius:8px;font-size:11.5px;max-width:min(280px,calc(100% - 80px));max-height:calc(100% - 60px);overflow:auto;box-shadow:0 4px 16px rgba(0,0,0,.35)}
.key>button{display:flex;align-items:center;justify-content:space-between;gap:12px;width:100%;border:0;background:none;color:inherit;font:700 10.5px system-ui,sans-serif;letter-spacing:.09em;text-transform:uppercase;padding:7px 10px;cursor:pointer}
.key>button svg{width:13px;height:13px;fill:none;stroke:currentColor;stroke-width:2.2;transition:transform .15s}.key.closed>button svg{transform:rotate(180deg)}
.key.closed .kb{display:none}.key .kb{padding:0 10px 8px;display:grid;gap:3px}
.key .kg{font-size:9.5px;letter-spacing:.09em;text-transform:uppercase;color:#9fb0bf;margin-top:5px}
.key .kr{display:flex;align-items:center;gap:7px;line-height:1.3}.key .kr>i{flex:0 0 auto;display:inline-block}
.key .note{color:#9fb0bf;font-size:10.5px;margin-top:3px}
.polebox{position:absolute;left:max(10px,env(safe-area-inset-left));top:10px;z-index:6;max-width:min(270px,calc(100% - 80px));background:rgba(14,21,27,.95);color:#e8eef3;border:1px solid #35444f;border-left:4px solid #d9661f;border-radius:8px;padding:8px 26px 8px 10px;font-size:12px;line-height:1.45;box-shadow:0 6px 20px rgba(0,0,0,.4)}
.polebox button{position:absolute;top:2px;right:4px;border:0;background:none;color:#9fb0bf;font-size:16px;cursor:pointer}
@media (max-width:760px){.key{bottom:10px;font-size:11px}}
`;
const S={
  ln:(c,st,w)=>`<i style="width:22px;height:0;border-top:${w||3}px ${st||'solid'} ${c}"></i>`,
  dot:(c,b)=>`<i style="width:10px;height:10px;border-radius:50%;background:${c};${b?'border:1.5px solid '+b:''}"></i>`,
  ring:(c,st,fill)=>`<i style="width:12px;height:12px;border-radius:50%;border:1.5px ${st||'solid'} ${c};background:${fill||'transparent'}"></i>`,
  sq:(c,b)=>`<i style="width:10px;height:10px;border-radius:2px;background:${c};${b?'border:1.5px solid '+b:''}"></i>`,
  bar:c=>`<i style="width:4px;height:14px;margin:0 9px;background:${c};border-radius:1px"></i>`
};
window.KEYSW=S;
// pole symbol (same look as the bid map): colored disc, white crossarm; towers get a triangle
window.POLEICON=(c,tower)=>'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="-20 -20 40 40"><circle r="15" fill="${c}" stroke="#fff" stroke-width="3.5"/>${tower?'<path d="M0 -9L8 7H-8Z M-4 1H4" fill="none" stroke="#fff" stroke-width="2.6" stroke-linejoin="round"/>':'<path d="M0 10V-10M-8 -5.5H8M-5 -1H5" fill="none" stroke="#fff" stroke-width="2.8" stroke-linecap="round"/>'}</svg>`);
window.POLECOL=(dft,reach)=>dft<=reach+20?'#e0312b':dft<=300?'#f2b01e':'#d9661f';
// p = [dx, dy, kind, poleNumber, kV, transformer, owner, circuit] in metres from the site pin
window.poleHtml=(p,reach)=>{const [dx,dy,k,r,kv,tx,op,ckt,src]=p,d=Math.round(Math.hypot(dx,dy)*3.28084),a=Math.atan2(dx,dy)*180/Math.PI,dir=['N','NE','E','SE','S','SW','W','NW'][Math.round(((a+360)%360)/45)%8];
  const e=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  return [`<b>${k==='t'?'Transmission tower':'Utility pole'}${r?' #'+e(r):''}</b>${op?' · '+e(op):''}`,
    (ckt||kv)?`Carries ${ckt?'SCE circuit '+e(ckt)+' ':''}${kv?kv+' kV':''}`:'',tx?'Has a transformer':'',
    `${d} ft ${dir} of the site pin${d<=reach+20?` — <b style="color:#ff6b62">inside the ${reach} ft reach + 20 ft clearance</b>`:d<=300?' — within 300 ft':''}`,
    `<span style="color:#9fb0bf">Source: ${src==='f'?'OCFA pole inspection list':src==='y'?'Mapillary street photos (computer-detected; position within a few feet)':'OpenStreetMap'}. Verify on site.</span>`].filter(Boolean).join('<br>')};
window.poleBox=(host,html)=>{let el=host.querySelector('.polebox');if(!el){el=document.createElement('div');el.className='polebox';host.appendChild(el)}
  el.innerHTML=`<button type="button" aria-label="Close">×</button>${html}`;el.hidden=false;el.firstChild.onclick=()=>{el.hidden=true}};
window.mapKey=(host,id,groups,note)=>{
  if(!document.getElementById('keycss')){const s=document.createElement('style');s.id='keycss';s.textContent=css;document.head.appendChild(s)}
  let el=document.getElementById(id);if(el)el.remove();
  el=document.createElement('div');el.className='key';el.id=id;
  let open=true;try{const v=localStorage.getItem('site3d-key-open');open=v==null?!matchMedia('(max-width:760px)').matches:v==='1'}catch(e){}
  el.classList.toggle('closed',!open);
  el.innerHTML=`<button type="button" aria-expanded="${open}"><span>Map key</span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 15l6-6 6 6"/></svg></button><div class="kb">${groups.map(([t,rows])=>`<div class="kg">${t}</div>${rows.map(([sw,l])=>`<div class="kr">${sw}<span>${l}</span></div>`).join('')}`).join('')}${note?`<div class="note">${note}</div>`:''}</div>`;
  el.firstChild.onclick=()=>{const c=el.classList.toggle('closed');el.firstChild.setAttribute('aria-expanded',!c);try{localStorage.setItem('site3d-key-open',c?'0':'1')}catch(e){}};
  host.appendChild(el);return el};
// the site hazards drawn on the satellite, truck route and 3D tabs
window.siteKeyGroups=(reach,extra,o)=>{const s=S;o=o||{};return [
  ['Crane',[[s.ring('#e0312b','solid','rgba(224,49,43,.15)'),`Crane reach (${reach} ft from the site pin)`],[s.ring(o.solid?'rgba(224,49,43,.7)':'#e0312b',o.solid?'solid':'dashed'),'Reach + 20 ft power-line clearance (OSHA)']]],
  ['Overhead power',[[s.ln('#e0312b'),'Line inside the clearance — danger'],[s.ln('#f07a1a'),'Line 60 kV and up (transmission)'],[s.ln('#ffcf33'),'Line under 60 kV or voltage unknown'],[s.ln('#8a97a3','dashed'),'Circuit, overhead not confirmed'],[`<i><img src="${POLEICON('#d9661f')}" width="14" height="14" alt=""></i>`,'Utility pole (tap for details)'],[`<i><img src="${POLEICON('#f2b01e')}" width="14" height="14" alt=""></i>`,'Pole within 300 ft'],[`<i><img src="${POLEICON('#e0312b')}" width="14" height="14" alt=""></i>`,'Pole inside the clearance'],...(o.ug?[[s.ln('#9b6bff','dotted'),'Underground (not a crane hazard; call 811 before digging)']]:[])]],
  ...(extra||[])]};
})();
