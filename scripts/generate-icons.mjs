// public/icon.svg is the only editable icon source. Run after npm ci.
import {readFile, writeFile} from 'node:fs/promises';
import sharp from 'sharp';

const source = await readFile(new URL('../public/icon.svg', import.meta.url));
const raster = size => sharp(source, {density: 288}).resize(size, size).png().toBuffer();
const sizes = [16, 32, 48];
const images = await Promise.all(sizes.map(raster));
const directory = Buffer.alloc(6 + 16 * sizes.length);
directory.writeUInt16LE(1, 2); // ICO, rather than CUR.
directory.writeUInt16LE(sizes.length, 4);
let offset = directory.length;
for (let i = 0; i < sizes.length; i++) {
  const entry = 6 + i * 16;
  directory[entry] = directory[entry + 1] = sizes[i];
  directory.writeUInt16LE(1, entry + 4);
  directory.writeUInt16LE(32, entry + 6);
  directory.writeUInt32LE(images[i].length, entry + 8);
  directory.writeUInt32LE(offset, entry + 12);
  offset += images[i].length;
}
await writeFile(new URL('../public/favicon.ico', import.meta.url), Buffer.concat([directory, ...images]));
await writeFile(new URL('../public/apple-touch-icon.png', import.meta.url), await raster(180));
console.log('Generated favicon.ico (16/32/48) and apple-touch-icon.png (180) from public/icon.svg');
