import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SQLite from 'expo-sqlite';
import {Platform} from 'react-native';
import type {Game} from '../data/library';

const LEGACY_KEY='tapdeck.mister-library.v1';
const CACHE_KEY='mister-library';
let database:SQLite.SQLiteDatabase|undefined;
let databasePromise:Promise<SQLite.SQLiteDatabase>|undefined;

function parseGames(raw:string):Game[]{try{return validGames(JSON.parse(raw));}catch{return [];}}
function validGames(value:unknown):Game[]{
 if(!Array.isArray(value))return [];
 return value.filter((game):game is Game=>!!game&&typeof game==='object'&&typeof game.id==='string'&&typeof game.title==='string'&&typeof game.system==='string'&&['Consoles','Computers','Arcade'].includes(game.category)&&typeof game.remotePath==='string');
}
async function getDatabase(){
 if(database)return database;
 if(!databasePromise)databasePromise=(async()=>{const opened=await SQLite.openDatabaseAsync('tapdeck-library.db');await opened.execAsync('CREATE TABLE IF NOT EXISTS cache (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL); CREATE TABLE IF NOT EXISTS artwork (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL);');database=opened;return opened;})();
 return databasePromise;
}
export async function loadCachedMiSTerLibrary():Promise<Game[]>{
 if(Platform.OS==='web')return parseGames(await AsyncStorage.getItem(LEGACY_KEY)??'[]');
 const db=await getDatabase();
 const record=await db.getFirstAsync<{value:string}>('SELECT value FROM cache WHERE key = ?',[CACHE_KEY]);
 if(record?.value)return parseGames(record.value);
 const legacy=await AsyncStorage.getItem(LEGACY_KEY);
 if(!legacy)return [];
 const games=parseGames(legacy);
 if(games.length)await saveCachedMiSTerLibrary(games);
 return games;
}
export async function saveCachedMiSTerLibrary(games:Game[]):Promise<void>{
 const value=JSON.stringify(games.map(({image,scene,...game})=>game));
 if(Platform.OS==='web'){await AsyncStorage.setItem(LEGACY_KEY,value);return;}
 const db=await getDatabase();
 await db.runAsync('INSERT OR REPLACE INTO cache (key, value) VALUES (?, ?)',[CACHE_KEY,value]);
}

export async function loadCachedArtwork(key:string):Promise<string|undefined>{if(Platform.OS==='web')return undefined;const db=await getDatabase();return (await db.getFirstAsync<{value:string}>('SELECT value FROM artwork WHERE key = ?',[key]))?.value;}
export async function saveCachedArtwork(key:string,value:string):Promise<void>{if(Platform.OS==='web')return;const db=await getDatabase();await db.runAsync('INSERT OR REPLACE INTO artwork (key, value) VALUES (?, ?)',[key,value]);}

export async function getCachedArtworkStats():Promise<{count:number;bytes:number}>{if(Platform.OS==='web')return {count:0,bytes:0};const db=await getDatabase();const row=await db.getFirstAsync<{count:number;bytes:number}>('SELECT COUNT(*) AS count, COALESCE(SUM(LENGTH(value)), 0) AS bytes FROM artwork');return {count:Number(row?.count??0),bytes:Number(row?.bytes??0)};}

export async function getCachedArtworkBySystem(games:Game[],url:string):Promise<{system:string;cached:number;total:number}[]>{
 if(Platform.OS==='web'||!url)return [];
 const db=await getDatabase();
 const rows=await db.getAllAsync<{key:string}>('SELECT key FROM artwork');
 const keys=new Set(rows.map(row=>row.key));
 const totals=new Map<string,{cached:number;total:number}>();
 for(const game of games){
  if(game.remoteMediaId===undefined)continue;
  const entry=totals.get(game.system)??{cached:0,total:0};entry.total+=1;
  const types=game.category==='Arcade'?['thumbnail','boxart','boxart3d','image','screenshot']:['thumbnail','boxart','boxart3d','image'];
  if(keys.has(`${url}|${game.remoteMediaId}|${types.join(',')}|128`))entry.cached+=1;
  totals.set(game.system,entry);
 }
 return [...totals.entries()].map(([system,counts])=>({system,...counts})).sort((a,b)=>a.system.localeCompare(b.system));
}
