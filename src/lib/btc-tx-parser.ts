// Minimal Bitcoin transaction parser (legacy + segwit-marker aware).
// Used to extract DER signatures + pubkeys + prev outpoints from inputs,
// so we can later compute the sighash and run real ECDSA nonce-reuse
// detection. Pure JS, no external deps. Verifiable byte-by-byte.

export interface TxInput {
  prevTxid: string;        // big-endian hex (display order)
  prevVout: number;
  scriptSig: Uint8Array;   // raw scriptSig bytes (legacy) — may be empty for segwit
  sequence: number;
  witness: Uint8Array[];   // empty if no witness
}

export interface TxOutput {
  value: bigint;           // satoshis
  scriptPubKey: Uint8Array;
}

export interface ParsedTx {
  version: number;
  hasWitness: boolean;
  inputs: TxInput[];
  outputs: TxOutput[];
  locktime: number;
  raw: Uint8Array;
}

export function hexToBytes(hex: string): Uint8Array {
  if (hex.length % 2) throw new Error("odd hex length");
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.substr(i * 2, 2), 16);
  return out;
}

export function bytesToHex(b: Uint8Array): string {
  let s = "";
  for (let i = 0; i < b.length; i++) s += b[i].toString(16).padStart(2, "0");
  return s;
}

class Reader {
  o = 0;
  constructor(public b: Uint8Array) {}
  u8() { return this.b[this.o++]; }
  u16le() { const v = this.b[this.o] | (this.b[this.o + 1] << 8); this.o += 2; return v; }
  u32le() {
    const v = (this.b[this.o] | (this.b[this.o + 1] << 8) | (this.b[this.o + 2] << 16) | (this.b[this.o + 3] << 24)) >>> 0;
    this.o += 4;
    return v;
  }
  u64le(): bigint {
    let v = 0n;
    for (let i = 0; i < 8; i++) v |= BigInt(this.b[this.o + i]) << BigInt(i * 8);
    this.o += 8;
    return v;
  }
  varint(): number {
    const t = this.u8();
    if (t < 0xfd) return t;
    if (t === 0xfd) return this.u16le();
    if (t === 0xfe) return this.u32le();
    // 0xff — 8-byte. Real txs never exceed 32-bit counts, safe.
    const lo = this.u32le(), hi = this.u32le();
    return lo + hi * 0x100000000;
  }
  take(n: number): Uint8Array { const s = this.b.slice(this.o, this.o + n); this.o += n; return s; }
}

export function parseTx(raw: Uint8Array): ParsedTx {
  const r = new Reader(raw);
  const version = r.u32le();
  let hasWitness = false;
  let inCount = r.varint();
  if (inCount === 0 && r.b[r.o] === 0x01) {
    // segwit marker (0x00) already consumed as inCount==0; flag is next byte
    hasWitness = true;
    r.o += 1; // skip flag
    inCount = r.varint();
  }
  const inputs: TxInput[] = [];
  for (let i = 0; i < inCount; i++) {
    const prevTxidLE = r.take(32);
    const prevTxid = bytesToHex(prevTxidLE.slice().reverse());
    const prevVout = r.u32le();
    const slen = r.varint();
    const scriptSig = r.take(slen);
    const sequence = r.u32le();
    inputs.push({ prevTxid, prevVout, scriptSig, sequence, witness: [] });
  }
  const outCount = r.varint();
  const outputs: TxOutput[] = [];
  for (let i = 0; i < outCount; i++) {
    const value = r.u64le();
    const slen = r.varint();
    const scriptPubKey = r.take(slen);
    outputs.push({ value, scriptPubKey });
  }
  if (hasWitness) {
    for (let i = 0; i < inCount; i++) {
      const wCount = r.varint();
      const w: Uint8Array[] = [];
      for (let j = 0; j < wCount; j++) {
        const wl = r.varint();
        w.push(r.take(wl));
      }
      inputs[i].witness = w;
    }
  }
  const locktime = r.u32le();
  return { version, hasWitness, inputs, outputs, locktime, raw };
}

// Parse a P2PKH scriptSig: <sig><pubkey> where each is preceded by its length byte.
export function parseP2PKHScriptSig(scriptSig: Uint8Array): { sig: Uint8Array; pubkey: Uint8Array; sighashType: number } | null {
  if (scriptSig.length < 2) return null;
  const sigLen = scriptSig[0];
  if (sigLen < 8 || sigLen > 73 || 1 + sigLen >= scriptSig.length) return null;
  const sigWithType = scriptSig.slice(1, 1 + sigLen);
  const sighashType = sigWithType[sigWithType.length - 1];
  const sig = sigWithType.slice(0, -1);
  const pkLen = scriptSig[1 + sigLen];
  if (pkLen !== 33 && pkLen !== 65) return null;
  if (1 + sigLen + 1 + pkLen !== scriptSig.length) return null;
  const pubkey = scriptSig.slice(1 + sigLen + 1);
  return { sig, pubkey, sighashType };
}

// Parse a DER-encoded ECDSA signature into (r, s) as bigints.
export function parseDERSignature(der: Uint8Array): { r: bigint; s: bigint } | null {
  if (der.length < 8 || der[0] !== 0x30) return null;
  const totalLen = der[1];
  if (totalLen + 2 !== der.length) return null;
  if (der[2] !== 0x02) return null;
  const rLen = der[3];
  if (4 + rLen + 2 > der.length) return null;
  const rBytes = der.slice(4, 4 + rLen);
  if (der[4 + rLen] !== 0x02) return null;
  const sLen = der[4 + rLen + 1];
  if (4 + rLen + 2 + sLen !== der.length) return null;
  const sBytes = der.slice(4 + rLen + 2, 4 + rLen + 2 + sLen);
  const toBigInt = (b: Uint8Array) => {
    let v = 0n;
    for (const byte of b) v = (v << 8n) | BigInt(byte);
    return v;
  };
  return { r: toBigInt(rBytes), s: toBigInt(sBytes) };
}

// Encode a varint (Bitcoin compact size).
export function encodeVarint(n: number): Uint8Array {
  if (n < 0xfd) return new Uint8Array([n]);
  if (n <= 0xffff) return new Uint8Array([0xfd, n & 0xff, (n >> 8) & 0xff]);
  if (n <= 0xffffffff) {
    const b = new Uint8Array(5);
    b[0] = 0xfe;
    b[1] = n & 0xff; b[2] = (n >> 8) & 0xff; b[3] = (n >> 16) & 0xff; b[4] = (n >>> 24) & 0xff;
    return b;
  }
  throw new Error("varint too large");
}

export function concat(...arrs: Uint8Array[]): Uint8Array {
  let n = 0; for (const a of arrs) n += a.length;
  const out = new Uint8Array(n);
  let o = 0; for (const a of arrs) { out.set(a, o); o += a.length; }
  return out;
}

export function u32leBytes(n: number): Uint8Array {
  return new Uint8Array([n & 0xff, (n >> 8) & 0xff, (n >> 16) & 0xff, (n >>> 24) & 0xff]);
}

export function u64leBytes(n: bigint): Uint8Array {
  const b = new Uint8Array(8);
  for (let i = 0; i < 8; i++) { b[i] = Number(n & 0xffn); n >>= 8n; }
  return b;
}