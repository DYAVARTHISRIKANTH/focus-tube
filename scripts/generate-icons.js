import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

// Simple CRC32 implementation
function makeCrcTable() {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      if (c & 1) {
        c = 0xedb88320 ^ (c >>> 1);
      } else {
        c = c >>> 1;
      }
    }
    table[n] = c;
  }
  return table;
}

const crcTable = makeCrcTable();

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function createChunk(type, data) {
  const len = data.length;
  const buf = Buffer.alloc(8 + len + 4);
  buf.writeUInt32BE(len, 0);
  buf.write(type, 4, 4, 'ascii');
  data.copy(buf, 8);
  const typeAndData = buf.subarray(4, 8 + len);
  buf.writeUInt32BE(crc32(typeAndData), 8 + len);
  return buf;
}

function createPng(size) {
  const width = size;
  const height = size;

  // Raw image data with filter byte (0) per row
  const rowBytes = 1 + width * 4;
  const rawData = Buffer.alloc(height * rowBytes);

  const center = size / 2;
  const radius = size * 0.44;

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowBytes;
    rawData[rowOffset] = 0; // Filter type 0 (None)

    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 4;
      const dx = x - center;
      const dy = y - center;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Rounded squircle background
      const nx = Math.abs(x - center) / (size * 0.45);
      const ny = Math.abs(y - center) / (size * 0.45);
      const squircleDist = Math.pow(nx, 4) + Math.pow(ny, 4);

      if (squircleDist <= 1.0) {
        // Gradient from crimson (#FF2A54) to violet (#8B5CF6)
        const t = (x + y) / (width + height);
        const r = Math.round(255 * (1 - t) + 139 * t);
        const g = Math.round(42 * (1 - t) + 92 * t);
        const b = Math.round(84 * (1 - t) + 246 * t);

        // Check if inside play triangle
        // Triangle vertices: (0.38 * size, 0.28 * size), (0.72 * size, 0.50 * size), (0.38 * size, 0.72 * size)
        const triX1 = 0.38 * size;
        const triY1 = 0.28 * size;
        const triX2 = 0.72 * size;
        const triY2 = 0.50 * size;
        const triX3 = 0.38 * size;
        const triY3 = 0.72 * size;

        // Barycentric inside triangle check
        const dX = x - triX3;
        const dY = y - triY3;
        const dX21 = triX3 - triX2;
        const dY12 = triY2 - triY3;
        const D = dY12 * (triX1 - triX3) + dX21 * (triY1 - triY3);
        const s = dY12 * dX + dX21 * dY;
        const t2 = (triY3 - triY1) * dX + (triX1 - triX3) * dY;

        const insideTriangle = D < 0 ? (s <= 0 && t2 <= 0 && s + t2 >= D) : (s >= 0 && t2 >= 0 && s + t2 <= D);

        if (insideTriangle) {
          // White triangle
          rawData[pxOffset] = 255;
          rawData[pxOffset + 1] = 255;
          rawData[pxOffset + 2] = 255;
          rawData[pxOffset + 3] = 255;
        } else {
          // Antialiased edge
          const edgeAlpha = squircleDist > 0.9 ? Math.max(0, Math.min(1, (1 - squircleDist) * 10)) : 1;
          rawData[pxOffset] = r;
          rawData[pxOffset + 1] = g;
          rawData[pxOffset + 2] = b;
          rawData[pxOffset + 3] = Math.round(255 * edgeAlpha);
        }
      } else {
        // Transparent
        rawData[pxOffset] = 0;
        rawData[pxOffset + 1] = 0;
        rawData[pxOffset + 2] = 0;
        rawData[pxOffset + 3] = 0;
      }
    }
  }

  // PNG Signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // 8-bit
  ihdrData[9] = 6; // RGBA
  ihdrData[10] = 0; // deflate
  ihdrData[11] = 0; // default filter
  ihdrData[12] = 0; // no interlace
  const ihdrChunk = createChunk('IHDR', ihdrData);

  // IDAT
  const compressed = zlib.deflateSync(rawData);
  const idatChunk = createChunk('IDAT', compressed);

  // IEND
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

const outDir = path.resolve('icons');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

[16, 32, 48, 128].forEach((size) => {
  const png = createPng(size);
  const filePath = path.join(outDir, `icon${size}.png`);
  fs.writeFileSync(filePath, png);
  console.log(`Generated ${filePath} (${png.length} bytes)`);
});
