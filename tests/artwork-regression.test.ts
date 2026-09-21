import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseArtworkDirectory,matchLibretroFilename,libretroSystemsFor,artworkCacheFilename,libretroArtworkUrl} from '../src/domain/libretroNaming.ts';
test('Eco Fighters resolves from a directory containing malformed percent escapes',()=>{
 const names=parseArtworkDirectory(`<a href="100% game.png">x</a><a href="Eco%20Fighters%20(USA%20940215).png">x</a>`);
 const game={title:'Eco Fighters',system:'Capcom Play II',category:'Arcade',id:'eco'} as any;
 assert.equal(matchLibretroFilename(game,names),'Eco Fighters (USA 940215).png');
 assert.equal(libretroSystemsFor(game)?.directories[0],'MAME');
});
test('Virtual Boy resolves to the Nintendo Virtual Boy artwork folder',()=>{
 assert.deepEqual(libretroSystemsFor({title:'Virtual Boy game',system:'VirtualBoy',category:'Consoles',id:'vb'} as any)?.directories,['Nintendo - Virtual Boy']);
});
test('ZX Spectrum resolves to the Sinclair ZX Spectrum artwork folder',()=>{
 assert.deepEqual(libretroSystemsFor({title:'Manic Miner',system:'ZX Spectrum',remoteSystemId:'spectrum',category:'Computers',id:'spectrum'} as any)?.directories,['Sinclair - ZX Spectrum']);
});
test('punctuation in A.B. Cop is not treated as a file extension',()=>{
 assert.equal(matchLibretroFilename({title:'A.B. Cop',id:'ab'} as any,['A.B. Cop (FD1094 317-0169b).png']),'A.B. Cop (FD1094 317-0169b).png');
});
test('Neo Geo CD aliases embedded native titles and trailing articles',()=>{
 const names=['Ryuuko no Ken ~ Art of Fighting (Japan, USA) (En,Ja,Es).png',"King of Fighters '94, The (Japan) (En,Ja).png",'Art of Fighting - Ryuuko no Ken Gaiden ~ The Path of the Warrior - Art of Fighting 3 (Japan) (En,Ja,Es,Pt.png'];
 assert.equal(matchLibretroFilename({title:'Art of Fighting',id:'aof'} as any,names),names[0]);
 assert.equal(matchLibretroFilename({title:"King of Fighters '94, the",id:'kof94'} as any,names),names[1]);
 assert.equal(matchLibretroFilename({title:'Art of Fighting 3',id:'aof3'} as any,names),names[2]);
});
test('Neo Geo possessive titles match apostrophe variants',()=>{
 assert.equal(matchLibretroFilename({title:"Top Player's Golf",id:'top-golf'} as any,["Top Player's Golf (NGM-003)(NGH-003).png"]),"Top Player's Golf (NGM-003)(NGH-003).png");
 assert.equal(matchLibretroFilename({title:'Top Players Golf',id:'top-golf-2'} as any,["Top Player's Golf (NGM-003)(NGH-003).png"]),"Top Player's Golf (NGM-003)(NGH-003).png");
});
test("Atari 2600 Porky's matches and encodes punctuation safely",()=>{
 const game={title:"Porky's",system:'Atari2600',category:'Consoles',id:'porkys'} as any;
 assert.equal(matchLibretroFilename(game,["Porky's (USA).png"]),"Porky's (USA).png");
 assert.equal(libretroArtworkUrl('Atari - 2600','Named_Boxarts',"Porky's (USA).png"),'https://thumbnails.libretro.com/Atari%20-%202600/Named_Boxarts/Porky%27s%20%28USA%29.png');
});
test('Libretro directory parsing preserves apostrophes inside quoted links',()=>{
 const html='<a href="Porky\'s%20(USA).png">Porky\'s (USA).png</a><a href="Top%20Player\'s%20Golf%20(NGM-003)(NGH-003).png">Top Player\'s Golf</a>';
 assert.deepEqual(parseArtworkDirectory(html),["Porky's (USA).png","Top Player's Golf (NGM-003)(NGH-003).png"]);
});
test('long ROM paths produce bounded, distinct cache filenames',()=>{
 const id='directory/'.repeat(60);
 assert.ok(artworkCacheFilename(id).length<40);
 assert.notEqual(artworkCacheFilename(id),artworkCacheFilename(id+'snap'));
});

