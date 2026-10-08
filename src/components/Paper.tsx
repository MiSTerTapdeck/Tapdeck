import {Image,StyleSheet,View} from 'react-native';
import Svg,{Path,Line} from 'react-native-svg';
import {isDarkTheme,paper} from '../theme';
const cardPaper=require('../../assets/paper-card-1980s.png');
export function Paper({opacity=.45,card=false}:{opacity?:number;card?:boolean}) {
 if(isDarkTheme())return null;
 return <View style={[StyleSheet.absoluteFill,{pointerEvents:'none',overflow:'hidden'}]} accessible={false}><Image source={card?cardPaper:paper} resizeMode="cover" style={[StyleSheet.absoluteFill,{width:'100%',height:'100%',opacity}]} accessibilityIgnoresInvertColors accessible={false}/></View>;
}
type CardEra='seventies'|'eighties'|'nineties'|'noughties'|'clean';
function eraFor(year:number|null|undefined):CardEra {if(!year||year>=2010)return 'clean';if(year<1980)return 'seventies';if(year<1990)return 'eighties';if(year<2000)return 'nineties';return 'noughties';}
export function Wear({seed=0,year}:{seed?:number;year?:number|null}) {
 const era=eraFor(year);if(era==='clean')return null;
 const density=era==='seventies'?58:era==='eighties'?38:era==='nineties'?20:7;
 const tone=era==='seventies'?'#765337':era==='eighties'?'#94724B':era==='nineties'?'#AB9169':'#C2AA86';
 const opacity=era==='seventies'?.46:era==='eighties'?.34:era==='nineties'?.24:.14;
 return <View style={[StyleSheet.absoluteFill,{pointerEvents:'none'}]}>
 <Svg width="100%" height="100%" viewBox="0 0 200 300" preserveAspectRatio="none">
  <Path d="M8 1 2 8 1 28M193 1l6 7v20M1 269v23l8 7m163 0h20l7-7" stroke={tone} strokeWidth={era==='seventies'?2.7:1.4} opacity={opacity} fill="none"/>
  {era!=='noughties'&&<Path d="M1 16 14 1M2 29 31 1m-27 0 42 38M194 1l-19 18m24 258-24 22M1 290l17 9" stroke="#FFF7E6" strokeWidth={era==='seventies'?1.7:1.1} opacity={opacity} fill="none"/>}
  {(era==='seventies'||era==='eighties')&&<Path d="M17 0c13 64-4 129 5 202M0 108c62 3 111-5 198 5" stroke={tone} strokeWidth="1" opacity={era==='seventies'?'.24':'.14'} fill="none"/>}
  {Array.from({length:density},(_,i)=>{const x=(i*71+seed*19)%196+2; const y=(i*47+seed*11)%296+2;return <Line key={i} x1={x} y1={y} x2={x+1.1} y2={y+.2} stroke={tone} strokeWidth={era==='seventies'?'.9':'.6'} opacity={opacity}/>;})}
  <Path d="M8 3h179q10 0 10 10v273q0 10-10 10H12q-9 0-9-10V14q0-11 5-11Z" stroke={tone} opacity={opacity} fill="none"/>
 </Svg></View>;
}
