/**
 * Generates a minimal 512×512 PNG app icon for AI-LiDAR.
 * Run with: node electron/generate-icon.mjs
 * Writes to: electron/assets/icon.png
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import zlib from 'zlib';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, 'assets');
fs.mkdirSync(outDir, { recursive: true });

const SIZE = 512;

// Build a 512x512 RGBA pixel buffer
const buf = Buffer.alloc(SIZE * SIZE * 4);

function setPixel(x, y, r, g, b, a = 255) {
  if (x < 0 || x >= SIZE || y < 0 || y >= SIZE) return;
  const i = (y * SIZE + x) * 4;
  buf[i] = r; buf[i + 1] = g; buf[i + 2] = b; buf[i + 3] = a;
}

function fillRect(x, y, w, h, r, g, b, a = 255) {
  for (let dy = 0; dy < h; dy++)
    for (let dx = 0; dx < w; dx++)
      setPixel(x + dx, y + dy, r, g, b, a);
}

function circle(cx, cy, radius, r, g, b, a = 255) {
  for (let y = Math.floor(cy - radius); y <= Math.ceil(cy + radius); y++) {
    for (let x = Math.floor(cx - radius); x <= Math.ceil(cx + radius); x++) {
      const d = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
      if (d <= radius) setPixel(x, y, r, g, b, a);
    }
  }
}

function ring(cx, cy, r1, r2, r, g, b, a = 255) {
  for (let y = Math.floor(cy - r2); y <= Math.ceil(cy + r2); y++) {
    for (let x = Math.floor(cx - r2); x <= Math.ceil(cx + r2); x++) {
      const d = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
      if (d >= r1 && d <= r2) setPixel(x, y, r, g, b, a);
    }
  }
}

function line(x0, y0, x1, y1, r, g, b, a = 255) {
  const dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let err = dx - dy, x = x0, y = y0;
  for (let i = 0; i < 1000; i++) {
    setPixel(x, y, r, g, b, a);
    if (x === x1 && y === y1) break;
    const e2 = 2 * err;
    if (e2 > -dy) { err -= dy; x += sx; }
    if (e2 < dx) { err += dx; y += sy; }
  }
}

// ── Draw icon ─────────────────────────────────────────────────────────────────
const C = SIZE / 2;

// Background: dark gradient (simulate with radial fill)
for (let y = 0; y < SIZE; y++) {
  for (let x = 0; x < SIZE; x++) {
    const d = Math.sqrt((x - C) ** 2 + (y - C) ** 2) / C;
    const v = Math.round(7 + (1 - d) * 22);
    setPixel(x, y, v, Math.round(v * 0.55), Math.round(v * 0.1));
  }
}

// Rounded corner mask
const RADIUS = 90;
for (let y = 0; y < SIZE; y++) {
  for (let x = 0; x < SIZE; x++) {
    const corners = [
      [RADIUS, RADIUS], [SIZE - RADIUS, RADIUS],
      [RADIUS, SIZE - RADIUS], [SIZE - RADIUS, SIZE - RADIUS],
    ];
    const nearCorner = corners.some(([cx, cy]) =>
      (Math.abs(x - cx) > RADIUS || Math.abs(y - cy) > RADIUS) &&
      x < RADIUS && y < RADIUS && Math.sqrt((x - cx) ** 2 + (y - cy) ** 2) > RADIUS
    );
    // Simple: kill pixels outside rounded rect
    const inCorner = (xc, yc) => Math.sqrt((x - xc) ** 2 + (y - yc) ** 2) > RADIUS;
    if (
      (x < RADIUS && y < RADIUS && inCorner(RADIUS, RADIUS)) ||
      (x > SIZE - RADIUS && y < RADIUS && inCorner(SIZE - RADIUS, RADIUS)) ||
      (x < RADIUS && y > SIZE - RADIUS && inCorner(RADIUS, SIZE - RADIUS)) ||
      (x > SIZE - RADIUS && y > SIZE - RADIUS && inCorner(SIZE - RADIUS, SIZE - RADIUS))
    ) {
      setPixel(x, y, 0, 0, 0, 0); // transparent
    }
  }
}

// Outer glow ring
ring(C, C, 180, 200, 59, 130, 246, 25);
ring(C, C, 195, 200, 59, 130, 246, 50);

// Blue circle
circle(C, C, 175, 15, 40, 100, 255);

// Darker inner circle
circle(C, C, 155, 7, 13, 24, 255);

// LiDAR scan rings
ring(C, C, 95, 105, 0, 212, 255, 180);
ring(C, C, 130, 138, 0, 212, 255, 100);
ring(C, C, 155, 160, 0, 212, 255, 60);

// Center dot (UAV)
circle(C, C, 22, 0, 212, 255, 255);
circle(C, C, 14, 255, 255, 255, 255);

// Scan beams
for (let a = 0; a < 4; a++) {
  const angle = (a * Math.PI) / 2;
  const x1 = Math.round(C + Math.cos(angle) * 22);
  const y1 = Math.round(C + Math.sin(angle) * 22);
  const x2 = Math.round(C + Math.cos(angle) * 90);
  const y2 = Math.round(C + Math.sin(angle) * 90);
  for (let t = 0; t <= 1; t += 0.005) {
    const x = Math.round(x1 + (x2 - x1) * t);
    const y = Math.round(y1 + (y2 - y1) * t);
    const alpha = Math.round(200 * (1 - t));
    setPixel(x, y, 0, 212, 255, alpha);
    setPixel(x + 1, y, 0, 212, 255, Math.round(alpha * 0.5));
  }
}

// Building silhouettes at bottom
const buildings = [
  [C - 130, 310, 40, 80],
  [C - 75, 300, 35, 90],
  [C - 25, 290, 50, 100],
  [C + 45, 305, 38, 85],
  [C + 100, 315, 42, 75],
];
buildings.forEach(([x, y, w, h]) => {
  fillRect(x, y, w, h, 30, 80, 140, 200);
  fillRect(x + 3, y + 5, w - 6, h - 5, 20, 55, 100, 150);
  // Windows
  for (let wy = 0; wy < 4; wy++) {
    for (let wx = 0; wx < 3; wx++) {
      fillRect(x + 5 + wx * 10, y + 10 + wy * 18, 6, 10, 0, 200, 255, 180);
    }
  }
});

// Text: "AI" at top
// Simple pixel font for "AI"
const AI_PIXELS = [
  // A
  [0,2],[1,1],[2,0],[3,1],[4,2],[1,2],[2,2],[3,2],[0,3],[4,3],[0,4],[4,4],
  // I (offset +7)
  [7,0],[8,0],[9,0],[8,1],[8,2],[8,3],[7,4],[8,4],[9,4],
];
AI_PIXELS.forEach(([px, py]) => {
  const sx = C - 25 + px * 10;
  const sy = 110 + py * 10;
  fillRect(sx, sy, 8, 8, 255, 255, 255, 230);
});

// ── Encode as PNG ─────────────────────────────────────────────────────────────
function encodePNG(width, height, pixels) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  function chunk(type, data) {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
    const t = Buffer.from(type, 'ascii');
    const crcBuf = Buffer.concat([t, data]);
    let crc = 0xffffffff;
    for (const byte of crcBuf) {
      crc ^= byte;
      for (let i = 0; i < 8; i++) crc = (crc & 1) ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
    }
    crc = (crc ^ 0xffffffff) >>> 0;
    const crcOut = Buffer.alloc(4); crcOut.writeUInt32BE(crc, 0);
    return Buffer.concat([len, t, data, crcOut]);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;

  const raw = [];
  for (let y = 0; y < height; y++) {
    raw.push(0); // filter none
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      raw.push(pixels[i], pixels[i + 1], pixels[i + 2], pixels[i + 3]);
    }
  }

  const deflated = zlib.deflateSync(Buffer.from(raw));
  return Buffer.concat([signature, chunk('IHDR', ihdr), chunk('IDAT', deflated), chunk('IEND', Buffer.alloc(0))]);
}

const png = encodePNG(SIZE, SIZE, buf);
const outPath = path.join(outDir, 'icon.png');
fs.writeFileSync(outPath, png);
console.log(`Icon written to ${outPath} (${Math.round(png.length / 1024)} KB)`);
