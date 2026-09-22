import React,{useRef} from 'react';
import {Platform,Animated,Pressable,StyleSheet,Text,View} from 'react-native';
import type {Game} from '../data/library';
import {isVintage} from '../domain/library';
import {fonts,palette as c} from '../theme';
import {Paper} from './Paper';
import {Icon} from './Icon';
import {ArtworkImage} from './ArtworkImage';
function GameCardImpl({game,index,saved,onPress,reducedMotion,artworkUrl,fetchRemote,allowDownload=true}:{game:Game;index:number;saved:boolean;onPress:()=>void;reducedMotion:boolean;artworkUrl?:string;fetchRemote?:boolean;allowDownload?:boolean}) {
 const scale=useRef(new Animated.Value(1)).current;
 const vintage=isVintage(game.year);
 const animate=(toValue:number)=>{if(!reducedMotion)Animated.spring(scale,{toValue,useNativeDriver:Platform.OS!=='web',speed:35,bounciness:0}).start();};
 return <Pressable accessibilityRole="button" accessibilityLabel={`Open ${game.title}, ${game.system}, ${game.year??'year unknown'}${saved?', saved':''}`} onPress={onPress} onPressIn={()=>animate(.965)} onPressOut={()=>animate(1)} testID={`card-${game.id}`} style={{flex:1}}>
  <Animated.View style={[s.card,{transform:[{scale}],backgroundColor:vintage?c.card:'#F9F5EA'}]}>
  <Paper opacity={vintage?.8:.14}/>
  <View style={s.top}><Text style={s.serial}>{String(index+1).padStart(3,'0')}</Text><Text style={[s.system,{color:game.system==='Mega Drive'?'#375970':game.system==='Arcade'?'#58623F':'#91402B'}]}>{game.system.toUpperCase()}</Text></View>
  <View style={s.art}><ArtworkImage game={game} misterUrl={artworkUrl} allowDownload={allowDownload} style={s.image}/></View>
  <View style={s.cardFoot}><Text style={s.cardGenre} numberOfLines={1}>{game.genre==='Not listed'?'COLLECTION':game.genre.toUpperCase()}</Text>{saved?<Icon name="bookmark" filled size={13} color={c.orange}/>:<Text style={s.year}>{game.year??'—'}</Text>}</View>
 </Animated.View>
 <Text style={s.title} numberOfLines={2}>{game.title}</Text>
 <Text style={s.subtitle}>{game.system} <Text style={{color:'#AA9C85'}}>·</Text> {game.year??'Year unknown'}{!vintage?'  ·  Recent release':''}</Text>
 </Pressable>;
}
export const GameCard=React.memo(GameCardImpl,(a,b)=>a.game.id===b.game.id&&a.game.image===b.game.image&&a.index===b.index&&a.saved===b.saved&&a.reducedMotion===b.reducedMotion&&a.artworkUrl===b.artworkUrl&&a.allowDownload===b.allowDownload&&a.onPress===b.onPress);
const s=StyleSheet.create({
 card:{borderRadius:9,padding:9,borderWidth:1,borderColor:'#CCB994',boxShadow:'0px 3px 5px rgba(64,43,15,0.16)',overflow:'hidden'},
 top:{height:23,flexDirection:'row',alignItems:'flex-start',justifyContent:'space-between',gap:4},
 serial:{fontFamily:fonts.body,fontSize:10,color:c.muted},system:{fontFamily:fonts.bold,fontSize:10,letterSpacing:.6},
  art:{aspectRatio:.94,borderRadius:4,overflow:'hidden',backgroundColor:'#35362D'},
 artBackdrop:{...StyleSheet.absoluteFill,left:-8,right:-8,top:-8,bottom:-8,opacity:.7,transform:[{scale:1.12}]},artShade:{...StyleSheet.absoluteFill,backgroundColor:'rgba(25,23,17,.18)'},
 image:{width:'100%',height:'100%'},cardFoot:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',height:24,gap:6},
 cardGenre:{fontFamily:fonts.medium,fontSize:8,letterSpacing:1,color:'#67543A',flex:1},year:{fontFamily:fonts.medium,fontSize:10,color:'#67543A'},
 title:{fontFamily:fonts.display,fontSize:20,lineHeight:28,color:c.ink,marginTop:9,paddingBottom:1},subtitle:{fontFamily:fonts.body,fontSize:13,color:c.muted,lineHeight:19,marginTop:2},
 missing:{flex:1,backgroundColor:'#E8DBC0',alignItems:'center',justifyContent:'center',padding:10,gap:12},
 missingTitle:{fontFamily:fonts.italic,fontSize:22,textAlign:'center',color:'#756143'},missingCaption:{fontFamily:fonts.medium,fontSize:7,letterSpacing:1,textAlign:'center',color:'#7D6E57'},
});
