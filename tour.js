// Constructed visitor-facing content only; no original documents or source drawings.
export const tourStops=[
 {title:'先認識整座校園',location:'全校總覽',room:null,text:'從鳥瞰視角認識第一至第四棟、活動中心與操場。你可以隨時旋轉、縮放，再按下一站繼續。'},
 {title:'行政處室',location:'第一棟 · 1F · 1103',room:'room-1103',text:'這一站來到教務處。第一棟一樓也有學務處、總務處、健康中心與事務中心，可搭配右側清單找到各處室。'},
 {title:'低年級教室',location:'第三棟 · 2F · 3202',room:'room-3202',text:'一年一班位於第三棟二樓，同層也有其他一年級與二年級班級。樓層已切換，可旋轉模型查看教室的相對位置。'},
 {title:'創客教室',location:'第三棟 · 4F · 3403',room:'room-3403',text:'創客教室位於第三棟四樓。這一層也有自然與英語教室，完整名稱可在場域清單查看。'},
 {title:'圖書館與桌球教室',location:'活動中心 · 1F · 5102',room:'room-5102',text:'圖書館與桌球教室同在活動中心一樓，兩個空間相連。點選右側清單，也能切換查看桌球教室。'},
 {title:'禮堂',location:'活動中心 · 2F · 5202',room:'room-5202',text:'最後來到禮堂，挑高範圍由二樓延伸至四樓。完成導覽後，可以回到自由探索，繼續查看其他教室與樓層。'}
];
export function createGuidedTour({onStart,onVisit,onExit}){
 const $=s=>document.querySelector(s),start=$('#tour-start'),panel=$('#tour-panel');
 let index=-1;
 function visit(next){
  index=Math.max(0,Math.min(tourStops.length-1,next));const s=tourStops[index];
  $('#tour-number').textContent=`${String(index+1).padStart(2,'0')} / ${String(tourStops.length).padStart(2,'0')}`;
  $('#tour-title').textContent=s.title;$('#tour-location').textContent=s.location;$('#tour-text').textContent=s.text;
  $('#tour-prev').disabled=index===0;$('#tour-next').textContent=index===tourStops.length-1?'完成導覽':'下一站 →';
  panel.querySelectorAll('.tour-dot').forEach((b,i)=>{b.classList.toggle('active',i===index);b.setAttribute('aria-current',i===index?'step':'false');});
  onVisit(s,index);
 }
 function stop({restore=true,focus=true}={}){if(index<0)return;index=-1;panel.hidden=true;document.body.classList.remove('touring');start.setAttribute('aria-expanded','false');onExit({restore});if(focus)start.focus({preventScroll:true});}
 start.onclick=()=>{if(index>=0){stop();return;}onStart();panel.hidden=false;document.body.classList.add('touring');start.setAttribute('aria-expanded','true');visit(0);$('#tour-next').focus({preventScroll:true});if(innerWidth<=620)document.querySelector('.viewport').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});};
 $('#tour-prev').onclick=()=>visit(index-1);$('#tour-next').onclick=()=>index===tourStops.length-1?stop():visit(index+1);$('#tour-exit').onclick=()=>stop();
 for(const [i,s] of tourStops.entries()){const button=document.createElement('button');button.className='tour-dot';button.type='button';button.textContent=String(i+1);button.setAttribute('aria-label',`第${i+1}站：${s.title}`);button.onclick=()=>visit(i);$('#tour-progress').append(button);}
 window.addEventListener('keydown',e=>{if(index<0||document.querySelector('dialog[open]')||/INPUT|TEXTAREA|SELECT/.test(e.target.tagName))return;if(e.key==='Escape'){e.preventDefault();stop();}else if(e.key==='ArrowRight'&&index<tourStops.length-1){e.preventDefault();visit(index+1);}else if(e.key==='ArrowLeft'&&index>0){e.preventDefault();visit(index-1);}});
 return {stop,get active(){return index>=0;},get index(){return index;}};
}
