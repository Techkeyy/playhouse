export const WIDTH=900, HEIGHT=500, ROUND_MS=45_000;
type Vec={x:number;y:number};
type Shot=Vec & {vx:number;vy:number;r:number;kind:'pulse'|'falling'|'sweep'|'orbit';age:number;telegraph:number;dodged:boolean};
export type GameState={elapsed:number;player:Vec;hp:number;score:number;hits:number;dodges:number;shots:Shot[];lastSpawn:number;invulnerable:number;done:boolean;won:boolean;move:Vec;target:Vec|null};
export function newGame():GameState{return {elapsed:0,player:{x:450,y:410},hp:3,score:0,hits:0,dodges:0,shots:[],lastSpawn:0,invulnerable:0,done:false,won:false,move:{x:0,y:0},target:null};}
const clamp=(n:number,a:number,b:number)=>Math.max(a,Math.min(b,n));
const dist=(a:Vec,b:Vec)=>Math.hypot(a.x-b.x,a.y-b.y);
export function advance(g:GameState,dtMs:number,families:string[],level:number):GameState{
 if(g.done)return g;
 const dt=Math.min(dtMs,50)/1000;
 g.elapsed+=dt*1000; g.invulnerable=Math.max(0,g.invulnerable-dt*1000);
 const dx=g.target?g.target.x-g.player.x:g.move.x;
 const dy=g.target?g.target.y-g.player.y:g.move.y;
 const len=Math.hypot(dx,dy);
 if(len>0.01){const speed=g.target?Math.min(330,len/dt):330;g.player.x=clamp(g.player.x+dx/len*speed*dt,22,WIDTH-22);g.player.y=clamp(g.player.y+dy/len*speed*dt,115,HEIGHT-22);}
 const cadence=Math.max(450,1000-(Math.min(level,10)-1)*42);
 if(g.elapsed-g.lastSpawn>cadence){
   g.lastSpawn=g.elapsed; const count=Math.floor(g.elapsed/cadence); const family=(families[(count-1)%Math.max(families.length,1)]||'pulse') as Shot['kind'];
   const speed=205+Math.min(level,10)*10;
   const emit=(x:number,y:number,vx:number,vy:number,r:number,kind:Shot['kind'])=>g.shots.push({x,y,vx,vy,r,kind,age:0,telegraph:650,dodged:false});
   if(family==='falling'){
     const x=clamp(g.player.x,60,WIDTH-60);for(const offset of [-95,0,95])emit(clamp(x+offset,25,WIDTH-25),110,0,speed,14,'falling');
   }else if(family==='sweep'){
     const fromLeft=count%2===0;for(let i=0;i<4;i++)emit(fromLeft?-25:WIDTH+25,175+i*75,fromLeft?speed*1.2:-speed*1.2,0,18,'sweep');
   }else if(family==='orbit'){
     const base=count*1.13;for(let i=0;i<5;i++){const a=base+i*Math.PI*2/5;emit(450,105,Math.cos(a)*speed*.72,Math.sin(a)*speed*.72,12,'orbit');}
   }else{
     const aim=Math.atan2(g.player.y-105,g.player.x-450);for(const offset of [-.42,-.21,0,.21,.42]){const a=aim+offset;emit(450,105,Math.cos(a)*speed,Math.sin(a)*speed,12,'pulse');}
   }
 }
 for(const shot of g.shots){
   shot.age+=dtMs;
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
export function drawGame(ctx:CanvasRenderingContext2D,g:GameState,boss:HTMLImageElement|null,arenaTheme:string){
 const c=ctx.canvas;ctx.clearRect(0,0,c.width,c.height);
 const hash=[...arenaTheme].reduce((n,ch)=>n+ch.charCodeAt(0),0),hue=190+hash%95;
 const grad=ctx.createLinearGradient(0,0,0,HEIGHT);grad.addColorStop(0,`hsl(${hue} 36% 25%)`);grad.addColorStop(1,`hsl(${hue} 40% 11%)`);ctx.fillStyle=grad;ctx.fillRect(0,0,WIDTH,HEIGHT);
 ctx.strokeStyle='rgba(203,238,255,.13)';ctx.lineWidth=1;for(let x=0;x<WIDTH;x+=50){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,HEIGHT);ctx.stroke();}for(let y=0;y<HEIGHT;y+=50){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(WIDTH,y);ctx.stroke();}
 ctx.fillStyle='rgba(10,20,31,.56)';ctx.fillRect(0,0,WIDTH,108);
 ctx.beginPath();ctx.arc(450,74,55,0,Math.PI*2);ctx.fillStyle='#fce98c';ctx.fill();
 if(boss?.complete&&boss.naturalWidth){ctx.save();ctx.beginPath();ctx.arc(450,74,48,0,Math.PI*2);ctx.clip();ctx.drawImage(boss,402,26,96,96);ctx.restore();}
 else{ctx.fillStyle='#21314b';ctx.textAlign='center';ctx.font='bold 18px system-ui';ctx.fillText('CHOG',450,80);}
 ctx.strokeStyle='#f6d967';ctx.lineWidth=5;ctx.beginPath();ctx.arc(450,74,55,0,Math.PI*2);ctx.stroke();
 for(const s of g.shots){if(s.age<s.telegraph){const alpha=.2+.4*s.age/s.telegraph;ctx.strokeStyle=`rgba(255,215,113,${alpha})`;ctx.lineWidth=2;ctx.setLineDash([8,8]);ctx.beginPath();ctx.moveTo(s.x,s.y);ctx.lineTo(s.x+s.vx*.6,s.y+s.vy*.6);ctx.stroke();ctx.setLineDash([]);continue;}
   ctx.beginPath();ctx.arc(s.x,s.y,s.r,0,Math.PI*2);ctx.fillStyle=s.kind==='falling'?'#8fe5ea':s.kind==='sweep'?'#f8ae74':s.kind==='orbit'?'#b99aff':'#ef87ac';ctx.shadowColor=ctx.fillStyle;ctx.shadowBlur=18;ctx.fill();ctx.shadowBlur=0;}
 if(!(g.invulnerable>0&&Math.floor(g.invulnerable/100)%2===0)){ctx.beginPath();ctx.arc(g.player.x,g.player.y,15,0,Math.PI*2);ctx.fillStyle='#8fe5ea';ctx.shadowColor='#8fe5ea';ctx.shadowBlur=20;ctx.fill();ctx.shadowBlur=0;ctx.strokeStyle='#fff';ctx.lineWidth=3;ctx.stroke();}
 ctx.textAlign='left';ctx.fillStyle='#eef8ff';ctx.font='bold 15px system-ui';ctx.fillText('MOVE: WASD / ARROWS / DRAG',20,HEIGHT-18);
}
