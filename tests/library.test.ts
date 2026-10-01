import test from 'node:test';
import assert from 'node:assert/strict';
import {filterGames,genresForCategory,isVintage,parseSaved,searchGames,systemsForCategory} from '../src/domain/library.ts';
import {cardGenre,discoverGenreKey,primaryGenre} from '../src/domain/genre.ts';
import {parsePlaylists,reorderIds} from '../src/domain/playlists.ts';
import {chooseIgdbRating} from '../src/domain/igdb.ts';
import {formatRegion,parseRating,parseYear,regionFlag} from '../src/domain/gamelist.ts';
import {discoverPlatform,featuredRecommendation,recommendGames} from '../src/domain/discover.ts';
import {groupGenericArcadeGames} from '../src/domain/arcadeCores.ts';
import type {Game} from '../src/data/library';
const seed:Game[]=[
 {id:'a',title:'Super Metroid',system:'SNES',category:'Consoles',year:1994,genre:'Platform',developer:'Nintendo',players:'1',description:''},
 {id:'b',title:'Turrican II',system:'Amiga',category:'Computers',year:1991,genre:'Action',developer:'Factor 5',players:'1',description:''},
 {id:'c',title:'Modern game',system:'SNES',category:'Consoles',year:2026,genre:'Action',developer:'Studio',players:'1',description:''},
];
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
 assert.deepEqual(filterGames(seed,'Nintendo','Consoles','collection',true,['a','b'],'SNES').map(g=>g.id),['a']);
 assert.deepEqual(filterGames(seed,'','Consoles','collection',false,[],'Amiga'),[]);
 assert.deepEqual(filterGames(seed,'','Computers','collection',false,[],'Amiga').map(g=>g.id),['b']);
});
test('genre options respect the active family and genre filter intersects other filters',()=>{
 assert.deepEqual(genresForCategory(seed,'Consoles'),['Action','Platform']);
 assert.deepEqual(genresForCategory(seed,'Computers'),['Action']);
 assert.deepEqual(filterGames(seed,'','Consoles','collection',false,[],null,'Platform').map(g=>g.id),['a']);
 assert.deepEqual(filterGames(seed,'Nintendo','Consoles','collection',true,['a'],null,'Platform').map(g=>g.id),['a']);
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
 assert.deepEqual(filterGames([{...seed[0],genre:'sports-football-soccer'}],'','Consoles','collection',false,[],null,'Sports').map(g=>g.title),['Super Metroid']);
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

test('Sega CD belongs in the 16-bit Discover category',()=>{
 assert.equal(discoverPlatform({...seed[0],system:'Sega CD'}),'16 bit');
});

test('featured Discover recommendation prefers the seed game decade when available',()=>{
 const items=[
  {game:{...seed[1],year:2004},score:5,reason:''},
  {game:{...seed[2],year:1998},score:4,reason:''},
 ];
 assert.equal(featuredRecommendation(items,1994)?.game.id,'c');
 assert.equal(featuredRecommendation(items,1984)?.game.id,'b');
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

test('Arcade picker includes every arcade drill-down group',()=>{ const games=[{id:'cps',title:'Street Fighter II',system:'CPS 1',category:'Arcade',genre:'Fighting',developer:'Capcom',year:1991,description:''},{id:'sega',title:'Out Run',system:'Sega',category:'Arcade',genre:'Racing',developer:'Sega',year:1986,description:''},{id:'snes',title:'F-Zero',system:'SNES',category:'Consoles',genre:'Racing',developer:'Nintendo',year:1990,description:''}] as any; assert.deepEqual(filterGames(games,'','Arcade','collection',false,[],'Arcade').map(game=>game.id),['cps','sega']); assert.deepEqual(filterGames(games,'','Arcade','collection',false,[],'CPS 1').map(game=>game.id),['cps']); });

test('Arcade merge keeps one core record when a generic copy survives a partial sync',()=>{
 const shared={title:'1941 Counter Attack',category:'Arcade' as const,system:'Arcade',genre:"Shoot'em Up",developer:'Capcom',year:1990,description:''};
 const merged=groupGenericArcadeGames([{...shared,id:'old',remoteSystemId:'arcade'},{...shared,id:'fresh',remoteSystemId:'cps1',remoteFilePath:'/media/fat/_Arcade/1941.mra'}] as any);
 assert.deepEqual(merged.map(game=>game.id),['fresh']);
 assert.equal(merged[0].system,'CPS 1');
});

test('Discover caps each platform category at twenty games',()=>{
 const platforms=[['Game Boy','Consoles'],['NES','Consoles'],['SNES','Consoles'],['PlayStation','Consoles'],['MAME','Arcade']] as const;
 const games:any[]=[{...seed[0],id:'seed',system:'SNES',category:'Consoles',genre:'Action'}];
 for(const [system,category] of platforms)for(let index=0;index<25;index++)games.push({...seed[0],id:`${system}-${index}`,title:`${system} Game ${index}`,system,category,genre:'Action'});
 const results=recommendGames(games,['seed']);
 assert.equal(results.length,100);
 for(const platform of ['Handheld','8 bit','16 bit','32/64 bit','Arcade'] as const)assert.equal(results.filter(item=>discoverPlatform(item.game)===platform).length,20);
});
