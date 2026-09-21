import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseArtworkDirectory,matchLibretroFilename,libretroSystemsFor,artworkCacheFilename} from '../src/domain/libretroNaming.ts';
test('Eco Fighters resolves from a directory containing malformed percent escapes',()=>{
 const names=parseArtworkDirectory(`<a href="100% game.png">x</a><a href="Eco%20Fighters%20(USA%20940215).png">x</a>`);
 const game={title:'Eco Fighters',system:'Capcom Play II',category:'Arcade',id:'eco'} as any;
 assert.equal(matchLibretroFilename(game,names),'Eco Fighters (USA 940215).png');
 assert.equal(libretroSystemsFor(game)?.directories[0],'MAME');
});
test('Virtual Boy resolves to the Nintendo Virtual Boy artwork folder',()=>{
 assert.deepEqual(libretroSystemsFor({title:'Virtual Boy game',system:'VirtualBoy',category:'Consoles',id:'vb'} as any)?.directories,['Nintendo - Virtual Boy']);
});
test('punctuation in A.B. Cop is not treated as a file extension',()=>{
 assert.equal(matchLibretroFilename({title:'A.B. Cop',id:'ab'} as any,['A.B. Cop (FD1094 317-0169b).png']),'A.B. Cop (FD1094 317-0169b).png');
});
test('long ROM paths produce bounded, distinct cache filenames',()=>{
 const id='directory/'.repeat(60);
 assert.ok(artworkCacheFilename(id).length<40);
 assert.notEqual(artworkCacheFilename(id),artworkCacheFilename(id+'snap'));
});

