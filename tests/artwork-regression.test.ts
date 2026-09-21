import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseArtworkDirectory,matchLibretroFilename,libretroSystemsFor,libretroArtworkIdentity,artworkCacheFilename,libretroArtworkUrl} from '../src/domain/libretroNaming.ts';
import {c64TapeLoadCommands,isC64TapeImage,launchRoutesFor} from '../src/domain/misterRemote.ts';
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
test('Neo Geo MVS prioritizes the dedicated Neo Geo artwork set',()=>{
 assert.deepEqual(libretroSystemsFor({title:'Samurai Shodown',system:'Neo Geo MVS',remoteSystemId:'neogeo-mvs',category:'Arcade',id:'samsho'} as any)?.directories,['SNK - Neo Geo','MAME','FBNeo - Arcade Games']);
});
test('Neo Geo MVS artwork uses a new cache identity after the source correction',()=>{
 const game={title:'Samurai Shodown',system:'Neo Geo MVS',remoteSystemId:'neogeo-mvs',remoteFilePath:'/media/fat/games/Neo Geo MVS/samsho.zip',category:'Arcade',id:'samsho'} as any;
 assert.match(libretroArtworkIdentity(game),/neo-geo-source-v2/);
});
test('ZX Spectrum artwork uses a new cache identity after the matcher correction',()=>{
 const game={title:'Academy - Side 1',system:'ZXSpectrum',remoteSystemId:'ZXSpectrum',remoteFilePath:'/media/usb3/games/Spectrum/Academy - Side 1.tzx',category:'Computers',id:'academy'} as any;
 assert.match(libretroArtworkIdentity(game),/spectrum-match-v2/);
});
test('Spectrum tape sides resolve to their base game and never a short unrelated title',()=>{
 const game={title:'Academy - Side 1',remoteFilePath:'/media/usb3/games/Spectrum/Academy - Side 1.tzx',id:'academy'} as any;
 assert.equal(matchLibretroFilename(game,['iD (Nu Wave Software).png','Academy (CRL Group).png']),'Academy (CRL Group).png');
 assert.equal(matchLibretroFilename(game,['iD (Nu Wave Software).png','Para Academy (Zeppelin Games Ltd).png']),undefined);
});
test('Spectrum sequels do not fall back to a shorter game title',()=>{
 const game={title:'Alien8',remoteFilePath:'/media/usb3/games/Spectrum/Alien8.tzx',id:'alien8'} as any;
 assert.equal(matchLibretroFilename(game,['Alien (Mind Games).png','Alien 8 (Ultimate Play The Game).png']),'Alien 8 (Ultimate Play The Game).png');
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


test('C64 and Spectrum use MiSTer Remote’s game loader before the compatibility route',()=>{
 assert.deepEqual(launchRoutesFor({remoteSystemId:'C64'} as any),['/games/launch','/launch']);
 assert.deepEqual(launchRoutesFor({remoteSystemId:'ZXSpectrum'} as any),['/games/launch','/launch']);
 assert.deepEqual(launchRoutesFor({remoteSystemId:'SNES'} as any),['/launch']);
});

test('C64 T64 files start the tape load command without changing cartridge launches',()=>{
 assert.equal(isC64TapeImage({remoteSystemId:'C64',remoteFilePath:'/media/usb3/games/C64/Impossible Mission.t64'} as any),true);
 assert.equal(isC64TapeImage({remoteSystemId:'C64',remoteFilePath:'/media/usb3/games/C64/Final Cartridge.crt'} as any),false);
 assert.deepEqual(c64TapeLoadCommands(),['kbdRaw:38','kbdRaw:24','kbdRaw:30','kbdRaw:32','kbdRaw:28']);
});
