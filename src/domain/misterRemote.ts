import type {Game} from '../data/library';
export function normaliseMiSTerRemoteUrl(value:string){const raw=value.trim().replace(/\/+$/,'');if(!raw)throw new Error('Enter your MiSTer address.');const candidate=/^https?:\/\//i.test(raw)?raw:`http://${raw}`;const parsed=new URL(candidate);if(!parsed.hostname)throw new Error('Enter a valid MiSTer address.');return `http://${parsed.hostname}:8182/api`;}
function normaliseAmigaVisionBridgeUrl(value:string){const raw=value.trim().replace(/\/+$/,'');if(!raw)throw new Error('Enter your MiSTer address.');const candidate=/^https?:\/\//i.test(raw)?raw:`http://${raw}`;const parsed=new URL(candidate);if(!parsed.hostname)throw new Error('Enter a valid MiSTer address.');return `http://${parsed.hostname}:8183/launch`;}
export async function returnMiSTerToMenu(value:string){const response=await fetch(`${normaliseMiSTerRemoteUrl(value)}/launch/menu`,{method:'POST'});if(!response.ok)throw new Error(`MiSTer Remote could not return to its menu (HTTP ${response.status}).`);}
const systemKey=(value?:string)=>value?.toLowerCase().replace(/[^a-z0-9]+/g,'')??'';
type LaunchGame=Pick<Game,'title'|'system'|'remoteFilePath'|'remoteSystemId'>;
/** CD32Vision titles are launched by their SD-card MGLs, not by Remote's game-path endpoint. */
export function mglLaunchPath(game:LaunchGame){
 const remote=systemKey(game.remoteSystemId);
 const system=systemKey(game.system);
 const source=game.remoteFilePath?.replace(/\\\\/g,'/')??'';
 const isCd32=remote==='cd32'||remote==='amigacd32'||remote==='commodorecd32'||system.includes('cd32')||/\/games\/amigacd32\//i.test(source);
 const isDos=remote==='ao486'||remote==='dos'||remote==='pcdos'||system.includes('dos');
 if(isDos)return game.title?`/media/fat/_DOS Games/${game.title}.mgl`:undefined;
 if(!isCd32)return undefined;
 const filename=source.split('/').pop()?.replace(/\.[^.]+$/,'')||game.title;
 return filename?`/media/fat/_Console/_Amiga CD32 Games/${filename}.mgl`:undefined;
}
export function launchRoutesFor(game:LaunchGame){return [mglLaunchPath(game)?'/launch':'/games/launch'];}
export function amigaVisionCanonicalTitle(game:Pick<Game,'remoteFilePath'|'remoteSystemId'>){
 const path=game.remoteFilePath?.replace(/\\/g,'/');
 if(systemKey(game.remoteSystemId)!=='amiga'||!path)return undefined;
 const match=path.match(/\/games\/amiga\/(?:games|demos)\/([^/]+)$/i);
 return match?.[1] ? decodeURIComponent(match[1]) : undefined;
}
async function launchAmigaVisionGame(value:string,title:string,signal:AbortSignal){
 const response=await fetch(normaliseAmigaVisionBridgeUrl(value),{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({title}),signal});
 if(response.ok)return title;
 const detail=(await response.text().catch(()=>'' )).trim();
 if(response.status===404)throw new Error('AmigaVision launch bridge is not installed on this MiSTer yet.');
 if(response.status===503)throw new Error('AmigaVision is still preparing its external drive. Please try again in a minute.');
 throw new Error(`AmigaVision could not queue the game (HTTP ${response.status})${detail?`: ${detail}`:''}`);
}
/** Retain the library-relative portion while checking the currently mounted USB slots. */
export function usbMountCandidates(path:string){const match=path.replace(/\\/g,'/').match(/^\/media\/usb\d+\/(.+)$/i);return match?Array.from({length:8},(_,index)=>`/media/usb${index}/${match[1]}`):[path];}
async function resolveMountedUsbPath(value:string,path:string,signal:AbortSignal){const candidates=usbMountCandidates(path);if(candidates.length===1)return path;const found=await Promise.all(candidates.map(async candidate=>{const folder=candidate.slice(0,candidate.lastIndexOf('/'));try{const response=await fetch(`${normaliseMiSTerRemoteUrl(value)}/games/view`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({path:folder}),signal});if(!response.ok)return undefined;const body=await response.json() as {items?:{path?:string}[]};return body.items?.some(item=>item.path===candidate)?candidate:undefined;}catch{return undefined;}}));return found.find(Boolean)??path;}
export function isC64TapeImage(game:Pick<Game,'remoteFilePath'|'remoteSystemId'>){return ['c64','commodore64'].includes(systemKey(game.remoteSystemId))&&/\.t64$/i.test(game.remoteFilePath??'');}
export function isSpectrumTapeImage(game:Pick<Game,'remoteFilePath'|'remoteSystemId'>){return ['spectrum','zxspectrum','sinclairzxspectrum'].includes(systemKey(game.remoteSystemId))&&/\.(?:tap|tzx)$/i.test(game.remoteFilePath??'');}
export function c64TapeLoadCommands(){return [38,24,30,32,28].map(code=>`kbdRaw:${code}`);}
export function c64RunCommands(){return [19,22,49,28].map(code=>`kbdRaw:${code}`);}
export function spectrumTapeLoadCommands(){return ['kbdRaw:68'];}
function remoteWebSocketUrl(value:string){return normaliseMiSTerRemoteUrl(value).replace(/^http/i,'ws')+'/ws';}
function sendRemoteCommands(value:string,commands:string[]){return new Promise<void>((resolve,reject)=>{const socket=new WebSocket(remoteWebSocketUrl(value));const openTimeout=setTimeout(()=>{socket.close();reject(new Error('MiSTer Remote keyboard connection timed out.'));},4000);let index=0;const sendNext=()=>{if(index>=commands.length){clearTimeout(openTimeout);socket.close();resolve();return;}socket.send(commands[index++]);setTimeout(sendNext,180);};socket.onopen=()=>{clearTimeout(openTimeout);sendNext();};socket.onerror=()=>{clearTimeout(openTimeout);reject(new Error('MiSTer Remote could not send the C64 tape load command.'));};});}
function startC64Tape(value:string){setTimeout(()=>{void sendRemoteCommands(value,c64TapeLoadCommands()).then(()=>{setTimeout(()=>{void sendRemoteCommands(value,c64RunCommands()).catch(()=>{});},3000);}).catch(()=>{});},2800);}
function startSpectrumTape(value:string){setTimeout(()=>{void sendRemoteCommands(value,spectrumTapeLoadCommands()).catch(()=>{});},2800);}
export async function launchMiSTerRemoteGame(value:string,game:LaunchGame):Promise<string>{if(!game.remoteFilePath)throw new Error('This game has no launch path in the MiSTer library.');const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),10000);try{const amigaVisionTitle=amigaVisionCanonicalTitle(game);if(amigaVisionTitle)return await launchAmigaVisionGame(value,amigaVisionTitle,controller.signal);const mglPath=mglLaunchPath(game);const path=mglPath??await resolveMountedUsbPath(value,game.remoteFilePath,controller.signal);const route=mglPath?'/launch':'/games/launch';const response=await fetch(`${normaliseMiSTerRemoteUrl(value)}${route}`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({path}),signal:controller.signal});if(!response.ok){const detail=(await response.text().catch(()=>'' )).trim();throw new Error(`MiSTer Remote could not launch the game (HTTP ${response.status})${detail?`: ${detail}`:''}`);}if(isC64TapeImage(game))startC64Tape(value);if(isSpectrumTapeImage(game))startSpectrumTape(value);return path;}catch(error){if(error instanceof DOMException&&error.name==='AbortError')throw new Error('MiSTer Remote timed out. Check that Remote is running on your MiSTer.');if(error instanceof TypeError)throw new Error('Could not reach the MiSTer launch service.');throw error;}finally{clearTimeout(timer);}}
