import type { ImageSourcePropType } from 'react-native';
import samples from './pack-samples.json';
import sega32x from './sega32x.json';
export type Category = 'All' | 'Consoles' | 'Computers' | 'Arcade';
export interface Game {
  id: string; title: string; system: string; category: Exclude<Category,'All'>;
  year: number | null; developer: string; genre: string; players: string;
  description: string; image?: ImageSourcePropType; scene?: ImageSourcePropType; source?: string; packKey?: string; remotePath?: string; remoteMediaId?:number; localArtworkSystem?: string; localThumbnail?: string; localMix?: string;
}
const images: Record<string,ImageSourcePropType> = {
  'super-metroid':require('../../assets/artwork/super-metroid.jpg'),
  'sonic-2':require('../../assets/artwork/sonic-2.jpg'),
  'bubble-bobble':require('../../assets/artwork/bubble-bobble.jpg'),
  'gunstar-heroes':require('../../assets/artwork/gunstar-heroes.jpg'),
  'metroid':require('../../assets/artwork/metroid.jpg'),
  'super-turrican':require('../../assets/artwork/super-turrican.jpg'),
  'turrican-collection':require('../../assets/artwork/turrican-collection.jpg'),
  'turrican-ii-amiga':require('../../assets/artwork/turrican-ii-amiga.png'),
};
const scenes: Record<string,ImageSourcePropType> = {
  'super-metroid':require('../../assets/scenes/super-metroid.jpg'),
  'sonic-2':require('../../assets/scenes/sonic-2.jpg'),
  'bubble-bobble':require('../../assets/scenes/bubble-bobble.jpg'),
  'gunstar-heroes':require('../../assets/scenes/gunstar-heroes.jpg'),
  'metroid':require('../../assets/scenes/metroid.jpg'),
  'super-turrican':require('../../assets/scenes/super-turrican.jpg'),
  'turrican-collection':require('../../assets/scenes/turrican-collection.jpg'),
  'turrican-ii-amiga':require('../../assets/scenes/turrican-ii-amiga.png'),
};
const genreFallbacks:Record<string,ImageSourcePropType>={
  'Action':require('../../assets/fallbacks/transparent/action.png'),'Adventure':require('../../assets/fallbacks/transparent/adventure.png'),'Fighting':require('../../assets/fallbacks/transparent/fighting.png'),'Platform':require('../../assets/fallbacks/transparent/platform.png'),'Puzzle':require('../../assets/fallbacks/transparent/puzzle.png'),'Racing':require('../../assets/fallbacks/transparent/racing.png'),'Role-playing':require('../../assets/fallbacks/transparent/role-playing.png'),'Shooter':require('../../assets/fallbacks/transparent/shooter.png'),'Simulation':require('../../assets/fallbacks/transparent/simulation.png'),'Sports':require('../../assets/fallbacks/transparent/sports.png'),'Strategy':require('../../assets/fallbacks/transparent/strategy.png'),
};
const genreThumbnails:Record<string,ImageSourcePropType>={
  'Action':require('../../assets/fallbacks/thumbnails/action.png'),'Adventure':require('../../assets/fallbacks/thumbnails/adventure.png'),'Fighting':require('../../assets/fallbacks/thumbnails/fighting.png'),'Platform':require('../../assets/fallbacks/thumbnails/platform.png'),'Puzzle':require('../../assets/fallbacks/thumbnails/puzzle.png'),'Racing':require('../../assets/fallbacks/thumbnails/racing.png'),'Role-playing':require('../../assets/fallbacks/thumbnails/role-playing.png'),'Shooter':require('../../assets/fallbacks/thumbnails/shooter.png'),'Simulation':require('../../assets/fallbacks/thumbnails/simulation.png'),'Sports':require('../../assets/fallbacks/thumbnails/sports.png'),'Strategy':require('../../assets/fallbacks/thumbnails/strategy.png'),
};
export function fallbackArtwork(genre:string){return genreFallbacks[genre]??genreFallbacks.Adventure;}
export function fallbackThumbnail(genre:string){return genreThumbnails[genre]??genreThumbnails.Adventure;}
const clean = (s:string) => s.replace(/&quot;/g,'"').replace(/&amp;/g,'&').replace(/&#39;/g,"'");
export const games:Game[] = samples.map(g=>({
  id:g.id, title:g.name, system:g.system==='Genesis'?'Mega Drive':g.system,
  category:g.system==='Arcade'?'Arcade':'Consoles', year:Number(g.year)||null,
  developer:g.developer, genre: g.genre.split('/')[0].trim() || 'Not listed',
  players:g.players, description:clean(g.synopsis), image:images[g.id], scene:g.hasScene?scenes[g.id]:undefined, source:g.source, packKey:g.key,
}));
games.splice(2,0,{
  id:'turrican-ii-amiga',title:'Turrican II',system:'Amiga',category:'Computers',year:1991,
  developer:'Factor 5',genre:'Action',players:'1',
  description:'The Final Fight takes Turrican’s Amiga action across alien worlds, with a sprawling arsenal, dense levels and Factor 5’s celebrated score.',image:images['turrican-ii-amiga'],scene:scenes['turrican-ii-amiga'],source:'User-supplied artwork',
});
games.push(...sega32x.map(game=>({
  id:game.id,title:game.title,system:'32X',category:'Consoles' as const,year:game.year,
  developer:game.developer,genre:game.genre,players:game.players,description:game.description,
  source:'Local RetroBat test library',packKey:game.artworkPath,
  localArtworkSystem:'32x',localThumbnail:game.artworkPath.replace(/-image\.png$/i,'-thumb.png'),localMix:game.artworkPath,
})));
export const categories:Category[] = ['All','Consoles','Computers','Arcade'];
