import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseArtworkDirectory,parseArtworkDirectoryInChunks,matchLibretroFilename,matchLibretroFilenameInChunks,libretroSystemsFor,libretroArtworkIdentity,artworkCacheFilename,libretroArtworkUrl} from '../src/domain/libretroNaming.ts';
import {amigaVisionCanonicalTitle,c64RunCommands,c64TapeLoadCommands,isC64TapeImage,isSpectrumTapeImage,launchRoutesFor,mglLaunchPath,spectrumTapeLoadCommands,usbMountCandidates} from '../src/domain/misterRemote.ts';
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
 assert.match(libretroArtworkIdentity(game),/neo-geo-source-v3/);
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

test('chunked Libretro directory parsing preserves filenames',async()=>{
 const html='<a href="Porky\'s%20(USA).png">Porky\'s</a><a href="Top%20Player\'s%20Golf.png">Top Player\'s</a>';
 assert.deepEqual(await parseArtworkDirectoryInChunks(html),parseArtworkDirectory(html));
});

test('chunked artwork matching preserves Spectrum matches in a large directory',async()=>{
 const game={title:'Academy - Side 1',remoteFilePath:'/media/usb3/games/Spectrum/Academy - Side 1.tzx',id:'academy'} as any;
 const names=[...Array.from({length:1000},(_,index)=>`Unrelated ${index}.png`),'Academy (1986).png'];
 assert.equal(await matchLibretroFilenameInChunks(game,names),'Academy (1986).png');
});
test('long ROM paths produce bounded, distinct cache filenames',()=>{
 const id='directory/'.repeat(60);
 assert.ok(artworkCacheFilename(id).length<40);
 assert.notEqual(artworkCacheFilename(id),artworkCacheFilename(id+'snap'));
});


test('ordinary systems use MiSTer Remote’s game launch endpoint',()=>{
 assert.deepEqual(launchRoutesFor({remoteSystemId:'C64'} as any),['/games/launch']);
 assert.deepEqual(launchRoutesFor({remoteSystemId:'ZXSpectrum'} as any),['/games/launch']);
 assert.deepEqual(launchRoutesFor({remoteSystemId:'SNES'} as any),['/games/launch']);
});
test('a user-provided MGL launches through MiSTer Remote for any core',()=>{
 const custom={title:'Custom computer game',system:'My Core',remoteSystemId:'MisterOtherMyCore',remoteFilePath:'/media/fat/games/My Core/Custom computer game.mgl'} as any;
 assert.equal(mglLaunchPath(custom),custom.remoteFilePath);
 assert.deepEqual(launchRoutesFor(custom),['/launch']);
});
test('CD32Vision and 0MHz DOS games use their MGL launchers',()=>{
 const dos={title:'Big Red Racing',system:'PC (DOS)',remoteSystemId:'ao486',remoteFilePath:'/media/usb0/games/AO486/media/big red racing/big red racing.chd'} as any;
 const cd32={title:'Alfred Chicken',system:'Amiga CD32',remoteSystemId:'cd32',remoteFilePath:'/media/usb0/games/AmigaCD32/Alfred Chicken (1993).chd'} as any;
 assert.equal(mglLaunchPath(dos),'/media/fat/_DOS Games/Big Red Racing.mgl');
 assert.equal(mglLaunchPath(cd32),'/media/fat/_Console/_Amiga CD32 Games/Alfred Chicken (1993).mgl');
 assert.deepEqual(launchRoutesFor(dos),['/launch']);
 assert.deepEqual(launchRoutesFor(cd32),['/launch']);
});
test('USB game paths are checked against every MiSTer USB mount without changing their game-relative path',()=>{
 const expected=Array.from({length:8},(_,index)=>`/media/usb${index}/games/SNES/3 Ninjas Kick Back (USA).sfc`);
 assert.deepEqual(usbMountCandidates('/media/usb0/games/SNES/3 Ninjas Kick Back (USA).sfc'),expected);
 assert.deepEqual(usbMountCandidates('/media/fat/games/SNES/3 Ninjas Kick Back (USA).sfc'),['/media/fat/games/SNES/3 Ninjas Kick Back (USA).sfc']);
});

test('C64 T64 files start the tape load command without changing cartridge launches',()=>{
 assert.equal(isC64TapeImage({remoteSystemId:'C64',remoteFilePath:'/media/usb3/games/C64/Impossible Mission.t64'} as any),true);
 assert.equal(isC64TapeImage({remoteSystemId:'C64',remoteFilePath:'/media/usb3/games/C64/Final Cartridge.crt'} as any),false);
 assert.deepEqual(c64TapeLoadCommands(),['kbdRaw:38','kbdRaw:24','kbdRaw:30','kbdRaw:32','kbdRaw:28']);
 assert.deepEqual(c64RunCommands(),['kbdRaw:19','kbdRaw:22','kbdRaw:49','kbdRaw:28']);
});

test('Spectrum tape files use the MiSTer core autoload shortcut without affecting snapshots',()=>{
 assert.equal(isSpectrumTapeImage({remoteSystemId:'ZXSpectrum',remoteFilePath:'/media/usb3/games/Spectrum/Academy.tzx'} as any),true);
 assert.equal(isSpectrumTapeImage({remoteSystemId:'ZXSpectrum',remoteFilePath:'/media/usb3/games/Spectrum/Academy.tap'} as any),true);
 assert.equal(isSpectrumTapeImage({remoteSystemId:'ZXSpectrum',remoteFilePath:'/media/usb3/games/Spectrum/Academy.z80'} as any),false);
 assert.deepEqual(spectrumTapeLoadCommands(),['kbdRaw:68']);
});

test('AmigaVision virtual games retain the canonical title needed by ags_boot',()=>{
 assert.equal(amigaVisionCanonicalTitle({remoteSystemId:'Amiga',remoteFilePath:'/media/fat/games/Amiga/Games/1000 Miglia (OCS)[en]'}),'1000 Miglia (OCS)[en]');
 assert.equal(amigaVisionCanonicalTitle({remoteSystemId:'Amiga',remoteFilePath:'/media/fat/games/Amiga/Demos/State of the Art (AGA)'}),'State of the Art (AGA)');
 assert.equal(amigaVisionCanonicalTitle({remoteSystemId:'Amiga',remoteFilePath:'/media/fat/games/Amiga/Normal Game.adf'}),undefined);
 assert.equal(amigaVisionCanonicalTitle({remoteSystemId:'SNES',remoteFilePath:'/media/fat/games/Amiga/Games/1000 Miglia (OCS)[en]'}),undefined);
});

test('artwork cache identities survive a Zaparoo file-path refresh',()=>{
 const before={title:'Ballblazer',system:'Atari 7800',category:'Consoles',id:'ballblazer',remoteSystemId:'atari7800',remoteFilePath:'/media/usb0/games/Atari 7800/Ballblazer.a78'} as any;
 const after={...before,remoteFilePath:'/media/fat/games/Atari 7800/Ballblazer.a78'};
 assert.equal(libretroArtworkIdentity(before),libretroArtworkIdentity(after));
});

test('SuperGrafx uses its dedicated Libretro folder and handles expanded titles',()=>{
 const game={system:'SuperGrafx',remoteSystemId:'supergrafx',category:'Consoles',id:'sg'} as any;
 assert.deepEqual(libretroSystemsFor(game)?.directories,['NEC - PC Engine SuperGrafx']);
 assert.equal(matchLibretroFilename({...game,title:'Aldynes'},['Aldynes - The Misson Code for Rage Crisis (Japan).png']),'Aldynes - The Misson Code for Rage Crisis (Japan).png');
 assert.equal(matchLibretroFilename({...game,title:'Madou ou Granzort'},['Madou King Granzort (Japan).png']),'Madou King Granzort (Japan).png');
});

test('HBMAME suffixes are ignored when matching arcade artwork',()=>{ assert.equal(matchLibretroFilename({title:'Alien Storm (HBMAME)',category:'Arcade',id:'alien-storm'} as any,['Alien Storm (World, 2 Players).png']),'Alien Storm (World, 2 Players).png'); });

test('readable system names resolve to their Libretro thumbnail directories',()=>{
 const cases:[string,string][]=[
  ['ColecoVision','Coleco - ColecoVision'],
  ['Commodore 64','Commodore - 64'],
  ['PC (DOS)','DOS'],
  ['Amiga CD32','Commodore - CD32'],
  ['3DO','The 3DO Company - 3DO'],
  ['Amstrad CPC','Amstrad - CPC'],
  ['MSX2','Microsoft - MSX2'],
  ['Sega SG-1000','Sega - SG-1000'],
  ['Sony PlayStation Portable','Sony - PlayStation Portable']
 ];
 for(const [system,directory] of cases)assert.deepEqual(libretroSystemsFor({title:'Test game',system,category:'Computers',id:system} as any)?.directories,[directory]);
});
test('Neo Geo base titles do not match sequel box art first',()=>{
 const names=[
  'Art of Fighting 2 _ Ryuuko no Ken 2 (NGM-056).png',
  'Art of Fighting _ Ryuuko no Ken (NGM-044)(NGH-044).png'
 ];
 assert.equal(matchLibretroFilename({title:'Art of Fighting',id:'aof'} as any,names),names[1]);
 assert.equal(matchLibretroFilename({title:'Art of Fighting 2',id:'aof2'} as any,names),names[0]);
});
