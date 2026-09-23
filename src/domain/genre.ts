import type {Category,Game} from '../data/library';

export const PRIMARY_GENRES=[
 'Action','Adventure','Adults','Beat ’em Up','Board Game','Casino','Casual Game',
 'Compilation','Dancing','Demo','Educational','Fighting','Fishing','Horse Racing',
 'Hunting','Lightgun Shooter','Mahjong','Music and Dancing','Pinball','Platform',
 'Playing Cards','Puzzle','Quiz','Racing','Role-playing Game','Shoot’em Up','Shooter',
 'Simulation','Sports','Strategy','Tactical RPG','Thinking','Various',
] as const;

function compactGenre(value:string|undefined|null){return (value??'').toLocaleLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g,'');}

// Zaparoo's genre tags often join repeated terms together, for example
// "sports-skiingsports". Match the leading semantic term and fold variants
// into the clean picker family.
export function primaryGenre(value:string|undefined|null):string {
 const raw=(value??'').trim();if(!raw||raw.toLocaleLowerCase()==='not listed')return 'Not listed';
 const key=compactGenre(raw);
 if(/^(tacticalrpg)/.test(key))return 'Tactical RPG';
 if(/^(actionrpg|dungeoncrawlerrpg|japaneserpg|partybasedrpg|roleplayinggame)/.test(key))return 'Role-playing Game';
 if(/^horseracing/.test(key))return 'Horse Racing';
 if(/^(motorcyclerace|racing)/.test(key))return 'Racing';
 if(/^beatemup/.test(key))return 'Beat ’em Up';
 if(/^(asiaticboardgame|boardgame|othello|renju|shougi)/.test(key))return 'Board Game';
 if(/^mahjong/.test(key))return 'Mahjong';
 if(/^playingcards/.test(key))return 'Playing Cards';
 if(/^lightgunshooter/.test(key))return 'Lightgun Shooter';
 if(/^shootemup/.test(key))return 'Shoot’em Up';
 if(/^shooter/.test(key))return 'Shooter';
 if(/^(buildandmanagement|simulation)/.test(key))return 'Simulation';
 if(/^(musicanddancing|rhythm)/.test(key))return 'Music and Dancing';
 if(/^hunting/.test(key))return 'Hunting';
 if(/^fishing/.test(key))return 'Fishing';
 if(/^action/.test(key))return 'Action';
 if(/^adults/.test(key))return 'Adults';
 if(/^adventure/.test(key))return 'Adventure';
 if(/^casino/.test(key))return 'Casino';
 if(/^casualgame/.test(key))return 'Casual Game';
 if(/^compilation/.test(key))return 'Compilation';
 if(/^dancing/.test(key))return 'Dancing';
 if(/^demo/.test(key))return 'Demo';
 if(/^educational/.test(key))return 'Educational';
 if(/^fighting/.test(key))return 'Fighting';
 if(/^pinball/.test(key))return 'Pinball';
 if(/^platform/.test(key))return 'Platform';
 if(/^puzzle/.test(key))return 'Puzzle';
 if(/^quiz/.test(key))return 'Quiz';
 if(/^sports/.test(key))return 'Sports';
 if(/^strategy/.test(key))return 'Strategy';
 if(/^thinking/.test(key))return 'Thinking';
 return 'Various';
}

const discoverSubgenres={
 Sports:['skiing','snowboarding','footballsoccer','footballamerican','baseball','basketball','boxing','bowling','cycling','darts','dodgeball','golf','hockey','rugby','swimming','tennis','volleyball','wrestling','skateboard','running','surf','water','pool','tabletennis','sumo','fitness','multisports','extremesports','handball','badminton','cricket','archery','karate','judo','motocross','motogp','karting','rally','formula1','flyingdisc','kayak','rowing','squash','paddle','jetski','skydiving','withanimals'],
 Shooter:['runandgun','spaceinvaders','missilecommand','vehicle','planefpv','planetpv','plane','shooterfpv','shootertpv','horizontal','vertical'],
 Racing:['motorcycle','boat','plane','fpv','tpv','driving','racing'],
} as const;

// Most recommendations intentionally use the broad primary genre. The three
// high-volume families below keep their specific discipline so skiing does not
// become every sport game, for example.
export function discoverGenreKey(value:string|undefined|null):string {
 const primary=primaryGenre(value);if(primary!=='Sports'&&primary!=='Shooter'&&primary!=='Racing')return primary.toLocaleLowerCase();
 const key=compactGenre(value);const subgenre=discoverSubgenres[primary].find(item=>key.includes(item));
 return `${primary.toLocaleLowerCase()}:${subgenre??'general'}`;
}

export function genresForCategory(games:Game[],category:Category,system:string|null=null):string[] {
 return [...new Set(games.filter(g=>(category==='All'||g.category===category)&&(!system||g.system===system)).map(g=>primaryGenre(g.genre)).filter(genre=>genre!=='Not listed'))].sort((a,b)=>a.localeCompare(b));
}
