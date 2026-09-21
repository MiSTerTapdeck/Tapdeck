import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SQLite from 'expo-sqlite';
import * as FileSystem from 'expo-file-system/legacy';
import {Platform} from 'react-native';
import type {Game} from '../data/library';
import {artworkCacheFilename} from './libretroNaming';

const LEGACY_KEY='tapdeck.mister-library.v1';
const CACHE_KEY='mister-library';
let database:SQLite.SQLiteDatabase|undefined;
let databasePromise:Promise<SQLite.SQLiteDatabase>|undefined;
// expo-sqlite can reject overlapping statements on the same native connection.
// Serialize cache access so artwork loads cannot race library saves/stats reads.
let databaseQueue=Promise.resolve();
async function withDatabase<T>(operation:(db:SQLite.SQLiteDatabase)=>Promise<T>):Promise<T>{
 const run=databaseQueue.then(async()=>{let last:unknown;for(let attempt=0;attempt<4;attempt+=1){try{return await operation(await getDatabase());}catch(error){last=error;if(!String(error).toLowerCase().includes('database is locked')||attempt===3)throw error;await new Promise(resolve=>setTimeout(resolve,75*(attempt+1)));}}throw last;});
 databaseQueue=run.then(()=>undefined,()=>undefined);
 return run;
}

function parseGames(raw:string):Game[]{try{return validGames(JSON.parse(raw));}catch{return [];}}
function validGames(value:unknown):Game[]{
 if(!Array.isArray(value))return [];
 return value.filter((game):game is Game=>!!game&&typeof game==='object'&&typeof game.id==='string'&&typeof game.title==='string'&&typeof game.system==='string'&&['Consoles','Computers','Arcade'].includes(game.category)&&typeof game.remotePath==='string');
}
async function getDatabase(){
 if(database)return database;
 if(!databasePromise)databasePromise=(async()=>{const opened=await SQLite.openDatabaseAsync('tapdeck-library.db');await opened.execAsync('CREATE TABLE IF NOT EXISTS cache (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL); CREATE TABLE IF NOT EXISTS artwork (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL); CREATE INDEX IF NOT EXISTS idx_cache_key ON cache(key); CREATE INDEX IF NOT EXISTS idx_artwork_key ON artwork(key);');database=opened;return opened;})();
 return databasePromise;
}
export async function loadCachedMiSTerLibrary():Promise<Game[]>{
 return parseGames(await AsyncStorage.getItem(LEGACY_KEY)??'[]');
}
export async function saveCachedMiSTerLibrary(games:Game[]):Promise<void>{
 const value=JSON.stringify(games.map(({image,scene,...game})=>game));
 await AsyncStorage.setItem(LEGACY_KEY,value);
}

function artworkFile(key:string){return FileSystem.documentDirectory?`${FileSystem.documentDirectory}tapdeck-artwork/${artworkCacheFilename(key)}`:undefined;}
export async function loadCachedArtwork(key:string):Promise<string|undefined>{if(Platform.OS==='web')return undefined;const file=artworkFile(key);if(file){try{if((await FileSystem.getInfoAsync(file)).exists)return file;}catch{}}return (await withDatabase(db=>db.getFirstAsync<{value:string}>('SELECT value FROM artwork WHERE key = ?',[key])))?.value;}
export async function saveCachedArtwork(key:string,value:string):Promise<void>{if(Platform.OS==='web')return;const file=artworkFile(key);if(file&&value.startsWith('data:')){await FileSystem.makeDirectoryAsync(`${FileSystem.documentDirectory}tapdeck-artwork/`,{intermediates:true});const payload=value.slice(value.indexOf(',')+1);await FileSystem.writeAsStringAsync(file,payload,{encoding:FileSystem.EncodingType.Base64});return;}await withDatabase(db=>db.runAsync('INSERT OR REPLACE INTO artwork (key, value) VALUES (?, ?)',[key,value]));}

export async function getCachedArtworkStats():Promise<{count:number;bytes:number}>{if(Platform.OS==='web')return {count:0,bytes:0};const root=FileSystem.documentDirectory?`${FileSystem.documentDirectory}tapdeck-artwork/`:undefined;if(root){try{const entries=await FileSystem.readDirectoryAsync(root);let bytes=0;for(const name of entries){const info=await FileSystem.getInfoAsync(`${root}${name}`);bytes+=Number((info as {size?:number}).size??0);}return {count:entries.length,bytes};}catch{}}try{const row=await withDatabase(db=>db.getFirstAsync<{count:number;bytes:number}>('SELECT COUNT(*) AS count, COALESCE(SUM(LENGTH(value)), 0) AS bytes FROM artwork'));return {count:Number(row?.count??0),bytes:Number(row?.bytes??0)};}catch{return {count:0,bytes:0};}}

export async function getCachedArtworkBySystem(games:Game[],url:string):Promise<{system:string;cached:number;total:number}[]>{
 if(Platform.OS==='web'||!url)return [];
 const rows=await withDatabase(db=>db.getAllAsync<{key:string}>('SELECT key FROM artwork'));
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
