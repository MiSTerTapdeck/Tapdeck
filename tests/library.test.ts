import test from 'node:test';
import assert from 'node:assert/strict';
import {filterGames,genresForCategory,isVintage,parseSaved,searchGames,systemsForCategory} from '../src/domain/library.ts';
import {cardGenre,discoverGenreKey,primaryGenre} from '../src/domain/genre.ts';
import {parsePlaylists,reorderIds} from '../src/domain/playlists.ts';
import {chooseIgdbRating} from '../src/domain/igdbMatch.ts';
import {formatRegion,parseRating,parseYear,regionFlag} from '../src/domain/gamelist.ts';
import {discoverPlatform,discoverShowcase,recommendGames} from '../src/domain/discover.ts';
import {groupGenericArcadeGames} from '../src/domain/arcadeCores.ts';
import {isPlayableGame} from '../src/domain/playable.ts';
import {isVisibleRemoteMedia} from '../src/domain/remoteMedia.ts';
import type {Game} from '../src/data/library';
const seed:Game[]=[
 {id:'a',title:'Super Metroid',system:'SNES',category:'Consoles',year:1994,genre:'Platform',developer:'Nintendo',players:'1',description:''},
 {id:'b',title:'Turrican II',system:'Amiga',category:'Computers',year:1991,genre:'Action',developer:'Factor 5',players:'1',description:''},
 {id:'c',title:'Modern game',system:'SNES',category:'Consoles',year:2026,genre:'Action',developer:'Studio',players:'1',description:''},
];
test('Zaparoo launch records remain visible regardless of their media extension',()=>{
 for(const extension of ['cue','m3u','vhd','bin','chd']){
  assert.equal(isPlayableGame({id:extension,title:'Example Game',system:'Future Console',category:'Consoles',year:null,genre:'Not listed',developer:'Not listed',players:'Not listed',description:'',remoteFilePath:`/media/usb0/games/Future Console/Example Game.${extension}`} as Game),true);
 }
 assert.equal(isPlayableGame({id:'test-drive',title:'Test Drive',system:'DOS',category:'Computers',year:1987,genre:'Racing',developer:'Accolade',players:'1',description:''} as Game),true);
});
test('a Zaparoo record without a ZapScript remains visible to MiSTer Remote launching',()=>{
 assert.equal(isVisibleRemoteMedia({name:'New core game',path:'/media/fat/games/NewCore/New core game.img'}),true);
 assert.equal(isVisibleRemoteMedia({name:'Missing game',path:'/media/fat/games/NewCore/Missing game.img',isMissing:true}),false);
});
test('search combines title and developer terms and intersects the category',()=>{
 assert.deepEqual(filterGames(seed,'  nintendo  metroid ','Consoles').map(g=>g.id),['a']);
 assert.equal(filterGames(seed,'Nintendo','Computers').length,0);
});
test('saved filter intersects search without mutating input order',()=>{
 assert.deepEqual(filterGames(seed,'','All','year',true,['a','c']).map(g=>g.id),['c','a']);
 assert.deepEqual(seed.map(g=>g.id),['a','b','c']);
});
test('rating sort uses only imported local ratings',()=>{
 assert.deepEqual(filterGames([{...seed[0],rating:60},{...seed[1],rating:90},{...seed[2]}],'','All','rating').map(game=>game.id),['b','a','c']);
});
test('date added to library puts recently discovered games first',()=>{
 const dated=[{...seed[0],libraryAddedAt:100},{...seed[1],libraryAddedAt:300},{...seed[2],libraryAddedAt:200}];
 assert.deepEqual(filterGames(dated,'','All','added').map(game=>game.id),['b','c','a']);
 assert.deepEqual(searchGames(dated,'','added').map(game=>game.id),['b','c','a']);
});
test('release age controls condition; unknown years are not treated as old',()=>{
 assert.equal(isVintage(1994,2026),true);assert.equal(isVintage(2026,2026),false);
 assert.equal(isVintage(null,2026),false);assert.equal(isVintage(2006,2026),true);
});
test('saved storage survives invalid JSON, old identifiers and duplicate entries',()=>{
 assert.deepEqual(parseSaved('{broken',['a']),[]);assert.deepEqual(parseSaved('{}',['a']),[]);
 assert.deepEqual(parseSaved('["a","a","removed",42]',['a']),['a']);
});
test('empty query preserves all games, and title order is stable',()=>{
 assert.equal(filterGames(seed,'  ','All').length,3);
 assert.deepEqual(filterGames(seed,'','All','title').map(g=>g.id),['c','a','b']);
});
test('system options are unique and belong only to the chosen family',()=>{
 assert.deepEqual(systemsForCategory(seed,'Consoles'),['SNES']);
 assert.deepEqual(systemsForCategory(seed,'Computers'),['Amiga']);
 assert.deepEqual(systemsForCategory(seed,'All'),[]);
 assert.deepEqual(systemsForCategory(seed,'Arcade'),[]);
});
test('system filter intersects category, search and saved status',()=>{
 assert.deepEqual(filterGames(seed,'Nintendo','Consoles','title',true,['a','b'],'SNES').map(g=>g.id),['a']);
 assert.deepEqual(filterGames(seed,'','Consoles','title',false,[],'Amiga'),[]);
 assert.deepEqual(filterGames(seed,'','Computers','title',false,[],'Amiga').map(g=>g.id),['b']);
});
test('genre options respect the active family and genre filter intersects other filters',()=>{
 assert.deepEqual(genresForCategory(seed,'Consoles'),['Action','Platform']);
 assert.deepEqual(genresForCategory(seed,'Computers'),['Action']);
 assert.deepEqual(filterGames(seed,'','Consoles','title',false,[],null,'Platform').map(g=>g.id),['a']);
 assert.deepEqual(filterGames(seed,'Nintendo','Consoles','title',true,['a'],null,'Platform').map(g=>g.id),['a']);
});
test('global and playlist search match the same title and developer fields as system lists',()=>{
 const games=[...seed,{...seed[1],id:'d',title:'Unrelated game',developer:'Sonic Team'}];
 assert.deepEqual(searchGames(games,'metroid').map(game=>game.id),['a']);
 assert.deepEqual(searchGames(games,'sonic').map(game=>game.id),['d']);
 assert.deepEqual(searchGames(games,'1991'),[]);
 assert.deepEqual(searchGames(games,'action amiga'),[]);
});
test('primary genres normalize Zaparoo genre taxonomy and preserve full genre search',()=>{
 assert.equal(primaryGenre('sports-football-soccer'), 'Sports');
 assert.equal(primaryGenre('racing,-drivingracing-fpv'), 'Racing');
 assert.equal(primaryGenre('action-rpgrole-playing-game'), 'Role-playing Game');
 assert.equal(primaryGenre('beatem-upbeatem-up'), 'Beat ’em Up');
 assert.equal(primaryGenre('build-and-managementsimulation'), 'Simulation');
 assert.deepEqual(genresForCategory([{...seed[0],genre:'sports-football-soccer'}],'Consoles'),['Sports']);
 assert.deepEqual(filterGames([{...seed[0],genre:'sports-football-soccer'}],'','Consoles','title',false,[],null,'Sports').map(g=>g.title),['Super Metroid']);
});
test('playlist storage removes invalid games and keeps a stable game order',()=>{
 const parsed=parsePlaylists('[{"id":"weekend","title":" Weekend picks ","gameIds":["b","a","b","gone"],"createdAt":12},{"id":"weekend","title":"Duplicate","gameIds":[]}]',['a','b']);
 assert.deepEqual(parsed,[{id:'weekend',title:'Weekend picks',gameIds:['b','a'],createdAt:12}]);
 assert.deepEqual(reorderIds(['a','b','c'],0,2),['b','c','a']);
 assert.deepEqual(reorderIds(['a','b'],3,0),['a','b']);
});
test('recommendations use genre rather than system overlap',()=>{
 const recommendations=recommendGames(seed,['a']);
 assert.deepEqual(recommendations,[]);
 assert.deepEqual(recommendGames(seed,[]),[]);
});

test('Discover excludes only known ratings below 60%',()=>{
 const games=[
  {...seed[0],id:'seed',genre:'Sports'},
  {...seed[1],id:'low',genre:'Sports',rating:59},
  {...seed[2],id:'qualifies',genre:'Sports',rating:60},
  {...seed[1],id:'unrated',genre:'Sports',rating:undefined},
 ];
 assert.deepEqual([...recommendGames(games,['seed']).map(item=>item.game.id)].sort(),['qualifies','unrated']);
});

test('Discover uses primary genres except for sports, shooter and racing sub-genres',()=>{
 assert.equal(discoverGenreKey('sports-skiingsports'), 'sports:skiing');
 assert.equal(discoverGenreKey('sports-football-soccersports'), 'sports:footballsoccer');
 assert.notEqual(discoverGenreKey('sports-skiingsports'),discoverGenreKey('sports-football-soccersports'));
 assert.equal(discoverGenreKey('shooter-run-and-gunshooter'), 'shooter:runandgun');
 assert.notEqual(discoverGenreKey('shooter-run-and-gunshooter'),discoverGenreKey('shooter-horizontalshooter'));
 assert.equal(discoverGenreKey('racing,-drivingracing-fpv'), 'racing:fpv');
 assert.equal(discoverGenreKey('action-adventureaction'), 'action');
});
test('Discover tops up a thin specialist genre with its broader genre',()=>{
 const base={...seed[0],genre:'shooter-verticalshooter'};
 const sparse=[{...base,id:'seed'}, {...base,id:'vertical'}, {...base,id:'horizontal',genre:'shooter-horizontalshooter'}];
 const sparseResults=recommendGames(sparse,['seed']);
 assert.ok(sparseResults.some(item=>item.game.id==='horizontal'));
 assert.equal(sparseResults.find(item=>item.game.id==='horizontal')?.reason,'more shooter games');
 const full=[{...base,id:'seed'},...Array.from({length:10},(_,index)=>({...base,id:`vertical-${index}`})),{...base,id:'horizontal',genre:'shooter-horizontalshooter'}];
 assert.ok(!recommendGames(full,['seed']).some(item=>item.game.id==='horizontal'));
});

test('Sega CD belongs in the 16-bit Discover category',()=>{
 assert.equal(discoverPlatform({...seed[0],system:'Sega CD'}),'16 bit');
});

test('Discover sorts rating bands including cached ratings, keeps gamelist priority and excludes cached low ratings',()=>{
 const base={...seed[0],genre:'Action'};
 const games=[{...base,id:'seed'},...[
  ['unrated',undefined],['sixties',60],['seventies',79],['eighties',80],['nineties',100],['cached',undefined],['cached-low',undefined],['gamelist',65],
 ].map(([id,rating])=>({...base,id:String(id),title:String(id),rating:rating as number|undefined}))];
 const cached=new Map([['cached',94],['cached-low',59],['gamelist',99]]);
 const results=recommendGames(games,['seed'],[],cached);
 assert.equal(results.length,7);
 assert.deepEqual(results.slice(0,2).map(item=>item.game.id).sort(),['cached','nineties']);
 assert.deepEqual(results.slice(2,4).map(item=>item.game.id),['eighties','seventies']);
 assert.equal(results.find(item=>item.game.id==='gamelist')?.game.rating,65);
 assert.equal(results.at(-1)?.game.id,'unrated');
 assert.ok(!results.some(item=>item.game.id==='cached-low'));
});

test('Discover shuffles within a band instead of alphabetising and does not reshuffle the showcase',t=>{
 const games=[{...seed[0],id:'seed'},...['Alpha','Bravo','Charlie','Delta'].map(title=>({...seed[0],id:title,title,rating:85}))];
 t.mock.method(Math,'random',()=>0);
 const first=recommendGames(games,['seed']);
 assert.deepEqual(first.map(item=>item.game.title),['Bravo','Charlie','Delta','Alpha']);
 t.mock.restoreAll();
 t.mock.method(Math,'random',()=>0.999);
 const second=recommendGames(games,['seed']);
 assert.notDeepEqual(first,second);
 const ready=new Set(first.map(item=>item.game.id));
 assert.deepEqual(discoverShowcase(first,ready),discoverShowcase(first,ready));
});

test('Discover showcase has artwork and five distinct systems, including the lead; all other games stay in the list',()=>{
 const systems=['SNES','SNES','Amiga','NES','Mega Drive','PlayStation','Game Boy'];
 const items=systems.map((system,index)=>({game:{...seed[0],id:String(index),system,rating:90-index},score:1,reason:''}));
 const ready=new Set(['0','1','2','3','4','5']);
 const result=discoverShowcase(items,ready);
 const top=[result.lead!,...result.rowGames];
 assert.equal(top.length,5);
 assert.equal(new Set(top.map(item=>item.game.system)).size,5);
 assert.ok(top.every(item=>ready.has(item.game.id)));
 assert.deepEqual(result.more.map(item=>item.game.id),['1','6']);
 assert.equal(top.length+result.more.length,items.length);
 const scarce=discoverShowcase(items,new Set(['0','1','2']));
 assert.equal(scarce.rowGames.length,2);
 assert.deepEqual([scarce.lead!,...scarce.rowGames].map(item=>item.game.id),['0','2','1']);
 assert.equal(scarce.more.length,4);
 const none=discoverShowcase(items,new Set());
 assert.equal(none.lead,undefined);
 assert.deepEqual(none.more,items);
});
test('Discover fills five artwork slots when a filtered category has fewer than five systems',()=>{
 const items=['PlayStation','PlayStation','3DO','PlayStation','3DO','PlayStation','3DO'].map((system,index)=>({game:{...seed[0],id:String(index),system,rating:90-index},score:1,reason:''}));
 const ready=new Set(['0','1','2','3','4','5']);
 const result=discoverShowcase(items,ready);
 const top=[result.lead!,...result.rowGames];
 assert.deepEqual(top.map(item=>item.game.id),['0','2','1','3','4']);
 assert.equal(new Set(top.map(item=>item.game.id)).size,5);
 assert.ok(top.every(item=>ready.has(item.game.id)));
 assert.deepEqual(result.more.map(item=>item.game.id),['5','6']);
});

test('cards show the cleaned primary and recognised sub-genre',()=>{
 assert.equal(cardGenre('sports-skiingsports'),'Sports — Skiing');
 assert.equal(cardGenre('shootem-up-verticalshootem-up'),'Shoot’em Up — Vertical');
 assert.equal(cardGenre('action-rpgrole-playing-game'),'Role-playing Game — Action RPG');
 assert.equal(cardGenre('platform-run-and-jumpplatform'),'Platform — Run and Jump');
 assert.equal(cardGenre('action-adventureaction'),'Action — Action Adventure');
});
test('IGDB rating selection prefers an exact title and closest release year',()=>{
 const rating=chooseIgdbRating([
  {name:'Another Game',total_rating:99,first_release_date:0},
  {name:'The Sonic',rating:81.4,first_release_date:631152000,platforms:[{name:'Sega Genesis'}]},
  {name:'Sonic',rating:70,first_release_date:1704067200,platforms:[{name:'Sega Genesis'}]},
 ],{title:'Sonic',year:1990,system:'Mega Drive'});
 assert.equal(rating,81.4);
 assert.equal(chooseIgdbRating([{name:'Unrelated'}],{title:'Sonic',year:1990,system:'Mega Drive'}),undefined);
 assert.equal(chooseIgdbRating([{name:'Sonic',rating:99,platforms:[{name:'PlayStation'}]}],{title:'Sonic',year:1990,system:'Mega Drive'}),undefined);
 assert.equal(chooseIgdbRating([{name:'Asteroids',rating:undefined,first_release_date:315532800,platforms:[{name:'Atari 2600'}]},{name:'Asteroids',total_rating:61.6,first_release_date:347155200,platforms:[{name:'Atari 2600'}]}],{title:'Asteroids',year:1981,system:'Atari 2600'}),61.6);
 assert.equal(chooseIgdbRating([{name:'Eco Fighters',total_rating:62.8,platforms:[{name:'Arcade'}]}],{title:'Eco Fighters',year:1994,system:'Capcom Play System II',category:'Arcade'}),62.8);
});
test('gamelist dates are normalised into list years',()=>{
 assert.equal(parseYear('1994'),1994);
 assert.equal(parseYear('1994-11-21'),1994);
 assert.equal(parseYear('19941121'),1994);
 assert.equal(parseYear(undefined),null);
});
test('gamelist ratings and regions are displayed consistently',()=>{
 assert.equal(parseRating('0.8'),80);
 assert.equal(parseRating('85'),85);
 assert.equal(parseRating('not a rating'),undefined);
 assert.equal(formatRegion('USA'),'USA 🇺🇸');
 assert.equal(regionFlag('Japan'),'🇯🇵');
 assert.equal(formatRegion('Europe'),'Europe 🇪🇺');
 assert.equal(formatRegion('Unknown territory'),'Unknown territory');
});

test('Discover categorises C64 and ZX Spectrum as 8 bit',()=>{
 const base={id:'system-check',title:'Test',category:'Computers' as const,year:null,developer:'Not listed',genre:'Platform',players:'1',description:''};
 assert.equal(discoverPlatform({...base,system:'Commodore 64'}),'8 bit');
 assert.equal(discoverPlatform({...base,system:'ZX Spectrum'}),'8 bit');
 assert.equal(discoverPlatform({...base,system:'Sinclair ZX Spectrum'}),'8 bit');
 assert.equal(discoverPlatform({...base,system:'PICO-8'}),'8 bit');
 assert.equal(discoverPlatform({...base,system:'TRS-80'}),'8 bit');
 assert.equal(discoverPlatform({...base,system:'TRS-80 CoCo 2'}),'8 bit');
 assert.equal(discoverPlatform({...base,system:'VTech CreatiVision'}),'8 bit');
 assert.equal(discoverPlatform({...base,system:'Amiga'}),'16 bit');
 assert.equal(discoverPlatform({...base,system:'Macintosh Plus'}),'16 bit');
 assert.equal(discoverPlatform({...base,system:'Sinclair QL'}),'16 bit');
 assert.equal(discoverPlatform({...base,system:'SuperGrafx'}),'16 bit');
 assert.equal(discoverPlatform({...base,system:'Tutor'}),'16 bit');
 assert.equal(discoverPlatform({...base,system:'Amiga CD32'}),'32/64 bit');
});

test('Arcade picker includes every arcade drill-down group',()=>{ const games=[{id:'cps',title:'Street Fighter II',system:'CPS 1',category:'Arcade',genre:'Fighting',developer:'Capcom',year:1991,description:''},{id:'sega',title:'Out Run',system:'Sega',category:'Arcade',genre:'Racing',developer:'Sega',year:1986,description:''},{id:'snes',title:'F-Zero',system:'SNES',category:'Consoles',genre:'Racing',developer:'Nintendo',year:1990,description:''}] as any; assert.deepEqual(filterGames(games,'','Arcade','title',false,[],'Arcade').map(game=>game.id),['sega','cps']); assert.deepEqual(filterGames(games,'','Arcade','title',false,[],'CPS 1').map(game=>game.id),['cps']); });

test('Arcade merge keeps one core record when a generic copy survives a partial sync',()=>{
 const shared={title:'1941 Counter Attack',category:'Arcade' as const,system:'Arcade',genre:"Shoot'em Up",developer:'Capcom',year:1990,description:''};
 const merged=groupGenericArcadeGames([{...shared,id:'old',remoteSystemId:'arcade'},{...shared,id:'fresh',remoteSystemId:'cps1',remoteFilePath:'/media/fat/_Arcade/1941.mra'}] as any);
 assert.deepEqual(merged.map(game=>game.id),['fresh']);
 assert.equal(merged[0].system,'CPS 1');
});

test('Arcade merge keeps different MRA files with the same game title',()=>{
 const base={title:'Tetris',category:'Arcade' as const,system:'Arcade',genre:'Puzzle',developer:'Not listed',year:1988,description:''};
 const merged=groupGenericArcadeGames([
  {...base,id:'atari',remoteSystemId:'atetris',remoteFilePath:'/media/fat/_Arcade/Atari Tetris.mra'},
  {...base,id:'sega',remoteSystemId:'segasys1',remoteFilePath:'/media/fat/_Arcade/Sega Tetris.mra'},
 ] as any);
 assert.deepEqual(merged.map(game=>game.id),['atari','sega']);
});

test('Discover caps each platform category at twenty games',()=>{
 const platforms=[['Game Boy','Consoles'],['NES','Consoles'],['SNES','Consoles'],['PlayStation','Consoles'],['MAME','Arcade']] as const;
 const games:any[]=[{...seed[0],id:'seed',system:'SNES',category:'Consoles',genre:'Action'}];
 for(const [system,category] of platforms)for(let index=0;index<25;index++)games.push({...seed[0],id:`${system}-${index}`,title:`${system} Game ${index}`,system,category,genre:'Action'});
 const results=recommendGames(games,['seed']);
 assert.equal(results.length,100);
 for(const platform of ['Handheld','8 bit','16 bit','32/64 bit','Arcade'] as const)assert.equal(results.filter(item=>discoverPlatform(item.game)===platform).length,20);
});
