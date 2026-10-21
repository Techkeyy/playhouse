import {useCallback,useEffect,useRef,useState} from 'react';
import {getChog,getChogs,saveBattle,startBattle,type BattleSummary,type Chog} from './api';
import {advance,drawGame,HEIGHT,MOBILE_WIDTH,newGame,ROUND_MS,STARTING_HEALTH,WIDTH,type GameState} from './game';
import OwnerControls from './OwnerControls';
import {playhouseAudio} from './audio';
import {ArrowIcon,AttackDiagram,BrandGlyph,ScrollProgressGraphic,SoundIcon} from './PlayhouseVisuals';

type Stage='landing'|'select'|'playing'|'result';
const short=(address:string)=>address?`${address.slice(0,6)}...${address.slice(-4)}`:'Unknown owner';
const round=(n:number)=>Math.floor(n).toLocaleString();

function Arena({chog,onFinish,onStarted}:{chog:Chog;onFinish:(g:GameState)=>void;onStarted:()=>void}){
 const worldWidth=useRef(window.matchMedia('(max-width: 720px) and (orientation: portrait)').matches?MOBILE_WIDTH:WIDTH).current;
 const canvas=useRef<HTMLCanvasElement>(null);const state=useRef(newGame(worldWidth));const image=useRef<HTMLImageElement|null>(null);const keys=useRef(new Set<string>());const callback=useRef(onFinish);const audioCount=useRef({waves:0,dodges:0,hits:0});const touchStart=useRef<{id:number;x:number;y:number;playerX:number;playerY:number}|null>(null);
 const [hud,setHud]=useState({time:45,hp:STARTING_HEALTH,score:0,dodges:0});
 const [started,setStarted]=useState(false);
 const [arenaSound,setArenaSound]=useState(playhouseAudio.getSettings());
 useEffect(()=>playhouseAudio.subscribe(setArenaSound),[]);
 useEffect(()=>{callback.current=onFinish},[onFinish]);
 useEffect(()=>{const im=new Image();im.onload=()=>{const ctx=canvas.current?.getContext('2d');if(ctx&&!state.current.elapsed)drawGame(ctx,state.current,im,chog.bossProfile.arenaTheme,String(chog.traits.find(t=>t.trait_type.toLowerCase()==='aura')?.value||''),true,chog.bossProfile.signature?.id);};im.src=chog.imageUrl;image.current=im;},[chog.imageUrl]);
 useEffect(()=>{
   if(!started){const ctx=canvas.current?.getContext('2d');if(ctx)drawGame(ctx,state.current,image.current,chog.bossProfile.arenaTheme,String(chog.traits.find(t=>t.trait_type.toLowerCase()==='aura')?.value||''),true,chog.bossProfile.signature?.id);return;}
   const down=(e:KeyboardEvent)=>{if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key))e.preventDefault();keys.current.add(e.key.toLowerCase());};
   const up=(e:KeyboardEvent)=>keys.current.delete(e.key.toLowerCase());window.addEventListener('keydown',down);window.addEventListener('keyup',up);
   const blur=()=>{keys.current.clear();state.current.target=null;};window.addEventListener('blur',blur);
   let raf=0,last=performance.now(),lastHud=0;const ctx=canvas.current!.getContext('2d')!;
   const tick=(now:number)=>{const dt=now-last;last=now;const g=state.current;const held=keys.current;
     g.move.x=Number(held.has('arrowright')||held.has('d'))-Number(held.has('arrowleft')||held.has('a'));
     g.move.y=Number(held.has('arrowdown')||held.has('s'))-Number(held.has('arrowup')||held.has('w'));
     if(g.move.x||g.move.y)g.target=null;
     advance(g,dt,chog.bossProfile.attackFamilies,chog.stats.level,chog.bossProfile.signature?.id,worldWidth);drawGame(ctx,g,image.current,chog.bossProfile.arenaTheme,String(chog.traits.find(t=>t.trait_type.toLowerCase()==='aura')?.value||''),window.matchMedia('(prefers-reduced-motion: reduce)').matches,chog.bossProfile.signature?.id);
     if(g.waves>audioCount.current.waves)playhouseAudio.attack(g.lastFamily);
     if(g.dodges>audioCount.current.dodges)playhouseAudio.dodge();
     if(g.hits>audioCount.current.hits)playhouseAudio.hit();
     audioCount.current={waves:g.waves,dodges:g.dodges,hits:g.hits};
     if(now-lastHud>100){lastHud=now;setHud({time:Math.max(0,Math.ceil((ROUND_MS-g.elapsed)/1000)),hp:g.hp,score:g.score,dodges:g.dodges});}
     if(g.done){playhouseAudio.stopAmbient();g.won?playhouseAudio.win():playhouseAudio.lose();callback.current({...g});return;}raf=requestAnimationFrame(tick);
   };raf=requestAnimationFrame(tick);
   return()=>{cancelAnimationFrame(raf);playhouseAudio.stopAmbient();window.removeEventListener('keydown',down);window.removeEventListener('keyup',up);window.removeEventListener('blur',blur);keys.current.clear();};
 },[started,chog.tokenId,chog.bossProfile.attackFamilies,chog.bossProfile.signature?.id,chog.stats.level]);
 const startRound=()=>{void playhouseAudio.unlock();playhouseAudio.startAmbient();onStarted();setStarted(true);if(worldWidth===WIDTH)requestAnimationFrame(()=>canvas.current?.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'center'}));};
 const pointer=(e:React.PointerEvent<HTMLCanvasElement>)=>{const rect=e.currentTarget.getBoundingClientRect();if(e.pointerType==='touch'){
   if(e.type==='pointerdown')touchStart.current={id:e.pointerId,x:e.clientX,y:e.clientY,playerX:state.current.player.x,playerY:state.current.player.y};
   const start=touchStart.current;if(start?.id!==e.pointerId)return;
   state.current.target={x:Math.max(22,Math.min(worldWidth-22,start.playerX+(e.clientX-start.x)/rect.width*worldWidth)),y:Math.max(215,Math.min(HEIGHT-22,start.playerY+(e.clientY-start.y)/rect.height*HEIGHT))};
 }else state.current.target={x:(e.clientX-rect.left)/rect.width*worldWidth,y:(e.clientY-rect.top)/rect.height*HEIGHT};};
 const releasePointer=(e:React.PointerEvent<HTMLCanvasElement>)=>{if(touchStart.current?.id===e.pointerId)touchStart.current=null;state.current.target=null;};
 const holdDirection=(key:string)=>(e:React.PointerEvent<HTMLButtonElement>)=>{e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);keys.current.add(key);state.current.target=null;};
 const releaseDirection=(key:string)=>(e:React.PointerEvent<HTMLButtonElement>)=>{e.preventDefault();keys.current.delete(key);};
 return <section className={`fight${started?' is-active':''}${worldWidth===MOBILE_WIDTH?' mobile-play':''}`} aria-label={`Fight ${chog.name}`}>
   <div className="fight-head"><div><span className="eyebrow">LIVE ROUND</span><h2>{chog.name}</h2><p>{chog.bossProfile.title} · {chog.bossProfile.arenaTheme} arena</p></div><div className="hud"><span><b>{hud.time}</b> SEC</span><span><b>{'♥'.repeat(Math.max(0,hud.hp))}{'♡'.repeat(STARTING_HEALTH-Math.max(0,hud.hp))}</b> HEALTH</span><span><b>{round(hud.score)}</b> SCORE</span></div></div>
   <div className="fight-guide" aria-label="How to play"><span><strong>Move:</strong> arrows or WASD</span><span><strong>Touch:</strong> drag in the arena</span><span><strong>Dodge:</strong> warning shapes show where attacks will land</span><span><strong>Goal:</strong> survive 45 seconds; every 10 near dodges restore one heart</span></div>
   {!started&&<div className="fight-ready" role="status"><p>Ready to face {chog.name}? Move into the open space after each warning. Your 45 seconds begin when you press Start.</p><button type="button" className="primary" onClick={startRound}>Start 45-second round →</button></div>}
   <canvas ref={canvas} width={worldWidth} height={HEIGHT} onPointerDown={e=>{if(!started)return;e.currentTarget.setPointerCapture(e.pointerId);pointer(e);}} onPointerMove={e=>{if(started&&(e.buttons||touchStart.current?.id===e.pointerId))pointer(e);}} onPointerUp={releasePointer} onPointerCancel={releasePointer} aria-label="Battle arena. Use arrow keys, WASD, or drag to dodge incoming attacks."/>
   {started&&<div className="touch-controls" aria-label="Touch movement controls"><div className="touch-controls-head"><span>Hold to move</span><button type="button" className="fight-sound" onClick={()=>playhouseAudio.toggleMuted()} aria-label={arenaSound.muted?'Unmute sound':'Mute sound'}><SoundIcon muted={arenaSound.muted} size={17}/>{arenaSound.muted?'Sound off':'Sound on'}</button></div><div className="touch-directions">{([['←','arrowleft','Move left'],['↑','arrowup','Move up'],['↓','arrowdown','Move down'],['→','arrowright','Move right']] as const).map(([symbol,key,label])=><button type="button" key={key} aria-label={label} onPointerDown={holdDirection(key)} onPointerUp={releaseDirection(key)} onPointerCancel={releaseDirection(key)} onLostPointerCapture={releaseDirection(key)}>{symbol}</button>)}</div></div>}
   <div className="arena-foot"><span>Survive 45 seconds. Follow the warning lines, then dodge the attacks. Every 10 near dodges restore one heart. On a phone, drag in the arena or hold the movement buttons below.</span><span>Near dodges: {hud.dodges}</span></div>
 </section>;
}
export default function App(){
 const [roster,setRoster]=useState<Chog[]>([]),[selected,setSelected]=useState<Chog|null>(null),[history,setHistory]=useState<BattleSummary[]>([]),[lookupId,setLookupId]=useState(''),[lookupBusy,setLookupBusy]=useState(false),[lookupError,setLookupError]=useState('');
 const [stage,setStage]=useState<Stage>('landing'),[loading,setLoading]=useState(true),[error,setError]=useState(''),[detailLoading,setDetailLoading]=useState(false),[starting,setStarting]=useState(false),[battleSessionId,setBattleSessionId]=useState(''),[result,setResult]=useState<GameState|null>(null),[saveState,setSaveState]=useState<'idle'|'saving'|'saved'|'error'>('idle');
 const [sound,setSound]=useState(playhouseAudio.getSettings());
 const [roundActive,setRoundActive]=useState(false);
 const [featuredIndex,setFeaturedIndex]=useState(0);
 const [featuredImageFailed,setFeaturedImageFailed]=useState(false);
 const [scrollProgress,setScrollProgress]=useState(0);
 useEffect(()=>playhouseAudio.subscribe(setSound),[]);
 const loadRoster=useCallback(async()=>{setLoading(true);setError('');try{const list=await getChogs();setRoster(list);if(!list.length)setError('No Chogs are available yet. Try again soon.');}catch{setError('Could not load real Chog NFTs. Check your connection and try again.');}finally{setLoading(false);}},[]);
 useEffect(()=>{void loadRoster()},[loadRoster]);
  useEffect(()=>{
    const update=()=>{const available=document.documentElement.scrollHeight-window.innerHeight;setScrollProgress(available>0?Math.min(1,window.scrollY/available):0);};
    update();window.addEventListener('scroll',update,{passive:true});window.addEventListener('resize',update);
    return()=>{window.removeEventListener('scroll',update);window.removeEventListener('resize',update);};
  },[stage]);
  useEffect(()=>{
    const sections=document.querySelectorAll<HTMLElement>('[data-reveal]');
    if(window.matchMedia('(prefers-reduced-motion: reduce)').matches||!('IntersectionObserver' in window))return;
    const observer=new IntersectionObserver(entries=>{for(const entry of entries){if(entry.isIntersecting){entry.target.classList.add('is-visible');observer.unobserve(entry.target);}}},{rootMargin:'0px 0px -40px 0px',threshold:.04});
    sections.forEach(section=>{section.classList.add('reveal-ready');observer.observe(section);});
    return()=>{observer.disconnect();sections.forEach(section=>section.classList.remove('reveal-ready'));};
  },[stage,selected?.tokenId,roster.length]);
  useEffect(()=>{const onHash=()=>{if(window.location.hash==='#arcade')setStage(current=>current==='playing'||current==='result'?current:'select');else if(window.location.hash==='#home')setStage(current=>current==='playing'||current==='result'?current:'landing');};onHash();window.addEventListener('hashchange',onHash);return()=>window.removeEventListener('hashchange',onHash);},[]);
 const revealProfile=()=>requestAnimationFrame(()=>{const profile=document.getElementById('boss-profile');profile?.focus({preventScroll:true});profile?.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});});
 const select=async(chog:Chog)=>{setSelected(chog);setDetailLoading(true);setHistory([]);setError('');try{const detail=await getChog(chog.tokenId);setSelected(detail.chog);setHistory(detail.history);revealProfile();}catch{setError('This Chog could not load its battle record. You can still try another Chog.');setSelected(null);}finally{setDetailLoading(false);}};
 const lookup=async(e:React.FormEvent)=>{e.preventDefault();setLookupError('');const id=lookupId.trim();if(!/^\d{1,6}$/.test(id)||BigInt(id)<1n){setLookupError('Enter a valid on-chain token ID. This is different from the number in the Chog name.');return;}setLookupBusy(true);try{const detail=await getChog(id);setSelected(detail.chog);setHistory(detail.history);setRoster(current=>current.some(c=>c.tokenId===detail.chog.tokenId)?current:[detail.chog,...current]);revealProfile();}catch{setLookupError('That token could not be loaded from the Chog collection. Check its on-chain token ID and try again.');}finally{setLookupBusy(false);}};
  const begin=async()=>{if(!selected)return;setStarting(true);setError('');try{const session=await startBattle(selected.tokenId);setBattleSessionId(session.battleSessionId);setResult(null);setSaveState('idle');setRoundActive(false);setStage('playing');window.scrollTo({top:0,behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});}catch{setError('Could not start a recorded fight. Try again in a moment.');}finally{setStarting(false);}};
 const finish=useCallback(async(g:GameState)=>{setResult(g);setRoundActive(false);setStage('result');if(!selected||!battleSessionId)return;setSaveState('saving');try{const saved=await saveBattle({battleSessionId,tokenId:selected.tokenId,score:g.score,survived:g.won,durationMs:Math.round(g.elapsed),hits:g.hits,dodges:g.dodges});setSelected(saved.chog);setHistory(h=>[saved.battle,...h].slice(0,8));setSaveState('saved');playhouseAudio.result();}catch{setSaveState('error');}},[selected,battleSessionId]);
 const retrySave=async()=>{if(!selected||!result||!battleSessionId)return;setSaveState('saving');try{const saved=await saveBattle({battleSessionId,tokenId:selected.tokenId,score:result.score,survived:result.won,durationMs:Math.round(result.elapsed),hits:result.hits,dodges:result.dodges});setSelected(saved.chog);setHistory(h=>[saved.battle,...h].slice(0,8));setSaveState('saved');playhouseAudio.result();}catch{setSaveState('error');}};
  const openLineup=()=>{setStage('select');if(window.location.hash!=='#arcade')window.history.replaceState(null,'','#arcade');window.scrollTo({top:0,behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});};
  const goHome=()=>{setStage('landing');if(window.location.hash!=='#home')window.history.replaceState(null,'','#home');window.scrollTo({top:0,behavior:'auto'});};
 const toggleSound=async()=>{if(!sound.unlocked){await playhouseAudio.unlock();if(sound.muted)playhouseAudio.setMuted(false);return;}playhouseAudio.toggleMuted();};
  const featured=roster.length?roster[featuredIndex%roster.length]:null;
  useEffect(()=>setFeaturedImageFailed(false),[featured?.tokenId]);
  return <main id="main-content" className={'app-shell stage-'+stage}>
    <div className="scroll-progress" aria-hidden="true"><span style={{transform:'scaleX('+scrollProgress+')'}}/></div>
    <header className="site-head">
      <button type="button" className="brand brand-button" onClick={goHome} disabled={roundActive} aria-label={roundActive?'Playhouse home unavailable during a live round':'Playhouse home'}><img src="/playhouse-mark.svg" width="34" height="34" alt=""/><span>PLAYHOUSE<span className="brand-dot">.</span></span></button>
      <nav className="site-nav" aria-label="Main navigation">
        <button type="button" className="sound-toggle" onClick={()=>void toggleSound()} aria-label={sound.unlocked&&!sound.muted?'Mute sound':'Enable sound'} aria-pressed={sound.unlocked&&!sound.muted}><SoundIcon muted={!sound.unlocked||sound.muted} size={20}/><span>{sound.unlocked&&!sound.muted?'Sound on':'Sound off'}</span></button>
        <button type="button" className="nav-play" onClick={openLineup} disabled={roundActive}>{roundActive?'Round active':'Enter arcade'} <ArrowIcon size={17}/></button>
      </nav>
    </header>
    {stage==='landing'&&<>
      <section className="landing-hero" aria-labelledby="hero-title">
        <div className="hero-index"><span className="chapter-tag">Welcome to Playhouse</span><span>CHOG GENESIS × MONAD</span></div>
        <div className="landing-copy">
          <div className="hero-copy-block"><span className="eyebrow">REAL NFT. REAL BOSS.</span><h1 id="hero-title">THE NFT<br/><em>FIGHTS BACK.</em></h1><p>Pick a Chog. Read its trait-powered attacks. Survive 45 seconds and change its battle history.</p>
          <div className="landing-actions"><button type="button" className="primary" onClick={openLineup}>Enter the arcade <ArrowIcon size={21}/></button><a className="text-link" href="#how-it-works">See how it works <ArrowIcon direction="down" size={18}/></a></div></div>
          <div className="hero-proof"><span>NO WALLET TO PLAY</span><span>45 SECOND ROUNDS</span><span>ONCHAIN CHOGS</span></div>
        </div>
        <div className="landing-feature" aria-label="Featured real Chog NFT">
          <div className="hero-art-label"><span>MEET YOUR OPPONENT</span><span>{featured?'TOKEN '+featured.tokenId:'LOADING'}</span></div>
          <div className="hero-art-frame">{featured&&!featuredImageFailed?<img src={featured.imageUrl} alt={featured.name+' NFT artwork'} onError={()=>setFeaturedImageFailed(true)}/>:<span className="art-loading" role="status">{featured?'Artwork unavailable for '+featured.name:loading?'Finding a Chog...':'Chog artwork unavailable'}</span>}<span className="hero-art-crosshair" aria-hidden="true">+</span></div>
          <div className="feature-caption"><div><strong>{featured?.name||'A Chog is coming'}</strong><span>{featured?.bossProfile.signature?.name||'Trait-built boss'}</span></div><div className="feature-switch"><button type="button" onClick={()=>setFeaturedIndex(i=>i+roster.length-1)} disabled={roster.length<2} aria-label="Previous featured Chog"><ArrowIcon direction="left" size={18}/></button><button type="button" onClick={()=>setFeaturedIndex(i=>i+1)} disabled={roster.length<2} aria-label="Next featured Chog"><ArrowIcon size={18}/></button></div></div>
        </div>
        <div className="hero-side-note" aria-hidden="true">SCROLL TO MEET THE CHOGS ↓</div>
      </section>
      <section className="concept-strip" aria-label="What makes Playhouse different"><span>NOT JUST ART</span><BrandGlyph size={26}/><strong>THE CHOG IS THE CHALLENGE.</strong><BrandGlyph size={26}/><span>EVERY FIGHT COUNTS</span></section>
      <section className="landing-how" id="how-it-works" data-reveal>
        <div className="section-kicker"><span className="chapter-tag">How the game goes</span><span>PLAY IN UNDER A MINUTE</span></div>
        <div className="how-layout"><div className="how-statement"><h2>CHOOSE.<br/>DODGE.<br/><em>RETURN.</em></h2><p>Every Chog is a real token with its own look, traits, owner, and growing record.</p><button type="button" className="inline-action" onClick={openLineup}>Find your boss <ArrowIcon size={20}/></button></div><ol className="how-steps"><li><span>01</span><div><h3>Pick a real Chog</h3><p>Browse the lineup or enter any Chog Genesis token ID. See its NFT art and signature attack before you play.</p></div><ArrowIcon size={18}/></li><li><span>02</span><div><h3>Read the warning</h3><p>Move with arrow keys, WASD, or touch. Attack shapes show where the danger will land.</p></div><ArrowIcon size={18}/></li><li><span>03</span><div><h3>Leave a mark</h3><p>Survive the round, set a score, and add your attempt to this token's permanent battle story.</p></div><ArrowIcon size={18}/></li></ol></div>
      </section>
      <section className="landing-proof" data-reveal>
        <div className="section-kicker"><span className="chapter-tag">The Chog makes the rules</span><span>TRAIT → ATTACK → HISTORY</span></div>
        <div className="proof-layout"><div className="proof-graphic"><AttackDiagram signatureId={featured?.bossProfile.signature?.id} family={featured?.bossProfile.signature?.family}/><span>TRAITS BECOME PATTERNS</span></div><div className="proof-copy"><h2>THE ART HAS<br/><em>TEETH.</em></h2><p>A Chog's real traits determine its signature move. Its onchain token ID carries its battle record. Whoever owns it can tune the next opening attack.</p><p className="proof-note">Anyone can fight. Only the holder can command the boss.</p><button type="button" className="primary" onClick={openLineup}>Choose a Chog <ArrowIcon size={20}/></button></div></div>
      </section>
    </>}
    {stage==='select'&&<>
      <section className="app-intro"><div className="section-kicker"><span className="chapter-tag">Step into the arcade</span><button type="button" className="back-link" onClick={goHome}><ArrowIcon direction="left" size={17}/> About Playhouse</button></div><div className="app-intro-main"><div><span className="eyebrow">YOUR NEXT OPPONENT</span><h1>CHOOSE A<br/><em>CHOG.</em></h1></div><p>Every boss below is a real Genesis NFT. Pick one, inspect its signature attack, then step into the arena. No wallet needed.</p></div></section>
      <section className="roster-section" data-reveal><div className="section-kicker"><span>THE LINEUP</span><span>{roster.length?roster.length+' CHOGS READY':'FETCHING REAL TOKENS'}</span></div>
        <div className="roster-topline"><h2>WHO WILL YOU FACE?</h2><p>Choose a featured boss or look up your own token.</p></div>
        <form className="token-lookup" onSubmit={e=>void lookup(e)}><label htmlFor="token-id">Know a Chog token ID?</label><div className="lookup-row"><input id="token-id" inputMode="numeric" pattern="[0-9]*" placeholder="e.g. 330" value={lookupId} onChange={e=>setLookupId(e.target.value)} /><button className="secondary" type="submit" disabled={lookupBusy}>{lookupBusy?'Searching...':'Find Chog'} <ArrowIcon size={17}/></button></div><small>The NFT name number may differ from its onchain token ID.</small>{lookupError&&<p className="owner-error" role="alert">{lookupError}</p>}</form>
        {loading&&<div className="notice" role="status">Loading genuine Chog NFTs from Monad...</div>}
        {!loading&&error&&<div className="notice error" role="alert">{error}<button type="button" onClick={()=>void loadRoster()}>Try again</button></div>}
        {!loading&&roster.length>0&&<div className="roster">{roster.map((chog,i)=><button type="button" key={chog.tokenId} className={'chog-card '+(selected?.tokenId===chog.tokenId?'active':'')} onClick={()=>void select(chog)} aria-pressed={selected?.tokenId===chog.tokenId}><span className="card-top"><span>CHALLENGER / {String(i+1).padStart(2,'0')}</span><ArrowIcon size={19}/></span><span className="card-image"><img src={chog.imageUrl} alt={chog.name+' NFT artwork'} loading="lazy" onError={e=>{e.currentTarget.style.visibility='hidden';}}/></span><span className="card-body"><small>TOKEN {chog.tokenId} / LEVEL {chog.stats.level}</small><strong>{chog.name}</strong><span>{chog.bossProfile.signature?.name||chog.bossProfile.title}</span></span></button>)}</div>}
      </section>
      {detailLoading&&<p className="profile-loading" role="status">Loading live traits, owner, and battle record...</p>}{selected&&<><section id="boss-profile" className="boss-detail" tabIndex={-1} data-reveal><div className="detail-art"><div className="detail-art-top"><span>SELECTED BOSS / TOKEN {selected.tokenId}</span><BrandGlyph size={28}/></div><img src={selected.imageUrl} alt={selected.name+' NFT artwork'}/><div className="detail-art-bottom">LEVEL {selected.stats.level} <span>CHOG GENESIS</span></div></div><div className="detail-copy"><div className="section-kicker"><span>FACE THE BOSS</span><span>#{selected.tokenId}</span></div><h2>{selected.name}</h2><p className="boss-title">{selected.bossProfile.title}</p><p className="detail-hint">{selected.bossProfile.evolutionHint}</p>{selected.bossProfile.signature&&<div className="signature-preview"><div className="signature-art"><AttackDiagram signatureId={selected.bossProfile.signature.id} family={selected.bossProfile.signature.family}/></div><div><span className="eyebrow">SIGNATURE ATTACK</span><h3>{selected.bossProfile.signature.name}</h3><p>{selected.bossProfile.signature.description}</p><small>FROM {selected.bossProfile.signature.source}</small></div></div>}<div className="stat-row"><div><b>{selected.stats.battles}</b><span>BATTLES</span></div><div><b>{selected.stats.wins}</b><span>SURVIVORS</span></div><div><b>{round(selected.stats.bestScore)}</b><span>BEST SCORE</span></div></div><div className="trait-list">{selected.traits.slice(0,6).map((trait,i)=><span key={trait.trait_type+'-'+i}><small>{trait.trait_type}</small>{trait.value}</span>)}</div><p className="owner-line">Owned by <span title={selected.owner}>{short(selected.owner)}</span> <a href={'https://opensea.io/assets/monad/0xc96d31f8626c6d03fae5dcd3d61e3fb9f4a73763/'+selected.tokenId} target="_blank" rel="noreferrer">View token <ArrowIcon size={14}/></a></p><button className="primary" disabled={detailLoading||starting} onClick={()=>void begin()}>{starting?'Preparing fight...':'Fight this Chog'} <ArrowIcon size={20}/></button>{error&&<p className="owner-error" role="alert">{error}</p>}</div></section><OwnerControls key={selected.tokenId} chog={selected} onUpdate={setSelected}/></>}
    </>}
    {stage==='playing'&&selected&&<Arena key={selected.tokenId+'-'+selected.stats.battles} chog={selected} onFinish={finish} onStarted={()=>setRoundActive(true)}/>}
    {stage==='result'&&selected&&result&&<section className="results" data-reveal><div className="section-kicker"><span>ROUND COMPLETE</span><span>{selected.name.toUpperCase()}</span></div><div className="result-layout"><div className="result-verdict"><span className="eyebrow">{result.won?'YOU SURVIVED':'TRY AGAIN'}</span><h1>{result.won?'YOU MADE IT.':'THE BOSS WON.'}</h1><p>{result.won?'You lasted the full 45 seconds. See the save status beside your score to confirm its place in this Chog’s history.':'You have seen its pattern. Face the same Chog again and beat your score.'}</p><div className="result-actions"><button className="primary" onClick={()=>void begin()} disabled={starting}>{starting?'Preparing fight...':'Rematch this Chog'} <ArrowIcon size={20}/></button><button className="secondary" onClick={()=>{setSelected(null);openLineup();}}>Choose another <ArrowIcon size={18}/></button></div></div><div className="result-tally"><span>YOUR SCORE</span><strong>{round(result.score)}</strong><div className="result-facts"><span>{Math.min(45,Math.round(result.elapsed/1000))} sec survived</span><span>{result.dodges} near dodges</span><span>{result.hits} hits</span></div><div className="save-status" role="status">{saveState==='saving'?'Saving this battle to the Chog record...':saveState==='saved'?'Battle saved to this Chog’s history.':saveState==='error'?<>Your round ended, but its record could not be saved. <button onClick={()=>void retrySave()}>Retry save</button></>:''}</div>{error&&<p className="owner-error" role="alert">{error}</p>}</div></div></section>}
    {selected&&(stage==='select'||stage==='result')&&history.length>0&&<section className="history" data-reveal><div className="section-kicker"><span>BOSS MEMORY</span><span>TOKEN {selected.tokenId}</span></div><div className="history-heading"><h2>EVERY FIGHT<br/>LEAVES A MARK.</h2><p>This record stays with token {selected.tokenId}, even when its owner changes.</p></div><div className="history-list">{history.slice(0,5).map((battle,i)=><div key={battle.id||i}><span className={battle.survived?'won':'lost'}>{battle.survived?'SURVIVED':'FELL'}</span><b>{round(battle.score)} pts</b><small>{Math.round(battle.durationMs/1000)} sec · {battle.dodges} near dodges</small></div>)}</div></section>}
    <footer><div className="footer-brand"><BrandGlyph size={34}/><strong>PLAYHOUSE.</strong></div><span>CHOG GENESIS / MONAD MAINNET</span><a href="https://chogathon.chog.xyz/" target="_blank" rel="noreferrer">CHOGATHON 2026 <ArrowIcon size={15}/></a></footer>
    <ScrollProgressGraphic progress={scrollProgress} className="scroll-glyph"/>
  </main>;
}
