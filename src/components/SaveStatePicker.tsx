import {useEffect,useRef,useState} from 'react';
import {Pressable,ScrollView,Text,View} from 'react-native';
import type {Game} from '../data/library';
import {readSaveStates,saveStateLabel,type SaveState} from '../domain/savestates';
import {palette as c} from '../theme';
import {s} from '../styles';
import {Paper} from './Paper';
import {Icon} from './Icon';

export function SaveStatePicker({host,game,bottom,onClose,onLaunch}:{host:string;game:Game;bottom:number;onClose:()=>void;onLaunch:(slot?:number)=>void}){
 const [ready,setReady]=useState(false);const [states,setStates]=useState<SaveState[]>([]);const [message,setMessage]=useState('Checking saved states…');
 const chosen=useRef(false);
 const choose=(slot?:number)=>{if(chosen.current)return;chosen.current=true;onLaunch(slot);};
 const close=()=>{chosen.current=true;onClose();};
 useEffect(()=>{let active=true;void readSaveStates(host,game).then(found=>{if(!active||chosen.current)return;if(!found.length){choose();return;}setStates(found);setReady(true);setMessage('Start a new game, or resume a saved state.');}).catch(error=>{if(active&&!chosen.current){setMessage(error instanceof Error?error.message:'Could not check save states.');setReady(true);}});return()=>{active=false;};},[]);
 // Keep the card interactive while checking; only mount the sheet after the result.
 if(!ready)return null;
 return <View style={[s.overlay,{zIndex:35}]} accessibilityViewIsModal><Pressable style={s.scrim} onPress={close} accessibilityRole="button" accessibilityLabel="Cancel save-state choices"/><View style={[s.sheet,{paddingBottom:Math.max(bottom,24),maxHeight:'58%'}]}><Paper opacity={.5}/><View style={s.sheetHandle}/><View style={s.sheetHeading}><Text style={s.sheetTitle}>Launch game</Text><Pressable onPress={close} style={s.iconButton} accessibilityRole="button" accessibilityLabel="Close save-state choices"><Icon name="close" color={c.ink}/></Pressable></View><Text style={s.sheetCopy}>{message}</Text><ScrollView><Pressable style={s.sortOption} onPress={()=>choose()} accessibilityRole="button"><Text style={s.body}>New game</Text><Icon name="play" color={c.orange}/></Pressable>{states.map(state=><Pressable key={state.slot} style={s.sortOption} onPress={()=>choose(state.slot)} accessibilityRole="button"><Text style={[s.body,{flex:1}]}>{saveStateLabel(state)}</Text><Icon name="play" color={c.orange}/></Pressable>)}</ScrollView></View></View>;
}
