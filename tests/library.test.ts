import test from 'node:test';
import assert from 'node:assert/strict';
import {filterGames,genresForCategory,isVintage,parseSaved,searchGamesByTitle,systemsForCategory} from '../src/domain/library.ts';
import {primaryGenre} from '../src/domain/genre.ts';
import {parsePlaylists,reorderIds} from '../src/domain/playlists.ts';
import {recommendGames} from '../src/domain/discover.ts';
import type {Game} from '../src/data/library';
const seed:Game[]=[
 {id:'a',title:'Super Metroid',system:'SNES',category:'Consoles',year:1994,genre:'Platform',developer:'Nintendo',players:'1',description:''},
 {id:'b',title:'Turrican II',system:'Amiga',category:'Computers',year:1991,genre:'Action',developer:'Factor 5',players:'1',description:''},
 {id:'c',title:'Modern game',system:'SNES',category:'Consoles',year:2026,genre:'Action',developer:'Studio',players:'1',description:''},
];
test('search combines words across metadata and intersects the category',()=>{
 assert.deepEqual(filterGames(seed,'  nintendo  SNES ','Consoles').map(g=>g.id),['a']);
 assert.equal(filterGames(seed,'Nintendo','Computers').length,0);
});
test('saved filter intersects search without mutating input order',()=>{
 assert.deepEqual(filterGames(seed,'SNES','All','year',true,['a','c']).map(g=>g.id),['c','a']);
 assert.deepEqual(seed.map(g=>g.id),['a','b','c']);
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
test('global game search matches titles only and ignores metadata matches',()=>{
 const games=[...seed,{...seed[1],id:'d',title:'Unrelated game',developer:'Sonic Team'}];
 assert.deepEqual(searchGamesByTitle(games,'metroid').map(game=>game.id),['a']);
 assert.deepEqual(searchGamesByTitle(games,'sonic'),[]);
});
test('primary genres normalize Zaparoo genre taxonomy and preserve full genre search',()=>{
 assert.equal(primaryGenre('sports-football-soccer'), 'Sports');
 assert.equal(primaryGenre('racing,-drivingracing-fpv'), 'Racing');
 assert.equal(primaryGenre('action-rpgrole-playing-game'), 'Action');
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
