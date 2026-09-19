import React,{useEffect,useState} from 'react';
import {Image,StyleSheet,Text,View,type ImageSourcePropType,type ImageStyle,type StyleProp} from 'react-native';
import type {Game} from '../data/library';
import {readCachedLibretroSnap,readCachedLibretroThumbnail,readLibretroSnap,readLibretroThumbnail,subscribeToArtwork} from '../domain/libretro';
import {normaliseMiSTerUrl,readCachedMiSTerThumbnail,readMiSTerThumbnail} from '../domain/mister';
import {fonts,palette as c} from '../theme';

type Props={game:Game;style?:StyleProp<ImageStyle>;misterUrl?:string;allowDownload?:boolean;resizeMode?:'cover'|'contain';onResolved?:(source:ImageSourcePropType)=>void};

export function ArtworkImage({game,style,misterUrl,allowDownload=true,resizeMode='cover',onResolved}:Props){
 const [source,setSource]=useState<ImageSourcePropType|undefined>(game.image);
 const [cacheVersion,setCacheVersion]=useState(0);
 useEffect(()=>subscribeToArtwork(()=>setCacheVersion(version=>version+1)),[]);
 useEffect(()=>{
  let active=true;
  setSource(game.image);
  if(game.image&&game.remoteMediaId===undefined)return()=>{active=false;};
  const publish=(value:ImageSourcePropType|undefined)=>{if(active&&value){setSource(value);onResolved?.(value);return true;}return false;};
  void (async()=>{
   const url=misterUrl?normaliseMiSTerUrl(misterUrl):undefined;
   if(url&&game.remoteMediaId!==undefined&&publish(await readCachedMiSTerThumbnail(url,game.remoteMediaId,game.category).catch(()=>undefined)))return;
   if(publish(await readCachedLibretroThumbnail(game).catch(()=>undefined)))return;
   if(publish(await readCachedLibretroSnap(game).catch(()=>undefined)))return;
   if(!allowDownload)return;
   if(url&&game.remoteMediaId!==undefined&&publish(await readMiSTerThumbnail(url,game.remoteMediaId,game.category).catch(()=>undefined)))return;
   if(publish(await readLibretroThumbnail(game).catch(()=>undefined)))return;
   publish(await readLibretroSnap(game).catch(()=>undefined));
  })();
  return()=>{active=false;};
 },[allowDownload,cacheVersion,game.category,game.id,game.image,game.remoteFilePath,game.remoteMediaId,game.remotePath,game.system,game.title,misterUrl]);
 if(!source)return <View style={[styles.missing,style]}><Text style={styles.missingText}>No artwork available</Text></View>;
 return <Image source={source} resizeMode={resizeMode} style={style} accessibilityLabel={`${game.title} artwork`}/>;
}

const styles=StyleSheet.create({missing:{alignItems:'center',justifyContent:'center',backgroundColor:'#E8DBC0'},missingText:{fontFamily:fonts.medium,fontSize:10,letterSpacing:.7,color:c.muted,textAlign:'center',padding:8}});
