export const WIDTH=900, MOBILE_WIDTH=450, HEIGHT=500, ROUND_MS=45_000, STARTING_HEALTH=5;
const HIT_GRACE_MS=1700, HIT_FLASH_MS=520;
type Vec={x:number;y:number};
export type AttackFamily='pulse'|'falling'|'sweep'|'orbit';
type Shot=Vec & {vx:number;vy:number;r:number;kind:AttackFamily;motif:string;age:number;telegraph:number;dodged:boolean;pressure?:boolean;aim?:Vec;expired?:boolean};
export type GameState={elapsed:number;player:Vec;hp:number;score:number;hits:number;dodges:number;shots:Shot[];lastSpawn:number;waves:number;lastFamily:AttackFamily;lastMotif:string;invulnerable:number;done:boolean;won:boolean;move:Vec;target:Vec|null;idleAnchor:Vec;idleMs:number;lastMoved:number;lastPressure:number};
export function newGame(width=WIDTH):GameState{return {elapsed:0,player:{x:width/2,y:355},hp:STARTING_HEALTH,score:0,hits:0,dodges:0,shots:[],lastSpawn:0,waves:0,lastFamily:'pulse',lastMotif:'',invulnerable:0,done:false,won:false,move:{x:0,y:0},target:null,idleAnchor:{x:width/2,y:355},idleMs:0,lastMoved:-Infinity,lastPressure:0};}
const clamp=(n:number,a:number,b:number)=>Math.max(a,Math.min(b,n));
const dist=(a:Vec,b:Vec)=>Math.hypot(a.x-b.x,a.y-b.y);
export const heatPhase=(elapsed:number)=>elapsed>=30_000?2:elapsed>=15_000?1:0;
export const spawnCadence=(elapsed:number,level:number)=>{
 const phase=heatPhase(elapsed),history=Math.max(1,Math.min(level,12))-1;
 // Ease the opening and cap history pressure while keeping a clear three-phase ramp.
 return Math.max(600,[1120,1000,860][phase]-history*[18,20,18][phase]);
};
const signatureFamily:Record<string,AttackFamily>={'coin-rain':'falling','token-rain':'falling','gold-rain':'falling','trait-rain':'falling','cell-bars':'sweep','frost-sweep':'sweep','stripe-sweep':'sweep','body-sweep':'sweep','visor-scan':'sweep','rally-orbit':'orbit','spell-orbit':'orbit','round-gaze':'orbit','aura-spiral':'orbit','eye-orbit':'orbit','ember-burst':'pulse','joy-pulse':'pulse','headwear-burst':'pulse'};
export function advance(g:GameState,dtMs:number,families:string[],level:number,signatureId='',width=WIDTH):GameState{
 if(g.done)return g;
 const dt=Math.min(dtMs,50)/1000;
 g.elapsed+=dt*1000; g.invulnerable=Math.max(0,g.invulnerable-dt*1000);
 const dx=g.target?g.target.x-g.player.x:g.move.x;
 const dy=g.target?g.target.y-g.player.y:g.move.y;
 const len=Math.hypot(dx,dy);
 if(len>0.01){const speed=g.target?Math.min(330,len/dt):330;g.player.x=clamp(g.player.x+dx/len*speed*dt,22,width-22);g.player.y=clamp(g.player.y+dy/len*speed*dt,215,HEIGHT-22);}
 if(dist(g.player,g.idleAnchor)>20){g.idleAnchor={...g.player};g.idleMs=0;g.lastMoved=g.elapsed;}
 else g.idleMs+=dt*1000;
 const phase=heatPhase(g.elapsed),cadence=spawnCadence(g.elapsed,level);
 if(g.elapsed-g.lastSpawn>cadence){
   g.lastSpawn=g.elapsed;const count=g.waves;const family=(families[g.waves%Math.max(families.length,1)]||'pulse') as AttackFamily;g.waves++;
   g.lastFamily=family;const motif=signatureFamily[signatureId]===family?signatureId:'';g.lastMotif=motif;
   const history=Math.max(1,Math.min(level,12))-1;
   const speed=phase===0?208+history*6:220+phase*24+history*9;
   const bossX=width/2+Math.sin(g.elapsed/1000*2.1)*19,attackY=185;
   const telegraph=[820,750,650][phase];
   const emit=(x:number,y:number,vx:number,vy:number,r:number,kind:AttackFamily,delayMs=0)=>g.shots.push({x,y,vx,vy,r,kind,motif,age:-delayMs,telegraph,dodged:false});
   if(family==='falling'){
     // Keep generous horizontal escape corridors on both arena widths. The
     // positions remain aligned across overlapping volleys, so a later wave
     // cannot silently fill the only gap left by an earlier one.
     const cascade=['coin-rain','token-rain','gold-rain','trait-rain'].includes(motif);
     const columnCount=Math.max(3,2*Math.floor((width-200)/220)+1);
     const middle=(columnCount-1)/2,step=110;
     for(let i=0;i<columnCount;i++){
       if(phase===0&&i%2!==middle%2)continue;
       if(phase===1&&i!==middle&&i%4===0)continue;
       emit(width/2+(i-middle)*step,attackY,0,speed,phase===2?16:15,'falling',cascade?i*75:0);
     }
   }else if(family==='sweep'){
     // A sweep needs an actual 50px-wide passage after accounting for the
     // player's 14px collision radius. Reuse rows across phases and volleys.
     const fromLeft=count%2===0;const rows=phase===0?[235,355]:[235,355,475];const alternating=['cell-bars','frost-sweep','stripe-sweep','body-sweep'].includes(motif);
     rows.forEach((y,i)=>{const left=alternating?i%2===0:fromLeft;emit(left?-25:width+25,y,left?speed*1.2:-speed*1.2,0,alternating?21:17,'sweep',alternating?i*65:0);});
   }else if(family==='orbit'){
     const base=count*1.13,n=(motif?7:5)+phase*2;for(let i=0;i<n;i++){const a=base+i*Math.PI*2/n;emit(bossX,attackY,Math.cos(a)*speed*.84,Math.sin(a)*speed*.84,12,'orbit',motif?i*55:0);}
   }else{
     const aim=Math.atan2(g.player.y-attackY,g.player.x-bossX),n=5+phase*2;for(let i=0;i<n;i++){const a=aim+(i-(n-1)/2)*(.72/(n-1));emit(bossX,attackY,Math.cos(a)*speed,Math.sin(a)*speed,12,'pulse');}
   }
 }
 // Independent, small aimed pressure prevents permanent parking in the
 // generous falling/sweep corridors without adding another arena-wide wall.
 // The marker records a point in time: sidestepping during its warning works.
 if(g.idleMs>=2200&&g.elapsed-g.lastPressure>=3600){
   g.lastPressure=g.elapsed;
   const aim={...g.player},origin={x:width/2+Math.sin(g.elapsed/1000*2.1)*19,y:185};
   const distance=Math.max(1,dist(origin,aim)),speed=240+phase*15;
   g.shots.push({x:origin.x,y:origin.y,vx:(aim.x-origin.x)/distance*speed,vy:(aim.y-origin.y)/distance*speed,r:8,kind:'pulse',motif:'pressure',age:0,telegraph:950,dodged:false,pressure:true,aim});
 }
 for(const shot of g.shots){
   shot.age+=dt*1000;
   if(shot.age<shot.telegraph)continue;
   shot.x+=shot.vx*dt;shot.y+=shot.vy*dt;
   const gap=dist(shot,g.player);
   if(gap<shot.r+14&&g.invulnerable===0){g.hp--;g.hits++;g.invulnerable=HIT_GRACE_MS;shot.y=HEIGHT+100;}
   else if(!shot.dodged&&gap<shot.r+35&&gap>=shot.r+14&&g.invulnerable===0&&g.elapsed-g.lastMoved<=1000){shot.dodged=true;g.dodges++;g.score+=15;if(g.dodges%10===0)g.hp=Math.min(STARTING_HEALTH,g.hp+1);}
   if(shot.pressure&&shot.aim&&(shot.x-shot.aim.x)*shot.vx+(shot.y-shot.aim.y)*shot.vy>0)shot.expired=true;
 }
 g.shots=g.shots.filter(s=>!s.expired&&s.x>-60&&s.x<width+60&&s.y<HEIGHT+60);
 g.score+=Math.round(dt*100);
 if(g.hp<=0||g.elapsed>=ROUND_MS){g.done=true;g.won=g.hp>0&&g.elapsed>=ROUND_MS;g.score+=g.won?500:0;}
 return g;
}
export function auraHue(value:string):number{
 const text=value.toLowerCase();
 if(text.includes('yellow')||text.includes('gold'))return 48;
 if(text.includes('rose')||text.includes('pink'))return 335;
 if(text.includes('purple')||text.includes('violet'))return 270;
 if(text.includes('fire')||text.includes('orange'))return 20;
 if(text.includes('green'))return 140;
 if(text.includes('blue'))return 205;
 return [...text].reduce((n,ch)=>n+ch.charCodeAt(0),0)%360;
}
export function bossPose(g:GameState,reducedMotion=false){
 if(reducedMotion)return {x:450,y:94,lean:0,pulse:0};
 const t=g.elapsed/1000,attackAge=g.waves?g.elapsed-g.lastSpawn:Infinity,lunge=attackAge<300?(1-attackAge/300)*20:0;
 return {x:450+Math.sin(t*2.1)*22,y:94+Math.sin(t*3.4)*9+lunge,lean:g.lastFamily==='sweep'?Math.sin(t*2.1)*.16:g.lastFamily==='orbit'?Math.sin(t*3)*.13:Math.sin(t*2.5)*.08,pulse:Math.sin(t*5)*5};
}
export function drawGame(ctx:CanvasRenderingContext2D,g:GameState,boss:HTMLImageElement|null,arenaTheme:string,auraTrait:string,reducedMotion=false,signatureId=''){
 const c=ctx.canvas,width=c.width;ctx.clearRect(0,0,c.width,c.height);
 const hash=[...arenaTheme].reduce((n,ch)=>n+ch.charCodeAt(0),0),hue=190+hash%95;
 const grad=ctx.createLinearGradient(0,0,0,HEIGHT);grad.addColorStop(0,`hsl(${hue} 36% 25%)`);grad.addColorStop(1,`hsl(${hue} 40% 11%)`);ctx.fillStyle=grad;ctx.fillRect(0,0,width,HEIGHT);
 ctx.strokeStyle='rgba(203,238,255,.13)';ctx.lineWidth=1;for(let x=0;x<width;x+=50){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,HEIGHT);ctx.stroke();}for(let y=0;y<HEIGHT;y+=50){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(width,y);ctx.stroke();}
 ctx.fillStyle='rgba(10,20,31,.56)';ctx.fillRect(0,0,width,205);
 const attackAge=g.waves?g.elapsed-g.lastSpawn:Infinity,{x:poseX,y:bossY,lean,pulse}=bossPose(g,reducedMotion),bossX=poseX+(width-WIDTH)/2,aura=auraHue(auraTrait);
 if(attackAge<380&&!reducedMotion){ctx.beginPath();ctx.arc(bossX,bossY,86+attackAge*.14,0,Math.PI*2);ctx.strokeStyle=`hsla(${aura},95%,75%,${.65*(1-attackAge/380)})`;ctx.lineWidth=5;ctx.stroke();}
 ctx.save();ctx.translate(bossX,bossY);
 ctx.shadowColor=`hsl(${aura} 90% 65%)`;ctx.shadowBlur=28+pulse;ctx.fillStyle=`hsla(${aura},85%,65%,.28)`;ctx.fillRect(-82,-82,164,164);ctx.shadowBlur=0;
 const reach=attackAge<300&&!reducedMotion?(1-attackAge/300)*22:0;
 const legSwing=reducedMotion?0:Math.sin(g.elapsed/280)*4;
 ctx.rotate(lean);ctx.scale(1+reach*.002,1-reach*.001);
 ctx.strokeStyle=`hsl(${aura} 85% 72%)`;ctx.lineWidth=12;ctx.lineCap='round';
 ctx.beginPath();ctx.moveTo(-66,4);ctx.lineTo(-97-reach,23-reach*.5);ctx.moveTo(66,4);ctx.lineTo(97+reach,23-reach*.5);ctx.stroke();
 ctx.beginPath();ctx.moveTo(-32,68);ctx.lineTo(-39,92+legSwing);ctx.moveTo(32,68);ctx.lineTo(39,92-legSwing);ctx.stroke();
 ctx.fillStyle='#172736';ctx.fillRect(-53,90,28,12);ctx.fillRect(25,90,28,12);
 ctx.fillStyle=`hsl(${aura} 90% 72%)`;ctx.fillRect(-75,-75,150,150);
 if(boss?.complete&&boss.naturalWidth){ctx.drawImage(boss,-69,-69,138,138);}
 else{ctx.fillStyle='#21314b';ctx.fillRect(-69,-69,138,138);ctx.fillStyle='#fff';ctx.textAlign='center';ctx.font='bold 23px system-ui';ctx.fillText('CHOG',0,7);}
 ctx.strokeStyle='#fff2bb';ctx.lineWidth=4;ctx.strokeRect(-73,-73,146,146);ctx.restore();
 ctx.textAlign='left';ctx.font='bold 13px system-ui';ctx.fillStyle='#f8d777';ctx.fillText(`HEAT ${heatPhase(g.elapsed)+1}/3`,20,29);ctx.fillStyle='#d8ebf5';ctx.fillText(g.lastFamily.toUpperCase(),20,51);ctx.font='bold 12px system-ui';ctx.fillText((g.lastMotif||signatureId).replaceAll('-',' ').toUpperCase(),20,72);
 for(const s of g.shots){if(s.age<s.telegraph){const alpha=.2+.5*Math.max(0,s.age)/s.telegraph;const tellHue=['coin-rain','token-rain','gold-rain'].includes(s.motif)?45:s.motif==='frost-sweep'?190:s.motif==='stripe-sweep'?150:s.kind==='sweep'?18:s.kind==='orbit'?275:45;ctx.strokeStyle=`hsla(${tellHue},90%,73%,${alpha})`;ctx.lineWidth=s.kind==='sweep'?4:3;
     // Show the whole player-center danger envelope, including the player's
     // collision radius, so a thin warning line never suggests a false gap.
     const danger=s.r+14;ctx.fillStyle=`hsla(${tellHue},90%,65%,${alpha*.22})`;
     if(s.kind==='falling')ctx.fillRect(s.x-danger,205,danger*2,HEIGHT-205);
     if(s.kind==='sweep')ctx.fillRect(0,s.y-danger,width,danger*2);
     if(s.pressure&&s.aim){ctx.strokeStyle=`rgba(255,215,105,${alpha})`;ctx.lineWidth=3;ctx.beginPath();ctx.arc(s.aim.x,s.aim.y,s.r+14,0,Math.PI*2);ctx.stroke();ctx.fillStyle='#ffdc84';ctx.textAlign='center';ctx.font='bold 14px system-ui';ctx.fillText('MOVE!',s.aim.x,Math.max(218,s.aim.y-31));}
     ctx.setLineDash([9,7]);ctx.beginPath();ctx.moveTo(s.x,s.y);
     if(s.kind==='falling')ctx.lineTo(s.x,HEIGHT);
     else if(s.kind==='sweep')ctx.lineTo(s.vx>0?width:0,s.y);
     else if(s.pressure&&s.aim)ctx.lineTo(s.aim.x,s.aim.y);
     else {const endY=s.vy>0?HEIGHT:0,scale=(endY-s.y)/(Math.abs(s.vy)<1?1:s.vy);ctx.lineTo(s.x+s.vx*scale,endY);}
     ctx.stroke();ctx.setLineDash([]);continue;}
   ctx.save();ctx.shadowBlur=18;
   if(['coin-rain','token-rain','gold-rain'].includes(s.motif)){ctx.fillStyle='#ffd364';ctx.shadowColor=ctx.fillStyle;ctx.beginPath();ctx.arc(s.x,s.y,s.r,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;ctx.strokeStyle='#8d5a16';ctx.lineWidth=3;ctx.stroke();ctx.fillStyle='#54370e';ctx.textAlign='center';ctx.font='bold 17px system-ui';ctx.fillText(s.motif==='coin-rain'?'$':'✦',s.x,s.y+6);}
   else if(['cell-bars','frost-sweep','stripe-sweep','body-sweep'].includes(s.motif)){ctx.fillStyle=s.motif==='frost-sweep'?'#91eeff':s.motif==='stripe-sweep'?'#9bf4a8':'#ff9d76';ctx.shadowColor=ctx.fillStyle;ctx.fillRect(s.x-23,s.y-10,46,20);ctx.shadowBlur=0;ctx.strokeStyle='#29434d';ctx.lineWidth=3;for(const offset of [-10,0,10]){ctx.beginPath();ctx.moveTo(s.x+offset,s.y-10);ctx.lineTo(s.x+offset,s.y+10);ctx.stroke();}}
   else if(['rally-orbit','spell-orbit','round-gaze','aura-spiral','eye-orbit'].includes(s.motif)){ctx.fillStyle=s.motif==='spell-orbit'?'#82d8ff':s.motif==='round-gaze'?'#f2d3ff':'#c9a1ff';ctx.shadowColor=ctx.fillStyle;ctx.beginPath();for(let i=0;i<10;i++){const angle=-Math.PI/2+i*Math.PI/5,radius=i%2===0?s.r+3:s.r*.5;const x=s.x+Math.cos(angle)*radius,y=s.y+Math.sin(angle)*radius;if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);}ctx.closePath();ctx.fill();}
   else if(s.motif==='headwear-burst'||s.motif==='ember-burst'){ctx.fillStyle=s.motif==='ember-burst'?'#ff805e':'#ffcb88';ctx.shadowColor=ctx.fillStyle;ctx.beginPath();ctx.moveTo(s.x,s.y-s.r-3);ctx.lineTo(s.x+s.r+3,s.y);ctx.lineTo(s.x,s.y+s.r+3);ctx.lineTo(s.x-s.r-3,s.y);ctx.closePath();ctx.fill();}
   else{ctx.beginPath();ctx.arc(s.x,s.y,s.r,0,Math.PI*2);ctx.fillStyle=s.kind==='falling'?'#8fe5ea':s.kind==='sweep'?'#f8ae74':s.kind==='orbit'?'#b99aff':'#ef87ac';ctx.shadowColor=ctx.fillStyle;ctx.fill();}ctx.restore();}
 if(!(g.invulnerable>0&&Math.floor(g.invulnerable/100)%2===0)){ctx.beginPath();ctx.arc(g.player.x,g.player.y,15,0,Math.PI*2);ctx.fillStyle='#8fe5ea';ctx.shadowColor='#8fe5ea';ctx.shadowBlur=20;ctx.fill();ctx.shadowBlur=0;ctx.strokeStyle='#fff';ctx.lineWidth=3;ctx.stroke();}
 if(g.invulnerable>HIT_GRACE_MS-HIT_FLASH_MS){ctx.fillStyle=`rgba(255,86,105,${(g.invulnerable-(HIT_GRACE_MS-HIT_FLASH_MS))/HIT_FLASH_MS*.22})`;ctx.fillRect(0,0,width,HEIGHT);}
 ctx.textAlign='left';ctx.fillStyle='#eef8ff';ctx.font='bold 15px system-ui';ctx.fillText('MOVE: WASD / ARROWS / DRAG',20,HEIGHT-18);
}
