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
  ['Overhead power',[[s.ln('#e0312b'),'Line inside the clearance — danger'],[s.ln('#f07a1a'),'Line 60 kV and up (transmission)'],[s.ln('#ffcf33'),'Line under 60 kV or voltage unknown'],[s.dot('#8a6a3a','#fff'),'Utility pole'],[s.dot('#e0312b','#fff'),'Pole inside the clearance']]],
  ...(extra||[])]};
})();
