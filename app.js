import * as THREE from 'three';
import { OrbitControls } from './vendor/OrbitControls.js';
import { createGuidedTour } from './tour.js';
import { createGroundWalk } from './walk.js';
import { buildFirstBuildingFront, buildSchoolGate } from './architecture.js';
import { buildCampusPerimeter } from './perimeter.js';
import { buildFirstFloorCorridor } from './corridor.js';

const $=s=>document.querySelector(s);
const state={building:null,floor:'all',room:null};
const floorNames=['all','B1','1F','2F','3F','4F'];
let renderer,scene,camera,controls,data,config,buildings=[],floorGroups=[],roomMeshes=[],labels=[],pickable=[],stairMarkers=[];
const ray=new THREE.Raycaster(),pointer=new THREE.Vector2();
let transition=null,dragStart=null;
let tour=null,tourReturn=null;
let walk=null,walkReturn=null;
let exterior, perimeter;
const white=new THREE.MeshStandardMaterial({color:0xe6e4da,roughness:.9});
const wall=new THREE.MeshStandardMaterial({color:0xf1f0e5,roughness:1});
const edgeMaterial=new THREE.LineBasicMaterial({color:0xaab6a0,transparent:true,opacity:.65});
function box(w,h,d,x,y,z,material=white,parent=scene){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
function outline(mesh){const l=new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry),edgeMaterial);mesh.add(l);}
function floorY(f){return f==='B1'?-config.basementHeight:(Number(f[0])-1)*config.floorHeight;}
function animateTo(position,target){if(matchMedia('(prefers-reduced-motion: reduce)').matches){transition=null;camera.position.copy(position);controls.target.copy(target);controls.update();return;}transition={from:camera.position.clone(),to:position.clone(),old:controls.target.clone(),target:target.clone(),start:performance.now()};}
function home(top=false){const center=new THREE.Vector3(-16,0,8);animateTo(new THREE.Vector3(top?-16:-150,top?230:170,top?8.1:220),center);$('#view-name').textContent=top?'全校俯視':'全校鳥瞰';}
function focusBuilding(id){const b=config.buildings.find(b=>b.id===id);const y=state.floor==='B1'?-1:6;animateTo(new THREE.Vector3(b.x-40,60,b.z+60),new THREE.Vector3(b.x,y,b.z));}
function roomNote(r){if(r.code==='2401')return '舞蹈與辦公室共用一室';if(r.code==='4101')return '一室分成兩空間；隔牆位置為示意';if(['5101','5102'].includes(r.code))return '1F，與'+(r.code==='5101'?'圖書館':'桌球教室')+'相連';if(r.code==='5202')return '2F～4F挑高；範圍與高度為示意';return '';}
function createFloor(b,f){
 const y=floorY(f),g=new THREE.Group();scene.add(g);g.userData={building:b.id,floor:f};floorGroups.push(g);
 const rooms=data.rooms.filter(r=>r.buildingId===b.id&&r.floor===f);
 if(f==='B1'){
  // Only the existence of B2/B3/B4 basements is confirmed; no internal room assignment.
  const m=box(b.width,.3,b.depth,b.x,y,b.z,new THREE.MeshStandardMaterial({color:0xc9d4bd,transparent:true,opacity:.75}),g);outline(m);
  m.userData={building:b.id};pickable.push(m);return;
 }
 const layout=config.floorLayouts[`${b.id}:${f}`];
 for(const p of [...layout.plates,...layout.passages]){const slab=box(p.width,.27,p.depth,p.x,y,p.z,white,g);slab.userData={building:b.id};pickable.push(slab);outline(slab);}
 // Open-topped white volumes convey floors without claiming detailed door/window geometry.
 const h=config.floorHeight-.45;
 const e=layout.envelope;
 const firstBuildingGround=b.id==='B1'&&f==='1F';
 for(const [x,z,w,d] of firstBuildingGround?[]:[[e.x,e.z-e.depth/2,e.width,.22],[e.x-e.width/2,e.z,.22,e.depth],[e.x+e.width/2,e.z,.22,e.depth]]){
  const mesh=box(w,h,d,x,y+h/2+.15,z,wall,g);mesh.userData={building:b.id};pickable.push(mesh);
 }
 for(const v of layout.voids){
  const line=new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(v.x-v.width/2,y+.3,v.z-v.depth/2),new THREE.Vector3(v.x+v.width/2,y+.3,v.z-v.depth/2),new THREE.Vector3(v.x+v.width/2,y+.3,v.z+v.depth/2),new THREE.Vector3(v.x-v.width/2,y+.3,v.z+v.depth/2)]),new THREE.LineBasicMaterial({color:0xbc9450}));g.add(line);
 }
 for(const st of config.stairs.filter(s=>s.building===b.id&&s.floors.includes(f))){
  const pad=box(st.width,.18,st.depth,st.x,y+.25,st.z,new THREE.MeshStandardMaterial({color:0xd5bb7d,roughness:1}),g);outline(pad);
  // Four lines are an abstract stair symbol, not the actual tread count.
  for(let i=1;i<=4;i++)box(st.width*.85,.04,.08,st.x,y+.36,st.z-st.depth/2+st.depth*i/5,new THREE.MeshStandardMaterial({color:0x947542}),g);
  stairMarkers.push({building:b.id,floor:f,position:new THREE.Vector3(st.x,y+1,st.z),id:st.id});
 }
 for(const r of rooms){
  const {x,z,width:w,depth:d}=config.roomGeometry[r.id];
  const mat=new THREE.MeshStandardMaterial({color:0xdde6d1,roughness:1,transparent:true,opacity:.85});
  const m=box(w,.45,d,x,y+.4,z,mat,g);outline(m);m.userData={room:r.id,building:b.id};roomMeshes.push(m);pickable.push(m);
  if(r.code==='4101'){
   // Partition exists, but the midpoint location below is only illustrative.
   box(w,.65,.13,x,y+.8,z,new THREE.MeshStandardMaterial({color:0xbba577}),g);
  }
  if(r.code==='5202'){
   for(const xx of [b.x-b.width/2+.3,b.x+b.width/2-.3])box(.4,config.floorHeight*3-.35,.4,xx,y+config.floorHeight*1.5,z-d/2,new THREE.MeshStandardMaterial({color:0xd6d5c6}),g);
  }
 }
 if(b.id==='B1')buildFirstBuildingFront(g,b,f,y,config.floorHeight);
 if(firstBuildingGround)buildFirstFloorCorridor(g);
}
function createSite(){
 const ground=box(185,.2,145,-16,-.35,8,new THREE.MeshStandardMaterial({color:0xcecfca}));ground.receiveShadow=true;
 // Outdoor areas are approximate placements from the old illustrative campus map.
 const trackShape=new THREE.Shape();trackShape.absellipse(0,0,18,46,0,Math.PI*2,false,0);
 const track=new THREE.Mesh(new THREE.ShapeGeometry(trackShape,72),new THREE.MeshStandardMaterial({color:0xb4c0a2}));track.rotation.x=-Math.PI/2;track.position.set(-76,-.12,5);scene.add(track);
 const fieldShape=new THREE.Shape();fieldShape.absellipse(0,0,14.5,40.5,0,Math.PI*2,false,0);
 const field=new THREE.Mesh(new THREE.ShapeGeometry(fieldShape,72),new THREE.MeshStandardMaterial({color:0xcbd8b6}));field.rotation.x=-Math.PI/2;field.position.set(-76,-.1,5);scene.add(field);
 for(const s of [1,2,3]){const points=[];for(let i=0;i<=80;i++){const a=i/80*Math.PI*2;points.push(new THREE.Vector3(-76+(14.8+s*.85)*Math.cos(a),-.06,5+(41+s*1.25)*Math.sin(a)));}scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),new THREE.LineBasicMaterial({color:0xe2e8d9})));}
 box(20,.12,15,-38,-.07,-4,new THREE.MeshStandardMaterial({color:0xc4d3b5}));
 box(12,.12,22,24,-.07,-2,new THREE.MeshStandardMaterial({color:0xc4d3b5}));
 box(67,.1,7,-5,-.1,41,new THREE.MeshStandardMaterial({color:0xececdf}));
 exterior=buildSchoolGate(scene);
 perimeter=buildCampusPerimeter(scene);
 for(const b of config.buildings){
  buildings.push(b);for(let i=1;i<=4;i++)createFloor(b,`${i}F`);if(b.basement)createFloor(b,'B1');
  const el=document.createElement('button');el.className='map-label';el.textContent=b.name;el.addEventListener('click',()=>selectBuilding(b.id));$('#labels-layer').append(el);labels.push({el,b});
 }
 for(const st of stairMarkers){const el=document.createElement('span');el.className='map-label stair-label';el.textContent='樓梯';el.setAttribute('aria-label','樓梯位置示意');el.hidden=true;$('#labels-layer').append(el);st.el=el;}
}
function leaveWalkForNavigation(){if(walk?.active){walk.stop({restore:false,focus:false});home();}}
function selectBuilding(id){leaveWalkForNavigation();tour?.stop({restore:false,focus:false});state.building=id;state.room=null;update();if(id)focusBuilding(id);else home();}
function update(){
 for(const g of floorGroups)g.visible=state.floor==='all'?g.userData.floor!=='B1':g.userData.floor===state.floor;
 // In basement mode the surface disappears so the three confirmed basement plates can be viewed.
 scene.children.filter(o=>o===scene.userData.ground).forEach(o=>o.visible=state.floor!=='B1');
 exterior.group.visible=exterior.plaza.visible=state.floor==='all'||state.floor==='1F';
 perimeter.visible=state.floor==='all'||state.floor==='1F';
 for(const m of roomMeshes){const selected=state.room===m.userData.room;m.material.color.set(selected?0xd8b963:state.building&&m.userData.building!==state.building?0xe9eadd:0xdde6d1);}
 document.querySelectorAll('.building-button').forEach(el=>{const active=el.dataset.id===(state.building||'all');el.classList.toggle('active',active);el.setAttribute('aria-pressed',String(active));});
 document.querySelectorAll('.floor-button').forEach(el=>{const active=el.dataset.floor===state.floor;el.classList.toggle('active',active);el.setAttribute('aria-pressed',String(active));});
 labels.forEach(({el,b})=>el.classList.toggle('active',b.id===state.building));
 const b=config.buildings.find(b=>b.id===state.building);
 $('#detail-title').textContent=b?b.name:'校園總覽';
 $('#detail-description').textContent=state.floor==='B1'?'第2、3、4棟有地下室，僅示意量體；地下室分間、入口與深度尚未確認。':b?b.description:'校舍依圖面相對關係配置，點選建築可查看各樓層空間。';
 $('#view-name').textContent=`${b?b.name:'全校鳥瞰'}${state.floor==='all'?'':' · '+state.floor}`;
 renderRooms();
}
function renderRooms(){
 const term=$('#search').value.trim().toLowerCase();
 const list=data.rooms.filter(r=>(!state.building||r.buildingId===state.building)&&(state.floor==='all'||r.floor===state.floor)&&(!term||[r.code,r.displayName,r.building].join(' ').toLowerCase().includes(term)));
 $('#space-count').textContent=list.length;$('#result-count').textContent=state.floor==='B1'?'地下室尚未配置教室資料':`符合條件 ${list.length} 個空間`;
 const container=$('#room-list');container.replaceChildren();
 for(const r of list){const button=document.createElement('button');button.className='room'+(state.room===r.id?' active':'');const title=document.createElement('b');title.textContent=r.displayName;const sub=document.createElement('small');sub.textContent=`${r.building} · ${r.floor}${r.code?' · '+r.code:' · 無編碼'}`;button.append(title,sub);const note=roomNote(r);if(note){const e=document.createElement('em');e.textContent=note;button.append(e);}button.addEventListener('click',()=>{leaveWalkForNavigation();tour?.stop({restore:false,focus:false});state.room=r.id;state.building=r.buildingId;state.floor=r.floor;update();const mesh=roomMeshes.find(m=>m.userData.room===r.id);if(mesh){const p=mesh.getWorldPosition(new THREE.Vector3());animateTo(p.clone().add(new THREE.Vector3(-16,25,27)),p);}});container.append(button);}
}
function initUI(){
 const nav=$('#buildings');for(const [i,b] of [{id:'all',name:'全校總覽'},...config.buildings].entries()){const button=document.createElement('button');button.className='building-button';button.dataset.id=b.id;const num=document.createElement('span');num.className='num';num.textContent=String(i).padStart(2,'0');const title=document.createElement('span');title.textContent=b.name;const arrow=document.createElement('span');arrow.className='arrow';arrow.textContent='↗';button.append(num,title,arrow);button.onclick=()=>selectBuilding(b.id==='all'?null:b.id);nav.append(button);}
 for(const f of floorNames){const button=document.createElement('button');button.className='floor-button';button.dataset.floor=f;button.textContent=f==='all'?'全棟':f;button.onclick=()=>{leaveWalkForNavigation();tour?.stop({restore:false,focus:false});state.floor=f;state.room=null;update();if(f==='B1')animateTo(new THREE.Vector3(-70,100,90),new THREE.Vector3(0,-3,0));};$('#floors').append(button);}
 $('#home').onclick=()=>{leaveWalkForNavigation();tour?.stop({restore:false,focus:false});state.building=null;state.floor='all';state.room=null;$('#search').value='';update();home();};$('#top').onclick=()=>{leaveWalkForNavigation();tour?.stop({restore:false,focus:false});home(true);};$('#search').oninput=()=>{leaveWalkForNavigation();tour?.stop({restore:false,focus:false});renderRooms();};$('#labels').onchange=()=>$('#labels-layer').hidden=!$('#labels').checked;
 tour=createGuidedTour({
  onStart:()=>{walk?.stop({restore:true,focus:false});tourReturn={state:{...state},search:$('#search').value,position:camera.position.clone(),target:controls.target.clone()};},
  onVisit:stop=>{
   $('#search').value='';
   if(!stop.room){state.building=null;state.floor='all';state.room=null;update();home();return;}
   const r=data.rooms.find(r=>r.id===stop.room),mesh=roomMeshes.find(m=>m.userData.room===stop.room);
   if(!r||!mesh)return;
   Object.assign(state,{building:r.buildingId,floor:r.floor,room:r.id});update();
   const p=mesh.getWorldPosition(new THREE.Vector3());animateTo(p.clone().add(new THREE.Vector3(-18,24,30)),p);
  },
  onExit:({restore})=>{if(restore&&tourReturn){Object.assign(state,tourReturn.state);$('#search').value=tourReturn.search;update();animateTo(tourReturn.position,tourReturn.target);}tourReturn=null;}
 });
 walk=createGroundWalk({camera,controls,canvas:renderer.domElement,config,
  onStart:()=>{tour?.stop({restore:false,focus:false});transition=null;walkReturn={state:{...state},search:$('#search').value};Object.assign(state,{building:null,floor:'all',room:null});$('#search').value='';update();setCorridorWalkView(true);$('#view-name').textContent='校園地面漫遊';},
  onExit:({restore})=>{if(restore&&walkReturn){Object.assign(state,walkReturn.state);$('#search').value=walkReturn.search;}walkReturn=null;setCorridorWalkView(false);update();}
 });
}
function setCorridorWalkView(active){
 scene.getObjectByName('corridor-ceiling').visible=active;
 for(const mesh of roomMeshes){if(mesh.parent.userData.building==='B1'&&mesh.parent.userData.floor==='1F')mesh.visible=!active;}
}
function resize(){const el=$('#scene');renderer.setSize(el.clientWidth,el.clientHeight);camera.aspect=el.clientWidth/el.clientHeight;camera.updateProjectionMatrix();}
function frame(){
 requestAnimationFrame(frame);
 if(transition){let t=Math.min((performance.now()-transition.start)/650,1);t=1-Math.pow(1-t,3);camera.position.lerpVectors(transition.from,transition.to,t);controls.target.lerpVectors(transition.old,transition.target,t);if(t>=1)transition=null;}
 if(walk?.active)walk.update(performance.now());else controls.update();renderer.render(scene,camera);
 const width=$('#scene').clientWidth,height=$('#scene').clientHeight;
 const northPoint=controls.target.clone().add(new THREE.Vector3(0,0,-10)).project(camera),centerPoint=controls.target.clone().project(camera);
 $('.north span').style.transform=`rotate(${Math.atan2((northPoint.x-centerPoint.x)*width,(northPoint.y-centerPoint.y)*height)}rad)`;
 for(const {el,b} of labels){const y=walk?.active?2.8:state.floor==='all'?17:state.floor==='B1'?-2:floorY(state.floor)+4;const v=new THREE.Vector3(b.x,y,b.z).project(camera);el.style.left=`${(v.x*.5+.5)*width}px`;el.style.top=`${(-v.y*.5+.5)*height}px`;el.style.display=v.z>1||Math.abs(v.x)>1||Math.abs(v.y)>1||(state.floor==='B1'&&!b.basement)?'none':'';}
 for(const st of stairMarkers){const v=st.position.clone().project(camera);const enabled=$('#stairs').checked&&state.floor!=='all'&&state.floor===st.floor&&(!state.building||state.building===st.building);st.el.hidden=!enabled;st.el.style.left=`${(v.x*.5+.5)*width}px`;st.el.style.top=`${(-v.y*.5+.5)*height}px`;st.el.style.display=v.z>1||Math.abs(v.x)>1||Math.abs(v.y)>1?'none':'';}
}
async function start(){
 const responses=await Promise.all([fetch('./data/spaces.json'),fetch('./data/model-config.json')]);if(responses.some(r=>!r.ok))throw Error('無法載入空間資料');[data,config]=await Promise.all(responses.map(r=>r.json()));
 scene=new THREE.Scene();scene.background=new THREE.Color(0xe9eee5);
 camera=new THREE.PerspectiveCamera(42,1,.1,1000);camera.position.set(-150,170,220);
 renderer=new THREE.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1;$('#scene').append(renderer.domElement);
 controls=new OrbitControls(camera,renderer.domElement);controls.target.set(-16,0,8);controls.enableDamping=true;controls.maxPolarAngle=Math.PI*.48;controls.minDistance=12;controls.maxDistance=420;controls.addEventListener('start',()=>transition=null);
 scene.add(new THREE.HemisphereLight(0xffffff,0x9aaa86,2.6));const sun=new THREE.DirectionalLight(0xfff9e7,3);sun.position.set(-60,100,40);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-130,right:130,top:100,bottom:-100,near:1,far:300});sun.shadow.bias=-.001;scene.add(sun);
 createSite();scene.userData.ground=scene.children.find(o=>o.isMesh);initUI();resize();new ResizeObserver(resize).observe($('#scene'));
 renderer.domElement.addEventListener('pointerdown',e=>dragStart=[e.clientX,e.clientY]);
 renderer.domElement.addEventListener('pointerup',e=>{if(walk?.active)return;if(!dragStart||Math.hypot(e.clientX-dragStart[0],e.clientY-dragStart[1])>5)return;const rect=renderer.domElement.getBoundingClientRect();pointer.set((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1);ray.setFromCamera(pointer,camera);const hit=ray.intersectObjects(pickable.filter(m=>m.parent.visible),false)[0];if(hit){tour?.stop({restore:false,focus:false});state.building=hit.object.userData.building;state.room=hit.object.userData.room||null;update();}});
 update();$('#loading').hidden=true;frame();
 window.campusDebug={state,data,config,floorGroups,roomMeshes,stairMarkers,scene,renderer,tour,walk};
}
start().catch(e=>{console.error(e);$('#loading').textContent='模型載入失敗。請重新整理網頁，並確認瀏覽器支援WebGL 2。錯誤：'+e.message;});
