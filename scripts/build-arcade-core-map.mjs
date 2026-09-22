import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const source = process.argv[2];
const output = process.argv[3] ?? 'src/data/arcadeCoreMap.ts';
if (!source) throw new Error('Pass the extracted MRA directory.');

const groups = ['Capcom', 'Irem', 'Jaleco', 'Namco', 'Sega', 'Taito'];
const groupForManufacturer = value => groups.find(group => value.toLocaleLowerCase().includes(group.toLocaleLowerCase()));
async function files(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  return (await Promise.all(entries.map(entry => entry.isDirectory() ? files(path.join(dir, entry.name)) : entry.name.toLowerCase().endsWith('.mra') ? [path.join(dir, entry.name)] : []))).flat();
}
const mraGroups = new Map();
for (const file of await files(source)) {
  const xml = await readFile(file, 'utf8');
  const manufacturer = xml.match(/<manufacturer>([^<]+)<\/manufacturer>/i)?.[1]?.trim();
  const group = manufacturer ? groupForManufacturer(manufacturer) : undefined;
  if (group) mraGroups.set(path.basename(file, '.mra').toLowerCase(), group);
}
const body = Object.fromEntries([...mraGroups.entries()].sort(([a], [b]) => a.localeCompare(b)));
await mkdir(path.dirname(output), { recursive: true });
await writeFile(output, `// Generated from the user's installed MiSTer MRA files.\nexport const arcadeManufacturerByMraName: Record<string, string> = ${JSON.stringify(body)};\n`);
console.log(JSON.stringify(Object.groupBy(Object.values(body), value => value), null, 2));
