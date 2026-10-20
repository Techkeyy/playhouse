import test from 'node:test';
import assert from 'node:assert/strict';
import {advance,auraHue,bossPose,drawGame,MOBILE_WIDTH,newGame,ROUND_MS,spawnCadence,STARTING_HEALTH} from './game.ts';

test('portrait arena keeps the player, warnings, and attacks inside its narrower world',()=>{
 const g=newGame(MOBILE_WIDTH);
 assert.equal(g.hp,STARTING_HEALTH,'the balanced round should begin with four hearts');
 assert.equal(STARTING_HEALTH,4);
 assert.equal(g.player.x,MOBILE_WIDTH/2);
 g.target={x:999,y:999};advance(g,50,['falling'],1,'coin-rain',MOBILE_WIDTH);
 assert.ok(g.player.x<=MOBILE_WIDTH-22);
 assert.ok(g.player.y<=478);
 g.target=null;
 for(let i=0;i<20;i++)advance(g,50,['falling'],1,'coin-rain',MOBILE_WIDTH);
 assert.ok(g.shots.length>0);
 assert.ok(g.shots.every(s=>s.x>=0&&s.x<=MOBILE_WIDTH));
});

test('portrait falling columns leave real dodge gaps in the final heat phase',()=>{
 const g=newGame(MOBILE_WIDTH);g.elapsed=31_000;g.lastSpawn=30_000;
 advance(g,50,['falling'],1,'',MOBILE_WIDTH);
 const columns=[...new Set(g.shots.map(s=>s.x))].sort((a,b)=>a-b);
 assert.equal(columns.length,6);
 for(let i=1;i<columns.length;i++){
   assert.ok(columns[i]-columns[i-1]>2*(16+14),'each adjacent column needs a gap wider than the player collision diameter');
 }
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
 for(let i=0;i<20;i++){g.lastSpawn=g.elapsed;advance(g,50,['pulse'],1);}
 assert.equal(g.hp,startHealth-1,'a second hit should not land within the 1.25 second recovery window');
 g.shots.push({x:g.player.x,y:g.player.y,vx:0,vy:0,r:15,kind:'pulse',age:650,telegraph:650,dodged:false});
 for(let i=0;i<5;i++){g.lastSpawn=g.elapsed;advance(g,50,['pulse'],1);}
 assert.equal(g.hp,startHealth-2,'the player becomes vulnerable again after recovery');
});

test('trait attack families generate visibly different paths',()=>{
 const patterns=new Map();
 for(const family of ['pulse','falling','sweep','orbit']){
   const g=newGame();for(let i=0;i<23;i++)advance(g,50,[family],1);
   patterns.set(family,g.shots.map(s=>`${Math.round(s.x)},${Math.round(s.y)}:${Math.round(s.vx)},${Math.round(s.vy)}`).join('|'));
 }
 assert.equal(new Set(patterns.values()).size,4);
});

test('battle pressure ramps with time and token history',()=>{
 assert.equal(spawnCadence(0,1),1000);
 assert.equal(spawnCadence(16_000,1),890);
 assert.equal(spawnCadence(31_000,1),780);
 assert.equal(spawnCadence(31_000,12),480);
 assert.ok(spawnCadence(0,1)>spawnCadence(16_000,1));
 assert.ok(spawnCadence(16_000,1)>spawnCadence(31_000,1));
 assert.ok(spawnCadence(0,1)>spawnCadence(0,5));
 const early=newGame();for(let i=0;i<21;i++)advance(early,50,['falling'],1);
 const late=newGame();late.elapsed=31_000;late.lastSpawn=30_000;advance(late,50,['falling'],1);
 assert.ok(late.shots.length>early.shots.length);
});

test('first attack honors the real trait-derived family order',()=>{
 const g=newGame();for(let i=0;i<21;i++)advance(g,50,['orbit','pulse'],1);
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
 const launch=(family,signature)=>{const g=newGame();for(let i=0;i<21;i++)advance(g,50,[family],1,signature);return g;};
 const coin=launch('falling','coin-rain'),cell=launch('sweep','cell-bars'),rally=launch('orbit','rally-orbit');
 assert.equal(coin.lastMotif,'coin-rain');
 assert.equal(cell.lastMotif,'cell-bars');
 assert.equal(rally.lastMotif,'rally-orbit');
 assert.equal(coin.shots.length,5);
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
   const g=newGame();for(let i=0;i<21;i++)advance(g,50,[family],1,signature);
   assert.equal(g.lastMotif,signature);
   assert.ok(g.shots.length>0);
   shapes.add(g.shots.map(s=>`${Math.sign(s.vx)},${Math.sign(s.vy)},${Math.round(s.r)},${Math.round(s.age)}`).join('|'));
 }
 assert.equal(shapes.size,4);
 assert.ok(spawnCadence(0,1)<=1000,'a new boss should apply pressure from the opening phase');
});
