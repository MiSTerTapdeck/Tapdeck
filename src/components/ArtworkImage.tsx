import React,{useEffect,useState} from 'react';
import {Image,StyleSheet,Text,View,type ImageSourcePropType,type ImageStyle,type StyleProp} from 'react-native';
import {fallbackThumbnail,type Game} from '../data/library';
import {readCachedLibretroSnap,readCachedLibretroThumbnail,readLibretroSnap,readLibretroThumbnail,subscribeToArtwork,libretroArtworkIdentity,libretroSnapArtworkIdentity} from '../domain/libretro';
import {fonts,palette as c} from '../theme';
import {Paper} from './Paper';

type Props={game:Game;style?:StyleProp<ImageStyle>;misterUrl?:string;allowDownload?:boolean;resizeMode?:'cover'|'contain';preferSnap?:boolean;priority?:'urgent'|'visible';onResolved?:(source:ImageSourcePropType)=>void};

function ArtworkImageImpl({game,style,misterUrl,allowDownload=true,resizeMode='cover',preferSnap=false,priority='urgent',onResolved}:Props){
 const artworkKey=`${game.id}|${game.system}|${game.title}|${preferSnap?'snap':'thumb'}`;
 // A local snap is immediately useful for feature cards while the Libretro
 // cache resolves. Box artwork remains the fallback for ordinary cards.
 const fallback=preferSnap?(game.scene??fallbackThumbnail(game.genre)):(game.image??fallbackThumbnail(game.genre));
 const [source,setSource]=useState<ImageSourcePropType|undefined>(fallback);
 const [sourceKey,setSourceKey]=useState(artworkKey);
 const [artworkVersion,setArtworkVersion]=useState(0);
 useEffect(()=>subscribeToArtwork(id=>{if(id===libretroArtworkIdentity(game)||id===libretroSnapArtworkIdentity(game))setArtworkVersion(version=>version+1);}),[game.id,game.system,game.remoteSystemId,game.remoteMediaId,game.remoteFilePath,game.remotePath]);
 useEffect(()=>{
  let active=true;

  const publish=(value:ImageSourcePropType|undefined)=>{if(active&&value){setSource(value);setSourceKey(artworkKey);onResolved?.(value);return true;}return false;};
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
  })();
  return()=>{active=false;};
 },[allowDownload,artworkKey,artworkVersion,game.category,game.id,game.image,game.remoteFilePath,game.remoteMediaId,game.remotePath,game.system,game.title,misterUrl,preferSnap,priority]);
 // A recycled list or Discover cell must never retain the previous game's image.
 // Until this game's cache/download resolves, show its own fallback artwork.
 const displaySource=sourceKey===artworkKey?source:fallback;
 if(!displaySource)return <View style={[styles.missing,style]}><Paper opacity={.5}/><Text style={styles.missingText}>No artwork available</Text></View>;
 return <Image source={displaySource} resizeMode={resizeMode} style={style} accessibilityLabel={`${game.title} artwork`}/>;
}

export const ArtworkImage=React.memo(ArtworkImageImpl);

const styles=StyleSheet.create({missing:{alignItems:'center',justifyContent:'center',backgroundColor:'#E8DBC0'},missingText:{fontFamily:fonts.medium,fontSize:10,letterSpacing:.7,color:c.muted,textAlign:'center',padding:8}});
