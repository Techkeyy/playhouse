import test from 'node:test';
import assert from 'node:assert/strict';
import {advance,auraHue,bossPose,drawGame,newGame,ROUND_MS,spawnCadence} from './game.ts';

test('surviving the full active round ends the game',()=>{
 const g=newGame();g.elapsed=ROUND_MS-40;g.lastSpawn=g.elapsed;
 advance(g,40,['pulse'],1);
 assert.equal(g.done,true);assert.equal(g.won,true);
});

test('collision removes health once during invulnerability',()=>{
 const g=newGame();g.shots.push({x:g.player.x,y:g.player.y,vx:0,vy:0,r:15,kind:'pulse',age:650,telegraph:650,dodged:false});
 advance(g,16,['pulse'],1);assert.equal(g.hp,2);
 advance(g,16,['pulse'],1);assert.equal(g.hp,2);
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
 assert.ok(spawnCadence(0,1)>spawnCadence(16_000,1));
 assert.ok(spawnCadence(16_000,1)>spawnCadence(31_000,1));
 assert.ok(spawnCadence(0,1)>spawnCadence(0,5));
 const early=newGame();for(let i=0;i<20;i++)advance(early,50,['falling'],1);
 const late=newGame();late.elapsed=31_000;late.lastSpawn=30_000;advance(late,50,['falling'],1);
 assert.ok(late.shots.length>early.shots.length);
});

test('first attack honors the real trait-derived family order',()=>{
 const g=newGame();for(let i=0;i<20;i++)advance(g,50,['orbit','pulse'],1);
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
