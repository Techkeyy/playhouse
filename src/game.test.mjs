import test from 'node:test';
import assert from 'node:assert/strict';
import {advance,auraHue,bossPose,drawGame,MOBILE_WIDTH,newGame,ROUND_MS,spawnCadence,STARTING_HEALTH} from './game.ts';

test('portrait arena keeps the player, warnings, and attacks inside its narrower world',()=>{
 const g=newGame(MOBILE_WIDTH);
 assert.equal(g.hp,STARTING_HEALTH,'the balanced round should begin with five hearts');
 assert.equal(STARTING_HEALTH,5);
 assert.equal(g.player.x,MOBILE_WIDTH/2);
 g.target={x:999,y:999};advance(g,50,['falling'],1,'coin-rain',MOBILE_WIDTH);
 assert.ok(g.player.x<=MOBILE_WIDTH-22);
 assert.ok(g.player.y<=478);
 g.target=null;
 for(let i=0;i<23;i++)advance(g,50,['falling'],1,'coin-rain',MOBILE_WIDTH);
 assert.ok(g.shots.length>0);
 assert.ok(g.shots.every(s=>s.x>=0&&s.x<=MOBILE_WIDTH));
});

function safeIntervals(shots,axis,min,max){
 const blocks=shots.map(s=>[s[axis]-s.r-14,s[axis]+s.r+14]).sort((a,b)=>a[0]-b[0]);
 const gaps=[];let cursor=min;
 for(const [start,end] of blocks){if(start>cursor)gaps.push([cursor,Math.min(max,start)]);cursor=Math.max(cursor,end);}
 if(cursor<max)gaps.push([cursor,max]);
 return gaps.filter(([a,b])=>b-a>=40);
}

test('falling and sweep attacks leave a reachable, human-sized escape route on desktop and mobile',()=>{
 for(const width of [MOBILE_WIDTH,900])for(const phase of [0,1,2])for(const level of [1,12])for(const [family,motif] of [
  ['falling',''],['falling','coin-rain'],['sweep',''],['sweep','cell-bars']
 ])for(const playerX of [22,width/2,width-22]){
   const g=newGame(width);g.player.x=playerX;g.elapsed=[2000,16000,31000][phase];g.lastSpawn=g.elapsed-2000;
   advance(g,50,[family],level,motif,width);
   const axis=family==='falling'?'x':'y',min=axis==='x'?22:215,max=axis==='x'?width-22:478;
   const gaps=safeIntervals(g.shots,axis,min,max);
   assert.ok(gaps.length>0,`${family} ${motif} must leave >=40px clear at width ${width}, phase ${phase}, level ${level}`);
   const safeCenters=gaps.map(([a,b])=>(a+b)/2);
   for(let p=min;p<=max;p+=5){
     const distance=Math.min(...safeCenters.map(center=>Math.abs(center-p)));
     assert.ok(distance<=g.shots[0].telegraph/1000*330,`${family} warning must let a player at ${p} reach a safe corridor`);
   }
 }
});

test('overlapping sweeps and falling volleys preserve the same clear corridors',()=>{
 for(const width of [MOBILE_WIDTH,900])for(const [family,motif] of [['falling','coin-rain'],['sweep','cell-bars']]){
   const g=newGame(width);g.elapsed=31_000;g.lastSpawn=30_000;
   for(let i=0;i<70;i++){
     advance(g,50,[family],12,motif,width);
     if(g.waves<2)continue;
     const axis=family==='falling'?'x':'y',min=axis==='x'?22:215,max=axis==='x'?width-22:478;
     assert.ok(safeIntervals(g.shots,axis,min,max).length>0,`${family} overlapping waves must not close every ${axis} corridor`);
   }
 }
});

test('warnings paint the full collision envelope instead of a misleading hairline',()=>{
 const g=newGame(MOBILE_WIDTH);g.elapsed=31_000;g.lastSpawn=30_000;
 advance(g,50,['falling'],1,'coin-rain',MOBILE_WIDTH);
 g.shots.push({x:-25,y:235,vx:300,vy:0,r:21,kind:'sweep',motif:'cell-bars',age:20,telegraph:650,dodged:false});
 const fills=[];const ctx=new Proxy({canvas:{width:MOBILE_WIDTH,height:500},createLinearGradient:()=>({addColorStop:()=>{}})},
  {get(target,key){return key in target?target[key]:(...args)=>{if(key==='fillRect')fills.push(args);};},set(target,key,value){target[key]=value;return true;}});
 drawGame(ctx,g,null,'Light Magenta','Yellow Aura',true);
 const first=g.shots[0],danger=first.r+14;
 assert.ok(fills.some(([x,y,w,h])=>x===first.x-danger&&y===205&&w===danger*2&&h===295),'falling warning covers shot and player radii');
 assert.ok(fills.some(([x,y,w,h])=>x===0&&y===200&&w===MOBILE_WIDTH&&h===70),'sweep warning covers shot and player radii');
});

test('standing still is not an automatic win against falling or sweep bosses',()=>{
 for(const width of [MOBILE_WIDTH,900])for(const level of [1,12])for(const [family,motif] of [
  ['falling',''],['falling','coin-rain'],['sweep',''],['sweep','cell-bars']
 ]){
   const g=newGame(width);
   for(let i=0;i<900&&!g.done;i++)advance(g,50,[family],level,motif,width);
   assert.equal(g.won,false,`${family} ${motif} on width ${width} level ${level} must require a dodge`);
   assert.ok(g.hits>0,`${family} ${motif} should threaten the starting position`);
 }
});

test('former parking spots lose even with observed trait-family rotations',()=>{
 const rotations=[['falling','sweep'],['falling','sweep','pulse'],['sweep','falling','orbit']];
 for(const width of [MOBILE_WIDTH,900])for(const level of [1,12])for(const families of rotations){
   for(const x of [22,width/2-55,width/2,width/2+55,width-22])for(const y of [215,275,295,355,415,478]){
     const g=newGame(width);g.player={x,y};g.idleAnchor={x,y};
     for(let i=0;i<900&&!g.done;i++)advance(g,50,families,level,'',width);
     assert.equal(g.won,false,`static park at (${x},${y}) must not clear ${families} on width ${width}, level ${level}`);
   }
 }
});

test('an idle warning locks onto a position and a clear sidestep avoids it',()=>{
 const g=newGame(MOBILE_WIDTH);g.lastSpawn=Infinity;
 for(let i=0;i<75;i++)advance(g,50,['falling'],1,'',MOBILE_WIDTH);
 const shot=g.shots.find(s=>s.pressure);
 assert.ok(shot,'an idle player gets an aimed pressure warning');
 assert.equal(shot.telegraph,950);
 assert.deepEqual(shot.aim,g.player);
 g.target={x:g.player.x+55,y:g.player.y+55};
 for(let i=0;i<60;i++)advance(g,50,['falling'],1,'',MOBILE_WIDTH);
 assert.equal(g.hp,STARTING_HEALTH,'moving well within the warning clears the aimed pressure shot');
});

test('surviving the full active round ends the game',()=>{
 const g=newGame();g.elapsed=ROUND_MS-40;g.lastSpawn=g.elapsed;
 advance(g,40,['pulse'],1);
 assert.equal(g.done,true);assert.equal(g.won,true);
});

test('collision removes health once during invulnerability',()=>{
 const g=newGame();g.shots.push({x:g.player.x,y:g.player.y,vx:0,vy:0,r:15,kind:'pulse',age:650,telegraph:650,dodged:false});
 const startHealth=g.hp;
 advance(g,16,['pulse'],1);assert.equal(g.hp,startHealth-1);
 advance(g,16,['pulse'],1);assert.equal(g.hp,startHealth-1);
 for(let i=0;i<30;i++){g.lastSpawn=g.elapsed;advance(g,50,['pulse'],1);}
 assert.equal(g.hp,startHealth-1,'a second hit should not land within the 1.7 second recovery window');
 g.shots.push({x:g.player.x,y:g.player.y,vx:0,vy:0,r:15,kind:'pulse',age:650,telegraph:650,dodged:false});
 for(let i=0;i<5;i++){g.lastSpawn=g.elapsed;advance(g,50,['pulse'],1);}
 assert.equal(g.hp,startHealth-2,'the player becomes vulnerable again after recovery');
});

test('trait attack families generate visibly different paths',()=>{
 const patterns=new Map();
 for(const family of ['pulse','falling','sweep','orbit']){
   const g=newGame();for(let i=0;i<25;i++)advance(g,50,[family],1);
   patterns.set(family,g.shots.map(s=>`${Math.round(s.x)},${Math.round(s.y)}:${Math.round(s.vx)},${Math.round(s.vy)}`).join('|'));
 }
 assert.equal(new Set(patterns.values()).size,4);
});

test('battle pressure ramps with time and token history',()=>{
 assert.equal(spawnCadence(0,1),1120);
 assert.equal(spawnCadence(16_000,1),1000);
 assert.equal(spawnCadence(31_000,1),860);
 assert.equal(spawnCadence(31_000,12),662);
 assert.ok(spawnCadence(0,1)>spawnCadence(16_000,1));
 assert.ok(spawnCadence(16_000,1)>spawnCadence(31_000,1));
 assert.ok(spawnCadence(0,1)>spawnCadence(0,5));
 const early=newGame();for(let i=0;i<24;i++)advance(early,50,['falling'],1);
 const late=newGame();late.elapsed=31_000;late.lastSpawn=30_000;advance(late,50,['falling'],1);
 assert.ok(late.shots.length>early.shots.length);
});

test('first attack honors the real trait-derived family order',()=>{
 const g=newGame();for(let i=0;i<24;i++)advance(g,50,['orbit','pulse'],1);
 assert.equal(g.lastFamily,'orbit');
 assert.ok(g.shots.every(s=>s.kind==='orbit'));
});

test('actual Aura trait changes the avatar color',()=>{
 assert.notEqual(auraHue('Yellow Aura'),auraHue('Rose Aura'));
 assert.equal(auraHue('Yellow Aura'),auraHue('Yellow Aura'));
});

test('the real-art boss sprite moves and reacts, while reduced motion stays steady',()=>{
 const g=newGame();g.elapsed=2400;g.lastSpawn=2300;g.waves=1;g.lastFamily='sweep';
 const attack=bossPose(g),steady=bossPose(g,true);
 assert.notEqual(attack.x,steady.x);
 assert.ok(attack.y>steady.y);
 assert.notEqual(attack.lean,0);
 g.elapsed=3000;assert.notDeepEqual(bossPose(g),attack);
 assert.deepEqual(bossPose(g,true),steady);
});

test('arena draws the full NFT image as a character sprite without cropping',()=>{
 const calls=[];
 const ctx=new Proxy({canvas:{width:900,height:500},createLinearGradient:()=>({addColorStop:()=>{}})}, {get(target,key){return key in target?target[key]:(...args)=>{calls.push([key,...args]);};},set(target,key,value){target[key]=value;return true;}});
 const nft={complete:true,naturalWidth:1000};
 drawGame(ctx,newGame(),nft,'Light Magenta','Yellow Aura',true);
 assert.ok(calls.some(call=>call[0]==='drawImage'&&call[1]===nft&&call[2]===-69&&call[3]===-69&&call[4]===138&&call[5]===138));
 assert.equal(calls.some(call=>call[0]==='clip'),false);
});

test('featured trait signatures change attack geometry, timing, and symbols',()=>{
 const launch=(family,signature)=>{const g=newGame();for(let i=0;i<24;i++)advance(g,50,[family],1,signature);return g;};
 const coin=launch('falling','coin-rain'),cell=launch('sweep','cell-bars'),rally=launch('orbit','rally-orbit');
 assert.equal(coin.lastMotif,'coin-rain');
 assert.equal(cell.lastMotif,'cell-bars');
 assert.equal(rally.lastMotif,'rally-orbit');
 assert.equal(coin.shots.length,3);
 assert.ok(new Set(coin.shots.map(s=>s.age)).size>1,'coin columns should cascade');
 assert.ok(cell.shots.some(s=>s.vx>0)&&cell.shots.some(s=>s.vx<0),'cell bars should enter from both sides');
 assert.equal(rally.shots.length,7);
 const calls=[];const ctx=new Proxy({canvas:{width:900,height:500},createLinearGradient:()=>({addColorStop:()=>{}})}, {get(target,key){return key in target?target[key]:(...args)=>{calls.push([key,...args]);};},set(target,key,value){target[key]=value;return true;}});
 for(const g of [coin,cell,rally]){for(const shot of g.shots)shot.age=shot.telegraph+1;drawGame(ctx,g,null,'Light Magenta','Yellow Aura',true,g.lastMotif);}
 assert.ok(calls.some(c=>c[0]==='fillText'&&c[1]==='$'),'coin rain should show coin symbols');
 assert.ok(calls.some(c=>c[0]==='closePath'),'rally orbit should draw stars');
});

test('nonfeatured semantic signatures keep four distinct attack mechanics',()=>{
 const cases=[['spell-orbit','orbit'],['frost-sweep','sweep'],['token-rain','falling'],['headwear-burst','pulse']];
 const shapes=new Set();
 for(const [signature,family] of cases){
   const g=newGame();for(let i=0;i<24;i++)advance(g,50,[family],1,signature);
   assert.equal(g.lastMotif,signature);
   assert.ok(g.shots.length>0);
   shapes.add(g.shots.map(s=>`${Math.sign(s.vx)},${Math.sign(s.vy)},${Math.round(s.r)},${Math.round(s.age)}`).join('|'));
 }
 assert.equal(shapes.size,4);
 assert.ok(spawnCadence(0,1)<=1200,'a new boss should apply pressure from the opening phase');
});

test('opening attacks give a readable warning while later heat still ramps up',()=>{
 const opening=newGame();for(let i=0;i<24;i++)advance(opening,50,['pulse'],1);
 assert.equal(opening.waves,1);
 assert.ok(opening.shots.every(s=>s.telegraph===820&&s.age<s.telegraph));
 assert.ok(opening.shots.every(s=>Math.hypot(s.vx,s.vy)<=209));
 const mid=newGame();mid.elapsed=16_000;mid.lastSpawn=15_000;advance(mid,50,['pulse'],1);
 assert.equal(mid.shots[0].telegraph,750);
 const final=newGame();final.elapsed=31_000;final.lastSpawn=30_000;advance(final,50,['pulse'],1);
 assert.equal(final.shots[0].telegraph,650);
 assert.equal(spawnCadence(31_000,12),662);
 assert.equal(spawnCadence(0,7),1012);
 assert.ok(spawnCadence(0,12)<spawnCadence(0,1),'experienced bosses still attack faster');
 const evolved=newGame();for(let i=0;i<21;i++)advance(evolved,50,['pulse'],7);
 assert.equal(evolved.waves,1,'an evolved boss still starts attacking promptly');
 assert.equal(evolved.shots[0].telegraph,820);
 assert.ok(Math.hypot(evolved.shots[0].vx,evolved.shots[0].vy)<250,'opening projectile speed tapers at higher levels');
});

test('near dodges restore one heart after ten and never exceed starting health',()=>{
 const g=newGame();g.hp=3;
 g.move={x:1,y:0};advance(g,50,['pulse'],1);advance(g,50,['pulse'],1);g.move={x:0,y:0};
 for(let i=0;i<9;i++)g.shots.push({x:g.player.x+40,y:g.player.y,vx:0,vy:0,r:15,kind:'pulse',age:650,telegraph:650,dodged:false});
 advance(g,16,['pulse'],1);
 assert.equal(g.dodges,9);assert.equal(g.hp,3);
 g.shots.push({x:g.player.x+40,y:g.player.y,vx:0,vy:0,r:15,kind:'pulse',age:650,telegraph:650,dodged:false});
 advance(g,16,['pulse'],1);
 assert.equal(g.dodges,10);assert.equal(g.hp,4);
 g.hp=STARTING_HEALTH;g.dodges=19;
 g.shots.push({x:g.player.x+40,y:g.player.y,vx:0,vy:0,r:15,kind:'pulse',age:650,telegraph:650,dodged:false});
 advance(g,16,['pulse'],1);
 assert.equal(g.hp,STARTING_HEALTH);
});

test('standing beside projectiles gives no near-dodge points or healing',()=>{
 const g=newGame();g.hp=3;g.lastSpawn=Infinity;
 for(let i=0;i<20;i++)g.shots.push({x:g.player.x+40,y:g.player.y,vx:0,vy:0,r:15,kind:'pulse',age:650,telegraph:650,dodged:false});
 advance(g,50,['pulse'],1);
 assert.equal(g.dodges,0);assert.equal(g.hp,3);
});
