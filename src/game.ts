export const WIDTH=900, HEIGHT=500, ROUND_MS=45_000;
type Vec={x:number;y:number};
export type AttackFamily='pulse'|'falling'|'sweep'|'orbit';
type Shot=Vec & {vx:number;vy:number;r:number;kind:AttackFamily;age:number;telegraph:number;dodged:boolean};
export type GameState={elapsed:number;player:Vec;hp:number;score:number;hits:number;dodges:number;shots:Shot[];lastSpawn:number;waves:number;lastFamily:AttackFamily;invulnerable:number;done:boolean;won:boolean;move:Vec;target:Vec|null};
export function newGame():GameState{return {elapsed:0,player:{x:450,y:410},hp:3,score:0,hits:0,dodges:0,shots:[],lastSpawn:0,waves:0,lastFamily:'pulse',invulnerable:0,done:false,won:false,move:{x:0,y:0},target:null};}
const clamp=(n:number,a:number,b:number)=>Math.max(a,Math.min(b,n));
const dist=(a:Vec,b:Vec)=>Math.hypot(a.x-b.x,a.y-b.y);
export const heatPhase=(elapsed:number)=>elapsed>=30_000?2:elapsed>=15_000?1:0;
export const spawnCadence=(elapsed:number,level:number)=>Math.max(430,950-heatPhase(elapsed)*135-(Math.max(1,Math.min(level,12))-1)*42);
export function advance(g:GameState,dtMs:number,families:string[],level:number):GameState{
 if(g.done)return g;
 const dt=Math.min(dtMs,50)/1000;
 g.elapsed+=dt*1000; g.invulnerable=Math.max(0,g.invulnerable-dt*1000);
 const dx=g.target?g.target.x-g.player.x:g.move.x;
 const dy=g.target?g.target.y-g.player.y:g.move.y;
 const len=Math.hypot(dx,dy);
 if(len>0.01){const speed=g.target?Math.min(330,len/dt):330;g.player.x=clamp(g.player.x+dx/len*speed*dt,22,WIDTH-22);g.player.y=clamp(g.player.y+dy/len*speed*dt,215,HEIGHT-22);}
 const phase=heatPhase(g.elapsed),cadence=spawnCadence(g.elapsed,level);
 if(g.elapsed-g.lastSpawn>cadence){
   g.lastSpawn=g.elapsed;const count=g.waves;const family=(families[g.waves%Math.max(families.length,1)]||'pulse') as AttackFamily;g.waves++;
   g.lastFamily=family;
   const speed=220+phase*24+(Math.max(1,Math.min(level,12))-1)*9;
   const bossX=450+Math.sin(g.elapsed/1000*2.1)*19,attackY=185;
   const telegraph=650-phase*55;
   const emit=(x:number,y:number,vx:number,vy:number,r:number,kind:AttackFamily)=>g.shots.push({x,y,vx,vy,r,kind,age:0,telegraph,dodged:false});
   if(family==='falling'){
     const x=clamp(g.player.x,60,WIDTH-60);const offsets=phase===0?[-100,0,100]:phase===1?[-140,-70,0,70,140]:[-175,-105,-35,35,105,175];
     for(const offset of offsets)emit(clamp(x+offset,25,WIDTH-25),attackY,0,speed,phase===2?15:14,'falling');
   }else if(family==='sweep'){
     const fromLeft=count%2===0;const lanes=phase===2?5:4;for(let i=0;i<lanes;i++)emit(fromLeft?-25:WIDTH+25,215+i*(phase===2?62:78),fromLeft?speed*1.2:-speed*1.2,0,17,'sweep');
   }else if(family==='orbit'){
     const base=count*1.13,n=5+phase*2;for(let i=0;i<n;i++){const a=base+i*Math.PI*2/n;emit(bossX,attackY,Math.cos(a)*speed*.84,Math.sin(a)*speed*.84,12,'orbit');}
   }else{
     const aim=Math.atan2(g.player.y-attackY,g.player.x-bossX),n=5+phase*2;for(let i=0;i<n;i++){const a=aim+(i-(n-1)/2)*(.72/(n-1));emit(bossX,attackY,Math.cos(a)*speed,Math.sin(a)*speed,12,'pulse');}
   }
 }
 for(const shot of g.shots){
   shot.age+=dt*1000;
   if(shot.age<shot.telegraph)continue;
   shot.x+=shot.vx*dt;shot.y+=shot.vy*dt;
   const gap=dist(shot,g.player);
   if(gap<shot.r+14&&g.invulnerable===0){g.hp--;g.hits++;g.invulnerable=1000;shot.y=HEIGHT+100;}
   else if(!shot.dodged&&gap<shot.r+35&&gap>=shot.r+14){shot.dodged=true;g.dodges++;g.score+=15;}
 }
 g.shots=g.shots.filter(s=>s.x>-60&&s.x<WIDTH+60&&s.y<HEIGHT+60);
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
export function drawGame(ctx:CanvasRenderingContext2D,g:GameState,boss:HTMLImageElement|null,arenaTheme:string,auraTrait:string,reducedMotion=false){
 const c=ctx.canvas;ctx.clearRect(0,0,c.width,c.height);
 const hash=[...arenaTheme].reduce((n,ch)=>n+ch.charCodeAt(0),0),hue=190+hash%95;
 const grad=ctx.createLinearGradient(0,0,0,HEIGHT);grad.addColorStop(0,`hsl(${hue} 36% 25%)`);grad.addColorStop(1,`hsl(${hue} 40% 11%)`);ctx.fillStyle=grad;ctx.fillRect(0,0,WIDTH,HEIGHT);
 ctx.strokeStyle='rgba(203,238,255,.13)';ctx.lineWidth=1;for(let x=0;x<WIDTH;x+=50){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,HEIGHT);ctx.stroke();}for(let y=0;y<HEIGHT;y+=50){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(WIDTH,y);ctx.stroke();}
 ctx.fillStyle='rgba(10,20,31,.56)';ctx.fillRect(0,0,WIDTH,205);
 const attackAge=g.waves?g.elapsed-g.lastSpawn:Infinity,{x:bossX,y:bossY,lean,pulse}=bossPose(g,reducedMotion),aura=auraHue(auraTrait);
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
 ctx.textAlign='left';ctx.font='bold 13px system-ui';ctx.fillStyle='#f8d777';ctx.fillText(`HEAT ${heatPhase(g.elapsed)+1}/3`,20,29);ctx.fillStyle='#d8ebf5';ctx.fillText(g.lastFamily.toUpperCase(),20,51);
 for(const s of g.shots){if(s.age<s.telegraph){const alpha=.2+.5*s.age/s.telegraph;ctx.strokeStyle=`rgba(255,215,113,${alpha})`;ctx.lineWidth=s.kind==='sweep'?4:3;ctx.setLineDash([9,7]);ctx.beginPath();ctx.moveTo(s.x,s.y);
     if(s.kind==='falling')ctx.lineTo(s.x,HEIGHT);
     else if(s.kind==='sweep')ctx.lineTo(s.vx>0?WIDTH:0,s.y);
     else {const endY=s.vy>0?HEIGHT:0,scale=(endY-s.y)/(Math.abs(s.vy)<1?1:s.vy);ctx.lineTo(s.x+s.vx*scale,endY);}
     ctx.stroke();ctx.setLineDash([]);continue;}
   ctx.beginPath();ctx.arc(s.x,s.y,s.r,0,Math.PI*2);ctx.fillStyle=s.kind==='falling'?'#8fe5ea':s.kind==='sweep'?'#f8ae74':s.kind==='orbit'?'#b99aff':'#ef87ac';ctx.shadowColor=ctx.fillStyle;ctx.shadowBlur=18;ctx.fill();ctx.shadowBlur=0;}
 if(!(g.invulnerable>0&&Math.floor(g.invulnerable/100)%2===0)){ctx.beginPath();ctx.arc(g.player.x,g.player.y,15,0,Math.PI*2);ctx.fillStyle='#8fe5ea';ctx.shadowColor='#8fe5ea';ctx.shadowBlur=20;ctx.fill();ctx.shadowBlur=0;ctx.strokeStyle='#fff';ctx.lineWidth=3;ctx.stroke();}
 if(g.invulnerable>730){ctx.fillStyle=`rgba(255,86,105,${(g.invulnerable-730)/270*.22})`;ctx.fillRect(0,0,WIDTH,HEIGHT);}
 ctx.textAlign='left';ctx.fillStyle='#eef8ff';ctx.font='bold 15px system-ui';ctx.fillText('MOVE: WASD / ARROWS / DRAG',20,HEIGHT-18);
}
