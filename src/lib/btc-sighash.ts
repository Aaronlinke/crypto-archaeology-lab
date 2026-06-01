// Compute the legacy Bitcoin SIGHASH_ALL message digest (z) for a P2PKH input.
// This is the value that gets signed by ECDSA, i.e. the "message hash" required
// to recover the nonce k from two signatures sharing the same r.
//
// Procedure (BIP — legacy sighash, SIGHASH_ALL):
//   1. Take a copy of the spending tx.
//   2. Empty every input's scriptSig.
//   3. Set scriptSig of the input being signed to the prev output's scriptPubKey
//      (the P2PKH scriptPubKey: OP_DUP OP_HASH160 <20> OP_EQUALVERIFY OP_CHECKSIG).
//   4. Serialize tx, append 4-byte LE sighash type (0x01).
//   5. z = SHA256(SHA256(serialized)).

import { sha256 } from "@noble/hashes/sha2.js";
import {
  ParsedTx, concat, encodeVarint, u32leBytes, u64leBytes, hexToBytes,
} from "./btc-tx-parser";

function dsha256(b: Uint8Array): Uint8Array {
  return sha256(sha256(b));
}

export function legacySighash(
  tx: ParsedTx,
  inputIndex: number,
  prevScriptPubKey: Uint8Array,
  sighashType: number,
): Uint8Array {
  if (sighashType !== 0x01) {
    // Only SIGHASH_ALL handled here. Other types are rare in practice and
    // would need ANYONECANPAY / NONE / SINGLE branches.
    throw new Error(`unsupported sighash type 0x${sighashType.toString(16)}`);
  }
  const parts: Uint8Array[] = [];
  parts.push(u32leBytes(tx.version));
  parts.push(encodeVarint(tx.inputs.length));
  for (let i = 0; i < tx.inputs.length; i++) {
    const inp = tx.inputs[i];
    // prevTxid is stored display (big-endian); on the wire it's little-endian
    const prevLE = hexToBytes(inp.prevTxid).reverse();
    parts.push(prevLE);
    parts.push(u32leBytes(inp.prevVout));
    if (i === inputIndex) {
      parts.push(encodeVarint(prevScriptPubKey.length));
      parts.push(prevScriptPubKey);
    } else {
      parts.push(encodeVarint(0));
    }
    parts.push(u32leBytes(inp.sequence));
  }
  parts.push(encodeVarint(tx.outputs.length));
  for (const o of tx.outputs) {
    parts.push(u64leBytes(o.value));
    parts.push(encodeVarint(o.scriptPubKey.length));
    parts.push(o.scriptPubKey);
  }
  parts.push(u32leBytes(tx.locktime));
  parts.push(u32leBytes(sighashType));
  return dsha256(concat(...parts));
}

// Detect a P2PKH scriptPubKey: 0x76 0xa9 0x14 <20-byte hash> 0x88 0xac
export function isP2PKH(spk: Uint8Array): boolean {
  return spk.length === 25 && spk[0] === 0x76 && spk[1] === 0xa9 && spk[2] === 0x14 && spk[23] === 0x88 && spk[24] === 0xac;
}