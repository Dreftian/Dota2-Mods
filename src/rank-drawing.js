// Renders authentic Dota 2 rank and hero badge numbers directly onto textures
// and patches Panorama CSS style sheets for in-game display.

const fs = require('fs');

// High quality 9x14 font for clean, sharp, beautiful digits
const DIGIT_FONT_9x14 = {
  '0': [
    '  11111  ',
    ' 1111111 ',
    '111   111',
    '111   111',
    '111   111',
    '111   111',
    '111   111',
    '111   111',
    '111   111',
    '111   111',
    '111   111',
    '111   111',
    ' 1111111 ',
    '  11111  ',
  ],
  '1': [
    '    111  ',
    '   1111  ',
    '  11111  ',
    ' 111111  ',
    '    111  ',
    '    111  ',
    '    111  ',
    '    111  ',
    '    111  ',
    '    111  ',
    '    111  ',
    '    111  ',
    ' 11111111',
    ' 11111111',
  ],
  '2': [
    '  11111  ',
    ' 1111111 ',
    '111   111',
    '111   111',
    '      111',
    '     111 ',
    '    111  ',
    '   111   ',
    '  111    ',
    ' 111     ',
    '111      ',
    '111   111',
    '111111111',
    '111111111',
  ],
  '3': [
    '  11111  ',
    ' 1111111 ',
    '111   111',
    '      111',
    '      111',
    '   11111 ',
    '   11111 ',
    '      111',
    '      111',
    '      111',
    '111   111',
    '111   111',
    ' 1111111 ',
    '  11111  ',
  ],
  '4': [
    '     1111',
    '    11111',
    '   11 111',
    '  111 111',
    ' 111  111',
    '111   111',
    '111   111',
    '111111111',
    '111111111',
    '      111',
    '      111',
    '      111',
    '      111',
    '      111',
  ],
  '5': [
    '111111111',
    '111111111',
    '111      ',
    '111      ',
    '1111111  ',
    ' 1111111 ',
    '      111',
    '      111',
    '      111',
    '      111',
    '111   111',
    '111   111',
    ' 1111111 ',
    '  11111  ',
  ],
  '6': [
    '  11111  ',
    ' 1111111 ',
    '111   111',
    '111      ',
    '111      ',
    '1111111  ',
    '11111111 ',
    '111   111',
    '111   111',
    '111   111',
    '111   111',
    '111   111',
    ' 1111111 ',
    '  11111  ',
  ],
  '7': [
    '111111111',
    '111111111',
    '111   111',
    '     111 ',
    '    111  ',
    '    111  ',
    '   111   ',
    '   111   ',
    '  111    ',
    '  111    ',
    ' 111     ',
    ' 111     ',
    ' 111     ',
    ' 111     ',
  ],
  '8': [
    '  11111  ',
    ' 1111111 ',
    '111   111',
    '111   111',
    ' 1111111 ',
    '  11111  ',
    ' 1111111 ',
    '111   111',
    '111   111',
    '111   111',
    '111   111',
    '111   111',
    ' 1111111 ',
    '  11111  ',
  ],
  '9': [
    '  11111  ',
    ' 1111111 ',
    '111   111',
    '111   111',
    '111   111',
    '111   111',
    ' 11111111',
    '  1111111',
    '      111',
    '      111',
    '      111',
    '111   111',
    ' 1111111 ',
    '  11111  ',
  ],
  '#': [
    '  11  11 ',
    '  11  11 ',
    '111111111',
    '111111111',
    '  11  11 ',
    '  11  11 ',
    '111111111',
    '111111111',
    '  11  11 ',
    '  11  11 ',
    '  11  11 ',
    '  11  11 ',
    '  11  11 ',
    '  11  11 ',
  ],
  'T': [
    '111111111',
    '111111111',
    '   111   ',
    '   111   ',
    '   111   ',
    '   111   ',
    '   111   ',
    '   111   ',
    '   111   ',
    '   111   ',
    '   111   ',
    '   111   ',
    '   111   ',
    '   111   ',
  ],
  'O': [
    '  11111  ',
    ' 1111111 ',
    '111   111',
    '111   111',
    '111   111',
    '111   111',
    '111   111',
    '111   111',
    '111   111',
    '111   111',
    '111   111',
    '111   111',
    ' 1111111 ',
    '  11111  ',
  ],
  'P': [
    '11111111 ',
    '111111111',
    '111   111',
    '111   111',
    '111111111',
    '11111111 ',
    '111      ',
    '111      ',
    '111      ',
    '111      ',
    '111      ',
    '111      ',
    '111      ',
    '111      ',
  ],
  ' ': [
    '         ',
    '         ',
    '         ',
    '         ',
    '         ',
    '         ',
    '         ',
    '         ',
    '         ',
    '         ',
    '         ',
    '         ',
    '         ',
    '         ',
  ]
};

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

function renderTextOnRgba(pixels, width, height, text, centerX, centerY, scale = 1, textColor = [255, 235, 195, 255]) {
  const chars = text.toString().trim().split('');
  const charWidth = 9 * scale;
  const charHeight = 14 * scale;
  const spacing = Math.max(1, Math.round(2 * scale));
  const totalWidth = chars.length * charWidth + (chars.length - 1) * spacing;
  let startX = Math.round(centerX - totalWidth / 2);
  const startY = Math.round(centerY - charHeight / 2);

  // 1. Draw outer dark shadow/outline for readability against dark plaque
  for (const ch of chars) {
    const glyph = DIGIT_FONT_9x14[ch] || DIGIT_FONT_9x14[' '];
    for (let row = 0; row < 14; row++) {
      const line = glyph[row];
      for (let col = 0; col < 9; col++) {
        if (line[col] === '1') {
          for (let dy = 0; dy < scale; dy++) {
            for (let dx = 0; dx < scale; dx++) {
              const px = startX + col * scale + dx;
              const py = startY + row * scale + dy;
              for (let oy = -1; oy <= 2; oy++) {
                for (let ox = -1; ox <= 2; ox++) {
                  const spx = px + ox;
                  const spy = py + oy;
                  if (spx >= 0 && spx < width && spy >= 0 && spy < height) {
                    const sidx = (spy * width + spx) * 4;
                    pixels[sidx] = 10;
                    pixels[sidx + 1] = 6;
                    pixels[sidx + 2] = 2;
                    pixels[sidx + 3] = 255;
                  }
                }
              }
            }
          }
        }
      }
    }
    startX += charWidth + spacing;
  }

  // 2. Draw golden gradient digits
  startX = Math.round(centerX - totalWidth / 2);
  for (const ch of chars) {
    const glyph = DIGIT_FONT_9x14[ch] || DIGIT_FONT_9x14[' '];
    for (let row = 0; row < 14; row++) {
      const line = glyph[row];
      const t = row / 14;
      const r = Math.round(textColor[0] * (1 - t * 0.12));
      const g = Math.round(textColor[1] * (1 - t * 0.20));
      const b = Math.round(textColor[2] * (1 - t * 0.38));

      for (let col = 0; col < 9; col++) {
        if (line[col] === '1') {
          for (let dy = 0; dy < scale; dy++) {
            for (let dx = 0; dx < scale; dx++) {
              const px = startX + col * scale + dx;
              const py = startY + row * scale + dy;
              if (px >= 0 && px < width && py >= 0 && py < height) {
                const idx = (py * width + px) * 4;
                pixels[idx] = r;
                pixels[idx + 1] = g;
                pixels[idx + 2] = b;
                pixels[idx + 3] = 255;
              }
            }
          }
        }
      }
    }
    startX += charWidth + spacing;
  }
}

/**
 * Renders immortal leaderboard digits onto a rank medal texture.
 *
 * @param {Buffer} vtexBuffer The original uncompressed RGBA .vtex_c buffer
 * @param {string|number} rankNumber The leaderboard digit, e.g. 30, '#30'
 * @returns {Buffer}
 */
function renderRankPlaqueDigits(vtexBuffer, rankNumber) {
  if (!vtexBuffer || !rankNumber) return vtexBuffer;
  const text = rankNumber.toString().startsWith('#') ? rankNumber.toString() : `#${rankNumber}`;

  const copy = Buffer.from(vtexBuffer);
  const headerSize = copy.readUInt32LE(0);
  const pixels = copy.subarray(headerSize);

  // Check if standard 256x256 medal (262144 bytes)
  if (pixels.length === 256 * 256 * 4) {
    renderTextOnRgba(pixels, 256, 256, text, 128, 214, 1, [255, 235, 195, 255]);
    return copy;
  }

  // Check if mini 128x64 plaque (32768 bytes)
  if (pixels.length === 128 * 64 * 4) {
    renderTextOnRgba(pixels, 128, 64, text, 64, 36, 1, [255, 235, 195, 255]);
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

/**
 * Patches a substring inside the DATA block of a RED2 CSS resource file.
 * Automatically recalculates block offsets and total file length.
 *
 * @param {Buffer} buffer Original RED2 .vcss_c buffer
 * @param {string} oldSnippet Substring to find in the CSS
 * @param {string} newSnippet Replacement substring
 * @returns {Buffer}
 */
function patchCssResource(buffer, oldSnippet, newSnippet) {
  const buf = Buffer.from(buffer);
  const blockCount = buf.readUInt32LE(12);

  let dataEntryOffset = -1;
  let dataBlockIndex = -1;
  let offset = 16;
  for (let i = 0; i < blockCount; i++) {
    const name = buf.subarray(offset, offset + 4).toString('ascii');
    if (name === 'DATA') {
      dataEntryOffset = offset;
      dataBlockIndex = i;
      break;
    }
    offset += 12;
  }

  if (dataEntryOffset === -1) {
    return buffer;
  }

  const dataRelOffset = buf.readUInt32LE(dataEntryOffset + 4);
  const dataSize = buf.readUInt32LE(dataEntryOffset + 8);
  const dataAbsOffset = dataEntryOffset + 4 + dataRelOffset;

  const dataSlice = buf.subarray(dataAbsOffset, dataAbsOffset + dataSize);
  const dataStr = dataSlice.toString('latin1');
  const targetIdx = dataStr.indexOf(oldSnippet);
  if (targetIdx === -1) {
    return buffer;
  }

  const newDataStr = dataStr.replace(oldSnippet, newSnippet);
  const newDataBuf = Buffer.from(newDataStr, 'latin1');
  const delta = newDataBuf.length - dataSlice.length;

  const beforeData = buf.subarray(0, dataAbsOffset);
  const afterData = buf.subarray(dataAbsOffset + dataSize);

  const newBuf = Buffer.concat([beforeData, newDataBuf, afterData]);

  // Update total file size
  newBuf.writeUInt32LE(newBuf.length, 0);

  // Update DATA block size
  newBuf.writeUInt32LE(newDataBuf.length, dataEntryOffset + 8);

  // Shift subsequent block relative offsets
  offset = 16;
  for (let i = 0; i < blockCount; i++) {
    if (i > dataBlockIndex) {
      const curRelOffset = newBuf.readUInt32LE(offset + 4);
      newBuf.writeUInt32LE(curRelOffset + delta, offset + 4);
    }
    offset += 12;
  }

  return newBuf;
}

module.exports = {
  renderRankPlaqueDigits,
  createHeroLevelVtex,
  patchCssResource,
};
