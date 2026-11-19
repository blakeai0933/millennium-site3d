// Camera toolbar for the 3D views: hold a button to keep turning, tilting, zooming or moving.
// makeNav3D(container, adapter) — adapter: get() -> {h,t,r,lat,lng,alt}, set(state), stop(), home()
//   h heading in degrees (0 = north), t tilt in degrees (0 = straight down, 90 = level), r distance from the look-at point in metres.
(()=>{
const css=`
.nav3d{position:absolute;right:max(10px,env(safe-area-inset-right));top:50%;transform:translateY(-50%);z-index:5;display:flex;flex-direction:column;gap:6px;align-items:center;user-select:none;-webkit-user-select:none;touch-action:none}
.nav3d .grp{display:grid;gap:2px;background:rgba(14,21,27,.86);border:1px solid #35444f;border-radius:10px;padding:4px;box-shadow:0 4px 16px rgba(0,0,0,.35)}
.nav3d .pad{grid-template-columns:repeat(3,36px);grid-template-rows:repeat(3,36px)}
.nav3d .col{grid-template-columns:36px 36px}
.nav3d button{width:36px;height:36px;border:0;border-radius:7px;background:transparent;color:#e8eef3;font:600 15px/1 system-ui,sans-serif;cursor:pointer;display:grid;place-items:center;padding:0;touch-action:none}
.nav3d button:hover{background:rgba(255,255,255,.1)}.nav3d button.held{background:#2f6f9f}
.nav3d button svg{width:20px;height:20px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;pointer-events:none}
.nav3d .cmp{width:44px;height:44px;border-radius:50%;background:rgba(14,21,27,.86);border:1px solid #35444f;box-shadow:0 4px 16px rgba(0,0,0,.35)}
.nav3d .cmp svg{width:30px;height:30px;stroke:none}
.nav3d .lbl{font-size:9px;letter-spacing:.06em;text-transform:uppercase;color:#9fb0bf;text-align:center;grid-column:1/-1;padding-top:2px}
.nav3d .tip{position:absolute;right:calc(100% + 8px);white-space:nowrap;background:#0b1116;color:#e8eef3;font-size:11px;padding:3px 7px;border-radius:5px;pointer-events:none;opacity:0;transition:opacity .15s}
.nav3d button:hover .tip{opacity:1}
@media (max-width:760px){.nav3d{top:auto;bottom:10px;transform:none;gap:4px}.nav3d .pad{grid-template-columns:repeat(3,32px);grid-template-rows:repeat(3,32px)}.nav3d .col{grid-template-columns:32px 32px}.nav3d button{width:32px;height:32px}.nav3d .tip{display:none}.nav3d .cmp{width:38px;height:38px}}
@media (max-width:760px) and (max-height:700px){.nav3d .zoomgrp{display:none}}
`;
const I={
  up:'<path d="M12 19V5M5 12l7-7 7 7"/>',down:'<path d="M12 5v14M5 12l7 7 7-7"/>',left:'<path d="M19 12H5M12 5l-7 7 7 7"/>',right:'<path d="M5 12h14M12 5l7 7-7 7"/>',
  rotl:'<path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/>',rotr:'<path d="M21 12a9 9 0 1 1-3-6.7"/><path d="M21 4v5h-5"/>',
  tup:'<path d="M4 18h16"/><path d="M8 14l4-8 4 8"/>',tdn:'<path d="M4 6h16"/><path d="M8 10l4 8 4-8"/>',
  zin:'<circle cx="11" cy="11" r="7"/><path d="M11 8v6M8 11h6M20 20l-4-4"/>',zout:'<circle cx="11" cy="11" r="7"/><path d="M8 11h6M20 20l-4-4"/>',
  home:'<circle cx="12" cy="12" r="3"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/>',
  up2:'<path d="M12 19V7M7 12l5-5 5 5"/><path d="M5 4h14"/>',dn2:'<path d="M12 5v12M7 12l5 5 5-5"/><path d="M5 20h14"/>'
};
const svg=p=>`<svg viewBox="0 0 24 24" aria-hidden="true">${p}</svg>`;
const b=(k,icon,tip)=>`<button type="button" data-k="${k}" aria-label="${tip}">${svg(I[icon])}<span class="tip">${tip}</span></button>`;

window.makeNav3D=(host,A)=>{
  if(!document.getElementById('nav3dcss')){const s=document.createElement('style');s.id='nav3dcss';s.textContent=css;document.head.appendChild(s)}
  const el=document.createElement('div');el.className='nav3d';
  el.innerHTML=`
  <button type="button" class="cmp" data-k="north" aria-label="Face north"><svg viewBox="0 0 30 30" aria-hidden="true"><g class="needle"><path d="M15 3l4 12h-8z" fill="#e0312b"/><path d="M15 27l-4-12h8z" fill="#c9d4dc"/></g><text x="15" y="10" text-anchor="middle" font-size="0"></text></svg><span class="tip">Face north</span></button>
  <div class="grp pad">
    <span></span>${b('fwd','up','Move forward')}<span></span>
    ${b('lft','left','Move left')}${b('home','home','Back to the site')}${b('rgt','right','Move right')}
    <span></span>${b('back','down','Move back')}<span></span>
  </div>
  <div class="grp col">
    ${b('rl','rotl','Turn left')}${b('rr','rotr','Turn right')}
    ${b('tu','tup','Look more level')}${b('td','tdn','Look more down')}
    <span class="lbl">Turn · tilt</span>
  </div>
  <div class="grp col zoomgrp">
    ${b('zi','zin','Zoom in')}${b('zo','zout','Zoom out')}
    ${b('ru','up2','Raise camera')}${b('rd','dn2','Lower camera')}
    <span class="lbl">Zoom · height</span>
  </div>`;
  host.appendChild(el);
  const needle=el.querySelector('.needle');
  const M=111320,clamp=(v,a,c)=>Math.max(a,Math.min(c,v));
  const step=(s,k,dt)=>{const sp=Math.max(25,s.r)*0.5*dt,hr=s.h*Math.PI/180;
    const mv=(ang,d)=>{s.lat+=Math.cos(ang)*d/M;s.lng+=Math.sin(ang)*d/(M*Math.cos(s.lat*Math.PI/180))};
    switch(k){
      case 'fwd':mv(hr,sp);break;case 'back':mv(hr,-sp);break;case 'lft':mv(hr-Math.PI/2,sp);break;case 'rgt':mv(hr+Math.PI/2,sp);break;
      case 'rl':s.h=(s.h-45*dt+360)%360;break;case 'rr':s.h=(s.h+45*dt)%360;break;
      case 'tu':s.t=clamp(s.t+28*dt,0,88);break;case 'td':s.t=clamp(s.t-28*dt,0,88);break;
      case 'zi':s.r=clamp(s.r*Math.pow(0.55,dt),15,20000);break;case 'zo':s.r=clamp(s.r/Math.pow(0.55,dt),15,20000);break;
      case 'ru':s.alt=(s.alt||0)+Math.max(6,s.r*0.35)*dt;break;case 'rd':s.alt=Math.max(A.minAlt?A.minAlt():0,(s.alt||0)-Math.max(6,s.r*0.35)*dt);break;
    }};
  let held=null,raf=0,last=0,st=null;
  const loop=now=>{if(!held)return;const dt=Math.min(0.05,(now-last)/1000);last=now;step(st,held,dt);A.set(st);upd();raf=requestAnimationFrame(loop)};
  const start=(k,btn)=>{A.stop();
    if(k==='home'){A.home();return}
    if(k==='north'){const s=A.get();s.h=0;A.set(s,true);upd();return}
    st=A.get();held=k;btn&&btn.classList.add('held');last=performance.now();
    step(st,k,0.12);A.set(st);upd();raf=requestAnimationFrame(loop)};
  const end=()=>{if(!held)return;held=null;cancelAnimationFrame(raf);el.querySelectorAll('.held').forEach(x=>x.classList.remove('held'));A.done&&A.done()};
  el.addEventListener('pointerdown',e=>{const btn=e.target.closest('button');if(!btn)return;e.preventDefault();try{btn.setPointerCapture(e.pointerId)}catch(_){}start(btn.dataset.k,btn)});
  ['pointerup','pointercancel','lostpointercapture'].forEach(t=>el.addEventListener(t,end));
  el.addEventListener('contextmenu',e=>e.preventDefault());
  // keyboard: arrows move, Q/E turn, R/F tilt, +/- zoom, PageUp/PageDown height
  const KEYS={ArrowUp:'fwd',ArrowDown:'back',ArrowLeft:'lft',ArrowRight:'rgt',q:'rl',e:'rr',r:'tu',f:'td','+':'zi','=':'zi','-':'zo',PageUp:'ru',PageDown:'rd'};
  const visible=()=>host.offsetParent!==null&&!host.closest('[hidden]');
  window.addEventListener('keydown',e=>{if(!visible()||/input|select|textarea/i.test(e.target.tagName))return;const k=KEYS[e.key]||KEYS[e.key.toLowerCase()];if(!k)return;e.preventDefault();if(held!==k){end();start(k,el.querySelector(`[data-k="${k}"]`))}});
  window.addEventListener('keyup',e=>{const k=KEYS[e.key]||KEYS[e.key.toLowerCase()];if(k&&held===k)end()});
  const upd=()=>{try{const h=A.heading();needle.setAttribute('transform',`rotate(${-h} 15 15)`)}catch(_){}};
  setInterval(()=>{if(!held&&visible())upd()},250);upd();
  return el;
};
})();
