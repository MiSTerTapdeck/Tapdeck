import type {Category,Game} from '../data/library';

export const PRIMARY_GENRES=[
  'Action','Adventure','Adults','Beat ’em Up','Board Game','Casino','Casual Game',
  'Compilation','Dancing','Demo','Educational','Fighting','Fishing','Horse Racing',
  'Lightgun Shooter','Mahjong','Music and Dancing','Pinball','Platform','Playing Cards',
  'Puzzle','Quiz','Racing','Rhythm','Role-playing Game','Shoot’em Up','Shooter',
  'Simulation','Sports','Strategy','Tactical RPG','Thinking','Various',
] as const;

const aliases:[string,string][]=[
  ['shootem-up','Shoot’em Up'],['shoot-em-up','Shoot’em Up'],['lightgun-shooter','Lightgun Shooter'],
  ['action','Action'],['role-playing-game','Role-playing Game'],['tactical-rpg','Tactical RPG'],['horse-racing','Horse Racing'],
  ['music-and-dancing','Music and Dancing'],['beat-em-up','Beat ’em Up'],['beatem-up','Beat ’em Up'],
  ['board-game','Board Game'],['playing-cards','Playing Cards'],['casual-game','Casual Game'],
  ['racing,-driving','Racing'],['racing-fpv','Racing'],['racing-tpv','Racing'],
  ['motorcycle-race-fpv','Racing'],['motorcycle-race-tpv','Racing'],['platform-run-jump','Platform'],
  ['platformer','Platform'],['adventure','Adventure'],['adults','Adults'],
  ['board','Board Game'],['casino','Casino'],['compilation','Compilation'],['dancing','Dancing'],
  ['demo','Demo'],['educational','Educational'],['fighting','Fighting'],['fishing','Fishing'],
  ['mahjong','Mahjong'],['pinball','Pinball'],['platform','Platform'],['puzzle','Puzzle'],
  ['quiz','Quiz'],['racing','Racing'],['rhythm','Rhythm'],['rpg','Role-playing Game'],
  ['shooter','Shooter'],['simulation','Simulation'],['sports','Sports'],['strategy','Strategy'],
  ['thinking','Thinking'],['various','Various'],
];

export function primaryGenre(value:string|undefined|null):string {
  const raw=(value??'').trim();
  if(!raw||raw.toLocaleLowerCase()==='not listed')return 'Not listed';
  const normalized=raw.toLocaleLowerCase().replace(/[’']/g,"'").replace(/\s+/g,' ');
  for(const [needle,label] of aliases)if(normalized.includes(needle.replace(/[’']/g,"'")))return label;
  const direct=PRIMARY_GENRES.find(label=>normalized===label.toLocaleLowerCase());
  return direct??'Various';
}

export function genresForCategory(games:Game[],category:Category,system:string|null=null):string[] {
  return [...new Set(games.filter(g=>(category==='All'||g.category===category)&&(!system||g.system===system)).map(g=>primaryGenre(g.genre)).filter(genre=>genre!=='Not listed'))].sort((a,b)=>a.localeCompare(b));
}
