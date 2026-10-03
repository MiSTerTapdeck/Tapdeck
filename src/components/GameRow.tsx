import React from 'react';
import {Pressable,StyleSheet,Text,View} from 'react-native';
import type {Game} from '../data/library';
import {cardGenre} from '../domain/genre';
import {fonts,isDarkTheme,palette as c,type ThemeMode} from '../theme';
import {Icon} from './Icon';
import {ArtworkImage} from './ArtworkImage';
function GameRowImpl({game,saved,onPress,annotation,trailing,artworkUrl,allowDownload=true,theme}:{game:Game;saved:boolean;onPress:()=>void;annotation?:string;trailing?:React.ReactNode;artworkUrl?:string;allowDownload?:boolean;theme?:ThemeMode}) {
 const [released,setReleased]=React.useState(false);
 const releaseTimer=React.useRef<ReturnType<typeof setTimeout>|null>(null);
 React.useEffect(()=>()=>{if(releaseTimer.current)clearTimeout(releaseTimer.current);},[]);
 const handlePress=()=>{
  setReleased(true);
  if(releaseTimer.current)clearTimeout(releaseTimer.current);
  releaseTimer.current=setTimeout(()=>{setReleased(false);onPress();},40);
 };
 return <Pressable testID={`row-${game.id}`} accessibilityRole="button" accessibilityLabel={`Open ${game.title}, ${game.system}, ${game.year??'year unknown'}${saved?', saved':''}`} onPress={handlePress} style={[s.row,isDarkTheme()&&s.darkRow,released&&s.released]}>
  <View style={[s.thumb,isDarkTheme()&&s.darkThumb]}><ArtworkImage game={game} misterUrl={artworkUrl} allowDownload={allowDownload} priority="visible" theme={theme} style={s.image}/></View>
  <View style={s.copy}><Text style={[s.title,{color:c.ink}]} numberOfLines={1}>{game.title}</Text><Text style={[s.meta,{color:c.muted}]}>{game.system} <Text style={[s.dot,{color:c.muted}]}>·</Text> {game.year??'Year unknown'}</Text><Text style={[s.genre,{color:c.muted}]} numberOfLines={1}>{annotation??cardGenre(game.genre)}</Text></View>
  {trailing??(saved&&<Icon name="bookmark" filled size={16} color={c.orange}/>)}
 </Pressable>;
}
export const GameRow=React.memo(GameRowImpl,(a,b)=>a.game.id===b.game.id&&a.game.image===b.game.image&&a.saved===b.saved&&a.annotation===b.annotation&&a.artworkUrl===b.artworkUrl&&a.allowDownload===b.allowDownload&&a.theme===b.theme&&a.onPress===b.onPress&&a.trailing===b.trailing);
const s=StyleSheet.create({row:{minHeight:86,paddingVertical:9,flexDirection:'row',alignItems:'center',gap:12,borderBottomWidth:1,borderColor:'#DFD4C3'},darkRow:{borderColor:'#342E28'},released:{backgroundColor:'rgba(190,112,63,.16)'},thumb:{height:66,width:56,padding:3,alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:'rgba(103,89,68,.42)',borderRadius:2,overflow:'hidden'},darkThumb:{padding:3,borderColor:'#B9AD9C',backgroundColor:'#312B25'},image:{height:'100%',width:'100%'},copy:{flex:1,gap:2},title:{fontFamily:fonts.display,fontSize:21,lineHeight:29,color:c.ink,paddingBottom:1},meta:{fontFamily:fonts.body,fontSize:11,color:c.muted},dot:{color:'#AA9C85'},genre:{fontFamily:fonts.medium,fontSize:9,letterSpacing:.7,textTransform:'uppercase',color:'#756144',marginTop:2}});
