import React from 'react';
import {Pressable,StyleSheet,Text,View} from 'react-native';
import type {Game} from '../data/library';
import {isVintage} from '../domain/library';
import {cardGenre} from '../domain/genre';
import {fonts,palette as c} from '../theme';
import {Paper} from './Paper';
import {Icon} from './Icon';
import {ArtworkImage} from './ArtworkImage';
function GameCardImpl({game,index,saved,onPress,reducedMotion,artworkUrl,allowDownload=true,compact=false}:{game:Game;index:number;saved:boolean;onPress:()=>void;reducedMotion:boolean;artworkUrl?:string;allowDownload?:boolean;compact?:boolean}) {
 const vintage=isVintage(game.year);
 const subtitle=`${game.system} · ${game.year??'Year unknown'}${!vintage?'  ·  Recent release':''}`;
 const [released,setReleased]=React.useState(false);
 const releaseTimer=React.useRef<ReturnType<typeof setTimeout>|null>(null);
 React.useEffect(()=>()=>{if(releaseTimer.current)clearTimeout(releaseTimer.current);},[]);
 const handlePress=()=>{
  setReleased(true);
  if(releaseTimer.current)clearTimeout(releaseTimer.current);
  releaseTimer.current=setTimeout(()=>{setReleased(false);onPress();},40);
 };
 return <Pressable accessibilityRole="button" accessibilityLabel={`Open ${game.title}, ${game.system}, ${game.year??'year unknown'}${saved?', saved':''}`} onPress={handlePress} testID={`card-${game.id}`} style={{flex:1}}>
  <View style={[s.card,compact&&s.compactCard,{backgroundColor:vintage?c.card:'#F9F5EA'},released&&s.released]}>
  {!compact&&<Paper opacity={vintage?.8:.14}/>}
  {!compact&&<View style={s.top}><Text style={s.serial}>{String(index+1).padStart(3,'0')}</Text><Text style={[s.system,{color:game.system==='Mega Drive'?'#375970':game.system==='Arcade'?'#58623F':'#91402B'}]}>{game.system.toUpperCase()}</Text></View>}
  <View style={[s.art,compact&&s.compactArt]}><ArtworkImage game={game} misterUrl={artworkUrl} allowDownload={allowDownload} priority="visible" style={s.image}/></View>
  {!compact&&<View style={s.cardFoot}><Text style={s.cardGenre} numberOfLines={1}>{cardGenre(game.genre)==='Not listed'?'COLLECTION':cardGenre(game.genre).toUpperCase()}</Text>{saved?<Icon name="bookmark" filled size={13} color={c.orange}/>:<Text style={s.year}>{game.year??'—'}</Text>}</View>}
 </View>
 <Text style={[s.title,compact&&s.compactTitle]} numberOfLines={2}>{game.title}{compact&&game.year!==null&&<Text style={s.compactYear}> · {game.year}</Text>}</Text>
 {!compact&&<Text style={s.subtitle} numberOfLines={1}>{subtitle}</Text>}
 </Pressable>;
}
export const GameCard=React.memo(GameCardImpl,(a,b)=>a.game.id===b.game.id&&a.game.image===b.game.image&&a.index===b.index&&a.saved===b.saved&&a.reducedMotion===b.reducedMotion&&a.artworkUrl===b.artworkUrl&&a.allowDownload===b.allowDownload&&a.compact===b.compact&&a.onPress===b.onPress);
const s=StyleSheet.create({
 card:{borderRadius:9,padding:9,borderWidth:1,borderColor:'#CCB994',boxShadow:'0px 3px 5px rgba(64,43,15,0.16)',overflow:'hidden'},released:{opacity:.76,transform:[{scale:.985}]},compactCard:{padding:6,borderRadius:7},
 top:{height:23,flexDirection:'row',alignItems:'flex-start',justifyContent:'space-between',gap:4},
 serial:{fontFamily:fonts.body,fontSize:10,color:c.muted},system:{fontFamily:fonts.bold,fontSize:10,letterSpacing:.6},
  art:{aspectRatio:.94,borderRadius:4,overflow:'hidden',backgroundColor:'#35362D'},compactArt:{aspectRatio:.76,borderRadius:4},
 artBackdrop:{...StyleSheet.absoluteFill,left:-8,right:-8,top:-8,bottom:-8,opacity:.7,transform:[{scale:1.12}]},artShade:{...StyleSheet.absoluteFill,backgroundColor:'rgba(25,23,17,.18)'},
 image:{width:'100%',height:'100%'},cardFoot:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',height:24,gap:6},
 cardGenre:{fontFamily:fonts.medium,fontSize:8,letterSpacing:1,color:'#67543A',flex:1},year:{fontFamily:fonts.medium,fontSize:10,color:'#67543A'},
 title:{fontFamily:fonts.display,fontSize:20,lineHeight:28,color:c.ink,marginTop:9,paddingBottom:1},compactTitle:{fontSize:15,lineHeight:18,letterSpacing:-.25,marginTop:6},compactYear:{fontFamily:fonts.body,fontSize:10,color:c.muted,letterSpacing:0},subtitle:{fontFamily:fonts.body,fontSize:13,color:c.muted,lineHeight:19,marginTop:2},
 missing:{flex:1,backgroundColor:'#E8DBC0',alignItems:'center',justifyContent:'center',padding:10,gap:12},
 missingTitle:{fontFamily:fonts.italic,fontSize:22,textAlign:'center',color:'#756143'},missingCaption:{fontFamily:fonts.medium,fontSize:7,letterSpacing:1,textAlign:'center',color:'#7D6E57'},
});
