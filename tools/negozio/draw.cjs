/* Pixel art della bottega: i fratelli Big Bros, in tunica e mantello, vendono una pozione mentre uno accarezza il gatto cyborg. Scrive PNG con i fotogrammi affiancati. Uso: node draw.cjs <cartella> */
'use strict';
const fs = require('node:fs'), zlib = require('node:zlib'), path = require('node:path');

function png(w, h, rgba) {
  const crcTable = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
  const crc = buf => { let c = 0xffffffff; for (const b of buf) c = crcTable[(c ^ b) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  const chunk = (type, data) => { const t = Buffer.from(type), len = Buffer.alloc(4), sum = Buffer.alloc(4); len.writeUInt32BE(data.length); sum.writeUInt32BE(crc(Buffer.concat([t, data]))); return Buffer.concat([len, t, data, sum]); };
  const head = Buffer.alloc(13); head.writeUInt32BE(w, 0); head.writeUInt32BE(h, 4); head[8] = 8; head[9] = 6;
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) { raw[y * (w * 4 + 1)] = 0; rgba.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4); }
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', head), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}

class Sprite {
  constructor(w, h) { this.w = w; this.h = h; this.p = Array.from({ length: h }, () => Array(w).fill(null)); }
  px(x, y, c) { x = Math.round(x); y = Math.round(y); if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.p[y][x] = c; }
  blit(o, ox, oy) { for (let y = 0; y < o.h; y++) for (let x = 0; x < o.w; x++) if (o.p[y][x]) this.px(x + ox, y + oy, o.p[y][x]); }
  // Pennello tondo lungo una spezzata: maniche, braccia e coda.
  stroke(points, r, c) { for (let i = 1; i < points.length; i++) { const [x0, y0] = points[i - 1], [x1, y1] = points[i], n = Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 2); for (let k = 0; k <= n; k++) this.ellipse(x0 + (x1 - x0) * k / n, y0 + (y1 - y0) * k / n, r, r, c); } }
  taper(points, r0, r1, c) { const total = points.slice(1).reduce((t, p, i) => t + Math.hypot(p[0] - points[i][0], p[1] - points[i][1]), 0); let done = 0; for (let i = 1; i < points.length; i++) { const [x0, y0] = points[i - 1], [x1, y1] = points[i], len = Math.hypot(x1 - x0, y1 - y0), n = Math.ceil(len * 3); for (let k = 0; k <= n; k++) { const r = r0 + (r1 - r0) * (done + len * k / n) / total; this.ellipse(x0 + (x1 - x0) * k / n, y0 + (y1 - y0) * k / n, r, r, c); } done += len; } }
  // Poligono pieno (pari-dispari sul centro di ogni pixel).
  poly(points, c) {
    const xs = points.map(p => p[0]), ys = points.map(p => p[1]);
    for (let y = Math.floor(Math.min(...ys)); y <= Math.ceil(Math.max(...ys)); y++) for (let x = Math.floor(Math.min(...xs)); x <= Math.ceil(Math.max(...xs)); x++) {
      let inside = false; const X = x + .5, Y = y + .5;
      for (let i = 0, j = points.length - 1; i < points.length; j = i++) { const [xi, yi] = points[i], [xj, yj] = points[j]; if ((yi > Y) !== (yj > Y) && X < (xj - xi) * (Y - yi) / (yj - yi) + xi) inside = !inside; }
      if (inside) this.px(x, y, c);
    }
  }
  get(x, y) { return x >= 0 && y >= 0 && x < this.w && y < this.h ? this.p[y][x] : null; }
  rect(x, y, w, h, c) { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) this.px(i, j, c); }
  ellipse(cx, cy, rx, ry, c, clip = () => true) { for (let y = Math.floor(cy - ry); y <= cy + ry; y++) for (let x = Math.floor(cx - rx); x <= cx + rx; x++) { const d = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2; if (d <= 1 && clip(x, y)) this.px(x, y, c); } }
  // Ombra su un lato: ripassa i pixel già pieni di un colore con un tono più scuro.
  shade(test, c) { for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) if (this.p[y][x] && test(x, y, this.p[y][x])) this.p[y][x] = c; }
  outline(c) {
    const add = [];
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) if (!this.p[y][x] && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => this.get(x + dx, y + dy) && this.get(x + dx, y + dy) !== c)) add.push([x, y]);
    for (const [x, y] of add) this.p[y][x] = c;
  }
  rgba() {
    const out = Buffer.alloc(this.w * this.h * 4);
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) { const c = this.p[y][x]; if (!c) continue; const i = (y * this.w + x) * 4; out[i] = parseInt(c.slice(1, 3), 16); out[i + 1] = parseInt(c.slice(3, 5), 16); out[i + 2] = parseInt(c.slice(5, 7), 16); out[i + 3] = 255; }
    return out;
  }
}
function sheet(frames) {
  const w = frames[0].w, h = frames[0].h, all = Buffer.alloc(w * frames.length * h * 4);
  frames.forEach((f, k) => { const b = f.rgba(); for (let y = 0; y < h; y++) b.copy(all, (y * w * frames.length + k * w) * 4, y * w * 4, (y + 1) * w * 4); });
  return png(w * frames.length, h, all);
}

const OUT = '#1b1424';
const SKIN = { hi: '#f6d3b4', base: '#eebf9c', mid: '#d99f80', low: '#b77a62', deep: '#8c5448' };
const EYE = { white: '#f2efe8', iris: '#7d98ab', dark: '#3b4f5e' };

function face(s, o) {
  const { cx, cy, rx, ry } = o;
  s.ellipse(cx, cy, rx, ry, SKIN.base);
  s.shade((x, y, c) => c === SKIN.base && (x < cx - rx + 2.2 || y > cy + ry - 3), SKIN.mid);
  s.shade((x, y, c) => c === SKIN.base && x > cx + rx - 2, SKIN.mid);
  s.ellipse(cx - 3, cy - 4, 3, 2, SKIN.hi, (x, y) => s.get(x, y) === SKIN.base);
}
function eyes(s, y, blink, brow, browThick) {
  for (const [x0, flip] of [[14, false], [23, true]]) {
    s.rect(x0, y - 2, 4, 1, brow); if (browThick) s.rect(x0 + (flip ? 0 : 1), y - 3, 3, 1, brow);
    if (blink) { s.rect(x0, y, 4, 1, SKIN.low); continue; }
    const row = flip ? [EYE.white, EYE.dark, EYE.iris, EYE.white] : [EYE.white, EYE.iris, EYE.dark, EYE.white];
    row.forEach((c, i) => s.px(x0 + i, y, c));
    s.rect(x0, y - 1, 4, 1, SKIN.mid);
    s.px(x0 + (flip ? 1 : 2), y + 1, SKIN.mid);
  }
}
function nose(s, top, bottom) { for (let y = top; y <= bottom; y++) s.px(21, y, SKIN.mid); s.px(20, bottom, SKIN.low); s.px(22, bottom, SKIN.low); s.px(21, bottom + 1, SKIN.mid); s.px(20, top + 1, SKIN.hi); }


const ROBE = { hi: '#8b643f', base: '#6a4a2c', mid: '#523720', low: '#3a2615', tunic: '#e9dcbc', tunicMid: '#cdb98f', tunicLow: '#a8936b', belt: '#3b2616' };
function robe(s, top) {
  s.ellipse(21, top + 4, 13, 4, ROBE.mid);                       // cappuccio abbassato dietro il collo
  s.ellipse(21, top + 16, 20, 12, ROBE.base);                     // spalle del mantello
  s.rect(1, top + 16, 40, 80 - top - 16, ROBE.base);
  s.shade((x, y, c) => c === ROBE.base && x > 30, ROBE.mid);
  s.shade((x, y, c) => c === ROBE.base && x < 6, ROBE.hi);
  for (const x of [8, 34]) for (let y = top + 14; y < 80; y++) if (s.get(x, y)) s.px(x, y, ROBE.low);
  // tunica crema a V, con i due lembi incrociati
  for (let y = top + 3; y < 80; y++) { const half = Math.min(11, 4 + (y - top) * 0.45); for (let x = Math.ceil(21 - half); x <= 21 + half; x++) s.px(x, y, ROBE.tunic); }
  for (let y = top + 3; y < 80; y++) { const half = Math.min(11, 4 + (y - top) * 0.45); s.px(Math.ceil(21 - half), y, ROBE.mid); s.px(Math.floor(21 + half), y, ROBE.low); }
  for (let i = 0; i < 11; i++) { s.px(16 + i * 0.55, top + 3 + i, ROBE.tunicLow); s.px(26 - i * 0.55, top + 3 + i, ROBE.tunicMid); }
  s.shade((x, y, c) => c === ROBE.tunic && x > 23, ROBE.tunicMid);
  s.rect(10, 74, 23, 3, ROBE.belt); s.rect(19, 74, 4, 3, '#9a7a46');
}

/* Fratello 1: capelli lunghi castano chiaro tirati indietro, sorriso, pizzetto chiaro, maglione blu notte a quadri viola. */
function broLong(blink) {
  const s = new Sprite(42, 80), H = { hi: '#e2b676', base: '#c48d4f', mid: '#a06d36', low: '#734b22' };
  // capelli dietro, fino alle spalle
  s.ellipse(21, 22, 12.4, 14, H.mid);
  s.rect(10, 24, 23, 12, H.mid);
  s.ellipse(11, 35, 2.6, 2, H.mid); s.ellipse(31, 35, 2.6, 2, H.mid);
  s.shade((x, y, c) => c === H.mid && y > 29, H.low);
  // collo e girocollo
  s.rect(17, 33, 9, 8, SKIN.mid); s.rect(17, 33, 9, 2, SKIN.low);
  robe(s, 38);
  // viso lungo
  face(s, { cx: 21, cy: 22, rx: 9.6, ry: 12.5 });
  // capelli: riga centrale, tirati indietro, ciocche ai lati del viso
  s.ellipse(21, 11.5, 10.6, 5, H.base, (x, y) => y <= 11);
  s.rect(11, 11, 2, 11, H.base); s.rect(30, 11, 2, 11, H.base);
  for (const [x, y] of [[13, 9], [15, 8], [17, 7], [25, 7], [27, 8], [29, 9], [14, 10], [28, 10]]) s.px(x, y, H.hi);
  for (let y = 7; y <= 11; y++) s.px(21, y, H.low);
  s.px(20, 7, H.mid); s.px(22, 7, H.mid);
  eyes(s, 19, blink, H.mid, false);
  nose(s, 19, 25);
  // sorriso leggero e pizzetto chiaro
  s.rect(18, 28, 6, 1, '#b2685c'); s.px(17, 27, SKIN.low); s.px(24, 27, SKIN.low); s.rect(19, 29, 4, 1, SKIN.base);
  for (const [x, y] of [[19, 30], [21, 30], [23, 30], [20, 31], [22, 31], [21, 32], [18, 31], [24, 31]]) s.px(x, y, '#c9a079');
  s.outline(OUT);
  return s;
}

/* Fratello 2: capelli corti castano scuro con ciuffo laterale, barba corta e baffi, maglietta nera. */
function broShort(blink) {
  const s = new Sprite(42, 80), H = { hi: '#7d5638', base: '#5a3a24', mid: '#432a19', low: '#2c1b10' };
  // collo e orecchie, poi tunica e mantello
  s.rect(17, 32, 9, 8, SKIN.mid); s.rect(17, 32, 9, 2, SKIN.low);
  robe(s, 37);
  s.ellipse(11.3, 21, 1.8, 3, SKIN.mid); s.ellipse(30.7, 21, 1.8, 3, SKIN.mid);
  face(s, { cx: 21, cy: 21, rx: 9.3, ry: 12 });
  // barba corta sulla mascella, baffi
  const beard = (x, y) => (x + y) % 2 === 0 ? '#6b4c3a' : '#8d6650';
  s.shade((x, y, c) => [SKIN.base, SKIN.mid, SKIN.hi].includes(c) && y >= 25 && y <= 33 && (y > 29 || x < 15 || x > 27), '#8d6650');
  for (let y = 25; y <= 33; y++) for (let x = 10; x < 33; x++) if (s.get(x, y) === '#8d6650') s.px(x, y, beard(x, y));
  s.rect(17, 27, 9, 1, '#4a3122'); s.rect(18, 26, 7, 1, '#6b4c3a');
  s.rect(18, 29, 7, 1, '#9c5e52'); s.px(17, 29, '#6b4c3a'); s.px(25, 29, '#6b4c3a');
  // capelli: riga a sinistra, volume che va verso destra
  s.ellipse(21, 11, 11, 6.5, H.base, (x, y) => y <= 14);
  s.rect(11, 11, 2, 8, H.base); s.rect(30, 11, 2, 8, H.base);
  s.ellipse(25, 8, 8, 3.5, H.base);
  s.rect(13, 13, 15, 1, H.base); s.rect(22, 14, 7, 1, H.mid);
  s.px(14, 8, H.low); s.px(14, 9, H.low); s.px(15, 7, H.low);
  for (const [x, y] of [[17, 7], [19, 6], [21, 6], [24, 5], [27, 6], [29, 8], [18, 10], [23, 9], [26, 10]]) s.px(x, y, H.hi);
  s.rect(11, 16, 2, 4, H.mid); s.rect(30, 16, 2, 4, H.mid);
  eyes(s, 19, blink, H.mid, true);
  nose(s, 19, 24);
  s.outline(OUT);
  return s;
}

/* Gatto persiano rosso tigrato, muso schiacciato e pelo folto, con occhio, orecchio e collare cibernetici. */
function cat(frame, happy) {
  const s = new Sprite(44, 36), O = { hi: '#f6b062', base: '#e48a34', mid: '#c46a22', low: '#9a4c16', stripe: '#8a3f12', cream: '#f8ddb0', creamLow: '#e7bf86' };
  const tail = frame ? [[36, 33], [38, 32], [39, 30], [40, 28], [40, 26], [39, 24], [37, 23]] : [[36, 33], [38, 32], [40, 31], [41, 29], [42, 27], [42, 25], [41, 23]];
  for (const [x, y] of tail) s.ellipse(x, y, 2.2, 2.2, O.base);
  tail.forEach(([x, y], i) => { if (i % 2) s.px(x, y, O.stripe); });
  // corpo e pettorina folta
  s.ellipse(22, 29, 15, 8, O.base);
  s.shade((x, y, c) => c === O.base && y > 31, O.mid);
  s.ellipse(22, 29, 7, 6, O.cream);
  for (const x of [10, 13, 31, 34]) for (let y = 25; y < 33; y++) if (s.get(x, y) === O.base || s.get(x, y) === O.mid) s.px(x, y, O.stripe);
  // zampe
  s.ellipse(16, 34, 3, 1.6, O.cream); s.ellipse(28, 34, 3, 1.6, O.cream);
  // orecchie: quella destra è di metallo con antenna
  for (let i = 0; i < 4; i++) s.rect(9 + i, 3 + i, 4 - i, 1, O.mid);
  s.px(10, 5, '#f0a9a0'); s.px(11, 6, '#f0a9a0');
  for (let i = 0; i < 4; i++) s.rect(31, 3 + i, 4 - i, 1, '#8f9cae');
  s.px(33, 4, '#5d6878'); s.rect(34, 0, 1, 3, '#5d6878'); s.px(34, 0, frame ? '#bff6ff' : '#57e8ff');
  // testa tonda e folta, con ciuffi sul bordo
  s.ellipse(22, 15, 14, 11, O.base);
  for (const [x, y] of [[8, 12], [7, 15], [8, 19], [36, 12], [37, 15], [36, 19], [10, 23], [34, 23], [13, 5], [31, 5], [22, 4]]) s.ellipse(x, y, 1.6, 1.6, O.base);
  s.shade((x, y, c) => c === O.base && y < 9, O.hi);
  s.shade((x, y, c) => c === O.base && y > 21, O.mid);
  // strisce tigrate: la «M» sulla fronte e le guance
  for (const [x, y] of [[17, 7], [17, 8], [18, 9], [19, 8], [20, 7], [22, 6], [22, 7], [22, 8], [24, 7], [25, 8], [26, 9], [27, 8], [27, 7]]) s.px(x, y, O.stripe);
  for (const [x, y] of [[10, 14], [11, 14], [10, 17], [11, 17], [33, 14], [34, 14], [33, 17], [34, 17]]) s.px(x, y, O.low);
  // muso schiacciato color crema
  s.ellipse(22, 19, 6, 3.4, O.cream);
  s.ellipse(22, 21.5, 4, 1.6, O.creamLow);
  s.rect(21, 17, 3, 1, '#c76d6d'); s.px(22, 18, '#9d4b4b');
  s.px(21, 19, '#7a3a3a'); s.px(23, 19, '#7a3a3a'); s.px(20, 20, '#7a3a3a'); s.px(24, 20, '#7a3a3a');
  // occhio naturale ramato, grande e tondo
  if (happy) { s.px(13, 14, O.stripe); s.rect(14, 13, 3, 1, O.stripe); s.px(17, 14, O.stripe); }
  else if (frame === 1) s.rect(13, 14, 5, 1, O.stripe);
  else { s.ellipse(15.5, 13.5, 2.6, 2.2, '#f2a933'); s.rect(15, 12, 1, 4, '#2b1a10'); s.px(14, 12, '#fff3d6'); }
  // occhio cibernetico: anello di metallo e lente ciano
  s.ellipse(28.5, 13.5, 3.4, 3, '#8f9cae'); s.ellipse(28.5, 13.5, 2.2, 1.9, frame ? '#bff6ff' : '#57e8ff'); s.px(28, 13, '#ffffff');
  s.rect(25, 10, 6, 1, '#5d6878'); s.px(31, 11, '#5d6878'); s.px(32, 12, '#5d6878');
  // collare di circuiti con medaglietta luminosa
  s.rect(13, 24, 18, 2, '#5d6878'); s.rect(13, 24, 18, 1, '#8f9cae');
  for (let x = 15; x < 30; x += 3) s.px(x, 25, '#57e8ff');
  s.rect(21, 26, 3, 2, frame ? '#bff6ff' : '#57e8ff');
  s.outline(OUT);
  // baffi sopra il contorno, sottili e chiari
  for (const [x0, dir] of [[7, -1], [37, 1]]) for (let i = 0; i < 4; i++) { s.px(x0 + dir * i, 18 - (i > 1 ? 1 : 0), '#fff1d6'); s.px(x0 + dir * i, 21 + (i > 1 ? 1 : 0), '#fff1d6'); }
  for (const [x, y] of [[16, 19], [15, 19], [28, 19], [29, 19], [16, 21], [28, 21]]) s.px(x, y, '#fff1d6');
  return s;
}

/* Scritte al neon con un carattere a pixel 4×7 (scala 1 o 2), centrate su cx. */
const FONT = { B: ['1110', '1001', '1001', '1110', '1001', '1001', '1110'], I: ['111', '010', '010', '010', '010', '010', '111'], G: ['0111', '1000', '1000', '1011', '1001', '1001', '0111'], R: ['1110', '1001', '1001', '1110', '1010', '1001', '1001'], O: ['0110', '1001', '1001', '1001', '1001', '1001', '0110'], S: ['0111', '1000', '1000', '0110', '0001', '0001', '1110'], P: ['1110', '1001', '1001', '1110', '1000', '1000', '1000'], Z: ['1111', '0001', '0010', '0100', '1000', '1000', '1111'], N: ['1001', '1101', '1101', '1011', '1011', '1001', '1001'] };
function neon(s, word, cx, top, k, color, shadow) {
  const gw = ch => ch === ' ' ? 3 : FONT[ch][0].length;
  let tx = Math.round(cx - k * [...word].reduce((t, ch) => t + gw(ch) + 1, -1) / 2);
  for (const ch of word) { if (ch !== ' ') FONT[ch].forEach((row, y) => [...row].forEach((v, x) => { if (v === '1') { s.rect(tx + x * k, top + y * k + k, k, k, shadow); s.rect(tx + x * k, top + y * k, k, k, color); } })); tx += (gw(ch) + 1) * k; }
}

/* Braccia con le proporzioni prese dalle foto di riferimento (Wikimedia Commons: N. Stojkovic, CC BY 2.0; S. Viinamäki, CC BY-SA 4.0):
   avambraccio largo circa un terzo della testa, manica a campana più larga al polso, mano lunga circa tre quarti del viso. */
const add = (a, b, k = 1) => [a[0] + b[0] * k, a[1] + b[1] * k];
function sleeve(a, shoulder, elbow, wrist, halfElbow, halfWrist) {
  const d = [wrist[0] - elbow[0], wrist[1] - elbow[1]], len = Math.hypot(...d), u = [d[0] / len, d[1] / len], n = [u[1], -u[0]];
  // parte alta lungo il fianco, poi l'avambraccio che si allarga a campana
  a.poly([add(shoulder, [-4, 0]), add(shoulder, [4, 0]), add(elbow, n, -halfElbow), add(elbow, [0, 4]), add(elbow, n, halfElbow)], ROBE.base);
  a.poly([add(elbow, n, halfElbow), add(elbow, n, -halfElbow), add(wrist, n, -halfWrist), add(wrist, n, halfWrist)], ROBE.base);
  a.ellipse(elbow[0], elbow[1], halfElbow, halfElbow, ROBE.base);
  a.shade((x, y, c) => c === ROBE.base && (!a.get(x, y - 1) || !a.get(x - 1, y)), ROBE.hi);
  a.shade((x, y, c) => c === ROBE.base && (!a.get(x, y + 1) || !a.get(x + 1, y + 1)), ROBE.mid);
  // pieghe morbide lungo l'avambraccio e al gomito
  for (const [k, side] of [[0.3, 0.4], [0.55, -0.3], [0.8, 0.2]]) { const p = add(add(elbow, d, k), n, side * halfWrist); for (let t = -2; t <= 2; t++) a.px(p[0] + u[0] * t, p[1] + u[1] * t, ROBE.mid); }
  a.px(elbow[0] - 1, elbow[1] + 1, ROBE.low); a.px(elbow[0], elbow[1] + 2, ROBE.low);
  // apertura della manica e polsino crema della tunica
  for (let t = -halfWrist; t <= halfWrist; t += .5) { const p = add(wrist, n, t); a.px(p[0], p[1], ROBE.low); a.px(p[0] + u[0], p[1] + u[1], ROBE.low); }
  for (let t = -halfWrist + 2; t <= halfWrist - 2; t += .5) { const p = add(add(wrist, u, 1.6), n, t); a.px(p[0], p[1], ROBE.tunic); }
  return { u, n };
}
// Carezza (riferimento: foto di N. Stojkovic): gomito vicino al fianco, mano sopra la testa del gatto, dita stese verso
// l'orecchio lontano, pollice staccato giù lungo la guancia.
function petArm(f) {
  const a = new Sprite(136, 118), d = f % 2 ? 1 : 0;
  sleeve(a, [37, 55], [39, 68], [43 + d, 51], 3.6, 4.6);
  a.poly([[42 + d, 49], [46 + d, 45.5], [53 + d, 44.5], [55.5 + d, 47], [50 + d, 51.5], [44 + d, 53]], SKIN.base);
  a.shade((x, y, c) => c === SKIN.base && !a.get(x, y - 1), SKIN.hi);
  for (let i = 0; i < 4; i++) { const b = [53.2 + d + i * 0.2, 45 + i * 1.5], t = [b[0] + 4 - i * 0.4, b[1] + 2.6 + i * 0.3]; a.poly([[b[0], b[1] - .7], [b[0], b[1] + .9], [t[0], t[1] + .7], [t[0] + .4, t[1] - .5]], SKIN.base); a.px(t[0], t[1], SKIN.mid); }
  for (let i = 0; i < 3; i++) a.px(54 + d + i * 0.2, 46.6 + i * 1.5, SKIN.low);
  a.poly([[42 + d, 51], [44.4 + d, 51.5], [42.8 + d, 57], [40.8 + d, 56.5]], SKIN.mid); a.px(41.6 + d, 56.5, SKIN.low);
  a.outline(OUT);
  return a;
}
// Presa (riferimento: foto di S. Viinamäki): gomito al fianco, palmo sotto la fiaschetta, nocche sul lato, pollice davanti.
function offerArm() {
  const a = new Sprite(136, 118);
  sleeve(a, [98, 55], [100, 74], [104, 64], 3.6, 5);
  a.poly([[102, 62.5], [105, 58.5], [112, 57.5], [113.5, 60.5], [108.5, 64], [104, 65]], SKIN.base);
  a.shade((x, y, c) => c === SKIN.base && !a.get(x, y + 1), SKIN.mid);
  a.outline(OUT);
  return a;
}
function offerGrip(fx, fy) {
  const a = new Sprite(136, 118);
  for (let i = 0; i < 4; i++) { const y = fy - 1.5 + i * 2.1; a.ellipse(fx - 6, y, 1.5, 1.1, SKIN.base); a.px(fx - 7, y, SKIN.hi); a.px(fx - 5, y + 1, SKIN.mid); }
  a.poly([[fx + 6.5, fy + 2], [fx + 6.5, fy + 4.2], [fx, fy + 3.6], [fx, fy + 1.8]], SKIN.base);
  a.px(fx, fy + 2, SKIN.hi); a.rect(fx + 1, fy + 3, 5, 1, SKIN.mid);
  a.outline(OUT);
  return a;
}

/* La scena della bottega: scaffali di pozioni, bancone al neon, il gatto sul bancone fra i due fratelli. */
const POTIONS = ['#ff5fd2', '#57e8ff', '#7dff8a', '#ffd35a', '#b78cff', '#ff7a59'];
let seed = 11;
const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
// Un oggetto da scaffale appoggiato sulla riga «base»: restituisce la larghezza occupata.
function item(s, x, base, kind, c, lit) {
  const glass = '#c9d6e6', cork = '#8a5a2e';
  if (kind === 'vial') { s.rect(x, base - 6, 3, 6, c); s.px(x, base - 6, '#ffffff'); s.rect(x + 1, base - 8, 1, 2, glass); s.px(x + 1, base - 9, cork); return 4; }
  if (kind === 'flask') { s.ellipse(x + 3, base - 3, 3.2, 3, c); s.px(x + 2, base - 5, '#ffffff'); s.rect(x + 2, base - 9, 2, 3, glass); s.rect(x + 2, base - 10, 2, 1, cork); return 7; }
  if (kind === 'tube') { s.rect(x, base - 10, 2, 10, glass); s.rect(x, base - 6, 2, 6, c); s.px(x, base - 10, '#ffffff'); return 3; }
  if (kind === 'jar') { s.rect(x, base - 7, 6, 7, '#2b4466'); s.rect(x + 1, base - 6, 4, 5, c); if (lit) { s.px(x + 2, base - 4, '#ffffff'); s.px(x + 3, base - 3, '#ffffff'); } s.rect(x, base - 8, 6, 1, '#8f9cae'); return 7; }
  if (kind === 'books') { const cols = ['#b5473a', '#3f7cc4', '#d9a441', '#5b9e5a', '#8a5bb5']; let w = 0; for (let i = 0; i < 4; i++) { const h = 6 + Math.floor(rnd() * 3); s.rect(x + w, base - h, 2, h, cols[(i + Math.floor(rnd() * 5)) % 5]); s.px(x + w, base - h + 1, '#f2e6c8'); w += 2; } return w + 1; }
  if (kind === 'crate') { s.rect(x, base - 6, 8, 6, '#6a4a2c'); s.rect(x, base - 6, 8, 1, '#8b643f'); s.rect(x, base - 3, 8, 1, '#523720'); s.px(x + 3, base - 5, '#523720'); s.px(x + 4, base - 2, '#523720'); return 9; }
  if (kind === 'candle') { s.rect(x, base - 4, 2, 4, '#f2e6c8'); s.px(x, base - 5, '#2a1d14'); s.px(x, base - 6, lit ? '#fff3c4' : '#ffb347'); return 3; }
  if (kind === 'skull') { s.ellipse(x + 3, base - 3, 3, 2.6, '#57e8ff'); s.px(x + 2, base - 3, '#10233a'); s.px(x + 4, base - 3, '#10233a'); s.rect(x + 2, base - 1, 3, 1, '#2f8fae'); return 7; }
  return 0;
}
function shelf(s, y, x0, x1, lit) {
  s.rect(x0, y, x1 - x0, 2, '#4a3524'); s.rect(x0, y, x1 - x0, 1, '#6a4a2c'); s.rect(x0, y + 2, x1 - x0, 1, '#2a1d14');
  for (const x of [x0 + 3, x1 - 4]) s.rect(x, y + 3, 1, 3, '#2a1d14');
  const kinds = ['vial', 'flask', 'tube', 'jar', 'books', 'crate', 'candle', 'flask', 'vial', 'skull'];
  for (let x = x0 + 2; x < x1 - 8;) { const k = kinds[Math.floor(rnd() * kinds.length)]; x += item(s, x, y, k, POTIONS[Math.floor(rnd() * POTIONS.length)], lit) + 1 + Math.floor(rnd() * 3); }
}
// Parete di mattoni con toni diversi.
function bricks(s, y0, y1, dark) {
  const tones = dark ? ['#0f2034', '#112539', '#0d1c2e'] : ['#13283f', '#162d46', '#112438', '#182f4a'];
  for (let y = y0; y < y1; y++) for (let x = 0; x < s.w; x++) { const row = Math.floor((y - y0) / 5), off = row % 2 ? 4 : 0; const mortar = (y - y0) % 5 === 4 || (x + off) % 9 === 8; s.px(x, y, mortar ? '#0b1828' : tones[(Math.floor((x + off) / 9) * 7 + row * 3) % tones.length]); }
}
function bottle(s, x, y, c, big) {
  const h = big ? 7 : 5, w = big ? 5 : 3;
  s.rect(x + Math.floor(w / 2), y - 2, 1, 2, '#c9d6e6'); s.px(x + Math.floor(w / 2), y - 3, '#8a5a2e');
  s.rect(x, y, w, h, c); s.rect(x, y, w, 1, '#ffffff99'.slice(0, 7)); s.px(x, y + 1, '#ffffff');
  s.rect(x, y + h, w, 1, '#1b1424');
}
function counter(f) {
  const W = 136, H = 118, s = new Sprite(W, H);
  // parete di mattoni, due scaffali con oggetti diversi e uno schermo olografico fra i fratelli
  seed = 23;
  bricks(s, 0, 82, false);
  shelf(s, 22, 0, W, f === 2);
  shelf(s, 46, 0, W, f === 2);
  s.rect(52, 26, 32, 15, '#0b1828'); s.rect(52, 26, 32, 1, '#57e8ff'); s.rect(52, 40, 32, 1, '#57e8ff');
  for (let i = 0; i < 6; i++) { const h = 3 + ((i * 5 + f) % 7); s.rect(55 + i * 5, 38 - h, 3, h, i % 2 ? '#57e8ff' : '#ff5fd2'); }
  const glow = POTIONS[(f + 1) % POTIONS.length];
  // i due fratelli
  s.blit(broLong(f === 3), 0, 6);
  s.blit(broShort(f === 3), 94, 6);
  // il gatto seduto sul bancone
  s.blit(cat(f % 2, f % 2 === 1), 32, 47);
  // fratello 1 accarezza il gatto; fratello 2 regge la pozione davanti al petto
  s.blit(petArm(f), 0, 0);
  s.blit(offerArm(), 0, 0);
  const fx = 108, fy = 51;
  s.ellipse(fx, fy, 6.4, 6.2, '#1b1424'); s.ellipse(fx, fy, 5.4, 5.2, '#ff5fd2'); s.ellipse(fx - 2, fy - 2, 1.8, 1.4, '#ffd0f2'); s.rect(fx - 4, fy + 3, 8, 1, '#c23f9d');
  s.rect(fx - 1, fy - 10, 3, 4, '#c9d6e6'); s.rect(fx - 2, fy - 11, 5, 1, '#8a5a2e'); s.rect(fx - 2, fy - 10, 1, 4, '#1b1424'); s.rect(fx + 2, fy - 10, 1, 4, '#1b1424');
  s.blit(offerGrip(fx, fy), 0, 0);
  const spark = f === 2 ? [[fx - 8, fy - 6], [fx + 9, fy - 4], [fx - 9, fy + 4], [fx + 10, fy + 6], [fx, fy - 13]] : [[fx - 7, fy - 3], [fx + 8, fy - 1], [fx, fy - 12]];
  for (const [x, y] of spark) { s.px(x, y, '#fff3fb'); if (f === 2) { s.px(x + 1, y, '#ff9be6'); s.px(x - 1, y, '#ff9be6'); s.px(x, y + 1, '#ff9be6'); s.px(x, y - 1, '#ff9be6'); } }
  // bancone: piano di metallo, striscia al neon, pannello con monete e pozioni
  s.rect(0, 82, W, 3, '#8f9cae'); s.rect(0, 82, W, 1, '#c9d6e6');
  s.rect(0, 85, W, 2, f % 2 ? '#bff6ff' : '#57e8ff');
  s.rect(0, 87, W, H - 87, '#17263a');
  s.rect(30, 92, 76, 19, '#0d1828'); s.rect(30, 92, 76, 1, '#2a4566');
  neon(s, 'POZIONI', 68, 98, 1, f === 2 ? '#ffd0f2' : '#ff5fd2', '#5a1d4c');
  item(s, 9, 82, 'flask', '#7dff8a', true); item(s, 17, 82, 'jar', '#ffd35a', f === 2); item(s, 114, 82, 'tube', glow); item(s, 118, 82, 'candle', '', f === 2); item(s, 122, 82, 'flask', '#57e8ff');
  for (let i = 0; i < 4; i++) { s.ellipse(105, 80 - i * 1.6, 3, 1.2, '#f2c14e'); s.px(104, 80 - i * 1.6, '#fff1b8'); }
  return s;
}
// Scena verticale, nelle proporzioni della colonna della bottega: spazio per il fumetto, insegna, scaffali e bancone.
function scene(f) {
  const W = 136, H = 212, top = H - 118, s = new Sprite(W, H);
  seed = 5;
  bricks(s, 0, H, false);
  // soffitto: tubi con valvole e cavi che pendono
  s.rect(0, 2, W, 3, '#5d6878'); s.rect(0, 2, W, 1, '#8f9cae'); s.rect(0, 9, W, 2, '#3a4a5e');
  for (const x of [30, 74, 110]) { s.rect(x, 1, 4, 5, '#8f9cae'); s.px(x + 1, 3, '#c4503a'); }
  for (let x = 40; x < 100; x++) s.px(x, 12 + Math.round(5 * Math.sin((x - 40) / 60 * Math.PI)), '#1b1424');
  for (let x = 4; x < 36; x++) s.px(x, 11 + Math.round(3 * Math.sin((x - 4) / 32 * Math.PI)), '#2f8fae');
  // pianta appesa con foglie al neon
  s.rect(118, 5, 1, 9, '#3a4a5e'); s.rect(114, 14, 9, 5, '#8a5a2e'); s.rect(114, 14, 9, 1, '#b57b45');
  for (const [x, y] of [[113, 19], [112, 21], [124, 19], [125, 22], [116, 20], [121, 21], [118, 22], [111, 23]]) s.px(x, y, f % 2 ? '#9dff9a' : '#7dff8a');
  // insegna grande con cornice al neon e due lampade appese
  s.rect(14, 30, 108, 26, '#0b1828'); s.rect(14, 30, 108, 1, '#57e8ff'); s.rect(14, 55, 108, 1, '#57e8ff'); s.rect(14, 30, 1, 26, '#57e8ff'); s.rect(121, 30, 1, 26, '#57e8ff');
  neon(s, 'BIG BROS', 68, 35, 2, f % 2 ? '#ffe08a' : '#ffd35a', '#6b4a12');
  for (const x of [10, 126]) { s.rect(x, 0, 1, 64, '#3a4a5e'); s.ellipse(x, 66, 4, 2.2, '#8f9cae'); s.rect(x - 2, 68, 5, 1, f === 2 ? '#fff3c4' : '#ffd35a'); }
  // finestra sulla Milano notturna, con le guglie del Duomo
  s.rect(4, 62, 44, 28, '#3a4a5e');
  for (let y = 64; y < 88; y++) for (let x = 6; x < 46; x++) s.px(x, y, y < 72 ? '#2c1d4f' : y < 80 ? '#3a2463' : '#4a2a6e');
  for (const [x, y] of [[9, 66], [20, 65], [34, 67], [42, 65], [27, 69]]) s.px(x, y, '#fff3c4');
  for (const [x, w, h] of [[6, 6, 10], [12, 5, 14], [32, 6, 12], [38, 8, 9]]) { s.rect(x, 88 - h, w, h, '#120c22'); for (let k = 0; k < 4; k++) s.px(x + 1 + (k * 3) % w, 90 - h + k * 2, '#ffd35a'); }
  s.rect(18, 80, 13, 8, '#d8cdb8'); for (const [x, h] of [[18, 6], [20, 9], [23, 12], [24, 14], [25, 12], [28, 9], [30, 6]]) s.rect(x, 80 - h, 1, h, '#d8cdb8'); s.px(24, 65, '#ffd35a');
  s.rect(44, 70, 1, 18, '#57e8ff');
  s.rect(25, 62, 2, 28, '#3a4a5e'); s.rect(4, 75, 44, 2, '#3a4a5e');
  // schermo olografico dei prezzi
  s.rect(56, 64, 26, 20, '#0b1828'); s.rect(56, 64, 26, 1, '#57e8ff'); s.rect(56, 83, 26, 1, '#57e8ff');
  for (let i = 0; i < 4; i++) { s.rect(59, 67 + i * 4, 3, 2, POTIONS[i]); s.rect(64, 68 + i * 4, 8 + ((i * 3 + f) % 6), 1, '#8fd8ea'); s.rect(76, 67 + i * 4, 3, 2, '#ffd35a'); }
  // scaffale con oggetti vari
  shelf(s, 86, 84, W, f === 2);
  shelf(s, 74, 86, W, f === 2);
  s.blit(counter(f), 0, top);
  return s;
}

const out = process.argv[2] || '.';
fs.writeFileSync(path.join(out, 'big-bros-shop-v1.png'), sheet([0, 1, 2, 3].map(scene)));
console.log('Scritti i negozianti in', out);
