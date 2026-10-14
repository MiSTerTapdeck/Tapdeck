import type {Game} from '../data/library';

type TateResponse={orientations?:Record<string,'cw'|'ccw'>};

function bridgeUrl(misterUrl:string){
 const url=new URL(misterUrl.includes('://')?misterUrl:`http://${misterUrl}`);
 return `http://${url.hostname}:8185/orientations`;
}

// This is deliberately called only while Tapdeck refreshes the library. The
// MiSTer bridge reads the MRA rotation field; list rendering never touches it.
export async function addTateMetadata(misterUrl:string,games:Game[]):Promise<Game[]>{
 const arcade=games.filter(game=>game.category==='Arcade'&&game.remoteFilePath);
 if(!arcade.length)return games;
 const controller=new AbortController();
 const timeout=setTimeout(()=>controller.abort(),12000);
 try{
  const response=await fetch(bridgeUrl(misterUrl),{signal:controller.signal});
  if(!response.ok)return games;
  const data=await response.json() as TateResponse;
  const orientations=data.orientations??{};
  return games.map(game=>{
   const tate=game.remoteFilePath?orientations[game.remoteFilePath.replace(/\\/g,'/')]:undefined;
   return tate?{...game,tate}:{...game,tate:undefined};
  });
 }catch{return games;}
 finally{clearTimeout(timeout);}
}
