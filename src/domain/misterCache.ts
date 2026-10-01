import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import {Platform} from 'react-native';
import type {Game} from '../data/library';
import {groupGenericArcadeGames} from './arcadeCores';
import {parseRating} from './gamelist';

const LEGACY_KEY='tapdeck.mister-library.v1';
const LIBRARY_FILE='tapdeck-library.json';
const LIBRARY_BACKUP_FILE='tapdeck-library.backup.json';
async function removeLegacyStorage():Promise<void>{
 await AsyncStorage.removeItem(LEGACY_KEY).catch(()=>{});
 if(Platform.OS==='web'||!FileSystem.documentDirectory)return;
 const root=FileSystem.documentDirectory;
 for(const path of [`${root}tapdeck-artwork/`,`${root}SQLite/tapdeck-library.db`,`${root}SQLite/tapdeck-library.db-shm`,`${root}SQLite/tapdeck-library.db-wal`])await FileSystem.deleteAsync(path,{idempotent:true}).catch(()=>{});
}

function parseGames(raw:string):Game[]{try{return validGames(JSON.parse(raw));}catch{return [];}}
function applyArcadeCoreMap(games:Game[]){
 return groupGenericArcadeGames(games);
}
function validGames(value:unknown):Game[]{
 if(!Array.isArray(value))return [];
 return value.filter((game):game is Game=>!!game&&typeof game==='object'&&typeof game.id==='string'&&typeof game.title==='string'&&typeof game.system==='string'&&['Consoles','Computers','Arcade'].includes(game.category)&&typeof game.remotePath==='string').map(game=>({...game,rating:typeof game.rating==='number'?game.rating:parseRating(typeof game.rating==='string'?game.rating:undefined),region:typeof game.region==='string'?game.region:undefined}));
}
export async function loadCachedMiSTerLibrary():Promise<Game[]>{
 if(Platform.OS!=='web'&&FileSystem.documentDirectory){
  for(const name of [LIBRARY_FILE,LIBRARY_BACKUP_FILE]){try{const file=`${FileSystem.documentDirectory}${name}`;if((await FileSystem.getInfoAsync(file)).exists){const records=parseGames(await FileSystem.readAsStringAsync(file));if(records.length){const migrated=applyArcadeCoreMap(records);if(migrated.some((game,index)=>game.system!==records[index].system))await saveCachedMiSTerLibrary(migrated);await removeLegacyStorage();return migrated;}}}catch{}}
  const legacy=parseGames(await AsyncStorage.getItem(LEGACY_KEY).catch(()=>null)??'[]');
  if(legacy.length){const migrated=applyArcadeCoreMap(legacy);await saveCachedMiSTerLibrary(migrated);return migrated;}
  await removeLegacyStorage();
  return [];
 }
 return applyArcadeCoreMap(parseGames(await AsyncStorage.getItem(LEGACY_KEY)??'[]'));
}
export async function saveCachedMiSTerLibrary(games:Game[]):Promise<void>{
 const value=JSON.stringify(applyArcadeCoreMap(games).map(({image,scene,...game})=>game));
 if(Platform.OS!=='web'&&FileSystem.documentDirectory){
  await FileSystem.writeAsStringAsync(`${FileSystem.documentDirectory}${LIBRARY_BACKUP_FILE}`,value);
  await FileSystem.writeAsStringAsync(`${FileSystem.documentDirectory}${LIBRARY_FILE}`,value);
  await removeLegacyStorage();
  return;
 }
 await AsyncStorage.setItem(LEGACY_KEY,value);
}
