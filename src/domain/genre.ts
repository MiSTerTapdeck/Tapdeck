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
 // Some Zaparoo tags consist solely of a subtype. Fold those into the family
 // used by the filter, Discover, and the card label.
 if(/^(pointandclick|survivalhorror)/.test(key))return 'Adventure';
 if(/^(breakoutgames|climbing|labyrinth)/.test(key))return 'Action';
 if(/^(hanafuda)/.test(key))return 'Board Game';
 if(/^(casinocards|slotmachine)/.test(key))return 'Casino';
 if(/^(2d|25d|3d|versus|vscoop|verticalfighting)/.test(key))return 'Fighting';
 if(/^sportswithanimals/.test(key))return 'Horse Racing';
 if(/^rhythm/.test(key))return 'Music and Dancing';
 if(/^(fighterscrolling|runandjump|shooterscrolling)/.test(key))return 'Platform';
 if(/^(equalize|fall|glide|throw)/.test(key))return 'Puzzle';
 if(/^(english|japanesequiz)/.test(key))return 'Quiz';
 if(/^(diagonalshootemup|horizontalshootemup|verticalshootemup)/.test(key))return 'Shoot’em Up';
 if(/^(fps|missilecommand|spaceinvaders|thirdperson|runandgun|shooterhorizontal|shootervehicle)/.test(key))return 'Shooter';
 if(/^(lifesimulation|scifisimulation|vehiclesimulation)/.test(key))return 'Simulation';
 if(/^(baseball|basketball|boxing|cycling|football|golf|hockey|multisports|pool|rugby|skiing|swimming|tennis|wrestling)/.test(key))return 'Sports';
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

const cardSubgenres:Partial<Record<string,readonly [string,string][]>>={
 Action:[['actionadventure','Action Adventure'],['breakout','Breakout Games'],['climbing','Climbing'],['labyrinth','Labyrinth']],
 Adventure:[['pointandclick','Point and Click'],['survivalhorror','Survival Horror']],
 'Board Game':[['asiaticboardgame','Asiatic Board Game'],['hanafuda','Hanafuda'],['mahjong','Mahjong'],['othello','Othello'],['renju','Renju'],['shougi','Shougi']],
 Casino:[['casinocards','Casino Cards'],['slotmachine','Slot Machine']],
 Fighting:[['25d','2.5D'],['2d','2D'],['3d','3D'],['vscoop','Vs Co-op'],['versus','Versus'],['vertical','Vertical']],
 Fishing:[['huntingandfishing','Hunting and Fishing']],
 Hunting:[['huntingandfishing','Hunting and Fishing']],
 'Horse Racing':[['sportswithanimals','Sports With Animals']],
 'Music and Dancing':[['rhythm','Rhythm']],
 Platform:[['fighterscrolling','Fighter Scrolling'],['runandjump','Run and Jump'],['shooterscrolling','Shooter Scrolling']],
 Puzzle:[['equalize','Equalize'],['fall','Fall'],['glide','Glide'],['throw','Throw']],
 Quiz:[['english','English'],['japanese','Japanese']],
 Racing:[['driving','Driving'],['boat','Boat'],['motorcycle','Motorcycle'],['plane','Plane'],['fpv','FPV'],['tpv','TPV']],
 'Role-playing Game':[['actionrpg','Action RPG'],['dungeoncrawlerrpg','Dungeon Crawler RPG'],['japaneserpg','Japanese RPG'],['partybasedrpg','Party-based RPG']],
 'Shoot’em Up':[['diagonal','Diagonal'],['horizontal','Horizontal'],['vertical','Vertical']],
 Shooter:[['fps','FPS'],['horizontal','Horizontal'],['missilecommand','Missile Command-like'],['plane','Plane'],['runandgun','Run and Gun'],['spaceinvaders','Space Invaders-like'],['thirdperson','Third Person'],['vehicle','Vehicle']],
 Simulation:[['buildandmanagement','Build and Management'],['life','Life'],['scifi','Sci-fi'],['vehicle','Vehicle']],
 Sports:[['baseball','Baseball'],['basketball','Basketball'],['boxing','Boxing'],['cycling','Cycling'],['football','Football'],['golf','Golf'],['hockey','Hockey'],['multisports','Multi-sports'],['pool','Pool'],['rugby','Rugby'],['skiing','Skiing'],['swimming','Swimming'],['tennis','Tennis'],['wrestling','Wrestling']],
};

// Cards use the friendly taxonomy rather than Zaparoo's often-conjoined raw tag.
export function cardGenre(value:string|undefined|null):string {
 const primary=primaryGenre(value);if(primary==='Not listed')return primary;
 const subgenre=cardSubgenres[primary]?.find(([needle])=>compactGenre(value).includes(needle))?.[1];
 return subgenre?primary+' — '+subgenre:primary;
}