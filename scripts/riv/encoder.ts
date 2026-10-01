// Low-level binary encoding for the Rive runtime format (major 7).
// Reference: rive-runtime/include/rive/runtime_header.hpp and src/file.cpp.

export type FieldType = "uint" | "double" | "string" | "color" | "bool";

export class ByteWriter {
  private chunks: number[] = [];

  varUint(value: number): void {
    let v = Math.floor(value);
    if (v < 0) throw new Error(`varUint cannot encode negative value ${value}`);
    do {
      let byte = v & 0x7f;
      v = Math.floor(v / 128);
      if (v !== 0) byte |= 0x80;
      this.chunks.push(byte);
    } while (v !== 0);
  }

  float32(value: number): void {
    const buf = new DataView(new ArrayBuffer(4));
    buf.setFloat32(0, value, true);
    for (let i = 0; i < 4; i++) this.chunks.push(buf.getUint8(i));
  }

  uint32(value: number): void {
    const buf = new DataView(new ArrayBuffer(4));
    buf.setUint32(0, value >>> 0, true);
    for (let i = 0; i < 4; i++) this.chunks.push(buf.getUint8(i));
  }

  byte(value: number): void {
    this.chunks.push(value & 0xff);
  }

  string(value: string): void {
    const bytes = new TextEncoder().encode(value);
    this.varUint(bytes.length);
    for (const b of bytes) this.chunks.push(b);
  }

  field(type: FieldType, value: number | string | boolean): void {
    switch (type) {
      case "uint":
        this.varUint(value as number);
        break;
      case "double":
        this.float32(value as number);
        break;
      case "string":
        this.string(value as string);
        break;
      case "color":
        this.uint32(value as number);
        break;
      case "bool":
        this.byte(value ? 1 : 0);
        break;
    }
  }

  bytes(): Uint8Array {
    return Uint8Array.from(this.chunks);
  }
}

export function writeHeader(w: ByteWriter): void {
  for (const c of "RIVE") w.byte(c.charCodeAt(0));
  w.varUint(7); // major
  w.varUint(4); // minor
  w.varUint(0); // file id
  // Empty property ToC: every key we write is known to the runtime.
  w.varUint(0);
}
