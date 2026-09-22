import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const source = process.argv[2];
const output = process.argv[3] ?? 'src/data/arcadeCoreMap.ts';
if (!source) throw new Error('Pass the extracted MRA directory.');

const groups = ['Capcom', 'Irem', 'Jaleco', 'Namco', 'Sega', 'Taito'];
const groupForManufacturer = value => groups.find(group => value.toLocaleLowerCase().includes(group.toLocaleLowerCase()));
const cpsForCore = core => ({jtcps1:'CPS 1',jtcps15:'CPS 1',jtcps2:'CPS 2',jtcps3:'CPS 3',CPS1:'CPS 1',CPS2:'CPS 2',CPS3:'CPS 3'})[core];
async function files(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  return (await Promise.all(entries.map(entry => entry.isDirectory() ? files(path.join(dir, entry.name)) : entry.name.toLowerCase().endsWith('.mra') ? [path.join(dir, entry.name)] : []))).flat();
}
const mraGroups = new Map();
const mraCps = new Map();
for (const file of await files(source)) {
  const xml = await readFile(file, 'utf8');
  const core = xml.match(/<rbf>([^<]+)<\/rbf>/i)?.[1]?.trim();
  const manufacturer = xml.match(/<manufacturer>([^<]+)<\/manufacturer>/i)?.[1]?.trim();
  const group = manufacturer ? groupForManufacturer(manufacturer) : undefined;
  const name=path.basename(file, '.mra').toLowerCase();
  if (group) mraGroups.set(name, group);
  const cps=core?cpsForCore(core):undefined;
  if(cps)mraCps.set(name,cps);
}
const body = Object.fromEntries([...mraGroups.entries()].sort(([a], [b]) => a.localeCompare(b)));
const cpsBody = Object.fromEntries([...mraCps.entries()].sort(([a], [b]) => a.localeCompare(b)));
await mkdir(path.dirname(output), { recursive: true });
await writeFile(output, `// Generated from the user's installed MiSTer MRA files.\nexport const arcadeManufacturerByMraName: Record<string, string> = ${JSON.stringify(body)};\nexport const arcadeCpsByMraName: Record<string, string> = ${JSON.stringify(cpsBody)};\n`);
console.log(JSON.stringify(Object.groupBy(Object.values(body), value => value), null, 2));
