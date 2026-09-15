import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SQLite from 'expo-sqlite';
import {Platform} from 'react-native';
import type {Game} from '../data/library';

const LEGACY_KEY='tapdeck.mister-library.v1';
const CACHE_KEY='mister-library';
let database:SQLite.SQLiteDatabase|undefined;

function validGames(value:unknown):Game[]{
 if(!Array.isArray(value))return [];
 return value.filter((game):game is Game=>!!game&&typeof game==='object'&&typeof game.id==='string'&&typeof game.title==='string'&&typeof game.system==='string'&&['Consoles','Computers','Arcade'].includes(game.category)&&typeof game.remotePath==='string');
}
async function getDatabase(){
 if(!database){database=await SQLite.openDatabaseAsync('tapdeck-library.db');await database.execAsync('CREATE TABLE IF NOT EXISTS cache (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL);');}
 return database;
}
export async function loadCachedMiSTerLibrary():Promise<Game[]>{
 if(Platform.OS==='web')return validGames(JSON.parse(await AsyncStorage.getItem(LEGACY_KEY)??'[]'));
 const db=await getDatabase();
 const record=await db.getFirstAsync<{value:string}>('SELECT value FROM cache WHERE key = ?',[CACHE_KEY]);
 if(record?.value)return validGames(JSON.parse(record.value));
 const legacy=await AsyncStorage.getItem(LEGACY_KEY);
 if(!legacy)return [];
 const games=validGames(JSON.parse(legacy));
 if(games.length)await saveCachedMiSTerLibrary(games);
 return games;
}
export async function saveCachedMiSTerLibrary(games:Game[]):Promise<void>{
 const value=JSON.stringify(games.map(({image,scene,...game})=>game));
 if(Platform.OS==='web'){await AsyncStorage.setItem(LEGACY_KEY,value);return;}
 const db=await getDatabase();
 await db.runAsync('INSERT OR REPLACE INTO cache (key, value) VALUES (?, ?)',[CACHE_KEY,value]);
}
