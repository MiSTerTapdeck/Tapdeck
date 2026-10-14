import React from 'react';
import {Pressable,StyleSheet,Text,View} from 'react-native';
import type {Game} from '../data/library';
import {isVintage} from '../domain/library';
import {cardGenre} from '../domain/genre';
import {fonts,isDarkTheme,palette as c,type ThemeMode} from '../theme';
import {Paper} from './Paper';
import {Icon} from './Icon';
import {ArtworkImage} from './ArtworkImage';
function GameCardImpl({game,index,saved,onPress,artworkUrl,allowDownload=true,compact=false,theme}:{game:Game;index:number;saved:boolean;onPress:()=>void;artworkUrl?:string;allowDownload?:boolean;compact?:boolean;theme?:ThemeMode}) {
 const vintage=isVintage(game.year);
 const dark=theme==='dark';
 const subtitle=`${game.system} · ${game.year??'Year unknown'}${!vintage?'  ·  Recent release':''}`;
  const compactMeta=[game.year===null?null:String(game.year),game.developer&&game.developer!=='Not listed'?game.developer.toLocaleUpperCase():null].filter((value):value is string=>!!value).join(' · ');
 const [released,setReleased]=React.useState(false);
 const releaseTimer=React.useRef<ReturnType<typeof setTimeout>|null>(null);
 React.useEffect(()=>()=>{if(releaseTimer.current)clearTimeout(releaseTimer.current);},[]);
 const handlePress=()=>{
  setReleased(true);
  if(releaseTimer.current)clearTimeout(releaseTimer.current);
  releaseTimer.current=setTimeout(()=>{setReleased(false);onPress();},40);
 };
 return <Pressable accessibilityRole="button" accessibilityLabel={`Open ${game.title}, ${game.system}, ${game.year??'year unknown'}${saved?', saved':''}`} onPress={handlePress} testID={`card-${game.id}`} style={{flex:1}}>
  <View style={[s.card,compact&&s.compactCard,{backgroundColor:compact?'transparent':dark?'#27221D':c.paper,borderColor:compact?(dark?'rgba(185,173,156,.62)':'rgba(103,89,68,.38)'):dark?'#756A5E':c.line},released&&s.released]}>
  {!compact&&<Paper card opacity={vintage?.8:.14}/>}
  {!compact&&<View style={s.top}><Text style={[s.serial,{color:c.muted}]}>{String(index+1).padStart(3,'0')}</Text><Text style={[s.system,{color:c.orange}]}>{game.system.toUpperCase()}</Text></View>}
   <View style={[s.art,compact&&s.compactArt,!compact&&isDarkTheme()&&s.darkArt]}><ArtworkImage game={game} misterUrl={artworkUrl} allowDownload={allowDownload} priority="visible" theme={theme} style={s.image}/></View>
  {!compact&&<View style={s.cardFoot}><Text style={[s.cardGenre,{color:c.muted}]} numberOfLines={1}>{game.tate?'TATE · ':''}{cardGenre(game.genre)==='Not listed'?'COLLECTION':cardGenre(game.genre).toUpperCase()}</Text>{saved?<Icon name="bookmark" filled size={13} color={c.orange}/>:<Text style={[s.year,{color:c.muted}]}>{game.year??'—'}</Text>}</View>}
 </View>
  <Text style={[s.title,compact&&s.compactTitle,{color:c.ink}]} numberOfLines={compact?1:2}>{game.title}</Text>
  {compact&&!!compactMeta&&<Text style={[s.compactMeta,{color:c.muted}]} numberOfLines={1}>{compactMeta}</Text>}
 {!compact&&<Text style={[s.subtitle,{color:c.muted}]} numberOfLines={1}>{subtitle}</Text>}
 </Pressable>;
}
export const GameCard=React.memo(GameCardImpl,(a,b)=>a.game.id===b.game.id&&a.game.image===b.game.image&&a.index===b.index&&a.saved===b.saved&&a.artworkUrl===b.artworkUrl&&a.allowDownload===b.allowDownload&&a.compact===b.compact&&a.theme===b.theme&&a.onPress===b.onPress);
const s=StyleSheet.create({
 card:{borderRadius:9,padding:9,borderWidth:1,borderColor:'#CCB994',boxShadow:'0px 3px 5px rgba(64,43,15,0.16)',overflow:'hidden'},released:{opacity:.76,transform:[{scale:.985}]},compactCard:{padding:3,borderRadius:7,boxShadow:'none'},
 top:{height:23,flexDirection:'row',alignItems:'flex-start',justifyContent:'space-between',gap:4},
 serial:{fontFamily:fonts.body,fontSize:10,color:c.muted},system:{fontFamily:fonts.bold,fontSize:10,letterSpacing:.6},
  // Keep the image viewport's dimensions unchanged across themes. Android's
  // renderer can otherwise leave a recycled Image surface blank after padding
  // is added in dark mode and removed again in light mode.
  art:{aspectRatio:.94,borderRadius:4,overflow:'hidden',padding:3,borderWidth:1,borderColor:'transparent',backgroundColor:'#F0E3CE'},compactArt:{aspectRatio:.76,borderRadius:4,padding:0,borderWidth:0,backgroundColor:'transparent'},darkArt:{borderColor:'#B9AD9C',backgroundColor:'#312B25'},
 image:{width:'100%',height:'100%'},cardFoot:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',height:24,gap:6},
 cardGenre:{fontFamily:fonts.medium,fontSize:8,letterSpacing:1,color:'#67543A',flex:1},year:{fontFamily:fonts.medium,fontSize:10,color:'#67543A'},
  title:{fontFamily:fonts.display,fontSize:20,lineHeight:28,color:c.ink,marginTop:9,paddingBottom:1},compactTitle:{fontSize:14,lineHeight:18,letterSpacing:-.2,marginTop:6},compactMeta:{fontFamily:fonts.body,fontSize:10,lineHeight:14,color:c.muted,letterSpacing:0,marginTop:1},subtitle:{fontFamily:fonts.body,fontSize:13,color:c.muted,lineHeight:19,marginTop:2},
});
