// Mathematical recovery of an ECDSA private key when two signatures over
// different messages share the same nonce r (i.e. the same k was used twice).
//
//   k  = (z1 - z2) * (s1 - s2)^-1   mod n
//   d  = (s1 * k  - z1) * r^-1      mod n
//
// n is the order of the secp256k1 group.

import { secp256k1 } from "@noble/curves/secp256k1.js";
import { sha256 } from "@noble/hashes/sha2";
import { ripemd160 } from "@noble/hashes/legacy";
import { base58check } from "@scure/base";
import { bytesToHex } from "./btc-tx-parser";

export const N = secp256k1.Point.Fn.ORDER; // group order

const mod = (a: bigint, m: bigint) => ((a % m) + m) % m;

// Extended Euclidean modular inverse.
export function modInv(a: bigint, m: bigint): bigint {
  let [old_r, r] = [mod(a, m), m];
  let [old_s, s] = [1n, 0n];
  while (r !== 0n) {
    const q = old_r / r;
    [old_r, r] = [r, old_r - q * r];
    [old_s, s] = [s, old_s - q * s];
  }
  if (old_r !== 1n) throw new Error("not invertible");
  return mod(old_s, m);
}

export interface Recovery {
  k: bigint;
  d: bigint;
  wif: string;
  hex: string;
}

export function recoverFromNonceReuse(
  z1: bigint, s1: bigint,
  z2: bigint, s2: bigint,
  r: bigint,
  compressedPubkey: boolean,
): Recovery {
  const dz = mod(z1 - z2, N);
  const ds = mod(s1 - s2, N);
  const k = mod(dz * modInv(ds, N), N);
  const d = mod((mod(s1 * k, N) - z1) * modInv(r, N), N);
  const hex = d.toString(16).padStart(64, "0");
  return { k, d, wif: privToWIF(hex, compressedPubkey), hex };
}

// Bitcoin mainnet WIF encoding: 0x80 + 32-byte priv [+ 0x01 if compressed], base58check.
export function privToWIF(privHex: string, compressed: boolean): string {
  const priv = new Uint8Array(32);
  for (let i = 0; i < 32; i++) priv[i] = parseInt(privHex.substr(i * 2, 2), 16);
  const payload = compressed
    ? new Uint8Array([0x80, ...priv, 0x01])
    : new Uint8Array([0x80, ...priv]);
  return base58check(sha256).encode(payload);
}

// Helpers exposed for the UI's verification panel.
export function bigToHex(n: bigint, bytes = 32): string {
  return n.toString(16).padStart(bytes * 2, "0");
}

export function hash160(b: Uint8Array): Uint8Array {
  return ripemd160(sha256(b));
}

export function bytesHex(b: Uint8Array): string { return bytesToHex(b); }