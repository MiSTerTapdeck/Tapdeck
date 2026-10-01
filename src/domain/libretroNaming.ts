import type {Game} from '../data/library';
export type LibretroArtworkKind='Named_Boxarts'|'Named_Snaps'|'Named_Titles'|'Named_Logos';
const systems:Record<string,string[]>={nes:['Nintendo - Nintendo Entertainment System'],snes:['Nintendo - Super Nintendo Entertainment System'],n64:['Nintendo - Nintendo 64'],nintendo64:['Nintendo - Nintendo 64'],gameboy:['Nintendo - Game Boy'],gameboycolor:['Nintendo - Game Boy Color'],gameboyadvance:['Nintendo - Game Boy Advance'],gba:['Nintendo - Game Boy Advance'],megadrive:['Sega - Mega Drive - Genesis'],genesis:['Sega - Mega Drive - Genesis'],sega32x:['Sega - 32X'],mastersystem:['Sega - Master System - Mark III'],gamegear:['Sega - Game Gear'],saturn:['Sega - Saturn'],dreamcast:['Sega - Dreamcast'],megacd:['Sega - Mega-CD - Sega CD'],psx:['Sony - PlayStation'],playstation:['Sony - PlayStation'],atari2600:['Atari - 2600'],atari5200:['Atari - 5200'],atari7800:['Atari - 7800'],atari800:['Atari - 8-bit'],atarilynx:['Atari - Lynx'],jaguar:['Atari - Jaguar'],atarijaguar:['Atari - Jaguar'],x68000:['Sharp - X68000'],neogeocd:['SNK - Neo Geo CD'],neogeo:['SNK - Neo Geo'],neogeomvs:['SNK - Neo Geo','MAME','FBNeo - Arcade Games'],amiga:['Commodore - Amiga'],c64:['Commodore - 64'],coco2:['Tandy - TRS-80 Color Computer'],intellivision:['Mattel - Intellivision'],macplus:['Apple - Macintosh'],turbografx16:['NEC - PC Engine - TurboGrafx 16'],turbografx:['NEC - PC Engine - TurboGrafx 16'],pcengine:['NEC - PC Engine - TurboGrafx 16'],pce:['NEC - PC Engine - TurboGrafx 16'],turbografx16cd:['NEC - PC Engine CD - TurboGrafx-CD'],turbografxcd:['NEC - PC Engine CD - TurboGrafx-CD'],pcenginecd:['NEC - PC Engine CD - TurboGrafx-CD'],pcecd:['NEC - PC Engine CD - TurboGrafx-CD'],supergrafx:['NEC - PC Engine SuperGrafx'],pcenginesupergrafx:['NEC - PC Engine SuperGrafx'],trs80:['Tandy - TRS-80'],ql:['Sinclair - QL'],virtualboy:['Nintendo - Virtual Boy'],
coleco:['Coleco - ColecoVision'],channelf:['Fairchild - ChannelF'],odyssey2:['Magnavox - Odyssey2'],casiopv1000:['Casio - PV-1000'],supervision:['Watara - Supervision'],wonderswan:['Bandai - WonderSwan'],wonderswancolor:['Bandai - WonderSwan Color'],pokemonmini:['Nintendo - Pokemon Mini'],gameandwatch:['Nintendo - Game & Watch'],vectrex:['GCE - Vectrex'],spectrum:['Sinclair - ZX Spectrum'],zxspectrum:['Sinclair - ZX Spectrum'],sinclairzxspectrum:['Sinclair - ZX Spectrum'],
threeDO:['3DO'],arcadia:['Emerson - Arcadia 2001'],adventurevision:['Entex - Adventure Vision'],gamate:['Bit Corporation - Gamate'],creativision:['VTech - CreatiVision'],vc4000:['Interton - VC 4000'],megaduck:['Creatronic - Mega Duck'],c16:['Commodore - 16'],pet2001:['Commodore - PET'],vic20:['Commodore - VIC-20'],edsac:['EDSAC'],galaksija:['Galaksija'],jupiter:['Jupiter Ace'],laser:['EACA - EG2000'],tomytutor:['Tomy - Pyuuta'],arcade:['MAME','FBNeo - Arcade Games'],mame:['MAME'],fbneo:['FBNeo - Arcade Games']};
// Zaparoo's readable system names are not always its core IDs. Keep these
// aliases alongside the core IDs above so both resolve to Libretro's exact
// thumbnail directory names.
const systemAliases:Record<string,string[]>={
 colecovision:['Coleco - ColecoVision'],commodore64:['Commodore - 64'],
 commodoreamiga:['Commodore - Amiga'],amstradcpc:['Amstrad - CPC'],
 ao486:['DOS'],dos:['DOS'],pcdos:['DOS'],pcdosgames:['DOS'],
 cd32:['Commodore - CD32'],amigacd32:['Commodore - CD32'],commodorecd32:['Commodore - CD32'],
 msx:['Microsoft - MSX'],microsoftmsx:['Microsoft - MSX'],
 msx2:['Microsoft - MSX2'],microsoftmsx2:['Microsoft - MSX2'],
 zx81:['Sinclair - ZX 81'],sinclairzx81:['Sinclair - ZX 81'],
 sg1000:['Sega - SG-1000'],segasg1000:['Sega - SG-1000'],
 segamegadrive:['Sega - Mega Drive - Genesis'],segagenesis:['Sega - Mega Drive - Genesis'],
 segamastersystem:['Sega - Master System - Mark III'],segagamegear:['Sega - Game Gear'],
 segasaturn:['Sega - Saturn'],segadreamcast:['Sega - Dreamcast'],
 nintendoentertainmentsystem:['Nintendo - Nintendo Entertainment System'],
 supernintendo:['Nintendo - Super Nintendo Entertainment System'],
 supernintendoentertainmentsystem:['Nintendo - Super Nintendo Entertainment System'],
 nintendogameboy:['Nintendo - Game Boy'],nintendogameboycolor:['Nintendo - Game Boy Color'],
 nintendogameboyadvance:['Nintendo - Game Boy Advance'],
 sonyplaystation:['Sony - PlayStation'],sonyplaystationportable:['Sony - PlayStation Portable'],psp:['Sony - PlayStation Portable'],
 atari8bit:['Atari - 8-bit'],neogeopocket:['SNK - Neo Geo Pocket'],neogeopocketcolor:['SNK - Neo Geo Pocket Color'],
 pcfx:['NEC - PC-FX'],xbox:['Microsoft - Xbox']
};
const arcadeSystems=new Set(['cave68000','cps1','cps2','cps3','capcomplaysystem','capcomplaysystem1','capcomplaysystem2','capcomplaysystemii','capcomcps1','capcomcps2','capcomcps3','iremm72','iremm92','jalecomegasystem1','namcosystem1','pgm','segastv','segasystem16','segasystem18','taitof2']);
const key=(v:string)=>v.toLowerCase().replace(/[^a-z0-9]+/g,'');
export function libretroSystemsFor(game:Game){const keys=[game.remoteSystemId,game.system].filter((value):value is string=>!!value).map(key);const directories=[...new Set(keys.flatMap(systemKey=>systems[systemKey]??systemAliases[systemKey]??(game.category==='Arcade'||arcadeSystems.has(systemKey)?['MAME','FBNeo - Arcade Games']:[])))];return directories.length?{directories}:undefined;}
function artworkSourceRevision(game:Game){const systemKey=key(game.remoteSystemId??game.system);return systemKey==='neogeomvs'?'::neo-geo-source-v3':systemKey==='zxspectrum'?'::spectrum-match-v2':'';}
export function legacyLibretroArtworkIdentity(game:Game){const system=game.remoteSystemId??game.system;return `libretro::${system}::${game.remoteFilePath??game.remotePath??game.id}${artworkSourceRevision(game)}`.replace(/[^a-z0-9._:-]+/gi,'_');}
export function libretroArtworkIdentity(game:Game){const system=game.remoteSystemId??game.system;return `libretro::${system}::${game.title}::stable-v1${artworkSourceRevision(game)}`.replace(/[^a-z0-9._:-]+/gi,'_');}
export function libretroSnapArtworkIdentity(game:Game){return `${libretroArtworkIdentity(game)}::snap-v2`;}
export function libretroTitleArtworkIdentity(game:Game){return `${libretroArtworkIdentity(game)}::title-v1`;}
export function filenameWithoutExtension(v:string){return (v.replace(/\\/g,'/').split('/').pop()??v).replace(/\.(?:png|jpe?g|webp|zip|7z|mra|rom|bin|cue|chd)$/i,'');}
export function artworkCandidates(game:Game){const title=game.title.trim();const withoutHbmame=title.replace(/(?:\s*[-_\[(]?\s*HBMAME\s*[\])]?\s*)$/i,'').trim();const plain=withoutHbmame.replace(/\s*[\[(][^\])]*[\])]/g,'').trim();const acronym=plain.replace(/([A-Za-z])\./g,'$1');return [...new Set([filenameWithoutExtension(game.remoteFilePath??''),withoutHbmame,plain,acronym])].filter(Boolean);}
const withoutTags=(value:string)=>filenameWithoutExtension(value).replace(/\s*[\[(][^\])]*[\])]/g,'').trim();
const normalizedTitle=(value:string)=>withoutTags(value).toLowerCase().normalize('NFKD').replace(/[’']/g,'').replace(/([a-z])s(?=[a-z]|$)/g,'$1s').replace(/[^a-z0-9]+/g,'');
// Directory lists are shared by thousands of games. Build the exact-title lookup
// once per list instead of normalising every filename again for every card.
const exactFilenameIndexes=new WeakMap<string[],Map<string,string>>();
function exactFilenameIndex(names:string[]){let index=exactFilenameIndexes.get(names);if(!index){index=new Map<string,string>();for(const name of names){const normal=normalizedTitle(name);if(!index.has(normal))index.set(normal,name);}exactFilenameIndexes.set(names,index);}return index;}
const titleVariants=(value:string)=>{const clean=withoutTags(value).trim();const variants=[clean];const tapeSide=clean.replace(/\s+-\s+(?:side\s+[a-z0-9]+|part\s+\d+|(?:48|128)k|game\s*&\s*tricky\s+levels)$/i,'').trim();if(tapeSide&&tapeSide!==clean)variants.push(tapeSide);const trailing=clean.match(/^(.*),\s*(the|a|an)$/i);if(trailing)variants.push(`${trailing[2]} ${trailing[1]}`);const leading=clean.match(/^(the|a|an)\s+(.+)$/i);if(leading)variants.push(`${leading[2]}, ${leading[1]}`);return [...new Set(variants)];};
const escapeRegExp=(value:string)=>value.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
// Libretro often appends an alternate title after "_" or "~". Treat that
// as a stronger match than a sequel which merely begins with the same words.
function displayTitlePrefixMatch(game:Game,names:string[]){
 for(const candidate of artworkCandidates(game))for(const variant of titleVariants(candidate)){
  const title=withoutTags(variant).trim();if(title.length<4)continue;
  const prefix=new RegExp(`^${escapeRegExp(title)}(?:\\s*(?:_|~)|\\s*\\(|$)`,'i');
  const match=names.find(name=>prefix.test(filenameWithoutExtension(name)));
  if(match)return match;
 }
}
const titleWords=(value:string)=>withoutTags(value).toLowerCase().normalize('NFKD').match(/[a-z0-9]+/g)?.filter(word=>word.length>1||/^\d+$/.test(word))??[];
const filenameWordIndexes=new WeakMap<string[],Map<string,string[]>>();
function filenameWordIndex(names:string[]){let index=filenameWordIndexes.get(names);if(!index){index=new Map<string,string[]>();for(const name of names)for(const word of new Set(titleWords(name))){const entries=index.get(word)??[];entries.push(name);index.set(word,entries);}filenameWordIndexes.set(names,index);}return index;}
function namesSharingWords(names:string[],words:string[]){if(!words.length)return names;const groups=words.map(word=>filenameWordIndex(names).get(word)).filter((group):group is string[]=>!!group);return groups.length?[...groups].sort((a,b)=>a.length-b.length)[0]:[];}
function exactLibretroFilename(game:Game,names:string[]){const index=exactFilenameIndex(names);for(const candidate of artworkCandidates(game))for(const variant of titleVariants(candidate)){const exact=index.get(normalizedTitle(variant));if(exact)return exact;}}
export function matchLibretroFilename(game:Game,names:string[]){
 const direct=exactLibretroFilename(game,names);if(direct)return direct;
 const titlePrefix=displayTitlePrefixMatch(game,names);if(titlePrefix)return titlePrefix;
 // Some regional databases prepend a native title, e.g. "Ryuuko no Ken ~
 // Art of Fighting". Accept a substantial title contained in the filename,
 // while avoiding short generic matches.
 for(const candidate of artworkCandidates(game))for(const variant of titleVariants(candidate)){const candidateNorm=normalizedTitle(variant);const words=titleWords(variant);if(candidateNorm.length<6||(words.length<2&&candidateNorm.length<7))continue;const embedded=namesSharingWords(names,words).find(name=>words.length<2?normalizedTitle(name).startsWith(candidateNorm):normalizedTitle(name).includes(candidateNorm));if(embedded)return embedded;}
 let best:{name:string;score:number}|undefined;for(const candidate of artworkCandidates(game)){const candidateWords=titleWords(candidate);if(candidateWords.length<2)continue;for(const name of namesSharingWords(names,candidateWords)){const nameWords=titleWords(name);const shared=new Set(candidateWords.filter(word=>nameWords.includes(word))).size;const score=shared/Math.max(candidateWords.length,nameWords.length);if(shared>=2&&score>=2/3&&(!best||score>best.score))best={name,score};}}return best?.name;}
const yieldToUi=()=>new Promise<void>(resolve=>setTimeout(resolve,0));
export async function matchLibretroFilenameInChunks(game:Game,names:string[]):Promise<string|undefined>{
 if(names.length<1000)return matchLibretroFilename(game,names);
 const direct=exactLibretroFilename(game,names);if(direct)return direct;
 const titlePrefix=displayTitlePrefixMatch(game,names);if(titlePrefix)return titlePrefix;
 let scanned=0;const pause=async()=>{if(++scanned%80===0)await yieldToUi();};
 for(const candidate of artworkCandidates(game))for(const variant of titleVariants(candidate)){const candidateNorm=normalizedTitle(variant);const words=titleWords(variant);if(candidateNorm.length<6||(words.length<2&&candidateNorm.length<7))continue;for(const name of namesSharingWords(names,words)){if(words.length<2?normalizedTitle(name).startsWith(candidateNorm):normalizedTitle(name).includes(candidateNorm))return name;await pause();}}
 let best:{name:string;score:number}|undefined;for(const candidate of artworkCandidates(game)){const candidateWords=titleWords(candidate);if(candidateWords.length<2)continue;for(const name of namesSharingWords(names,candidateWords)){const nameWords=titleWords(name);const shared=new Set(candidateWords.filter(word=>nameWords.includes(word))).size;const score=shared/Math.max(candidateWords.length,nameWords.length);if(shared>=2&&score>=2/3&&(!best||score>best.score))best={name,score};await pause();}}return best?.name;
}
const encodePathSegment=(value:string)=>encodeURIComponent(value).replace(/[!'()*]/g,character=>`%${character.charCodeAt(0).toString(16).toUpperCase()}`);
export function libretroArtworkUrl(directory:string,kind:LibretroArtworkKind,filename:string){return `https://thumbnails.libretro.com/${encodePathSegment(directory)}/${kind}/${encodePathSegment(filename)}`;}

export function parseArtworkDirectory(html:string):string[]{
 const names:string[]=[];
 for(const match of html.matchAll(/href=(["'])(.*?)\1/gi)){
  let name=match[2].replace(/&amp;/g,'&');
  try{name=decodeURIComponent(name);}catch{}
  if(/\.(png|jpe?g|webp)$/i.test(name)&&!name.includes('/'))names.push(name);
 }
 return names;
}
export async function parseArtworkDirectoryInChunks(html:string):Promise<string[]>{
 const names:string[]=[];const matcher=/href=(["'])(.*?)\1/gi;let match:RegExpExecArray|null;let processed=0;
 while((match=matcher.exec(html))){
  let name=match[2].replace(/&amp;/g,'&');
  try{name=decodeURIComponent(name);}catch{}
  if(/\.(png|jpe?g|webp)$/i.test(name)&&!name.includes('/'))names.push(name);
  if(++processed%250===0)await new Promise<void>(resolve=>setTimeout(resolve,0));
 }
 return names;
}
export function artworkCacheFilename(id:string){
 let a=2166136261,b=5381;
 for(let i=0;i<id.length;i++){a=Math.imul(a^id.charCodeAt(i),16777619);b=Math.imul(b,33)^id.charCodeAt(i);}
 return (a>>>0).toString(16)+'-'+(b>>>0).toString(16)+'.png';
}



