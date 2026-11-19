// Google Photorealistic 3D tab. Started only when someone opens the 3D tab, because every start is a billed Google load.
window.init3D=async(P)=>{
const $=id=>document.getElementById(id),msg=$('msg');msg.hidden=false;
const FT=3.28084;
const lat=+P.lat,lon=+P.lon;
let REACH=[100,150,200,250].includes(+P.r)?+P.r:150;

let KEY=(window.SITE3D&&SITE3D.googleKey)||'';
try{KEY=KEY||localStorage.getItem('site3d-key')||''}catch(e){}
if(!KEY){KEY=await new Promise(res=>{msg.innerHTML='<b>Google Maps API key needed</b><div style="font-size:12px;color:#9fb0bf;margin-top:4px">Paste the Millennium Map Tiles API key. It is kept in this browser only.</div><input id="k" autocomplete="off" spellcheck="false"><button id="kgo" class="btn" type="button">Open 3D</button>';
  $('kgo').onclick=()=>{const v=$('k').value.trim();if(v){try{localStorage.setItem('site3d-key',v)}catch(e){}res(v)}}})}
msg.textContent='Loading 3D city…';

Cesium.GoogleMaps.defaultApiKey=KEY;
const viewer=new Cesium.Viewer('cz',{globe:false,baseLayer:false,baseLayerPicker:false,geocoder:false,homeButton:false,sceneModePicker:false,navigationHelpButton:false,animation:false,timeline:false,fullscreenButton:false,infoBox:false,selectionIndicator:false,requestRenderMode:false});
viewer.scene.skyAtmosphere.show=true;
viewer.scene.screenSpaceCameraController.enableCollisionDetection=true;
const cz=$('cz');cz.appendChild($('info'));cz.appendChild($('meas'));cz.appendChild(msg);window.VIEW3D=viewer;
let tiles;
try{tiles=await ((window.SITE3D&&SITE3D.tilesetFactory)||Cesium.createGooglePhotorealistic3DTileset)(undefined,{showCreditsOnScreen:true,maximumScreenSpaceError:8});viewer.scene.primitives.add(tiles)}
catch(e){msg.innerHTML='Google 3D tiles did not load: '+(e.message||e)+'<br><span style="font-size:12px;color:#9fb0bf">Check the API key and that the Map Tiles API is enabled for it.</span>';return}

// find the ground at the pin from the 3D tiles themselves
const C0=Cesium.Cartesian3.fromDegrees(lon,lat,0);
let h0=0;
viewer.camera.setView({destination:Cesium.Cartesian3.fromDegrees(lon,lat,700),orientation:{pitch:-Cesium.Math.PI_OVER_TWO}});
// don't hold the view hostage to the most detailed tiles: give the ground sampling a few seconds at most
const within=(p,ms)=>Promise.race([p,new Promise((_,rej)=>setTimeout(()=>rej(new Error('timeout')),ms))]);
try{const [c]=await within(viewer.scene.clampToHeightMostDetailed([Cesium.Cartesian3.fromDegrees(lon,lat,400)]),6000);if(c)h0=Cesium.Cartographic.fromCartesian(c).height}catch(e){}
// the pin often sits on a roof: take the lowest of a few samples around it as grade
try{const ring=[];for(let a=0;a<8;a++){const d=25/111320;ring.push(Cesium.Cartesian3.fromDegrees(lon+Math.cos(a*Math.PI/4)*d/Math.cos(lat*Math.PI/180),lat+Math.sin(a*Math.PI/4)*d,400))}
  const rs=await within(viewer.scene.clampToHeightMostDetailed(ring),4000);const hs=rs.filter(Boolean).map(c=>Cesium.Cartographic.fromCartesian(c).height);if(hs.length)h0=Math.min(h0,...hs)}catch(e){}
msg.hidden=true;
const at=(dx,dy,dz)=>{const m=Math.cos(lat*Math.PI/180);return Cesium.Cartesian3.fromDegrees(lon+dx/111320/m,lat+dy/111320,h0+dz)};
const center=at(0,0,0);

// power features arrive as metre offsets from the pin: p poles [[dx,dy,kind]], l lines [[[dx,dy]...],kv]
const PW=P.pw||{p:[],l:[]};
const pwE=[],reachE=[];
const R=()=>REACH/FT,CLR=()=>(REACH+20)/FT;
function drawPower(){pwE.forEach(e=>viewer.entities.remove(e));pwE.length=0;const risky=[];
  (PW.p||[]).forEach(([dx,dy,k])=>{const d=Math.hypot(dx,dy),bad=d<=CLR(),hgt=k==='t'?30:12.2;if(bad)risky.push(`${k==='t'?'tower':'pole'} ${Math.round(d*FT)} ft`);
    pwE.push(viewer.entities.add({position:at(dx,dy,hgt/2),cylinder:{length:hgt,topRadius:k==='t'?1.2:.22,bottomRadius:k==='t'?2.5:.22,material:bad?Cesium.Color.RED:Cesium.Color.fromCssColorString('#8a6a3a')}}))});
  (PW.l||[]).forEach(([pts,kv,f])=>{const ugl=f==='u';if(ugl&&!($('ckUg')&&$('ckUg').checked))return;const z=ugl?0.4:kv&&kv>=60?30:11;let near=1e9;for(let i=0;i<pts.length-1;i++){const [ax,ay]=pts[i],[bx,by]=pts[i+1],L=(bx-ax)**2+(by-ay)**2,t=L?Math.max(0,Math.min(1,(-ax*(bx-ax)-ay*(by-ay))/L)):0;near=Math.min(near,Math.hypot(ax+t*(bx-ax),ay+t*(by-ay)))}
    const bad=!ugl&&near<=CLR();if(bad)risky.push(`${f==='q'?'possible ':''}${kv?kv+' kV ':''}line ${Math.round(near*FT)} ft`);
    pwE.push(viewer.entities.add({polyline:{positions:pts.map(([x,y])=>at(x,y,z)),width:bad?3:2,clampToGround:ugl,material:bad?Cesium.Color.RED:ugl?new Cesium.PolylineDashMaterialProperty({color:Cesium.Color.fromCssColorString('#9b6bff'),dashLength:8}):f==='q'?new Cesium.PolylineDashMaterialProperty({color:Cesium.Color.fromCssColorString('#8a97a3'),dashLength:14}):Cesium.Color.fromCssColorString(kv>=60?'#f07a1a':'#ffcf33')}}))});
  pwE.forEach(e=>e.show=$('ckPw').checked);return risky}
function drawReach(){reachE.forEach(e=>viewer.entities.remove(e));reachE.length=0;
  reachE.push(viewer.entities.add({position:center,ellipse:{semiMajorAxis:R(),semiMinorAxis:R(),height:h0+.4,material:Cesium.Color.RED.withAlpha(.12),outline:true,outlineColor:Cesium.Color.RED,outlineWidth:2}}));
  reachE.push(viewer.entities.add({position:center,ellipse:{semiMajorAxis:CLR(),semiMinorAxis:CLR(),height:h0+.5,fill:false,outline:true,outlineColor:Cesium.Color.RED.withAlpha(.7)}}));
  reachE.push(viewer.entities.add({position:center,ellipsoid:{radii:new Cesium.Cartesian3(R(),R(),R()),maximumCone:Cesium.Math.PI_OVER_TWO,material:Cesium.Color.RED.withAlpha(.07),outline:true,outlineColor:Cesium.Color.RED.withAlpha(.25),slicePartitions:24,stackPartitions:12}}));
  reachE.push(viewer.entities.add({polyline:{positions:[at(0,0,0),at(0,0,R())],width:5,material:Cesium.Color.fromCssColorString('#f2b01e')}}));
  reachE.forEach(e=>e.show=$('ckReach').checked)}
function info(){const risky=drawPower();drawReach();
  $('info').hidden=false;
  $('info').innerHTML=`<b>${risky.length?`<span class="flag red">Conflict</span>${risky.length} mapped power feature${risky.length>1?'s':''} inside ${REACH} ft reach + 20 ft`:`<span class="flag">Clear</span>No mapped power inside ${REACH} ft reach + 20 ft`}</b>`+
   (risky.length?`<div class="dim">${risky.slice(0,6).join(' · ')}</div>`:'')+(P.w?`<div>${P.w}</div>`:'')+
   `<div class="dim note">Reach measured from the site pin. Poles and lines from OpenStreetMap and utility maps are incomplete, and Google's 3D model can be months old. Verify on site.</div>`}
info();
viewer.entities.add({position:at(0,0,2),point:{pixelSize:12,color:Cesium.Color.fromCssColorString('#2f6f9f'),outlineColor:Cesium.Color.WHITE,outlineWidth:2,disableDepthTestDistance:Number.POSITIVE_INFINITY},label:{text:P.n||'Site',font:'600 13px system-ui',fillColor:Cesium.Color.WHITE,outlineColor:Cesium.Color.BLACK,outlineWidth:3,style:Cesium.LabelStyle.FILL_AND_OUTLINE,pixelOffset:new Cesium.Cartesian2(0,-18),disableDepthTestDistance:Number.POSITIVE_INFINITY}});

// camera
let spin=null;const stopSpin=()=>{if(spin){viewer.clock.onTick.removeEventListener(spin);spin=null}};
const target=at(0,0,15);
function orbit(range=420,pitch=-32){stopSpin();viewer.camera.lookAt(target,new Cesium.HeadingPitchRange(Cesium.Math.toRadians(20),Cesium.Math.toRadians(pitch),range));
  spin=()=>viewer.camera.rotateRight(0.0016);viewer.clock.onTick.addEventListener(spin)}
function setView(v){document.querySelectorAll('#views button').forEach(b=>b.classList.toggle('on',b.dataset.v===v));stopSpin();viewer.camera.lookAtTransform(Cesium.Matrix4.IDENTITY);
  if(v==='orbit')orbit();
  else if(v==='fly'){viewer.camera.setView({destination:at(-1800,-2200,1400),orientation:{heading:Cesium.Math.toRadians(40),pitch:Cesium.Math.toRadians(-30)}});
    viewer.camera.flyToBoundingSphere(new Cesium.BoundingSphere(target,90),{duration:7,offset:new Cesium.HeadingPitchRange(Cesium.Math.toRadians(35),Cesium.Math.toRadians(-28),380),complete:()=>orbit(380,-28)})}
  else if(v==='top')viewer.camera.setView({destination:at(0,0,R()*5+250),orientation:{heading:0,pitch:-Cesium.Math.PI_OVER_TWO}});
  else if(v==='street')viewer.camera.setView({destination:at(-R()*1.3,-R()*1.3,1.8),orientation:{heading:Cesium.Math.toRadians(45),pitch:Cesium.Math.toRadians(8)}});
}
document.querySelectorAll('#views button').forEach(b=>b.onclick=()=>setView(b.dataset.v));
viewer.screenSpaceEventHandler.setInputAction(()=>{if(spin){stopSpin();viewer.camera.lookAtTransform(Cesium.Matrix4.IDENTITY);document.querySelectorAll('#views button').forEach(b=>b.classList.toggle('on',b.dataset.v==='free'))}},Cesium.ScreenSpaceEventType.LEFT_DOWN);
const markReach=()=>document.querySelectorAll('#reach button').forEach(b=>b.classList.toggle('on',+b.dataset.r===REACH));markReach();
document.querySelectorAll('#reach button').forEach(b=>b.onclick=()=>{REACH=+b.dataset.r;markReach();info()});
$('ckPw').onchange=()=>pwE.forEach(e=>e.show=$('ckPw').checked);
$('ckReach').onchange=()=>reachE.forEach(e=>e.show=$('ckReach').checked);
$('ckUg').checked=false;$('ckUg').onchange=()=>{info();key3d()};

// measure: tap two points for horizontal distance and height difference; one point gives height above site grade
let meas=false,mpts=[],mE=[];
const clearM=()=>{mE.forEach(e=>viewer.entities.remove(e));mE=[];mpts=[]};
$('measBtn').onclick=()=>{meas=!meas;$('measBtn').classList.toggle('on',meas);clearM();$('meas').hidden=!meas;$('meas').innerHTML=meas?'Tap a point on a roof, pole or the ground.':''};
viewer.screenSpaceEventHandler.setInputAction(e=>{if(!meas)return;const p=viewer.scene.pickPosition(e.position);if(!p)return;
  if(mpts.length===2)clearM();mpts.push(p);mE.push(viewer.entities.add({position:p,point:{pixelSize:9,color:Cesium.Color.YELLOW,disableDepthTestDistance:Number.POSITIVE_INFINITY}}));
  const c=p=>Cesium.Cartographic.fromCartesian(p);const hp=c(p).height-h0;
  if(mpts.length===1){$('meas').innerHTML=`Height above site grade: <b>${Math.round(hp*FT)} ft</b><div class="dim" style="color:#9fb0bf">Tap a second point to measure between them.</div>`}
  else{const a=c(mpts[0]),b=c(mpts[1]);const g=new Cesium.EllipsoidGeodesic(a,b).surfaceDistance;const dz=b.height-a.height;
    mE.push(viewer.entities.add({polyline:{positions:mpts.slice(),width:3,material:Cesium.Color.YELLOW,depthFailMaterial:Cesium.Color.YELLOW.withAlpha(.5)}}));
    $('meas').innerHTML=`Horizontal: <b>${Math.round(g*FT)} ft</b> · Rise: <b>${Math.round(dz*FT)} ft</b><br>Straight line: <b>${Math.round(Math.hypot(g,dz)*FT)} ft</b><div style="color:#9fb0bf">Measured on Google's 3D model; expect a few feet of error.</div>`}
},Cesium.ScreenSpaceEventType.LEFT_CLICK);

// toolbar on the right: hold to move, turn, tilt, zoom or raise the camera
{const D=Cesium.Math.toDegrees,Rd=Cesium.Math.toRadians,cl=(v,a,b)=>Math.max(a,Math.min(b,v));
  let pivot={lat,lng:lon,alt:h0+15};
  const toLLA=c=>{const g=Cesium.Cartographic.fromCartesian(c);return {lat:D(g.latitude),lng:D(g.longitude),alt:g.height}};
  const free=()=>document.querySelectorAll('#views button').forEach(b=>b.classList.toggle('on',b.dataset.v==='free'));
  window.makeNav3D&&makeNav3D(cz,{
    get:()=>{const cam=viewer.camera,cv=viewer.scene.canvas;let p=null;
      try{p=viewer.scene.pickPosition(new Cesium.Cartesian2(cv.clientWidth/2,cv.clientHeight/2))}catch(e){}
      if(p&&isFinite(p.x)&&Cesium.Cartesian3.distance(cam.positionWC,p)<20000)pivot=toLLA(p);
      const C=Cesium.Cartesian3.fromDegrees(pivot.lng,pivot.lat,pivot.alt);
      return {h:(D(cam.heading)+360)%360,t:cl(D(cam.pitch)+90,0,88),r:Cesium.Cartesian3.distance(cam.positionWC,C),lat:pivot.lat,lng:pivot.lng,alt:pivot.alt}},
    set:s=>{pivot={lat:s.lat,lng:s.lng,alt:s.alt};viewer.camera.lookAt(Cesium.Cartesian3.fromDegrees(s.lng,s.lat,s.alt),new Cesium.HeadingPitchRange(Rd(s.h),Rd(s.t-90),s.r));viewer.camera.lookAtTransform(Cesium.Matrix4.IDENTITY)},
    stop:()=>{stopSpin();viewer.camera.cancelFlight();viewer.camera.lookAtTransform(Cesium.Matrix4.IDENTITY);free()},
    home:()=>{pivot={lat,lng:lon,alt:h0+15};viewer.camera.flyToBoundingSphere(new Cesium.BoundingSphere(target,90),{duration:1.2,offset:new Cesium.HeadingPitchRange(viewer.camera.heading,Rd(-32),420)})},
    minAlt:()=>h0,
    heading:()=>D(viewer.camera.heading)})}
// map key for the 3D city
const key3d=()=>{const S=KEYSW;mapKey(cz,'key3',siteKeyGroups(REACH,[
  ['In the 3D view',[[S.bar('#f2b01e'),'Yellow post: crane reach height at the site pin'],[S.dot('#2f6f9f','#fff'),'Site pin'],[S.dot('#ffff00'),'Measuring points (Measure tool)']]]],{solid:true,ug:$('ckUg').checked}),
  'Red dome shows how far the crane reaches in every direction. Google 3D can be months old; verify on site.')};
key3d();document.querySelectorAll('#reach button').forEach(b=>b.addEventListener('click',key3d));
setView(P.v==='top'?'top':'fly');
};
