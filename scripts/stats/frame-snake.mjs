import { readFile, writeFile } from "node:fs/promises";

const file = process.argv[2] ?? "dist/github-snake-dark.svg";
const PAD = 20;

const svg = await readFile(file, "utf8");
const open = svg.match(/<svg\b[^>]*>/);
const viewBox = open?.[0].match(/viewBox="([^"]+)"/);
if (!open || !viewBox) throw new Error(`No <svg viewBox> found in ${file}`);

const [x, y, w, h] = viewBox[1].split(/[\s,]+/).map(Number);
const box = { x: x - PAD, y: y - PAD, w: w + PAD * 2, h: h + PAD * 2 };

const tag = open[0]
  .replace(/viewBox="[^"]+"/, `viewBox="${box.x} ${box.y} ${box.w} ${box.h}"`)
  .replace(/\swidth="[^"]+"/, ` width="${box.w}"`)
  .replace(/\sheight="[^"]+"/, ` height="${box.h}"`);

const frame = `<defs><linearGradient id="snake-stroke" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7F5AF0" stop-opacity="0.7"/><stop offset="0.5" stop-color="#FFFFFF" stop-opacity="0.06"/><stop offset="1" stop-color="#2CB67D" stop-opacity="0.6"/></linearGradient></defs><rect x="${box.x + 0.75}" y="${box.y + 0.75}" width="${box.w - 1.5}" height="${box.h - 1.5}" rx="20" fill="#0B0F19" stroke="url(#snake-stroke)" stroke-width="1.5"/>`;

await writeFile(file, svg.replace(open[0], tag + frame));
console.log(`Framed ${file}: ${box.w}x${box.h}`);
