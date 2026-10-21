/**
 * Minimal ZIP writer using the "store" method (no compression).
 *
 * PDFs are already compressed, so storing them uncompressed keeps this
 * dependency-free while producing a valid archive that every OS can open.
 */

interface ZipEntry {
  name: string;
  data: Uint8Array;
  crc: number;
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function encodeName(name: string): Uint8Array {
  return new TextEncoder().encode(name);
}

function writeUint32(view: DataView, offset: number, value: number): void {
  view.setUint32(offset, value >>> 0, true);
}

function writeUint16(view: DataView, offset: number, value: number): void {
  view.setUint16(offset, value & 0xffff, true);
}

export function createZip(files: { name: string; data: Uint8Array }[]): Blob {
  const entries: ZipEntry[] = files.map((file) => ({
    name: file.name,
    data: file.data,
    crc: crc32(file.data),
  }));

  const parts: BlobPart[] = [];
  const centralChunks: Uint8Array[] = [];
  let offset = 0;

  for (const entry of entries) {
    const nameBytes = encodeName(entry.name);
    const local = new Uint8Array(30 + nameBytes.length);
    const localView = new DataView(local.buffer);
    writeUint32(localView, 0, 0x04034b50);
    writeUint16(localView, 4, 20);
    writeUint16(localView, 6, 0);
    writeUint16(localView, 8, 0);
    writeUint16(localView, 10, 0);
    writeUint16(localView, 12, 0);
    writeUint32(localView, 14, entry.crc);
    writeUint32(localView, 18, entry.data.length);
    writeUint32(localView, 22, entry.data.length);
    writeUint16(localView, 26, nameBytes.length);
    writeUint16(localView, 28, 0);
    local.set(nameBytes, 30);
    parts.push(toBlobPart(local), toBlobPart(entry.data));

    const central = new Uint8Array(46 + nameBytes.length);
    const centralView = new DataView(central.buffer);
    writeUint32(centralView, 0, 0x02014b50);
    writeUint16(centralView, 4, 20);
    writeUint16(centralView, 6, 20);
    writeUint16(centralView, 8, 0);
    writeUint16(centralView, 10, 0);
    writeUint16(centralView, 12, 0);
    writeUint16(centralView, 14, 0);
    writeUint32(centralView, 16, entry.crc);
    writeUint32(centralView, 20, entry.data.length);
    writeUint32(centralView, 24, entry.data.length);
    writeUint16(centralView, 28, nameBytes.length);
    writeUint16(centralView, 30, 0);
    writeUint16(centralView, 32, 0);
    writeUint16(centralView, 34, 0);
    writeUint16(centralView, 36, 0);
    writeUint32(centralView, 38, 0);
    writeUint32(centralView, 42, offset);
    central.set(nameBytes, 46);
    centralChunks.push(central);

    offset += local.length + entry.data.length;
  }

  const centralSize = centralChunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const end = new Uint8Array(22);
  const endView = new DataView(end.buffer);
  writeUint32(endView, 0, 0x06054b50);
  writeUint16(endView, 4, 0);
  writeUint16(endView, 6, 0);
  writeUint16(endView, 8, entries.length);
  writeUint16(endView, 10, entries.length);
  writeUint32(endView, 12, centralSize);
  writeUint32(endView, 16, offset);
  writeUint16(endView, 20, 0);

  return new Blob([...parts, ...centralChunks.map(toBlobPart), toBlobPart(end)], {
    type: 'application/zip',
  });
}

/**
 * Copies the view into a plain ArrayBuffer-backed Uint8Array so the result
 * satisfies `BlobPart` regardless of the source buffer type.
 */
function toBlobPart(bytes: Uint8Array): BlobPart {
  return new Uint8Array(bytes);
}
