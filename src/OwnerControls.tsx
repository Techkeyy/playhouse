import {useState} from 'react';
import type {Chog} from './api';

type Wallet={request:(args:{method:string;params?:unknown[]})=>Promise<unknown>};
declare global{interface Window{ethereum?:Wallet}}
async function post<T>(path:string,body:object,token?:string):Promise<T>{
 const res=await fetch(path,{method:'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},body:JSON.stringify(body)});
 if(!res.ok)throw new Error((await res.json().catch(()=>({error:''}))).error||'Request failed');return res.json();
}
export default function OwnerControls({chog,onUpdate}:{chog:Chog;onUpdate:(chog:Chog)=>void}){
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[session,setSession]=useState(''),[attack,setAttack]=useState(chog.bossProfile.attackFamilies[0]||''),[saved,setSaved]=useState(false);
 const connect=async()=>{setBusy(true);setError('');setSaved(false);try{
   const wallet=window.ethereum;if(!wallet)throw new Error('A browser wallet is needed for owner controls. Install one, then return here.');
   const addresses=await wallet.request({method:'eth_requestAccounts'}) as string[];const address=addresses[0];if(!address)throw new Error('No wallet account was selected.');
   if(address.toLowerCase()!==chog.owner.toLowerCase())throw new Error('This wallet does not own this Chog. You can still play against it.');
   const chain=await wallet.request({method:'eth_chainId'}) as string;if(chain!=='0x8f'){
     try{await wallet.request({method:'wallet_switchEthereumChain',params:[{chainId:'0x8f'}]});}catch{throw new Error('Switch your wallet to Monad mainnet to use owner controls.');}
   }
   const challenge=await post<{nonce:string;message:string}>('/api/auth/challenge',{address,tokenId:chog.tokenId});
   const signature=await wallet.request({method:'personal_sign',params:[challenge.message,address]}) as string;
   const verified=await post<{token:string}>('/api/auth/verify',{nonce:challenge.nonce,signature});setSession(verified.token);
 }catch(e){setError(e instanceof Error?e.message:'Could not verify ownership. Please try again.');}finally{setBusy(false);}};
 const save=async()=>{if(!session)return;setBusy(true);setError('');setSaved(false);try{const result=await post<{chog:Chog}>(`/api/chogs/${encodeURIComponent(chog.tokenId)}/settings`,{preferredAttack:attack},session);onUpdate(result.chog);setSaved(true);}catch(e){setError(e instanceof Error?e.message:'Could not save the attack preference.');setSession('');}finally{setBusy(false);}};
 return <section className="owner-controls" aria-labelledby="owner-controls-title"><div><span className="eyebrow">HOLDER CONTROL / TOKEN {chog.tokenId}</span><h3 id="owner-controls-title">COMMAND YOUR BOSS.</h3><p>Own this Chog? Verify your wallet to choose its opening attack. Ownership and control follow the NFT when it changes hands.</p></div>
 {!session?<button className="secondary" onClick={()=>void connect()} disabled={busy}>{busy?'Checking ownership...':'Verify owner wallet'}</button>:<div className="owner-edit"><label htmlFor="preferred-attack">First attack pattern</label><select id="preferred-attack" value={attack} onChange={e=>{setAttack(e.target.value);setSaved(false);}}>{chog.bossProfile.attackFamilies.map(f=><option key={f} value={f}>{f[0].toUpperCase()+f.slice(1)}</option>)}</select><button className="secondary" onClick={()=>void save()} disabled={busy}>{busy?'Saving...':'Save attack choice'}</button></div>}
 {saved&&<p className="owner-success" role="status">Saved. Your chosen pattern will lead this Chog's next fight.</p>}{error&&<p className="owner-error" role="alert">{error}</p>}
 </section>;
}
