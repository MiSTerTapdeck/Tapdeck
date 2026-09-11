import React from 'react';
import {Image,StyleSheet} from 'react-native';
import type {ImageSourcePropType} from 'react-native';

const stock:Record<string,ImageSourcePropType>={
  seventies:require('../../assets/card-stock/1970s.png'),eighties:require('../../assets/card-stock/1980s.png'),nineties:require('../../assets/card-stock/1990s.png'),noughties:require('../../assets/card-stock/2000s.png'),
};
function era(year:number|null|undefined){if(!year||year>=2010)return null;if(year<1980)return 'seventies';if(year<1990)return 'eighties';if(year<2000)return 'nineties';return 'noughties';}
/** Uses the source artwork for paper grain only; Wear supplies the responsive edge. */
export function CardStock({year}:{year:number|null|undefined}){const period=era(year);return period?<Image source={stock[period]} resizeMode="cover" style={[StyleSheet.absoluteFill,{transform:[{scale:1.26}]}]} accessible={false}/>:null;}
