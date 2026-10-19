export type Trait = {trait_type:string; value:string | number};
export type Chog = {
  tokenId:string; name:string; imageUrl:string; traits:Trait[]; owner:string;
  bossProfile:{title:string; attackFamilies:string[]; arenaTheme:string; evolutionHint:string; signature?:{id:string;family:string;name:string;source:string;description:string}};
  stats:{battles:number;wins:number;losses:number;bestScore:number;level:number};
};
export type BattleSummary = {id?:string;tokenId:string;score:number;survived:boolean;durationMs:number;hits:number;dodges:number;createdAt?:string};

async function request<T>(path:string, init?:RequestInit):Promise<T> {
  const response = await fetch(path, init);
  if(!response.ok) throw new Error(`Request failed (${response.status})`);
  return response.json() as Promise<T>;
}
export const getChogs = async ():Promise<Chog[]> => (await request<{chogs:Chog[]}>('/api/chogs?limit=12')).chogs;
export const getChog = (id:string) => request<{chog:Chog;history:BattleSummary[]}>(`/api/chogs/${encodeURIComponent(id)}`);
export const startBattle = (tokenId:string) => request<{battleSessionId:string;startedAt:number}>('/api/battles/start',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({tokenId})});
export const saveBattle = (battle:Omit<BattleSummary,'id'|'createdAt'> & {battleSessionId:string}) => request<{battle:BattleSummary;chog:Chog}>('/api/battles',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(battle)});
