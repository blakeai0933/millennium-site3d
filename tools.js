// Millennium Site Viewer: tabs, Google 3D (site3d.js) and Azure Maps tools (satellite, truck route, traffic, weather).
// Everything about the site arrives in the link's #hash, which browsers never send to the web server.
(()=>{
const $=id=>document.getElementById(id);
const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
let P={};
const HS=location.hash.length>1?location.hash:(()=>{try{return sessionStorage.getItem('site3d-hash')||''}catch(e){return ''}})();
try{P=JSON.parse(decodeURIComponent(atob(HS.slice(1).replace(/-/g,'+').replace(/_/g,'/'))))}catch(e){}
const lat=+P.lat,lon=+P.lon;
if(!isFinite(lat)||!isFinite(lon)){document.querySelector('main').innerHTML='<div class="msg">Open this page from a job card on the Bid Pipeline Map.</div>';return}
$('title').textContent=P.n||'Jobsite';
$('sub').textContent=P.a||`${lat.toFixed(5)}, ${lon.toFixed(5)}`;
document.title=(P.n||'Site')+' · Site Viewer';
const CFG=window.SITE3D||{};
const MKEY=CFG.azureMapsKey||'';
const OFFICE=Array.isArray(P.o)?{lat:+P.o[0],lon:+P.o[1],name:'San Clemente office'}:{lat:33.4269,lon:-117.6120,name:'San Clemente office'};
const FABS=(Array.isArray(P.fab)?P.fab:[]).filter(f=>Array.isArray(f)&&isFinite(+f[2])&&isFinite(+f[3])).map(([k,n,la,lo])=>({k:String(k),name:String(n),lat:+la,lon:+lo}));
let autoFrom=FABS.find(f=>f.k===P.f)||null;
const LS={get:k=>{try{return JSON.parse(localStorage.getItem('site3d-'+k))}catch(e){return null}},set:(k,v)=>{try{localStorage.setItem('site3d-'+k,JSON.stringify(v))}catch(e){}}};
const FT=3.28084;
const m2ll=(dx,dy)=>[lon+dx/111320/Math.cos(lat*Math.PI/180),lat+dy/111320];

// ---------- script loading ----------
const loaded={};
const loadScript=src=>loaded[src]||(loaded[src]=new Promise((res,rej)=>{const s=document.createElement('script');s.src=src;s.onload=res;s.onerror=()=>rej(new Error('could not load '+src));document.head.appendChild(s)}));
const loadCss=href=>{if(document.querySelector(`link[href="${href}"]`))return;const l=document.createElement('link');l.rel='stylesheet';l.href=href;document.head.appendChild(l)};

// ---------- tabs ----------
const TABS=['3d','fly','sat','route','traffic','wx'];
let tab=null,started3d=false;
async function show(t){if(!TABS.includes(t))t='3d';tab=t;
  document.querySelectorAll('#tabs button').forEach(b=>b.classList.toggle('on',b.dataset.t===t));
  const is3d=t==='3d',isFly=t==='fly';$('cz').hidden=!is3d;$('foot3d').hidden=!is3d;$('flyp').hidden=!isFly;$('tools').hidden=is3d||isFly;
  if(window.VIEW3D)window.VIEW3D.useDefaultRenderLoop=is3d;
  LS.set('tab',t);
  if(is3d){if(!started3d){started3d=true;$('msg').hidden=false;$('msg').textContent='Loading 3D city…';
      try{loadCss('https://cdn.jsdelivr.net/npm/cesium@1.121.0/Build/Cesium/Widgets/widgets.css');await loadScript('https://cdn.jsdelivr.net/npm/cesium@1.121.0/Build/Cesium/Cesium.js');await window.init3D(P)}
      catch(e){$('msg').hidden=false;$('msg').textContent='3D view could not start: '+(e.message||e)}}
    return}
  if(isFly){if(window.FLY3D)return;try{await window.initFly(P)}catch(e){$('fmsg').hidden=false;$('fmsg').textContent='Flyover could not start: '+(e.message||e)}return}
  await mapTab(t);
}
document.querySelectorAll('#tabs button').forEach(b=>b.onclick=()=>show(b.dataset.t));

// ---------- Azure Maps ----------
const AZ='https://atlas.microsoft.com';
const api=async(path,params={},init)=>{const u=new URL(AZ+path);for(const[k,v]of Object.entries(params))if(v!=null&&v!=='')u.searchParams.set(k,v);u.searchParams.set('subscription-key',MKEY);
  const r=await fetch(u,init);if(!r.ok){let m='';try{m=(await r.json()).error.message}catch(e){}throw new Error(`Azure Maps ${r.status}${m?': '+m:''}`)}return r.json()};
let map=null,src=null,routeSrc=null,mapReady=null,poleLayer=null;
function amsg(t){$('amsg').hidden=!t;$('amsg').innerHTML=t||''}
async function ensureMap(){if(mapReady)return mapReady;
  mapReady=(async()=>{if(!MKEY)throw new Error('The Azure Maps key is not set up yet (AZURE_MAPS_KEY secret).');
    loadCss(AZ+'/sdk/javascript/mapcontrol/3/atlas.min.css');await loadScript(AZ+'/sdk/javascript/mapcontrol/3/atlas.min.js');
    map=new atlas.Map('am',{center:[lon,lat],zoom:17,style:'satellite_road_labels',view:'Auto',language:'en-US',showFeedbackLink:false,
      authOptions:{authType:'subscriptionKey',subscriptionKey:MKEY}});
    await new Promise(res=>map.events.add('ready',res));
    map.controls.add([new atlas.control.ZoomControl(),new atlas.control.StyleControl({mapStyles:['satellite_road_labels','satellite','road','grayscale_dark']})],{position:'top-right'});
    await Promise.all([['pole','#d9661f',0],['pole-amb','#f2b01e',0],['pole-red','#e0312b',0],['tower','#a3361a',1],['tower-red','#e0312b',1]].map(([id,c,t])=>map.imageSprite.add(id,POLEICON(c,t)).catch(()=>{})));
    src=new atlas.source.DataSource();map.sources.add(src);
    routeSrc=new atlas.source.DataSource('route');map.sources.add(routeSrc);
    map.layers.add([
      new atlas.layer.PolygonLayer(src,null,{filter:['==',['get','k'],'reach'],fillColor:'rgba(224,49,43,0.12)'}),
      new atlas.layer.LineLayer(src,null,{filter:['==',['get','k'],'reach'],strokeColor:'#e0312b',strokeWidth:2}),
      new atlas.layer.LineLayer(src,null,{filter:['==',['get','k'],'clr'],strokeColor:'#e0312b',strokeWidth:1.2,strokeDashArray:[3,2]}),
      new atlas.layer.LineLayer(src,null,{filter:['==',['get','k'],'ugline'],strokeColor:'#9b6bff',strokeWidth:2,strokeDashArray:[1,2.5]}),
      new atlas.layer.LineLayer(src,null,{filter:['==',['get','k'],'qline'],strokeColor:['case',['get','bad'],'#e0312b','#8a97a3'],strokeWidth:2,strokeDashArray:[4,3]}),
      new atlas.layer.LineLayer(src,null,{filter:['==',['get','k'],'line'],strokeColor:['case',['get','bad'],'#e0312b',['>=',['get','kv'],60],'#f07a1a','#ffcf33'],strokeWidth:['case',['get','bad'],3,2]}),
      poleLayer=new atlas.layer.SymbolLayer(src,null,{filter:['==',['get','k'],'pole'],iconOptions:{image:['case',['all',['get','bad'],['==',['get','t'],'t']],'tower-red',['get','bad'],'pole-red',['==',['get','t'],'t'],'tower',['get','amb'],'pole-amb','pole'],size:['interpolate',['linear'],['zoom'],15,0.35,18,0.6,20,0.8],allowOverlap:true,ignorePlacement:true},textOptions:{textField:['step',['zoom'],'',17,['get','lab']],offset:[0,1.5],color:'#ffffff',haloColor:'#000000',haloWidth:1.6,size:11,allowOverlap:true}}),
      new atlas.layer.LineLayer(routeSrc,null,{strokeColor:'#2b8be6',strokeWidth:6,lineJoin:'round',lineCap:'round'}),
      new atlas.layer.SymbolLayer(src,null,{filter:['==',['get','k'],'pin'],iconOptions:{image:'pin-blue',anchor:'bottom',allowOverlap:true},textOptions:{textField:['get','name'],offset:[0,-3.2],color:'#fff',haloColor:'#000',haloWidth:1.5,allowOverlap:true}})
    ]);
    map.events.add('click',poleLayer,e=>{const s=e.shapes&&e.shapes[0];if(!s)return;const pr=s.getProperties?s.getProperties():s.properties;if(pr&&pr.info)poleBox($('am'),pr.info)});
    map.events.add('mouseover',poleLayer,()=>map.getCanvasContainer().style.cursor='pointer');map.events.add('mouseout',poleLayer,()=>map.getCanvasContainer().style.cursor='');
    drawSite(+(LS.get('reach')||P.r||150));
    return map})();
  return mapReady.catch(e=>{mapReady=null;throw e})}
function drawSite(reach){if(!src)return;src.clear();const R=reach/FT,C=(reach+20)/FT;const center=new atlas.data.Position(lon,lat);
  const ring=r=>atlas.math.getRegularPolygonPath(center,r,64,'meters');
  src.add([new atlas.data.Feature(new atlas.data.Polygon([ring(R)]),{k:'reach'}),new atlas.data.Feature(new atlas.data.LineString(ring(C)),{k:'clr'}),new atlas.data.Feature(new atlas.data.Point(center),{k:'pin',name:P.n||'Site'})]);
  const pw=P.pw||{};
  (pw.p||[]).forEach(a=>{const [dx,dy,k]=a,d=Math.hypot(dx,dy),dft=Math.round(d*FT);src.add(new atlas.data.Feature(new atlas.data.Point(m2ll(dx,dy)),{k:'pole',bad:d<=C,amb:dft<=300,t:k,lab:dft<=300?dft+' ft':'',info:poleHtml(a,reach)}))});
  (pw.l||[]).forEach(([pts,kv,f])=>{if(f==='u'&&!UGON)return;let near=1e9;for(let i=0;i<pts.length-1;i++){const[ax,ay]=pts[i],[bx,by]=pts[i+1],L=(bx-ax)**2+(by-ay)**2,t=L?Math.max(0,Math.min(1,(-ax*(bx-ax)-ay*(by-ay))/L)):0;near=Math.min(near,Math.hypot(ax+t*(bx-ax),ay+t*(by-ay)))}
    src.add(new atlas.data.Feature(new atlas.data.LineString(pts.map(([x,y])=>m2ll(x,y))),{k:f==='u'?'ugline':f==='q'?'qline':'line',kv:kv||0,bad:f!=='u'&&near<=C}))})}

async function mapTab(t){const side=$('side');
  try{await ensureMap();amsg('')}catch(e){amsg(esc(e.message||e));}
  if(map){map.resize();map.setTraffic(t==='traffic'?{flow:'relative',incidents:true}:{flow:'none',incidents:false});
    map.setStyle({style:t==='traffic'?'grayscale_dark':'satellite_road_labels'});
    $('legendT')&&$('legendT').remove();
    siteKey(t);
    if(t==='traffic'){const lg=document.createElement('div');lg.className='legend';lg.id='legendT';lg.innerHTML='Traffic vs normal: <i style="background:#2ecc71"></i>flowing<i style="background:#f1c40f"></i>slow<i style="background:#e74c3c"></i>heavy';$('am').appendChild(lg)}
    if(t==='sat'||t==='traffic')map.setCamera({center:[lon,lat],zoom:t==='sat'?18:14,type:'ease',duration:600});
    if(routeSrc&&t!=='route')routeSrc.clear()}
  if(t==='sat')side.innerHTML=satPanel();
  else if(t==='route')routePanel();
  else if(t==='traffic')trafficPanel();
  else if(t==='wx')weatherPanel();
}

function siteKey(t){if(t!=='sat'&&t!=='route'){$('keyS')&&$('keyS').remove();return}const S=KEYSW,reach=+(LS.get('reach')||P.r||150);
  mapKey($('am'),'keyS',siteKeyGroups(reach,[['Site',[[S.dot('#2f6f9f','#fff'),'Site pin'],...(t==='route'?[[S.ln('#2b8be6','solid',5),'Planned truck route']]:[])]]],{ug:UGON}),'Power lines and poles come from OpenStreetMap and utility maps and are incomplete. Verify on the site walk.')}
// ---------- Satellite ----------
function satPanel(){const reach=+(LS.get('reach')||P.r||150);setTimeout(()=>{const u=$('sUg');if(u)u.onchange=()=>{UGON=u.checked;drawSite(+(LS.get('reach')||P.r||150));siteKey(tab)}},0);setTimeout(()=>document.querySelectorAll('#sreach button').forEach(b=>b.onclick=()=>{LS.set('reach',+b.dataset.r);drawSite(+b.dataset.r);siteKey(tab);$('side').innerHTML=satPanel()}),0);
  const pw=P.pw||{},C=(reach+20)/FT;const poles=(pw.p||[]).filter(([dx,dy])=>Math.hypot(dx,dy)<=C).length;
  return `<h3>Live satellite</h3><div class="dim">Microsoft/Azure Maps imagery streamed at full detail. Zoom anywhere around the site.</div>
  <h4>Crane reach</h4><div class="seg" id="sreach">${[100,150,200,250].map(r=>`<button data-r="${r}" class="${r===reach?'on':''}">${r} ft</button>`).join('')}</div>
  <div class="row">${poles?`<span class="flag red">Conflict</span>${poles} mapped pole${poles>1?'s':''} inside ${reach} ft + 20 ft`:`<span class="flag">Clear</span>No mapped poles inside ${reach} ft + 20 ft`}</div>
  <label class="ck" style="margin-top:10px"><input type="checkbox" id="sUg" ${UGON?'checked':''}> Show underground power (off by default)</label>
  <div class="note">Red ring: reach from the site pin. Dashed ring: plus the 20 ft line clearance (OSHA 1926.1408). Poles and lines come from OpenStreetMap and utility maps and are incomplete. Verify on site. Satellite photos can be months or years old.</div>`}

// ---------- Truck route ----------
let UGON=false; // underground power: always starts off
const DEF_TRUCK={lbs:80000,load:48000,trailer:48,len:70,h:13.5,w:8.5,haz:''};
function routePanel(){const T={...DEF_TRUCK,...(LS.get('truck')||{})};const auto=autoFrom;autoFrom=null;const from=auto||LS.get('from')||{name:OFFICE.name,lat:OFFICE.lat,lon:OFFICE.lon};
  const START=[{k:'office',name:OFFICE.name,lat:OFFICE.lat,lon:OFFICE.lon},...FABS];
  const preset=START.find(s=>Math.abs(s.lat-from.lat)<1e-4&&Math.abs(s.lon-from.lon)<1e-4);
  const truckLine=t=>`${t.len} ft overall · ${Math.floor(t.h)}'-${Math.round((t.h%1)*12)}" tall · ${(+t.lbs).toLocaleString()} lbs${t.haz?' · hazmat':''}`;
  $('side').innerHTML=`<h3>Truck route to the site</h3>
  <div class="fld one"><label for="rStart">Start from</label>
    <select id="rStart"><optgroup label="Millennium"><option value="0">${esc(OFFICE.name)}</option></optgroup>
      ${FABS.length?`<optgroup label="Suppliers and yards">${FABS.map((f,i)=>`<option value="${i+1}">${esc(f.name)}</option>`).join('')}</optgroup>`:''}
      <optgroup label="Other"><option value="custom">Another address…</option></optgroup></select></div>
  <div id="rCustom" ${preset?'hidden':''}><div class="srch"><input id="rFrom" value="${preset?'':esc(from.name)}" placeholder="Street address or place" autocomplete="off" spellcheck="false" aria-label="Start address"><button class="btn" id="rFind" type="button">Find</button></div><div class="sugg" id="rSugg"></div></div>
  <details class="truck"><summary><span>Truck</span><b id="tSum">${esc(truckLine(T))}</b><em>Change</em></summary>
  <div class="fld">
    <label for="tLbs">Gross weight (lbs)</label><input id="tLbs" inputmode="numeric" value="${T.lbs}">
    <label for="tLen">Overall length (ft)</label><input id="tLen" inputmode="decimal" value="${T.len}">
    <label for="tH">Height (ft)</label><input id="tH" inputmode="decimal" value="${T.h}">
    <label for="tW">Width (ft)</label><input id="tW" inputmode="decimal" value="${T.w}">
    <label for="tHaz">Hazmat</label><select id="tHaz"><option value="">None</option>${[1,2,3,4,5,6,7,8,9].map(n=>`<option value="USHazmatClass${n}" ${T.haz==='USHazmatClass'+n?'selected':''}>Class ${n}</option>`).join('')}</select>
  </div>
  <div class="note" style="margin-top:6px">Standard delivery: ${DEF_TRUCK.load.toLocaleString()} lb load on a ${DEF_TRUCK.trailer} ft flatbed, about ${DEF_TRUCK.lbs.toLocaleString()} lbs gross with the tractor. Changes are remembered on this device.</div></details>
  <button class="btn pri wide" id="rGo" type="button">Plan truck route</button>
  <div id="rOut"></div>`;
  let FROM=from;
  const sugg=async()=>{const q=$('rFrom').value.trim();if(q.length<4)return;$('rSugg').innerHTML='<span class="dim">Searching…</span>';
    try{const j=await api('/search/address/json',{'api-version':'1.0',query:q,countrySet:'US',limit:5,lat,lon});
      $('rSugg').innerHTML=(j.results||[]).map((r,i)=>`<button type="button" data-i="${i}">${esc(r.address.freeformAddress)}</button>`).join('')||'<span class="dim">No match.</span>';
      $('rSugg').querySelectorAll('button').forEach(b=>b.onclick=()=>{const r=j.results[+b.dataset.i];FROM={name:r.address.freeformAddress,lat:r.position.lat,lon:r.position.lon};LS.set('from',FROM);$('rFrom').value=FROM.name;$('rSugg').innerHTML=''})}
    catch(e){$('rSugg').innerHTML=`<span class="dim">${esc(e.message)}</span>`}};
  $('rFind').onclick=sugg;$('rFrom').onkeydown=e=>{if(e.key==='Enter')sugg()};
  const sel=$('rStart');sel.value=preset?String(START.indexOf(preset)):'custom';
  sel.onchange=()=>{const v=sel.value;$('rCustom').hidden=v!=='custom';$('rSugg').innerHTML='';
    if(v==='custom'){$('rFrom').focus();return}
    const s=START[+v];FROM={name:s.name,lat:s.lat,lon:s.lon};LS.set('from',FROM);$('rGo').click()};
  ['tLbs','tLen','tH','tW','tHaz'].forEach(id=>$(id).addEventListener('change',()=>{$('tSum').textContent=truckLine({lbs:+$('tLbs').value||DEF_TRUCK.lbs,len:+$('tLen').value||DEF_TRUCK.len,h:+$('tH').value||DEF_TRUCK.h,haz:$('tHaz').value})}));
  $('rGo').onclick=async()=>{const T2={lbs:+$('tLbs').value||DEF_TRUCK.lbs,len:+$('tLen').value||DEF_TRUCK.len,h:+$('tH').value||DEF_TRUCK.h,w:+$('tW').value||DEF_TRUCK.w,haz:$('tHaz').value};LS.set('truck',T2);
    const out=$('rOut');out.innerHTML='<div class="dim">Planning the truck route…</div>';
    try{const q={'api-version':'1.0',query:`${FROM.lat},${FROM.lon}:${lat},${lon}`,travelMode:'truck',vehicleCommercial:'true',
        vehicleWeight:Math.round(T2.lbs*0.45359),vehicleLength:(T2.len/FT).toFixed(2),vehicleHeight:(T2.h/FT).toFixed(2),vehicleWidth:(T2.w/FT).toFixed(2),vehicleLoadType:T2.haz||null,
        traffic:'true',routeType:'fastest',computeTravelTimeFor:'all',instructionsType:'text',language:'en-US',routeRepresentation:'polyline'};
      const j=await api('/route/directions/json',q);const r=j.routes&&j.routes[0];if(!r)throw new Error('No truck route found.');
      const s=r.summary,mi=s.lengthInMeters/1609.34,min=x=>{const m=Math.round(x/60);return m>=60?`${Math.floor(m/60)} h ${m%60} min`:`${m} min`};
      const pts=r.legs.flatMap(l=>l.points.map(p=>[p.longitude,p.latitude]));
      if(map&&routeSrc){const rs=routeSrc;rs.clear();rs.add(new atlas.data.LineString(pts));map.setCamera({bounds:atlas.data.BoundingBox.fromPositions(pts),padding:50,type:'ease',duration:700})}
      const steps=((r.guidance&&r.guidance.instructions)||[]).filter(x=>x.message).slice(0,40);
      out.innerHTML=`<h4>Route</h4><div class="kv"><span>Distance</span><b>${mi.toFixed(1)} mi</b><span>Drive time now</span><b>${min(s.travelTimeInSeconds)}</b>
        ${s.noTrafficTravelTimeInSeconds?`<span>Without traffic</span><b>${min(s.noTrafficTravelTimeInSeconds)}</b>`:''}<span>Traffic delay</span><b>${min(s.trafficDelayInSeconds||0)}</b>
        <span>Arrive about</span><b>${new Date(s.arrivalTime).toLocaleTimeString([],{hour:'numeric',minute:'2-digit'})}</b></div>
        <div class="note">Truck routing uses the weight, length, height and width above to stay off roads, bridges and tunnels the truck can't legally use. Check the last block into the site yourself: gate, turn radius, overhead lines and where the truck stages are not in the map data.</div>
        ${steps.length?`<h4>Directions</h4><ol class="steps">${steps.map(x=>`<li>${esc(x.message)}</li>`).join('')}</ol>`:''}`}
    catch(e){out.innerHTML=`<div class="alert">${esc(e.message||e)}</div>`}};
  if(auto&&map)$('rGo').click();
}

// ---------- Traffic ----------
async function trafficPanel(){const side=$('side');side.innerHTML=`<h3>Live traffic</h3><div class="dim">Flow and incidents within about 2 miles of the site, as of ${new Date().toLocaleTimeString([],{hour:'numeric',minute:'2-digit'})}.</div><div id="tOut"><div class="dim" style="margin-top:8px">Loading incidents…</div></div>`;
  try{const d=0.03,box=[lat-d,lon-d/Math.cos(lat*Math.PI/180),lat+d,lon+d/Math.cos(lat*Math.PI/180)];
    const j=await api('/traffic/incident/detail/json',{'api-version':'1.0',style:'s3',boundingbox:box.join(','),boundingZoom:13,trafficmodelid:-1,projection:'EPSG4326',expandCluster:'true',language:'en-US'});
    const pois=((j.tm&&j.tm.poi)||[]).filter(p=>!p.cpoi);
    const ty={0:'Unknown',1:'Accident',2:'Fog',3:'Dangerous conditions',4:'Rain',5:'Ice',6:'Jam',7:'Lane closed',8:'Road closed',9:'Road works',10:'Wind',11:'Flooding',14:'Broken-down vehicle'};
    $('tOut').innerHTML=pois.length?`<h4>${pois.length} incident${pois.length>1?'s':''}</h4>`+pois.slice(0,25).map(p=>`<div class="row" style="margin:4px 0"><span class="flag ${p.ic===8||p.ic===1?'red':'amb'}">${esc(ty[p.ic]||'Incident')}</span><span>${esc(p.d||'')}${p.f?` · ${esc(p.f)}`:''}${p.t?` → ${esc(p.t)}`:''}${p.dl?` · delay ${Math.round(p.dl/60)} min`:''}</span></div>`).join('')
      :'<div class="row"><span class="flag">Clear</span>No incidents reported near the site right now.</div>';
  }catch(e){$('tOut').innerHTML=`<div class="alert">${esc(e.message||e)}</div>`}
  $('side').insertAdjacentHTML('beforeend','<div class="note">Colors on the map compare current speed to normal speed for that road. Use the Truck route tab for a drive time that includes traffic.</div>')}

// ---------- Weather ----------
async function weatherPanel(){const side=$('side');side.innerHTML='<h3>Weather at the site</h3><div class="dim">Loading…</div>';
  if(map)map.setCamera({center:[lon,lat],zoom:12,type:'ease',duration:600});
  if(!MKEY){side.innerHTML='<h3>Weather at the site</h3><div class="alert">The Azure Maps key is not set up yet.</div>';return}
  try{const q={'api-version':'1.1',query:`${lat},${lon}`,unit:'imperial'};
    const [cur,hr,al]=await Promise.all([api('/weather/currentConditions/json',{...q,details:'true'}),api('/weather/forecast/hourly/json',{...q,duration:24}),api('/weather/severe/alerts/json',{'api-version':'1.1',query:`${lat},${lon}`,details:'true'}).catch(()=>({results:[]}))]);
    const c=(cur.results||[])[0]||{},v=o=>o&&o.value!=null?Math.round(o.value):'–';
    const gNow=c.windGust&&c.windGust.speed?Math.round(c.windGust.speed.value):null;
    const H=(hr.forecasts||[]);const maxG=Math.max(0,...H.map(f=>f.windGust&&f.windGust.speed?f.windGust.speed.value:0));
    const rain=H.filter(f=>(f.precipitationProbability||0)>=50);
    const flag=maxG>=30?'<span class="flag red">High wind</span>':maxG>=20?'<span class="flag amb">Windy</span>':'<span class="flag">Wind OK</span>';
    side.innerHTML=`<h3>Weather at the site</h3><div class="dim">Azure Maps weather, ${new Date().toLocaleString([],{weekday:'short',hour:'numeric',minute:'2-digit'})}</div>
      ${(al.results||[]).map(a=>`<div class="alert"><b>${esc(a.description&&a.description.localized||'Weather alert')}</b>${(a.alertAreas||[]).map(z=>`<div>${esc(z.summary||'')}</div><div class="dim">${z.startTime?new Date(z.startTime).toLocaleString([],{weekday:'short',hour:'numeric'}):''} – ${z.endTime?new Date(z.endTime).toLocaleString([],{weekday:'short',hour:'numeric'}):''}</div>`).join('')}</div>`).join('')}
      <div class="row"><span class="big">${v(c.temperature)}°F</span><span>${esc(c.phrase||'')}</span></div>
      <div class="kv"><span>Wind</span><b>${esc(c.wind&&c.wind.direction&&c.wind.direction.localizedDescription||'')} ${v(c.wind&&c.wind.speed)} mph${gNow?`, gusts ${gNow}`:''}</b>
        <span>Humidity</span><b>${c.relativeHumidity!=null?c.relativeHumidity+'%':'–'}</b><span>Visibility</span><b>${v(c.visibility)} mi</b></div>
      <h4>Next 24 hours</h4><div class="row">${flag} Highest gust ${Math.round(maxG)} mph${rain.length?` · <span class="flag amb">Rain</span>${rain.length} h at 50%+`:''}</div>
      <div style="overflow-x:auto"><table><thead><tr><th>Time</th><th>°F</th><th>Wind</th><th>Gust</th><th>Rain</th><th></th></tr></thead><tbody>
      ${H.map(f=>{const g=f.windGust&&f.windGust.speed?Math.round(f.windGust.speed.value):0;return `<tr class="${g>=30?'high':g>=20?'gust':''}"><td>${new Date(f.date).toLocaleTimeString([],{weekday:'short',hour:'numeric'})}</td><td>${v(f.temperature)}</td><td>${esc(f.wind&&f.wind.direction&&f.wind.direction.localizedDescription||'')} ${v(f.wind&&f.wind.speed)}</td><td>${g||'–'}</td><td>${f.precipitationProbability!=null?f.precipitationProbability+'%':'–'}</td><td>${esc(f.iconPhrase||'')}</td></tr>`}).join('')}
      </tbody></table></div>
      <div class="note">Gusts of 20 mph and up are amber, 30 mph and up red. Check the crane's load chart and the manufacturer's wind limit for the actual pick; bundles and mats catch wind.</div>`;
  }catch(e){side.innerHTML=`<h3>Weather at the site</h3><div class="alert">${esc(e.message||e)}</div>`}}

window.addEventListener('resize',()=>{if(map&&tab!=='3d')map.resize()});
show(P.t||'3d');
})();
