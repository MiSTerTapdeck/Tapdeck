import React,{useEffect,useRef,useState} from 'react';
import {Platform,Animated,Image,Pressable,StyleSheet,Text,View} from 'react-native';
import {fallbackArtwork,type Game} from '../data/library';
import {isVintage} from '../domain/library';
import {fonts,palette as c} from '../theme';
import {Paper} from './Paper';
import {Icon} from './Icon';
import {readMiSTerArtwork} from '../domain/mister';
export function GameCard({game,index,saved,onPress,reducedMotion,artworkUrl}:{game:Game;index:number;saved:boolean;onPress:()=>void;reducedMotion:boolean;artworkUrl?:string}) {
 const scale=useRef(new Animated.Value(1)).current;
 const [remoteArtwork,setRemoteArtwork]=useState<Game['image']>();
 useEffect(()=>{let active=true;if(!artworkUrl||!game.remoteMediaId||game.image||game.remoteHasArtwork===false)return;const imageTypes=game.category==='Arcade'?['image','thumbnail','boxart','boxart3d','screenshot']:['image','thumbnail','boxart','boxart3d'];void readMiSTerArtwork(artworkUrl,game.remoteMediaId,imageTypes,512).then(image=>{if(active&&image)setRemoteArtwork(image);}).catch(()=>{});return()=>{active=false;};},[artworkUrl,game.id,game.image,game.remoteMediaId,game.remoteHasArtwork,game.category]);
 const vintage=isVintage(game.year);
 const artwork=game.image??remoteArtwork??fallbackArtwork(game.genre);
 const animate=(toValue:number)=>{if(!reducedMotion)Animated.spring(scale,{toValue,useNativeDriver:Platform.OS!=='web',speed:35,bounciness:0}).start();};
 return <Pressable accessibilityRole="button" accessibilityLabel={`Open ${game.title}, ${game.system}, ${game.year??'year unknown'}${saved?', saved':''}`} onPress={onPress} onPressIn={()=>animate(.965)} onPressOut={()=>animate(1)} testID={`card-${game.id}`} style={{flex:1}}>
  <Animated.View style={[s.card,{transform:[{scale}],backgroundColor:vintage?c.card:'#F9F5EA'}]}>
  <Paper opacity={vintage?.8:.14}/>
  <View style={s.top}><Text style={s.serial}>{String(index+1).padStart(3,'0')}</Text><Text style={[s.system,{color:game.system==='Mega Drive'?'#375970':game.system==='Arcade'?'#58623F':'#91402B'}]}>{game.system.toUpperCase()}</Text></View>
  <View style={[s.art,!game.image&&!remoteArtwork&&!!artwork&&{backgroundColor:'#EFE7D5'}]}>
   {artwork?<Image source={artwork} style={s.image} resizeMode={game.image||remoteArtwork?'cover':'contain'} accessibilityLabel={`${game.title} ${game.image||remoteArtwork?'original box artwork':'genre artwork'}`}/>:<View style={s.missing}><Icon name="computer" size={38} color="#9A8767"/><Text style={s.missingTitle}>{game.title}</Text><Text style={s.missingCaption}>ARTWORK UNAVAILABLE</Text></View>}
  </View>
  <View style={s.cardFoot}><Text style={s.cardGenre} numberOfLines={1}>{game.genre==='Not listed'?'COLLECTION':game.genre.toUpperCase()}</Text>{saved?<Icon name="bookmark" filled size={13} color={c.orange}/>:<Text style={s.year}>{game.year??'—'}</Text>}</View>
 </Animated.View>
 <Text style={s.title} numberOfLines={2}>{game.title}</Text>
 <Text style={s.subtitle}>{game.system} <Text style={{color:'#AA9C85'}}>·</Text> {game.year??'Year unknown'}{!vintage?'  ·  Recent release':''}</Text>
 </Pressable>;
}
const s=StyleSheet.create({
 card:{borderRadius:9,padding:9,borderWidth:1,borderColor:'#CCB994',boxShadow:'0px 3px 5px rgba(64,43,15,0.16)',overflow:'hidden'},
 top:{height:23,flexDirection:'row',alignItems:'flex-start',justifyContent:'space-between',gap:4},
 serial:{fontFamily:fonts.body,fontSize:10,color:c.muted},system:{fontFamily:fonts.bold,fontSize:10,letterSpacing:.6},
  art:{aspectRatio:.94,borderRadius:4,overflow:'hidden',backgroundColor:'#35362D'},
 artBackdrop:{...StyleSheet.absoluteFill,left:-8,right:-8,top:-8,bottom:-8,opacity:.7,transform:[{scale:1.12}]},artShade:{...StyleSheet.absoluteFill,backgroundColor:'rgba(25,23,17,.18)'},
 image:{width:'100%',height:'100%'},cardFoot:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',height:24,gap:6},
 cardGenre:{fontFamily:fonts.medium,fontSize:8,letterSpacing:1,color:'#67543A',flex:1},year:{fontFamily:fonts.medium,fontSize:10,color:'#67543A'},
 title:{fontFamily:fonts.display,fontSize:18,lineHeight:26,color:c.ink,marginTop:9,paddingBottom:1},subtitle:{fontFamily:fonts.body,fontSize:11,color:c.muted,lineHeight:17,marginTop:2},
 missing:{flex:1,backgroundColor:'#E8DBC0',alignItems:'center',justifyContent:'center',padding:10,gap:12},
 missingTitle:{fontFamily:fonts.italic,fontSize:22,textAlign:'center',color:'#756143'},missingCaption:{fontFamily:fonts.medium,fontSize:7,letterSpacing:1,textAlign:'center',color:'#7D6E57'},
});
