import React,{useEffect,useState} from 'react';
import {Image,Pressable,StyleSheet,Text,View} from 'react-native';
import {fallbackThumbnail,type Game} from '../data/library';
import {fonts,palette as c} from '../theme';
import {Icon} from './Icon';
import {readMiSTerArtwork} from '../domain/mister';
export function GameRow({game,saved,onPress,annotation,trailing,artworkUrl}:{game:Game;saved:boolean;onPress:()=>void;annotation?:string;trailing?:React.ReactNode;artworkUrl?:string}) {
 const [remoteArtwork,setRemoteArtwork]=useState<Game['image']>();
 useEffect(()=>{let active=true;if(!artworkUrl||!game.remoteMediaId||game.image||game.remoteHasArtwork===false)return;void readMiSTerArtwork(artworkUrl,game.remoteMediaId,['thumbnail','boxart','boxart3d','image'],128).then(image=>{if(active&&image)setRemoteArtwork(image);}).catch(()=>{});return()=>{active=false;};},[artworkUrl,game.id,game.image,game.remoteMediaId,game.remoteHasArtwork]);
 const artwork=game.image??remoteArtwork??fallbackThumbnail(game.genre);
 return <Pressable testID={`row-${game.id}`} accessibilityRole="button" accessibilityLabel={`Open ${game.title}, ${game.system}, ${game.year??'year unknown'}${saved?', saved':''}`} onPress={onPress} style={s.row}>
  <View style={s.thumb}><Image source={artwork} resizeMode={game.image||remoteArtwork?'cover':'contain'} style={s.image} accessibilityLabel={`${game.title} ${game.image||remoteArtwork?'box artwork':'genre illustration'}`}/></View>
  <View style={s.copy}><Text style={s.title} numberOfLines={1}>{game.title}</Text><Text style={s.meta}>{game.system} <Text style={s.dot}>·</Text> {game.year??'Year unknown'}</Text><Text style={s.genre} numberOfLines={1}>{annotation??game.genre}</Text></View>
  {trailing??(saved&&<Icon name="bookmark" filled size={16} color={c.orange}/>)}
 </Pressable>;
}
const s=StyleSheet.create({row:{minHeight:86,paddingVertical:9,flexDirection:'row',alignItems:'center',gap:12,borderBottomWidth:1,borderColor:c.line},thumb:{height:66,width:56,padding:3,alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:'rgba(103,89,68,.42)',borderRadius:2},image:{height:'100%',width:'100%'},copy:{flex:1,gap:2},title:{fontFamily:fonts.display,fontSize:21,lineHeight:29,color:c.ink,paddingBottom:1},meta:{fontFamily:fonts.body,fontSize:11,color:c.muted},dot:{color:'#AA9C85'},genre:{fontFamily:fonts.medium,fontSize:9,letterSpacing:.7,textTransform:'uppercase',color:'#756144',marginTop:2}});
