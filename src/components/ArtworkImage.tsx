import React,{useEffect,useState} from 'react';
import {Image,StyleSheet,Text,View,type ImageSourcePropType,type ImageStyle,type StyleProp} from 'react-native';
import {fallbackThumbnail,type Game} from '../data/library';
import {optimisticLibretroArtworkSource,readCachedLibretroSnap,readCachedLibretroThumbnail,readLibretroSnap,readLibretroThumbnail,subscribeToArtwork,libretroArtworkIdentity,libretroSnapArtworkIdentity} from '../domain/libretro';
import {fonts,palette as c,type ThemeMode} from '../theme';
import {Paper} from './Paper';

type Props={game:Game;style?:StyleProp<ImageStyle>;misterUrl?:string;allowDownload?:boolean;resizeMode?:'cover'|'contain';preferSnap?:boolean;priority?:'urgent'|'visible';theme?:ThemeMode;onResolved?:(source:ImageSourcePropType)=>void};

function ArtworkImageImpl({game,style,misterUrl,allowDownload=true,resizeMode='cover',preferSnap=false,priority='urgent',theme,onResolved}:Props){
 const artworkKey=`${game.id}|${game.system}|${game.title}|${preferSnap?'snap':'thumb'}`;
 const placeholder=fallbackThumbnail(game.genre);
 const fallback=preferSnap?(game.scene??game.image??placeholder):(game.image??placeholder);
 // The downloaded file's path is deterministic. Start from that path, rather
 // than genre art, while the asynchronous file check confirms it exists.
 const optimisticSource=optimisticLibretroArtworkSource(game,preferSnap);
 const [source,setSource]=useState<ImageSourcePropType|undefined>(optimisticSource??fallback);
 const [sourceKey,setSourceKey]=useState(artworkKey);
 const [artworkVersion,setArtworkVersion]=useState(0);
 useEffect(()=>subscribeToArtwork(id=>{if(id===libretroArtworkIdentity(game)||id===libretroSnapArtworkIdentity(game))setArtworkVersion(version=>version+1);}),[game.id,game.system,game.remoteSystemId,game.remoteMediaId,game.remoteFilePath,game.remotePath]);
 useEffect(()=>{
  let active=true;

  let published=false;
  const publish=(value:ImageSourcePropType|undefined)=>{if(active&&value){published=true;setSource(value);setSourceKey(artworkKey);onResolved?.(value);return true;}return false;};
  void (async()=>{
   const [cachedBox,cachedSnap]=await Promise.all([readCachedLibretroThumbnail(game).catch(()=>undefined),readCachedLibretroSnap(game).catch(()=>undefined)]);
   if(preferSnap){
    if(publish(cachedSnap))return;
    if(publish(cachedBox))return;
    if(!allowDownload)return;
    if(publish(await readLibretroSnap(game,priority==='urgent').catch(()=>undefined)))return;
    publish(await readLibretroThumbnail(game,priority==='urgent').catch(()=>undefined));
    return;
   }
   if(publish(cachedBox))return;
   if(publish(cachedSnap))return;
   if(!allowDownload)return;
   if(publish(await readLibretroThumbnail(game,priority==='urgent').catch(()=>undefined)))return;
   publish(await readLibretroSnap(game,priority==='urgent').catch(()=>undefined));
  })().finally(()=>{
   // If no local or remote image exists, resolve to the game's own fallback
   // only after the cache lookup. This keeps genre artwork out of the initial
   // frame while preserving it for genuinely unmatched games.
   if(active&&!published){setSource(fallback);setSourceKey(artworkKey);}
  });
  return()=>{active=false;};
 },[allowDownload,artworkKey,artworkVersion,game.category,game.id,game.image,game.remoteFilePath,game.remoteMediaId,game.remotePath,game.system,game.title,misterUrl,preferSnap,priority]);
 // A recycled list or Discover cell must never retain the previous game's image.
 const displaySource=sourceKey===artworkKey?source:(optimisticSource??fallback);
 if(!displaySource)return <View style={[styles.missing,style,{backgroundColor:c.card}]}><Paper opacity={.5}/><Text style={[styles.missingText,{color:c.muted}]}>No artwork available</Text></View>;
 // Android's native image view can retain an empty render surface when a parent
 // changes its presentation. Recreate only that native layer on a theme change;
 // the confirmed image source stays in React state.
 return <Image key={`${artworkKey}:${theme??'light'}`} source={displaySource} resizeMode={resizeMode} style={style} accessibilityLabel={`${game.title} artwork`} onError={()=>{setSource(placeholder);setSourceKey(artworkKey);}}/>;
}

export const ArtworkImage=React.memo(ArtworkImageImpl);

const styles=StyleSheet.create({missing:{alignItems:'center',justifyContent:'center',backgroundColor:'#E8DBC0'},missingText:{fontFamily:fonts.medium,fontSize:10,letterSpacing:.7,color:c.muted,textAlign:'center',padding:8}});
