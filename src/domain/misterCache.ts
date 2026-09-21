import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SQLite from 'expo-sqlite';
import * as FileSystem from 'expo-file-system/legacy';
import {Platform} from 'react-native';
import type {Game} from '../data/library';

const LEGACY_KEY='tapdeck.mister-library.v1';
const LIBRARY_FILE='tapdeck-library.json';
export async function clearLegacyArtworkCaches():Promise<void>{
 if(Platform.OS==='web')return;
 for(const path of [FileSystem.documentDirectory?`${FileSystem.documentDirectory}tapdeck-artwork/`:undefined,FileSystem.documentDirectory?`${FileSystem.documentDirectory}tapdeck-libretro/`:undefined])if(path)await FileSystem.deleteAsync(path,{idempotent:true}).catch(()=>{});
 await SQLite.deleteDatabaseAsync('tapdeck-library.db').catch(()=>{});
}

function parseGames(raw:string):Game[]{try{return validGames(JSON.parse(raw));}catch{return [];}}
function validGames(value:unknown):Game[]{
 if(!Array.isArray(value))return [];
 return value.filter((game):game is Game=>!!game&&typeof game==='object'&&typeof game.id==='string'&&typeof game.title==='string'&&typeof game.system==='string'&&['Consoles','Computers','Arcade'].includes(game.category)&&typeof game.remotePath==='string');
}
export async function loadCachedMiSTerLibrary():Promise<Game[]>{
 if(Platform.OS!=='web'&&FileSystem.documentDirectory){try{const file=`${FileSystem.documentDirectory}${LIBRARY_FILE}`;if((await FileSystem.getInfoAsync(file)).exists){const records=parseGames(await FileSystem.readAsStringAsync(file));if(records.length)return records;}}catch{}}
 return parseGames(await AsyncStorage.getItem(LEGACY_KEY)??'[]');
}
export async function saveCachedMiSTerLibrary(games:Game[]):Promise<void>{
 const value=JSON.stringify(games.map(({image,scene,...game})=>game));
 await AsyncStorage.setItem(LEGACY_KEY,value);
 if(Platform.OS!=='web'&&FileSystem.documentDirectory)await FileSystem.writeAsStringAsync(`${FileSystem.documentDirectory}${LIBRARY_FILE}`,value);
}
