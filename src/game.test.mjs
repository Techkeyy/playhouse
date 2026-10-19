import test from 'node:test';
import assert from 'node:assert/strict';
import {advance,newGame,ROUND_MS} from './game.ts';

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
