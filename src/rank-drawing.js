// Renders authentic Dota 2 rank and hero badge numbers directly onto textures
// and patches Panorama CSS style sheets for in-game display.

const fs = require('fs');


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

const GLYPH_DATA = require('./rank-font-data');

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
      const targetR = Math.round(250 * (1 - t * 0.05));
      const targetG = Math.round(242 * (1 - t * 0.08));
      const targetB = Math.round(226 * (1 - t * 0.14));

      for (let gx = 0; gx < g.w; gx++) {
        const a = g.alpha[gy * g.w + gx];
        if (a > 5) {
          const px = drawX + gx;
          const py = curY + gy;
          if (px >= 0 && px < width && py >= 0 && py < height) {
            const idx = (py * width + px) * 4;
            const alphaFrac = a / 255;
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

  // Check if standard 256x256 medal (262144 bytes) - plaque plate center at (128, 214)
  if (pixels.length === 256 * 256 * 4) {
    const centerY = text.length >= 3 ? 213 : 214;
    renderPlaqueGlyphs(pixels, 256, 256, text, 128, centerY, 'scale');
    return copy;
  }

  // Check if mini 128x64 plaque (32768 bytes) - plaque plate center at (64, 47)
  if (pixels.length === 128 * 64 * 4) {
    renderPlaqueGlyphs(pixels, 128, 64, text, 64, 47, 'mini');
    return copy;
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
  const pixels = Buffer.alloc(width * height * 4); // all zeros = transparent

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
  createHeroLevelVtex,
};

