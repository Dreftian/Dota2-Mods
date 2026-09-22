// Renders authentic Dota 2 rank and hero badge numbers directly onto textures
// and patches Panorama CSS style sheets for in-game display.

const fs = require('fs');
const zlib = require('zlib');
const { crc32 } = require('./vpk');
const GLYPH_DATA = require('./rank-font-data');

// 5x7 bitmap font for small hero badge level numbers
const FONT_5x7 = {
  '0': [' 111 ', '1   1', '1   1', '1   1', '1   1', '1   1', ' 111 '],
  '1': ['  1  ', ' 11  ', '  1  ', '  1  ', '  1  ', '  1  ', ' 111 '],
  '2': [' 111 ', '1   1', '    1', '  11 ', ' 1   ', '1    ', '11111'],
  '3': ['1111 ', '    1', '    1', ' 111 ', '    1', '    1', '1111 '],
  '4': ['   1 ', '  11 ', ' 1 1 ', '1  1 ', '11111', '   1 ', '   1 '],
  '5': ['11111', '1    ', '1111 ', '    1', '    1', '1   1', ' 111 '],
  '6': [' 111 ', '1    ', '1111 ', '1   1', '1   1', '1   1', ' 111 '],
  '7': ['11111', '    1', '   1 ', '  1  ', ' 1   ', ' 1   ', ' 1   '],
  '8': [' 111 ', '1   1', '1   1', ' 111 ', '1   1', '1   1', ' 111 '],
  '9': [' 111 ', '1   1', '1   1', ' 1111', '    1', '    1', ' 111 '],
};

function paeth(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
}

function decodePngRgba(pngBuf) {
  let offset = 8;
  const idats = [];
  let w = 0, h = 0;
  while (offset < pngBuf.length) {
    const len = pngBuf.readUInt32BE(offset);
    const type = pngBuf.subarray(offset + 4, offset + 8).toString('ascii');
    if (type === 'IHDR') {
      w = pngBuf.readUInt32BE(offset + 8);
      h = pngBuf.readUInt32BE(offset + 12);
    } else if (type === 'IDAT') {
      idats.push(pngBuf.subarray(offset + 8, offset + 8 + len));
    }
    offset += 12 + len;
  }
  const raw = zlib.inflateSync(Buffer.concat(idats));
  const pixels = Buffer.alloc(w * h * 4);
  const bpp = 4;
  const stride = 1 + w * bpp;
  for (let y = 0; y < h; y++) {
    const filter = raw[y * stride];
    const rowOffset = y * stride + 1;
    const outRow = y * w * bpp;
    for (let x = 0; x < w * bpp; x++) {
      const val = raw[rowOffset + x];
      const left = x >= bpp ? pixels[outRow + x - bpp] : 0;
      const up = y > 0 ? pixels[outRow - w * bpp + x] : 0;
      const upLeft = (y > 0 && x >= bpp) ? pixels[outRow - w * bpp + x - bpp] : 0;
      let res = val;
      if (filter === 1) res = (val + left) & 0xff;
      else if (filter === 2) res = (val + up) & 0xff;
      else if (filter === 3) res = (val + Math.floor((left + up) / 2)) & 0xff;
      else if (filter === 4) res = (val + paeth(left, up, upLeft)) & 0xff;
      pixels[outRow + x] = res;
    }
  }
  return { width: w, height: h, pixels };
}

function encodePngRgba(width, height, pixels) {
  const stride = 1 + width * 4;
  const raw = Buffer.alloc(height * stride);
  for (let y = 0; y < height; y++) {
    raw[y * stride] = 0;
    pixels.copy(raw, y * stride + 1, y * width * 4, (y + 1) * width * 4);
  }
  const compressed = zlib.deflateSync(raw);
  function makeChunk(typeStr, dataBuf) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(dataBuf.length, 0);
    const type = Buffer.from(typeStr, 'ascii');
    const crcVal = Buffer.alloc(4);
    crcVal.writeUInt32BE(crc32(Buffer.concat([type, dataBuf])) >>> 0, 0);
    return Buffer.concat([len, type, dataBuf, crcVal]);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    makeChunk('IHDR', (() => {
      const b = Buffer.alloc(13);
      b.writeUInt32BE(width, 0);
      b.writeUInt32BE(height, 4);
      b[8] = 8;
      b[9] = 6;
      return b;
    })()),
    makeChunk('IDAT', compressed),
    makeChunk('IEND', Buffer.alloc(0)),
  ]);
}

function isPng(buf, offset) {
  return buf.length >= offset + 8 &&
    buf[offset] === 0x89 && buf[offset + 1] === 0x50 &&
    buf[offset + 2] === 0x4E && buf[offset + 3] === 0x47 &&
    buf[offset + 4] === 0x0D && buf[offset + 5] === 0x0A &&
    buf[offset + 6] === 0x1A && buf[offset + 7] === 0x0A;
}

function scaleGlyph(glyph, scale) {
  const targetW = Math.max(2, Math.round(glyph.w * scale));
  const targetH = Math.max(3, Math.round(glyph.h * scale));
  const srcAlpha = Buffer.from(glyph.data, 'base64');
  const dstAlpha = Buffer.alloc(targetW * targetH);
  for (let dy = 0; dy < targetH; dy++) {
    const sy = (dy / targetH) * (glyph.h - 1);
    const y0 = Math.floor(sy);
    const y1 = Math.min(glyph.h - 1, y0 + 1);
    const fy = sy - y0;
    for (let dx = 0; dx < targetW; dx++) {
      const sx = (dx / targetW) * (glyph.w - 1);
      const x0 = Math.floor(sx);
      const x1 = Math.min(glyph.w - 1, x0 + 1);
      const fx = sx - x0;
      const a00 = srcAlpha[y0 * glyph.w + x0];
      const a10 = srcAlpha[y0 * glyph.w + x1];
      const a01 = srcAlpha[y1 * glyph.w + x0];
      const a11 = srcAlpha[y1 * glyph.w + x1];
      const top = a00 * (1 - fx) + a10 * fx;
      const bot = a01 * (1 - fx) + a11 * fx;
      dstAlpha[dy * targetW + dx] = Math.round(top * (1 - fy) + bot * fy);
    }
  }
  return { w: targetW, h: targetH, alpha: dstAlpha };
}

function drawBadgeNumber(pixels, width, height, text, centerX, centerY, scaleFactor, spacing) {
  const clean = text.toString().replace(/[^0-9]/g, '');
  if (!clean) return;
  const set = GLYPH_DATA.scale1;
  const glyphs = [];
  let totalW = 0;
  for (const ch of clean) {
    const g = set[ch];
    if (g) {
      const scaled = scaleGlyph(g, scaleFactor);
      glyphs.push(scaled);
      totalW += scaled.w;
    }
  }
  totalW += (glyphs.length - 1) * spacing;
  const startX = Math.round(centerX - totalW / 2);

  // 1. Subtle, soft drop shadow matching authentic Valve Radiance style (no cartoon outlines)
  const shadowOffsets = [
    { dx: 0, dy: 1, a: 0.55 },
    { dx: 1, dy: 1, a: 0.65 },
    { dx: 0, dy: 2, a: 0.45 },
    { dx: 1, dy: 2, a: 0.55 },
    { dx: -1, dy: 1, a: 0.35 },
    { dx: 2, dy: 2, a: 0.25 },
  ];

  let curX = startX;
  for (const g of glyphs) {
    const startY = Math.round(centerY - g.h / 2);
    for (let gy = 0; gy < g.h; gy++) {
      for (let gx = 0; gx < g.w; gx++) {
        const a = g.alpha[gy * g.w + gx];
        if (a > 10) {
          for (const off of shadowOffsets) {
            const px = curX + gx + off.dx;
            const py = startY + gy + off.dy;
            if (px >= 0 && px < width && py >= 0 && py < height) {
              const idx = (py * width + px) * 4;
              const shadowA = (a * off.a) / 255;
              const inv = 1 - shadowA;
              pixels[idx] = Math.round(pixels[idx] * inv + 5 * shadowA);
              pixels[idx + 1] = Math.round(pixels[idx + 1] * inv + 5 * shadowA);
              pixels[idx + 2] = Math.round(pixels[idx + 2] * inv + 10 * shadowA);
              pixels[idx + 3] = Math.max(pixels[idx + 3], Math.round(a * 0.9));
            }
          }
        }
      }
    }
    curX += g.w + spacing;
  }

  // 2. Pure crisp white fill with subtle ivory/silver gradient
  curX = startX;
  for (const g of glyphs) {
    const startY = Math.round(centerY - g.h / 2);
    for (let gy = 0; gy < g.h; gy++) {
      const t = gy / g.h;
      const targetR = Math.round(255 * (1 - t * 0.04));
      const targetG = Math.round(255 * (1 - t * 0.04));
      const targetB = Math.round(255 * (1 - t * 0.02));
      for (let gx = 0; gx < g.w; gx++) {
        const a = g.alpha[gy * g.w + gx];
        if (a > 5) {
          const px = curX + gx;
          const py = startY + gy;
          if (px >= 0 && px < width && py >= 0 && py < height) {
            const idx = (py * width + px) * 4;
            const alphaFrac = a / 255;
            const inv = 1 - alphaFrac;
            pixels[idx] = Math.round(pixels[idx] * inv + targetR * alphaFrac);
            pixels[idx + 1] = Math.round(pixels[idx + 1] * inv + targetG * alphaFrac);
            pixels[idx + 2] = Math.round(pixels[idx + 2] * inv + targetB * alphaFrac);
            pixels[idx + 3] = Math.max(pixels[idx + 3], a);
          }
        }
      }
    }
    curX += g.w + spacing;
  }
}

function renderPlaqueGlyphs(pixels, width, height, text, centerX, centerY, scalePrefix = 'scale') {
  const clean = text.toString().replace(/[^0-9]/g, '');
  if (!clean) return;
  const len = clean.length;
  const scaleKey = scalePrefix + (len === 1 ? '1' : len === 2 ? '2' : len === 3 ? '3' : '4');
  const set = GLYPH_DATA[scaleKey] || GLYPH_DATA[scalePrefix + '4'];
  if (!set) return;
  const spacing = len >= 4 ? 1 : 2;

  const glyphs = [];
  let totalW = 0;
  for (const ch of clean) {
    const g = set[ch];
    if (g) {
      glyphs.push({ w: g.w, h: g.h, alpha: Buffer.from(g.data, 'base64') });
      totalW += g.w;
    }
  }
  totalW += (glyphs.length - 1) * spacing;
  const startX = Math.round(centerX - totalW / 2);

  // 1. Draw outer shadow / dark glow for maximum contrast on bronze plate
  let shadowX = startX;
  for (const g of glyphs) {
    const curY = Math.round(centerY - g.h / 2);
    for (let gy = 0; gy < g.h; gy++) {
      for (let gx = 0; gx < g.w; gx++) {
        const a = g.alpha[gy * g.w + gx];
        if (a > 10) {
          for (const [ox, oy] of [[1, 1], [1, 2], [0, 2], [-1, 1]]) {
            const px = shadowX + gx + ox;
            const py = curY + gy + oy;
            if (px >= 0 && px < width && py >= 0 && py < height) {
              const idx = (py * width + px) * 4;
              const shadowAlpha = (a * 0.85) / 255;
              const inv = 1 - shadowAlpha;
              pixels[idx] = Math.round(pixels[idx] * inv + 16 * shadowAlpha);
              pixels[idx + 1] = Math.round(pixels[idx + 1] * inv + 12 * shadowAlpha);
              pixels[idx + 2] = Math.round(pixels[idx + 2] * inv + 8 * shadowAlpha);
              pixels[idx + 3] = Math.max(pixels[idx + 3], Math.round(a * 0.9));
            }
          }
        }
      }
    }
    shadowX += g.w + spacing;
  }

  // 2. Draw warm ivory digits with authentic gradient (#F4EBD8)
  let drawX = startX;
  for (const g of glyphs) {
    const curY = Math.round(centerY - g.h / 2);
    for (let gy = 0; gy < g.h; gy++) {
      const t = gy / g.h;
      const targetR = Math.round(255 * (1 - t * 0.03));
      const targetG = Math.round(250 * (1 - t * 0.05));
      const targetB = Math.round(235 * (1 - t * 0.08));

      for (let gx = 0; gx < g.w; gx++) {
        const a = g.alpha[gy * g.w + gx];
        if (a > 5) {
          const px = drawX + gx;
          const py = curY + gy;
          if (px >= 0 && px < width && py >= 0 && py < height) {
            const idx = (py * width + px) * 4;
            const alphaFrac = a > 140 ? 1 : a / 140;
            const inv = 1 - alphaFrac;
            pixels[idx] = Math.round(pixels[idx] * inv + targetR * alphaFrac);
            pixels[idx + 1] = Math.round(pixels[idx + 1] * inv + targetG * alphaFrac);
            pixels[idx + 2] = Math.round(pixels[idx + 2] * inv + targetB * alphaFrac);
            pixels[idx + 3] = 255;
          }
        }
      }
    }
    drawX += g.w + spacing;
  }
}

/**
 * Renders authentic Dota 2 immortal leaderboard digits onto a rank medal texture.
 * Exactly matches in-game Radiance font typography, ivory fill, drop shadow and centering.
 *
 * @param {Buffer} vtexBuffer The original uncompressed RGBA .vtex_c buffer
 * @param {string|number} rankNumber The leaderboard digit, e.g. 1, 20, 250, 2045
 * @returns {Buffer}
 */
function renderRankPlaqueDigits(vtexBuffer, rankNumber) {
  if (!vtexBuffer || rankNumber === undefined || rankNumber === null) return vtexBuffer;
  const text = rankNumber.toString().replace(/[^0-9]/g, '').trim();
  if (!text) return vtexBuffer;

  const copy = Buffer.from(vtexBuffer);
  const headerSize = copy.readUInt32LE(0);
  const pixels = copy.subarray(headerSize);

  // Standard 256x256 medal (262144 bytes) - plaque plate center at (128, 212)
  if (pixels.length === 256 * 256 * 4) {
    const centerY = text.length >= 3 ? 211 : 212;
    renderPlaqueGlyphs(pixels, 256, 256, text, 128, centerY, 'scale');
    return copy;
  }

  // Mini 128x64 plaque (32768 bytes) - plaque plate center at (64, 47)
  if (pixels.length === 128 * 64 * 4) {
    renderPlaqueGlyphs(pixels, 128, 64, text, 64, 47, 'mini');
    return copy;
  }

  // Mini 80x80 icon (25600 bytes) - plaque plate center at (40, 67)
  if (pixels.length === 80 * 80 * 4) {
    renderPlaqueGlyphs(pixels, 80, 80, text, 40, 67, 'mini');
    return copy;
  }

  return copy;
}

/**
 * Renders authentic Dota 2 Radiance font level digits centered onto hero badge textures.
 * Supports uncompressed RGBA (256x256, 64x64 small, 32x32 tiny) and PNG-wrapped VTEX.
 *
 * @param {Buffer} vtexBuffer Raw VTEX buffer
 * @param {string|number} level Level number, e.g. 10, 30
 * @returns {Buffer} Modified VTEX buffer
 */
function renderHeroBadgeDigits(vtexBuffer, level) {
  if (!vtexBuffer || level === undefined || level === null) return vtexBuffer;
  const text = String(level).replace(/[^0-9]/g, '').trim();
  if (!text) return vtexBuffer;

  const headerSize = vtexBuffer.readUInt32LE(0);
  if (isPng(vtexBuffer, headerSize)) {
    const pngBuf = vtexBuffer.subarray(headerSize);
    const { width, height, pixels } = decodePngRgba(pngBuf);
    drawBadgeNumber(pixels, width, height, text, Math.round(width / 2), Math.round(height * 0.49), 1.15, 2);
    const pngOut = encodePngRgba(width, height, pixels);
    return Buffer.concat([vtexBuffer.subarray(0, headerSize), pngOut]);
  }

  const copy = Buffer.from(vtexBuffer);
  const pixels = copy.subarray(headerSize);
  if (pixels.length === 256 * 256 * 4) {
    drawBadgeNumber(pixels, 256, 256, text, 128, 125, 1.15, 2);
  } else if (pixels.length === 64 * 64 * 4) {
    drawBadgeNumber(pixels, 64, 64, text, 32, 31, 0.45, 1);
  } else if (pixels.length === 32 * 32 * 4) {
    drawBadgeNumber(pixels, 32, 32, text, 16, 16, 0.28, 1);
  }
  return copy;
}

/**
 * Generates a 32x32 transparent .vtex_c containing the level digit in white with black outline.
 *
 * @param {string|number} level The level number, e.g. 30
 * @param {string} baseVtexPath Path to a 32x32 uncompressed .vtex_c template
 * @returns {Buffer}
 */
function createHeroLevelVtex(level, baseVtexPath) {
  const base = fs.readFileSync(baseVtexPath);
  const headerSize = base.readUInt32LE(0);
  const header = base.subarray(0, headerSize);
  const width = 32;
  const height = 32;
  const pixels = Buffer.alloc(width * height * 4);

  const text = level.toString().trim();
  const chars = text.split('');
  const charW = 5;
  const charH = 7;
  const spacing = 1;
  const totalW = chars.length * charW + (chars.length - 1) * spacing;
  let startX = Math.round((width - totalW) / 2);
  const startY = Math.round((height - charH) / 2);

  // Black outline
  for (const ch of chars) {
    const glyph = FONT_5x7[ch];
    if (glyph) {
      for (let r = 0; r < 7; r++) {
        for (let c = 0; c < 5; c++) {
          if (glyph[r][c] === '1') {
            const px = startX + c;
            const py = startY + r;
            for (let dy = -1; dy <= 1; dy++) {
              for (let dx = -1; dx <= 1; dx++) {
                const ox = px + dx;
                const oy = py + dy;
                if (ox >= 0 && ox < width && oy >= 0 && oy < height) {
                  const idx = (oy * width + ox) * 4;
                  pixels[idx] = 0;
                  pixels[idx + 1] = 0;
                  pixels[idx + 2] = 0;
                  pixels[idx + 3] = 240;
                }
              }
            }
          }
        }
      }
    }
    startX += charW + spacing;
  }

  // Crisp white fill
  startX = Math.round((width - totalW) / 2);
  for (const ch of chars) {
    const glyph = FONT_5x7[ch];
    if (glyph) {
      for (let r = 0; r < 7; r++) {
        for (let c = 0; c < 5; c++) {
          if (glyph[r][c] === '1') {
            const px = startX + c;
            const py = startY + r;
            if (px >= 0 && px < width && py >= 0 && py < height) {
              const idx = (py * width + px) * 4;
              pixels[idx] = 255;
              pixels[idx + 1] = 255;
              pixels[idx + 2] = 255;
              pixels[idx + 3] = 255;
            }
          }
        }
      }
    }
    startX += charW + spacing;
  }

  return Buffer.concat([header, pixels]);
}

module.exports = {
  renderRankPlaqueDigits,
  renderHeroBadgeDigits,
  createHeroLevelVtex,
};
