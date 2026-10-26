import type {Game} from '../data/library';
import {normaliseMiSTerRemoteUrl} from './misterRemote.ts';

export type SaveState={slot:number;updatedAt:string};
const supported=new Set(['snes','mastersystem','sms','nes','gba','psx','gamegear','gameboy','gameboycolor','gbc','virtualboy']);
export function supportsSaveStates(game:Pick<Game,'remoteSystemId'|'remoteFilePath'>){return supported.has(game.remoteSystemId?.toLowerCase()??'')&&!!game.remoteFilePath&&!/\.(mgl|zip|7z)$/i.test(game.remoteFilePath);}
async function request(url:string,options:RequestInit={},timeout=4000){
 const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),timeout);
 try{return await fetch(url,{...options,signal:controller.signal});}finally{clearTimeout(timer);}
}
export async function readSaveStates(host:string,game:Game):Promise<SaveState[]>{
 if(!supportsSaveStates(game))return [];
 const url=new URL(normaliseMiSTerRemoteUrl(host));
 const response=await request(`http://${url.hostname}:8184/savestates`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({system:game.remoteSystemId,path:game.remoteFilePath})});
 if(response.status===404)throw new Error('Update Tapdeck Helper to detect save states. You can still launch normally.');
 if(!response.ok)throw new Error('Could not check save states. You can still launch normally.');
 const data=await response.json() as {states?:SaveState[]};
 if(!Array.isArray(data.states))throw new Error('The helper returned an invalid save-state response.');
 return data.states.filter(state=>Number.isInteger(state.slot)&&state.slot>=1&&state.slot<=4&&Number.isFinite(Date.parse(state.updatedAt))).sort((a,b)=>Date.parse(b.updatedAt)-Date.parse(a.updatedAt));
}
export function saveStateLabel(state:SaveState){const d=new Date(state.updatedAt);const pad=(n:number)=>String(n).padStart(2,'0');return `Load save — ${pad(d.getDate())}/${pad(d.getMonth()+1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())} · Slot ${state.slot}`;}
type Playing={system?:string;game?:string;gameName?:string};
const key=(value:string)=>value.toLowerCase().replace(/[^a-z0-9]/g,'');
export function playingMatchesSave(game:Game,path:string,playing:Playing){
 const expected=key(game.remoteSystemId??'');const actual=key(playing.system??'');
 const aliases:Record<string,string>={mastersystem:'sms',gameboycolor:'gbc'};
 const family=(id:string)=>aliases[id]??id;
 if(family(expected)!==family(actual))return false;
 const stem=(value:string)=>value.replace(/\\/g,'/').split('/').pop()?.replace(/\.[^.]+$/,'')??'';
 return stem(playing.game??'')===stem(path)||playing.gameName===stem(path);
}
// Remote reports the active game, not FPGA readiness. Require matching identity
// twice and a settling period; never send F1 blindly to the menu/another game.
export async function restoreSaveAfterLaunch(host:string,game:Game,path:string,slot:number,cancelled:()=>boolean,options:{wait?:(ms:number)=>Promise<void>;now?:()=>number;settleMs?:number;timeoutMs?:number}={}){
 if(!supportsSaveStates(game)||!Number.isInteger(slot)||slot<1||slot>4)throw new Error('Unsupported save-state request.');
 const wait=options.wait??(ms=>new Promise(resolve=>setTimeout(resolve,ms)));const now=options.now??Date.now;const start=now();let matches=0;
 const base=normaliseMiSTerRemoteUrl(host);
 while(now()-start<(options.timeoutMs??45000)){
  if(cancelled())return;
  await wait(500);if(cancelled())return;
  let playing:Playing;
  try{const response=await request(`${base}/games/playing`);if(!response.ok){matches=0;continue;}playing=await response.json();}catch{matches=0;continue;}
  matches=playingMatchesSave(game,path,playing)?matches+1:0;
  if(matches<2||now()-start<(options.settleMs??8000))continue;
  if(cancelled())return;
  // Slot 1 uses the command tested on device; F2–F4 use Remote's raw key API.
  const route=slot===1?'keyboard/load_state':`keyboard-raw/${58+slot}`;
  const response=await request(`${base}/controls/${route}`,{method:'POST'});
  if(!response.ok)throw new Error(`Game launched, but Remote could not send the load-state command (HTTP ${response.status}).`);
  return;
 }
 throw new Error('Game launched, but its identity could not be confirmed in time. Save state was not loaded.');
}

export type SaveStateIndex=Record<string,string[]>;
export function hasIndexedSave(game:Pick<Game,'remoteSystemId'|'remoteFilePath'>,index:SaveStateIndex){
 if(!supportsSaveStates(game))return false;
 const id=game.remoteSystemId!.toLowerCase();
 const folder:Record<string,string>={snes:'SNES',mastersystem:'SMS',sms:'SMS',nes:'NES',gba:'GBA',psx:'PSX',gamegear:'GameGear',gameboy:'GAMEBOY',gameboycolor:'GBC',gbc:'GBC',virtualboy:'VirtualBoy'};
 const stem=game.remoteFilePath!.replace(/\\/g,'/').split('/').pop()!.replace(/\.[^.]+$/,'');
 return index[folder[id]]?.includes(stem)??false;
}
export async function readSaveStateIndex(host:string):Promise<SaveStateIndex>{
 const url=new URL(normaliseMiSTerRemoteUrl(host));
 const response=await request(`http://${url.hostname}:8184/savestates/index`);
 if(!response.ok)throw new Error('Save index unavailable');
 const data=await response.json() as {systems?:SaveStateIndex};
 if(!data.systems||typeof data.systems!=='object'||Object.values(data.systems).some(names=>!Array.isArray(names)||names.some(name=>typeof name!=='string')))throw new Error('Invalid save index');
 return data.systems;
}
