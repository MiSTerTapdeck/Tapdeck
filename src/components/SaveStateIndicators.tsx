import React,{createContext,useEffect,useRef,useState} from 'react';
import {AppState} from 'react-native';
import {readSaveStateIndex,type SaveStateIndex} from '../domain/savestates';
export const SaveStateIndexContext=createContext<SaveStateIndex>({});
export function SaveStateIndicators({host,connected,playing,refreshKey,children}:{host:string;connected:boolean;playing:boolean;refreshKey:string;children:React.ReactNode}){
 const [index,setIndex]=useState<SaveStateIndex>({});
 const refreshRef=useRef<()=>void>(()=>{});
 const previousRefreshKey=useRef(refreshKey);
 // Navigation and game activity must not clear the existing indicators.
 useEffect(()=>{setIndex({});},[host,connected]);
 useEffect(()=>{
  let active=true,pending=false,queued=false;
  const refresh=async()=>{
   if(!active||!host||!connected||AppState.currentState==='background')return;
   if(pending){queued=true;return;}
   pending=true;
   try{const next=await readSaveStateIndex(host);if(active)setIndex(current=>JSON.stringify(current)===JSON.stringify(next)?current:next);}
   catch{/* Older/offline helpers must not interfere with the library. */}
   finally{pending=false;if(active&&queued){queued=false;void refresh();}}
  };
  refreshRef.current=()=>void refresh();
  void refresh();
  const timer=setInterval(()=>void refresh(),playing?3000:60000);
  const subscription=AppState.addEventListener('change',state=>{if(state==='active')void refresh();});
  return()=>{active=false;refreshRef.current=()=>{};clearInterval(timer);subscription.remove();};
 },[host,connected,playing]);
 // Closing a card or returning to a list triggers a fresh check immediately.
 useEffect(()=>{if(previousRefreshKey.current===refreshKey)return;previousRefreshKey.current=refreshKey;refreshRef.current();},[refreshKey]);
 return <SaveStateIndexContext.Provider value={index}>{children}</SaveStateIndexContext.Provider>;
}
