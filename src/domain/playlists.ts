export type Playlist={id:string;title:string;gameIds:string[];createdAt:number;playedAt?:Record<string,number>;seedGameId?:string};

// Storage is treated as untrusted: a removed game or a malformed old entry should
// never stop the binder from opening.
export function parsePlaylists(raw:string|null,validIds?:string[]):Playlist[]{
 try{
  const data=JSON.parse(raw??'[]');
  if(!Array.isArray(data))return [];
  const seen=new Set<string>();
  return data.flatMap((entry):Playlist[]=>{
   if(!entry||typeof entry!=='object')return [];
   const item=entry as {id?:unknown;title?:unknown;gameIds?:unknown;createdAt?:unknown;playedAt?:unknown;seedGameId?:unknown};
   if(typeof item.id!=='string'||typeof item.title!=='string'||seen.has(item.id))return [];
   const title=item.title.trim();if(!title)return [];
   seen.add(item.id);
   const ids:string[]=Array.isArray(item.gameIds)?[...new Set(item.gameIds.filter((id:unknown):id is string=>typeof id==='string'&&(!validIds||validIds.includes(id))))]:[];
   const playedAt:Record<string,number>={};if(item.playedAt&&typeof item.playedAt==='object')for(const [id,time] of Object.entries(item.playedAt)){if(ids.includes(id)&&typeof time==='number'&&Number.isFinite(time))playedAt[id]=time;}
   return [{id:item.id,title,gameIds:ids,createdAt:typeof item.createdAt==='number'?item.createdAt:0,...(Object.keys(playedAt).length?{playedAt}:{}),...(typeof item.seedGameId==='string'&&(!validIds||validIds.includes(item.seedGameId))?{seedGameId:item.seedGameId}:{})}];
  });
 }catch{return [];}
}

export function reorderIds(ids:string[],from:number,to:number):string[]{
 if(from<0||to<0||from>=ids.length||to>=ids.length||from===to)return ids;
 const next=[...ids];const [moved]=next.splice(from,1);next.splice(to,0,moved);return next;
}
