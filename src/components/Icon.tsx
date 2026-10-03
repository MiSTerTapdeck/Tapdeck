import Svg,{Path,Circle,Rect} from 'react-native-svg';
export type IconName='search'|'back'|'close'|'bookmark'|'library'|'playlist'|'compass'|'settings'|'sort'|'play'|'check'|'computer'|'gamepad'|'info'|'arrow'|'plus'|'up'|'down'|'trash'|'pencil'|'dice'|'sun'|'moon';
export function Icon({name,size=22,color='#28251F',filled=false}:{name:IconName;size?:number;color?:string;filled?:boolean}) {
 const paths:Partial<Record<IconName,string>>={
 search:'m16 16 4.5 4.5',back:'m14 5-7 7 7 7',close:'m6 6 12 12M6 18 18 6',
 bookmark:'M6 4h12v17l-6-4-6 4Z',library:'M5 6h14v15H5ZM9 6V3h6v3M8 10h8',
 playlist:'M8 6h12M8 12h12M8 18h12M3 6h.1M3 12h.1M3 18h.1',
 compass:'m15.5 8.5-2 5-5 2 2-5Z',settings:'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5',
 sort:'M5 6h14M8 12h11m-8 6h8',play:'m8 4 12 8-12 8Z',check:'m5 12 4 4L19 6',
 computer:'M3 4h18v13H3Zm5 17h8m-4-4v4',
 sun:'M12 3v2m0 14v2M3 12h2m14 0h2M5.6 5.6 7 7m10 10 1.4 1.4m0-12.8L17 7M7 17l-1.4 1.4M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8',moon:'M20 15.5A8 8 0 0 1 8.5 4 8 8 0 1 0 20 15.5Z',
 gamepad:'M6 7h12c2 0 3 3 3 7s-2 5-4 2l-1-1H8l-1 1c-2 3-4 2-4-2s1-7 3-7ZM7 10v4m-2-2h4m7-1h.1m2 2h.1',
 info:'M12 11v6m0-10v.1',arrow:'M4 12h15m-5-5 5 5-5 5',plus:'M12 5v14M5 12h14',up:'m6 14 6-6 6 6',down:'m6 10 6 6 6-6',trash:'M5 7h14m-9 4v6m4-6v6M9 7V4h6v3m-8 0 1 14h8l1-14',pencil:'m5 19 1-5L17 3l4 4L10 18l-5 1ZM14 6l4 4',
 };
 return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden={true}>
  {name==='search'&&<Circle cx="10.5" cy="10.5" r="6.5" stroke={color} strokeWidth="1.6"/>}
  {name==='dice'&&<><Rect x="4.5" y="4.5" width="15" height="15" rx="2.5" stroke={color} strokeWidth="1.6"/><Circle cx="8.5" cy="8.5" r="1" fill={color}/><Circle cx="15.5" cy="8.5" r="1" fill={color}/><Circle cx="12" cy="12" r="1" fill={color}/><Circle cx="8.5" cy="15.5" r="1" fill={color}/><Circle cx="15.5" cy="15.5" r="1" fill={color}/></>}
  {(name==='compass'||name==='info')&&<Circle cx="12" cy="12" r="9" stroke={color} strokeWidth="1.5"/>}
  <Path d={paths[name]} stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill={filled?color:'none'}/>
 </Svg>;
}
