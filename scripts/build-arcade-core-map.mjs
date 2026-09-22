import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const source = process.argv[2];
const output = process.argv[3] ?? 'src/data/arcadeCoreMap.ts';
if (!source) throw new Error('Pass the extracted MRA directory.');

const names = {
  CPS1: 'Capcom CPS1', CPS2: 'Capcom CPS2', CPS3: 'Capcom CPS3',
  SegaSTV: 'Sega ST-V', SegaSystem16: 'Sega System 16', SegaSystem18: 'Sega System 18',
  SegaSystem24: 'Sega System 24', SegaSystem32: 'Sega System 32', SegaSystem32Multi: 'Sega System 32 Multi',
  Meathax_SegaSystem24: 'Sega System 24', Meathax_SegaSystem32: 'Sega System 32', Meathax_SegaSystem32Multi: 'Sega System 32 Multi',
  SegaXBoard: 'Sega X Board', SegaYBoard: 'Sega Y Board', SegaC2: 'Sega System C/C-2',
  IremM72: 'Irem M72', IremM92: 'Irem M92', Cave68000: 'Cave 68000',
  NamcoSystem1: 'Namco System 1', NamcoSystem11: 'Namco System 11', NamcoSystem12: 'Namco System 12',
  JalecoMegaSystem1: 'Jaleco Mega System 1', JalecoMegaSystem32: 'Jaleco Mega System 32',
  TaitoF2: 'Taito F2', TaitoF3: 'Taito F3', TaitoB: 'Taito B System', TaitoAir: 'Taito Air System',
  CapcomZN1: 'Capcom ZN-1', CapcomZN2: 'Capcom ZN-2',
};
const displayName = core => names[core] ?? core.replace(/([a-z])([A-Z0-9])/g, '$1 $2').replace(/(\d)([A-Za-z])/g, '$1 $2');
async function files(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  return (await Promise.all(entries.map(entry => entry.isDirectory() ? files(path.join(dir, entry.name)) : entry.name.toLowerCase().endsWith('.mra') ? [path.join(dir, entry.name)] : []))).flat();
}
const map = new Map();
const mraNames = new Map();
for (const file of await files(source)) {
  const xml = await readFile(file, 'utf8');
  const core = xml.match(/<rbf>([^<]+)<\/rbf>/i)?.[1]?.trim();
  if (!core) continue;
  mraNames.set(path.basename(file, '.mra').toLowerCase(), displayName(core));
  const values = [...xml.matchAll(/<(?:setname|rom[^>]*\bzip)\b[^>]*>([^<]+)<\/(?:setname|rom)>|\bzip="([^"]+)"/gi)]
    .map(match => match[1] ?? match[2])
    .filter(Boolean)
    .map(value => path.basename(value).replace(/\.zip$/i, '').toLowerCase());
  for (const value of values) {
    const previous = map.get(value);
    if (!previous || previous === core) map.set(value, core);
  }
}
const grouped = Object.groupBy([...map.entries()].sort(([a], [b]) => a.localeCompare(b)), ([, core]) => core);
const body = Object.fromEntries([...map.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([set, core]) => [set, displayName(core)]));
const mraBody = Object.fromEntries([...mraNames.entries()].sort(([a], [b]) => a.localeCompare(b)));
await mkdir(path.dirname(output), { recursive: true });
await writeFile(output, `// Generated from the user's installed MiSTer MRA files.\nexport const arcadeCoreByRomSet: Record<string, string> = ${JSON.stringify(body)};\nexport const arcadeCoreByMraName: Record<string, string> = ${JSON.stringify(mraBody)};\n`);
console.log(JSON.stringify(Object.fromEntries(Object.entries(grouped).map(([core, entries]) => [displayName(core), entries.length])), null, 2));
