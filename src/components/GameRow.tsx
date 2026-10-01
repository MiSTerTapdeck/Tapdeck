import React from 'react';
import {Pressable,StyleSheet,Text,View} from 'react-native';
import type {Game} from '../data/library';
import {cardGenre} from '../domain/genre';
import {fonts,palette as c} from '../theme';
import {Icon} from './Icon';
import {ArtworkImage} from './ArtworkImage';
function GameRowImpl({game,saved,onPress,annotation,trailing,artworkUrl,allowDownload=true}:{game:Game;saved:boolean;onPress:()=>void;annotation?:string;trailing?:React.ReactNode;artworkUrl?:string;allowDownload?:boolean}) {
 const [released,setReleased]=React.useState(false);
 const releaseTimer=React.useRef<ReturnType<typeof setTimeout>|null>(null);
 React.useEffect(()=>()=>{if(releaseTimer.current)clearTimeout(releaseTimer.current);},[]);
 const handlePress=()=>{
  setReleased(true);
  if(releaseTimer.current)clearTimeout(releaseTimer.current);
  releaseTimer.current=setTimeout(()=>{setReleased(false);onPress();},40);
 };
 return <Pressable testID={`row-${game.id}`} accessibilityRole="button" accessibilityLabel={`Open ${game.title}, ${game.system}, ${game.year??'year unknown'}${saved?', saved':''}`} onPress={handlePress} style={[s.row,released&&s.released]}>
  <View style={s.thumb}><ArtworkImage game={game} misterUrl={artworkUrl} allowDownload={allowDownload} priority="visible" style={s.image}/></View>
  <View style={s.copy}><Text style={s.title} numberOfLines={1}>{game.title}</Text><Text style={s.meta}>{game.system} <Text style={s.dot}>·</Text> {game.year??'Year unknown'}</Text><Text style={s.genre} numberOfLines={1}>{annotation??cardGenre(game.genre)}</Text></View>
  {trailing??(saved&&<Icon name="bookmark" filled size={16} color={c.orange}/>)}
 </Pressable>;
}
export const GameRow=React.memo(GameRowImpl,(a,b)=>a.game.id===b.game.id&&a.game.image===b.game.image&&a.saved===b.saved&&a.annotation===b.annotation&&a.artworkUrl===b.artworkUrl&&a.allowDownload===b.allowDownload&&a.onPress===b.onPress&&a.trailing===b.trailing);
const s=StyleSheet.create({row:{minHeight:86,paddingVertical:9,flexDirection:'row',alignItems:'center',gap:12,borderBottomWidth:1,borderColor:c.line},released:{backgroundColor:'rgba(190,112,63,.16)'},thumb:{height:66,width:56,padding:3,alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:'rgba(103,89,68,.42)',borderRadius:2,overflow:'hidden'},image:{height:'100%',width:'100%'},copy:{flex:1,gap:2},title:{fontFamily:fonts.display,fontSize:21,lineHeight:29,color:c.ink,paddingBottom:1},meta:{fontFamily:fonts.body,fontSize:11,color:c.muted},dot:{color:'#AA9C85'},genre:{fontFamily:fonts.medium,fontSize:9,letterSpacing:.7,textTransform:'uppercase',color:'#756144',marginTop:2}});
