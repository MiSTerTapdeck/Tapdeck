import type {Game} from '../data/library';
export type LibretroArtworkKind='Named_Boxarts'|'Named_Snaps'|'Named_Logos';
const systems:Record<string,string[]>={nes:['Nintendo - Nintendo Entertainment System'],snes:['Nintendo - Super Nintendo Entertainment System'],n64:['Nintendo - Nintendo 64'],nintendo64:['Nintendo - Nintendo 64'],gameboy:['Nintendo - Game Boy'],gameboycolor:['Nintendo - Game Boy Color'],gameboyadvance:['Nintendo - Game Boy Advance'],gba:['Nintendo - Game Boy Advance'],megadrive:['Sega - Mega Drive - Genesis'],genesis:['Sega - Mega Drive - Genesis'],sega32x:['Sega - 32X'],mastersystem:['Sega - Master System - Mark III'],gamegear:['Sega - Game Gear'],saturn:['Sega - Saturn'],dreamcast:['Sega - Dreamcast'],megacd:['Sega - Mega-CD - Sega CD'],psx:['Sony - PlayStation'],playstation:['Sony - PlayStation'],atari2600:['Atari - 2600'],atari5200:['Atari - 5200'],atari7800:['Atari - 7800'],atari800:['Atari - 8-bit'],atarilynx:['Atari - Lynx'],jaguar:['Atari - Jaguar'],atarijaguar:['Atari - Jaguar'],x68000:['Sharp - X68000'],neogeocd:['SNK - Neo Geo CD'],neogeo:['SNK - Neo Geo'],neogeomvs:['MAME','FBNeo - Arcade Games'],amiga:['Commodore - Amiga'],c64:['Commodore - 64'],coco2:['Tandy - TRS-80 Color Computer'],intellivision:['Mattel - Intellivision'],macplus:['Apple - Macintosh'],turbografx16:['NEC - PC Engine - TurboGrafx 16'],turbografx16cd:['NEC - PC Engine CD - TurboGrafx-CD'],trs80:['Tandy - TRS-80'],ql:['Sinclair - QL'],virtualboy:['Nintendo - Virtual Boy'],
coleco:['Coleco - ColecoVision'],channelf:['Fairchild - ChannelF'],odyssey2:['Magnavox - Odyssey2'],casiopv1000:['Casio - PV-1000'],supervision:['Watara - Supervision'],wonderswan:['Bandai - WonderSwan'],wonderswancolor:['Bandai - WonderSwan Color'],pokemonmini:['Nintendo - Pokemon Mini'],gameandwatch:['Nintendo - Game & Watch'],vectrex:['GCE - Vectrex'],
threeDO:['3DO'],arcadia:['Emerson - Arcadia 2001'],adventurevision:['Entex - Adventure Vision'],gamate:['Bit Corporation - Gamate'],creativision:['VTech - CreatiVision'],vc4000:['Interton - VC 4000'],megaduck:['Creatronic - Mega Duck'],c16:['Commodore - 16'],pet2001:['Commodore - PET'],vic20:['Commodore - VIC-20'],edsac:['EDSAC'],galaksija:['Galaksija'],jupiter:['Jupiter Ace'],laser:['EACA - EG2000'],tomytutor:['Tomy - Pyuuta'],arcade:['MAME','FBNeo - Arcade Games'],mame:['MAME'],fbneo:['FBNeo - Arcade Games']};
const arcadeSystems=new Set(['cave68000','cps1','cps2','cps3','capcomplaysystem','capcomplaysystem1','capcomplaysystem2','capcomplaysystemii','capcomcps1','capcomcps2','capcomcps3','iremm72','iremm92','jalecomegasystem1','namcosystem1','pgm','segastv','segasystem16','segasystem18','taitof2']);
const key=(v:string)=>v.toLowerCase().replace(/[^a-z0-9]+/g,'');
export function libretroSystemsFor(game:Game){const keys=[game.remoteSystemId,game.system].filter((value):value is string=>!!value).map(key);const directories=[...new Set(keys.flatMap(systemKey=>systems[systemKey]??(game.category==='Arcade'||arcadeSystems.has(systemKey)?['MAME','FBNeo - Arcade Games']:[])))];return directories.length?{directories}:undefined;}
export function libretroArtworkIdentity(game:Game){return `libretro::${game.remoteSystemId??game.system}::${game.remoteFilePath??game.remotePath??game.id}`.replace(/[^a-z0-9._:-]+/gi,'_');}
export function libretroSnapArtworkIdentity(game:Game){return `${libretroArtworkIdentity(game)}::snap-v2`;}
export function filenameWithoutExtension(v:string){return (v.replace(/\\/g,'/').split('/').pop()??v).replace(/\.(?:png|jpe?g|webp|zip|7z|mra|rom|bin|cue|chd)$/i,'');}
export function artworkCandidates(game:Game){const title=game.title.trim();const plain=title.replace(/\s*[\[(][^\])]*[\])]/g,'').trim();const acronym=plain.replace(/([A-Za-z])\./g,'$1');return [...new Set([filenameWithoutExtension(game.remoteFilePath??''),title,plain,acronym])].filter(Boolean);}
const withoutTags=(value:string)=>filenameWithoutExtension(value).replace(/\s*[\[(][^\])]*[\])]/g,'').trim();
const normalizedTitle=(value:string)=>withoutTags(value).toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g,'');
const titleVariants=(value:string)=>{const clean=withoutTags(value).trim();const variants=[clean];const trailing=clean.match(/^(.*),\s*(the|a|an)$/i);if(trailing)variants.push(`${trailing[2]} ${trailing[1]}`);const leading=clean.match(/^(the|a|an)\s+(.+)$/i);if(leading)variants.push(`${leading[2]}, ${leading[1]}`);return variants;};
const titleWords=(value:string)=>withoutTags(value).toLowerCase().normalize('NFKD').match(/[a-z0-9]+/g)?.filter(word=>word.length>1||/^\d+$/.test(word))??[];
export function matchLibretroFilename(game:Game,names:string[]){
 for(const candidate of artworkCandidates(game))for(const variant of titleVariants(candidate)){const candidateNorm=normalizedTitle(variant);const exact=names.find(name=>normalizedTitle(name)===candidateNorm);if(exact)return exact;}
 // Some regional databases prepend a native title, e.g. "Ryuuko no Ken ~
 // Art of Fighting". Accept a substantial title contained in the filename,
 // while avoiding short generic matches.
 for(const candidate of artworkCandidates(game))for(const variant of titleVariants(candidate)){const candidateNorm=normalizedTitle(variant);if(candidateNorm.length<6)continue;const embedded=names.find(name=>{const nameNorm=normalizedTitle(name);return nameNorm.includes(candidateNorm)||candidateNorm.includes(nameNorm);});if(embedded)return embedded;}
 let best:{name:string;score:number}|undefined;for(const candidate of artworkCandidates(game)){const candidateWords=titleWords(candidate);if(candidateWords.length<2)continue;for(const name of names){const nameWords=titleWords(name);const shared=new Set(candidateWords.filter(word=>nameWords.includes(word))).size;const score=shared/Math.max(candidateWords.length,nameWords.length);if(shared>=2&&score>=.7&&(!best||score>best.score))best={name,score};}}return best?.name;}
export function libretroArtworkUrl(directory:string,kind:LibretroArtworkKind,filename:string){return `https://thumbnails.libretro.com/${encodeURIComponent(directory)}/${kind}/${encodeURIComponent(filename)}`;}

export function parseArtworkDirectory(html:string):string[]{
 const names:string[]=[];
 for(const match of html.matchAll(/href=["']([^"']+)["']/gi)){
  let name=match[1].replace(/&amp;/g,'&');
  try{name=decodeURIComponent(name);}catch{}
  if(/\.(png|jpe?g|webp)$/i.test(name)&&!name.includes('/'))names.push(name);
 }
 return names;
}
export function artworkCacheFilename(id:string){
 let a=2166136261,b=5381;
 for(let i=0;i<id.length;i++){a=Math.imul(a^id.charCodeAt(i),16777619);b=Math.imul(b,33)^id.charCodeAt(i);}
 return (a>>>0).toString(16)+'-'+(b>>>0).toString(16)+'.png';
}



