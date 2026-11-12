import * as THREE from 'three';
import { gateObstacles, gateView } from './architecture.js';

export function createGroundWalk({camera,controls,canvas,config,onStart,onExit}){
 const $=s=>document.querySelector(s),panel=$('#walk-panel'),start=$('#walk-start');
 const bounds={left:-108,right:76,north:-64,south:80},spawn=new THREE.Vector3(-7,1.65,34),radius=.42;
 const solids=Object.entries(config.floorLayouts).filter(([key])=>key.endsWith(':1F')).flatMap(([,layout])=>[...layout.plates,...layout.passages]).concat(gateObstacles);
 const keys=new Set(),held=new Map();let active=false,saved=null,yaw=0,pitch=-.04,look=null,last=0,blockedAt=-Infinity;
 const svgNS='http://www.w3.org/2000/svg';
 for(const b of config.buildings){const rect=document.createElementNS(svgNS,'rect');for(const [k,v] of Object.entries({x:b.x-b.width/2,y:b.z-b.depth/2,width:b.width,height:b.depth,fill:'#cbd7bd',stroke:'#708965','stroke-width':.6}))rect.setAttribute(k,v);$('#walk-map-buildings').append(rect);}
 function blocked(x,z){if(x<bounds.left+radius||x>bounds.right-radius||z<bounds.north+radius||z>bounds.south-radius)return true;return solids.some(p=>{const cx=Math.max(p.x-p.width/2,Math.min(x,p.x+p.width/2)),cz=Math.max(p.z-p.depth/2,Math.min(z,p.z+p.depth/2));return (x-cx)**2+(z-cz)**2<radius**2;});}
 function clear(){keys.clear();held.clear();look=null;document.querySelectorAll('.walk-direction').forEach(b=>b.classList.remove('pressed'));}
 function reset(view={x:spawn.x,z:spawn.z,yaw:0}){camera.position.set(view.x,spawn.y,view.z);yaw=view.yaw;pitch=view.pitch??-.04;camera.rotation.set(pitch,yaw,0,'YXZ');clear();blockedAt=-Infinity;$('#walk-message').textContent='';}
 function stop({restore=true,focus=true}={}){
  if(!active)return;active=false;clear();panel.hidden=true;document.body.classList.remove('walking');start.setAttribute('aria-expanded','false');
  controls.enabled=saved.enabled;camera.fov=saved.fov;camera.updateProjectionMatrix();
  if(restore){camera.position.copy(saved.position);camera.quaternion.copy(saved.quaternion);controls.target.copy(saved.target);controls.update();}
  onExit({restore});saved=null;if(focus)start.focus({preventScroll:true});
 }
 start.onclick=()=>{
  if(active){stop();return;}
  onStart();saved={position:camera.position.clone(),quaternion:camera.quaternion.clone(),target:controls.target.clone(),enabled:controls.enabled,fov:camera.fov};
  active=true;controls.enabled=false;camera.fov=68;camera.updateProjectionMatrix();panel.hidden=false;document.body.classList.add('walking');start.setAttribute('aria-expanded','true');reset();last=performance.now();
  $('#walk-exit').focus({preventScroll:true});requestAnimationFrame(()=>{if(innerWidth<=620)document.querySelector('.viewport').scrollIntoView({behavior:'instant',block:'start'});});
 };
 $('#walk-exit').onclick=()=>stop();$('#walk-reset').onclick=()=>reset();$('#walk-gate').onclick=()=>reset(gateView);
 window.addEventListener('keydown',e=>{if(!active||/INPUT|TEXTAREA|SELECT/.test(e.target.tagName))return;if(e.key==='Escape'){e.preventDefault();stop();return;}const key=e.key.toLowerCase();if(['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright','shift'].includes(key)){e.preventDefault();keys.add(key);}});
 window.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));window.addEventListener('blur',clear);document.addEventListener('visibilitychange',()=>{if(document.hidden)clear();});
 canvas.addEventListener('pointerdown',e=>{if(!active||look||e.button!==0)return;e.preventDefault();look={id:e.pointerId,x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId);});
 canvas.addEventListener('pointermove',e=>{if(!active||look?.id!==e.pointerId)return;yaw-=(e.clientX-look.x)*.005;pitch=THREE.MathUtils.clamp(pitch-(e.clientY-look.y)*.004,-.85,.85);look.x=e.clientX;look.y=e.clientY;camera.rotation.set(pitch,yaw,0,'YXZ');});
 for(const name of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(name,e=>{if(look?.id===e.pointerId)look=null;});
 document.querySelectorAll('.walk-direction').forEach(button=>{
  button.addEventListener('pointerdown',e=>{if(!active)return;e.preventDefault();button.setPointerCapture(e.pointerId);held.set(e.pointerId,button.dataset.direction);button.classList.add('pressed');});
  for(const event of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(event,e=>{held.delete(e.pointerId);button.classList.remove('pressed');});
 });
 function update(now){
  if(!active)return;const dt=Math.min((now-last)/1000,.15);last=now;
  const directions=new Set(held.values());let forward=(keys.has('w')||keys.has('arrowup')||directions.has('forward')?1:0)-(keys.has('s')||keys.has('arrowdown')||directions.has('back')?1:0);
  let strafe=(keys.has('d')||directions.has('right')?1:0)-(keys.has('a')||directions.has('left')?1:0);
  if(keys.has('arrowleft'))yaw+=dt*1.4;if(keys.has('arrowright'))yaw-=dt*1.4;camera.rotation.set(pitch,yaw,0,'YXZ');
  const length=Math.hypot(forward,strafe);if(length){forward/=length;strafe/=length;const distance=dt*(keys.has('shift')?4:2.4),dx=(-Math.sin(yaw)*forward+Math.cos(yaw)*strafe)*distance,dz=(-Math.cos(yaw)*forward-Math.sin(yaw)*strafe)*distance;
   const steps=Math.max(1,Math.ceil(distance/.12));
   for(let i=0;i<steps;i++){
    if(!blocked(camera.position.x+dx/steps,camera.position.z))camera.position.x+=dx/steps;else blockedAt=now;
    if(!blocked(camera.position.x,camera.position.z+dz/steps))camera.position.z+=dz/steps;else blockedAt=now;
   }
  }
  camera.position.y=spawn.y;$('#walk-message').textContent=now-blockedAt<1200?'前方為校舍或邊界，請沿室外繞行。':'';
  $('#walk-map-position').setAttribute('cx',camera.position.x);$('#walk-map-position').setAttribute('cy',camera.position.z);
  $('#walk-map-heading').setAttribute('x1',camera.position.x);$('#walk-map-heading').setAttribute('y1',camera.position.z);$('#walk-map-heading').setAttribute('x2',camera.position.x-Math.sin(yaw)*9);$('#walk-map-heading').setAttribute('y2',camera.position.z-Math.cos(yaw)*9);
 }
 return {stop,update,blocked,get active(){return active;},get position(){return camera.position.clone();}};
}
