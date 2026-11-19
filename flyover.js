// Flyover tab: Google 3D Maps (Maps JavaScript API, maps3d) with a cinematic fly-in and orbit,
// oblique views from each side, and Google's pre-rendered Aerial View video when one exists for the address.
// Loaded only when someone opens the tab, because each load is a billed Google map load.
(()=>{
const $=id=>document.getElementById(id);
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const FT=3.28084;
let started=null;

function googleKey(){let k=(window.SITE3D&&SITE3D.googleKey)||'';try{k=k||localStorage.getItem('site3d-key')||''}catch(e){}return k}

function loadMapsJs(key){
  if(window.google&&google.maps&&google.maps.importLibrary)return;
  // Google's bootstrap loader (https://developers.google.com/maps/documentation/javascript/load-maps-js-api)
  (g=>{var h,a,k,p="The Google Maps JavaScript API",c="google",l="importLibrary",q="__ib__",m=document,b=window;b=b[c]||(b[c]={});var d=b.maps||(b.maps={}),r=new Set,e=new URLSearchParams,u=()=>h||(h=new Promise(async(f,n)=>{await (a=m.createElement("script"));e.set("libraries",[...r]+"");for(k in g)e.set(k.replace(/[A-Z]/g,t=>"_"+t[0].toLowerCase()),g[k]);e.set("callback",c+".maps."+q);a.src=`https://maps.${c}apis.com/maps/api/js?`+e;d[q]=f;a.onerror=()=>h=n(Error(p+" could not load."));a.nonce=m.querySelector("script[nonce]")?.nonce||"";m.head.append(a)}));d[l]?console.warn(p+" only loads once. Ignoring:",g):d[l]=(f,...n)=>r.add(f)&&u().then(()=>d[l](f,...n))})({key,v:'beta'});
}

window.initFly=P=>started||(started=start(P).catch(e=>{started=null;throw e}));

async function start(P){
  const lat=+P.lat,lng=+P.lon,side=$('flyside'),m=$('fmsg');
  const reach=[100,150,200,250].includes(+P.r)?+P.r:150;
  const key=googleKey();
  side.innerHTML=panelHtml(P,!!key);
  if(!key){m.hidden=false;m.innerHTML='<b>Google key not set up yet</b><div class="dim" style="font-size:12px;margin-top:4px">The flyover needs the Millennium Google Maps key (GOOGLE_MAPS_KEY in the site settings).</div>';return}
  m.hidden=false;m.textContent='Loading Google 3D…';
  loadMapsJs(key);
  const lib=await google.maps.importLibrary('maps3d');
  const MM=lib.MapMode||{SATELLITE:'SATELLITE',HYBRID:'HYBRID'};
  const site={lat,lng,altitude:0};
  const map=new lib.Map3DElement({center:{lat,lng,altitude:0},range:2600,tilt:0,heading:0,mode:MM.HYBRID,defaultUIHidden:true});
  $('flym').appendChild(map);
  window.FLY3D=map;
  m.hidden=true;

  // site pin and crane reach ring, when this version of the library has them
  try{const mk=new lib.Marker3DElement({position:{lat,lng,altitude:35},altitudeMode:'RELATIVE_TO_GROUND',extruded:true,label:P.n||'Site'});map.append(mk)}catch(e){}
  const ring=r=>{const R=r/FT/111320,o=[];for(let i=0;i<=72;i++){const a=i/72*2*Math.PI;o.push({lat:lat+R*Math.sin(a),lng:lng+R*Math.cos(a)/Math.cos(lat*Math.PI/180)})}return o};
  let reachEl=null;
  const drawReach=r=>{try{if(reachEl)reachEl.remove();reachEl=new lib.Polygon3DElement({altitudeMode:'CLAMP_TO_GROUND',fillColor:'rgba(224,49,43,0.18)',strokeColor:'#e0312b',strokeWidth:3,drawsOccludedSegments:true});const pts=ring(r);if('path' in reachEl)reachEl.path=pts;else reachEl.outerCoordinates=pts;map.append(reachEl)}catch(e){}};
  drawReach(reach);
  const keyF=r=>{const S=KEYSW;mapKey($('flym'),'keyF',[['Site',[[S.ring('#e0312b','solid','rgba(224,49,43,.18)'),`Crane reach (${r} ft from the site pin)`],[S.dot('#e0312b','#fff'),'Site pin']]]],'Power lines are shown on the 3D city and Satellite tabs.')};
  keyF(reach);

  const cam=(o)=>({center:site,range:o.range,tilt:o.tilt,heading:o.heading});
  const stop=()=>{try{map.stopCameraAnimation()}catch(e){}};
  const fly=(o,ms)=>{stop();map.flyCameraTo({endCamera:cam(o),durationMillis:ms==null?2500:ms})};
  let rng=420;
  function flyover(){stop();
    map.flyCameraTo({endCamera:cam({range:2600,tilt:0,heading:0}),durationMillis:0});
    setTimeout(()=>{map.flyCameraTo({endCamera:cam({range:rng,tilt:62,heading:0}),durationMillis:9000});
      map.addEventListener('gmp-animationend',()=>map.flyCameraAround({camera:cam({range:rng,tilt:62,heading:0}),durationMillis:40000,rounds:1}),{once:true})},300)}
  // first view: fly straight in
  flyover();

  $('fPlay').onclick=flyover;
  $('fOrbit').onclick=()=>{stop();map.flyCameraAround({camera:cam({range:rng,tilt:map.tilt||60,heading:map.heading||0}),durationMillis:40000,rounds:1})};
  $('fStop').onclick=stop;
  side.querySelectorAll('[data-h]').forEach(b=>b.onclick=()=>fly({range:Math.max(220,rng*0.8),tilt:+b.dataset.t,heading:+b.dataset.h}));
  $('fNear').onclick=()=>{rng=Math.max(120,rng*0.6);fly({range:rng,tilt:map.tilt||60,heading:map.heading||0},1500)};
  $('fFar').onclick=()=>{rng=Math.min(4000,rng/0.6);fly({range:rng,tilt:map.tilt||60,heading:map.heading||0},1500)};
  $('fLabels').onchange=e=>{map.mode=e.target.checked?MM.HYBRID:MM.SATELLITE};
  side.querySelectorAll('#freach button').forEach(b=>b.onclick=()=>{side.querySelectorAll('#freach button').forEach(x=>x.classList.toggle('on',x===b));drawReach(+b.dataset.r);keyF(+b.dataset.r)});
  map.addEventListener('gmp-click',stop);
  // toolbar on the right: hold to move, turn, tilt, zoom or raise the camera
  window.makeNav3D&&makeNav3D($('flym'),{
    get:()=>{const c=map.center||site;return {h:((+map.heading||0)+360)%360,t:+map.tilt||0,r:+map.range||rng,lat:+c.lat,lng:+c.lng,alt:+c.altitude||0}},
    set:s=>{map.center={lat:s.lat,lng:s.lng,altitude:s.alt||0};map.heading=s.h;map.tilt=s.t;map.range=s.r},
    stop,
    home:()=>fly({range:rng,tilt:60,heading:+map.heading||0},1500),
    heading:()=>+map.heading||0});

  aerial(P,key);
}

function panelHtml(P,hasKey){
  const reach=[100,150,200,250].includes(+P.r)?+P.r:150;
  const ge=`https://earth.google.com/web/@${(+P.lat).toFixed(6)},${(+P.lon).toFixed(6)},0a,450d,35y,0h,60t,0r`;
  return `<h3>Flyover</h3><div class="dim">Google's photorealistic 3D city. Use the toolbar on the right to move, turn, tilt and zoom; hold a button to keep going. Keys: arrows move, Q/E turn, R/F tilt, +/− zoom.</div>
  ${hasKey?`<div class="row"><button class="btn pri" id="fPlay" type="button">Play flyover</button><button class="btn" id="fOrbit" type="button">Orbit</button><button class="btn" id="fStop" type="button">Stop</button></div>
  <h4>Oblique views</h4>
  <div class="row">
    <button class="btn" type="button" data-h="0" data-t="50">Looking north</button><button class="btn" type="button" data-h="90" data-t="50">Looking east</button>
    <button class="btn" type="button" data-h="180" data-t="50">Looking south</button><button class="btn" type="button" data-h="270" data-t="50">Looking west</button>
    <button class="btn" type="button" data-h="0" data-t="0">Straight down</button><button class="btn" type="button" data-h="0" data-t="82">Street level</button>
  </div>
  <div class="row"><button class="btn" id="fNear" type="button">Closer</button><button class="btn" id="fFar" type="button">Farther</button><label class="ck"><input type="checkbox" id="fLabels" checked> Street names</label></div>
  <h4>Crane reach</h4><div class="seg" id="freach">${[100,150,200,250].map(r=>`<button type="button" data-r="${r}" class="${r===reach?'on':''}">${r} ft</button>`).join('')}</div>
  <h4>Flyover video</h4><div id="fVid"><div class="dim">Checking Google for a flyover video of ${esc(P.a||'this address')}…</div></div>`:''}
  <div class="note">3D imagery is Google's and can be a year or more old, so new grading, demo or neighboring buildings may not show. Verify on the site walk. <a href="${ge}" target="_blank" rel="noopener" style="color:#9fd0ff">Open in Google Earth ↗</a></div>`;
}

// Aerial View API: pre-rendered flyover videos for US street addresses (renders take about an hour to a few hours).
async function aerial(P,key){
  const box=$('fVid');if(!box)return;
  const addr=(P.a||'').trim();
  if(!addr||!/\d/.test(addr)){box.innerHTML='<div class="dim">Google flyover videos need a street address, and this job only has an approximate location.</div>';return}
  const AV='https://aerialview.googleapis.com/v1/videos';
  const q=p=>{const u=new URL(AV+p);u.searchParams.set('key',key);return u};
  const meta=async()=>{const u=q(':lookupVideoMetadata');u.searchParams.set('address',addr);const r=await fetch(u);if(r.status===404)return {state:'NONE'};const j=await r.json().catch(()=>({}));if(!r.ok)throw new Error((j.error&&j.error.message)||('Aerial View '+r.status));return j};
  const show=async()=>{box.innerHTML='<div class="dim">Loading the video…</div>';
    try{const u=q(':lookupVideo');u.searchParams.set('address',addr);const r=await fetch(u);const j=await r.json();if(!r.ok)throw new Error((j.error&&j.error.message)||('Aerial View '+r.status));
      const U=j.uris||{},v=(U.MP4_HIGH||U.MP4_MEDIUM||U.MP4_LOW||{}).landscapeUri;if(!v)throw new Error('No video file came back.');
      box.innerHTML=`<video controls autoplay muted playsinline loop style="width:100%;border-radius:6px;background:#000" src="${esc(v)}"></video><div class="note">Video by Google Aerial View${j.metadata&&j.metadata.captureDate?`, imagery from ${esc(fmtDate(j.metadata.captureDate))}`:''}. It streams from Google and can't be saved.</div>`}
    catch(e){box.innerHTML=`<div class="alert">${esc(e.message||e)}</div>`}};
  const request=async()=>{box.innerHTML='<div class="dim">Asking Google to make the video…</div>';
    try{const r=await fetch(q(':renderVideo'),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({address:addr})});const j=await r.json().catch(()=>({}));
      if(!r.ok){const msg=(j.error&&j.error.message)||('Aerial View '+r.status);box.innerHTML=`<div class="alert">${/not supported/i.test(msg)?'Google can\'t make a flyover video for this address.':esc(msg)}</div>`;return}
      if(j.state==='ACTIVE')return show();
      box.innerHTML='<div><span class="flag amb">Rendering</span>Google is making the flyover video. It usually takes an hour to a few hours; open this tab again later.</div>'}
    catch(e){box.innerHTML=`<div class="alert">${esc(e.message||e)}</div>`}};
  try{const md=await meta();
    if(md.state==='ACTIVE'){box.innerHTML=`<div class="row"><span class="flag">Ready</span>Google has a flyover video for this address${md.captureDate?` (imagery ${esc(fmtDate(md.captureDate))})`:''}.</div><div class="row"><button class="btn pri" id="fVgo" type="button">Play flyover video</button></div>`;$('fVgo').onclick=show}
    else if(md.state==='PROCESSING')box.innerHTML='<div><span class="flag amb">Rendering</span>Google is still making this video. Check back in a little while.</div>';
    else{box.innerHTML=`<div class="dim">Google doesn't have a flyover video for this address yet.</div><div class="row"><button class="btn" id="fVreq" type="button">Request a flyover video</button></div><div class="note">US street addresses only. Google renders it from the same 3D imagery, usually within a few hours.</div>`;$('fVreq').onclick=request}}
  catch(e){box.innerHTML=`<div class="dim">Flyover videos aren't available with this key yet (${esc(e.message||e)}). The Aerial View API needs to be turned on for the Google key.</div>`}
}
function fmtDate(d){try{return new Date(d.year,(d.month||1)-1,d.day||1).toLocaleDateString([],{month:'short',year:'numeric'})}catch(e){return ''}}
})();
