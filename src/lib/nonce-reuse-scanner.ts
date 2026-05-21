// Live scanner: pulls all transactions of a Bitcoin address from the public
// Blockstream Esplora API, parses every legacy P2PKH input, computes the real
// sighash, extracts (r, s, z, pubkey) tuples, and detects r-collisions across
// the entire signature set (same pubkey + same r over different messages = key
// recovery possible).
//
// All math is genuine — no simulation. Results are reproducible: every
// (txid, vin, r, s, z) is shown so the user can verify byte-for-byte.

import { hexToBytes, parseTx, parseP2PKHScriptSig, parseDERSignature, bytesToHex } from "./btc-tx-parser";
import { legacySighash, isP2PKH } from "./btc-sighash";
import { recoverFromNonceReuse, Recovery } from "./ecdsa-recovery";

const ESPLORA = "https://blockstream.info/api";

export interface SigRecord {
  txid: string;
  vin: number;
  pubkeyHex: string;
  r: bigint;
  s: bigint;
  z: bigint;          // sighash that was signed
  sighashType: number;
  prevTxid: string;
  prevVout: number;
}

export interface CollisionResult {
  pubkeyHex: string;
  r: bigint;
  sigs: SigRecord[];
  recovery: Recovery | null;
  recoveryError?: string;
}

export interface ScanProgress {
  phase: string;
  detail?: string;
  done?: number;
  total?: number;
}

export interface ScanReport {
  address: string;
  txCount: number;
  legacyInputs: number;
  signatures: SigRecord[];
  collisions: CollisionResult[];
  skipped: { txid: string; vin: number; reason: string }[];
  durationMs: number;
}

async function fetchJson(url: string): Promise<any> {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return r.json();
}
async function fetchText(url: string): Promise<string> {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return r.text();
}

// Paginate /address/:addr/txs (Esplora returns 25 per page, oldest cursor by last_seen_txid).
async function fetchAllTxids(address: string, onProgress?: (p: ScanProgress) => void): Promise<string[]> {
  const ids: string[] = [];
  let lastSeen = "";
  for (let page = 0; page < 200; page++) {
    const url = lastSeen
      ? `${ESPLORA}/address/${address}/txs/chain/${lastSeen}`
      : `${ESPLORA}/address/${address}/txs`;
    const txs: any[] = await fetchJson(url);
    if (!txs.length) break;
    for (const t of txs) ids.push(t.txid);
    onProgress?.({ phase: "TXIDs", detail: `${ids.length} geladen`, done: ids.length });
    if (txs.length < 25) break;
    lastSeen = txs[txs.length - 1].txid;
  }
  return ids;
}

// In-flight raw tx cache (we need prev tx to read its scriptPubKey for sighash).
const rawCache = new Map<string, Uint8Array>();
async function getRawTx(txid: string): Promise<Uint8Array> {
  const c = rawCache.get(txid);
  if (c) return c;
  const hex = (await fetchText(`${ESPLORA}/tx/${txid}/hex`)).trim();
  const b = hexToBytes(hex);
  rawCache.set(txid, b);
  return b;
}

export async function scanAddress(
  address: string,
  onProgress?: (p: ScanProgress) => void,
): Promise<ScanReport> {
  const t0 = performance.now();
  onProgress?.({ phase: "Lade TX-Liste" });
  const txids = await fetchAllTxids(address, onProgress);

  const sigs: SigRecord[] = [];
  const skipped: ScanReport["skipped"] = [];
  let legacyInputs = 0;

  for (let idx = 0; idx < txids.length; idx++) {
    const txid = txids[idx];
    onProgress?.({ phase: "Analysiere TXs", detail: txid.slice(0, 12) + "…", done: idx + 1, total: txids.length });
    let raw: Uint8Array;
    try { raw = await getRawTx(txid); } catch (e) {
      skipped.push({ txid, vin: -1, reason: `tx fetch: ${(e as Error).message}` });
      continue;
    }
    const tx = parseTx(raw);
    for (let vin = 0; vin < tx.inputs.length; vin++) {
      const inp = tx.inputs[vin];
      // Coinbase inputs have prevTxid all-zero — skip.
      if (/^0+$/.test(inp.prevTxid)) continue;
      // Pure legacy P2PKH: scriptSig present, witness empty.
      if (inp.scriptSig.length === 0 || inp.witness.length > 0) {
        skipped.push({ txid, vin, reason: "segwit/non-P2PKH input" });
        continue;
      }
      const parsed = parseP2PKHScriptSig(inp.scriptSig);
      if (!parsed) { skipped.push({ txid, vin, reason: "scriptSig nicht als P2PKH parsebar" }); continue; }
      const der = parseDERSignature(parsed.sig);
      if (!der) { skipped.push({ txid, vin, reason: "DER-Signatur ungültig" }); continue; }
      let prevRaw: Uint8Array;
      try { prevRaw = await getRawTx(inp.prevTxid); } catch (e) {
        skipped.push({ txid, vin, reason: `prev tx fetch: ${(e as Error).message}` }); continue;
      }
      const prevTx = parseTx(prevRaw);
      const prevOut = prevTx.outputs[inp.prevVout];
      if (!prevOut) { skipped.push({ txid, vin, reason: "prev vout fehlt" }); continue; }
      if (!isP2PKH(prevOut.scriptPubKey)) { skipped.push({ txid, vin, reason: "prev scriptPubKey kein P2PKH" }); continue; }
      let z: Uint8Array;
      try { z = legacySighash(tx, vin, prevOut.scriptPubKey, parsed.sighashType); } catch (e) {
        skipped.push({ txid, vin, reason: (e as Error).message }); continue;
      }
      const zBig = BigInt("0x" + bytesToHex(z));
      legacyInputs++;
      sigs.push({
        txid, vin,
        pubkeyHex: bytesToHex(parsed.pubkey),
        r: der.r, s: der.s, z: zBig,
        sighashType: parsed.sighashType,
        prevTxid: inp.prevTxid, prevVout: inp.prevVout,
      });
    }
  }

  onProgress?.({ phase: "Suche r-Kollisionen", total: sigs.length, done: sigs.length });

  // Bucket by (pubkey, r). Collision = 2+ entries with different z.
  const buckets = new Map<string, SigRecord[]>();
  for (const sig of sigs) {
    const key = sig.pubkeyHex + "|" + sig.r.toString(16);
    const arr = buckets.get(key) ?? [];
    arr.push(sig);
    buckets.set(key, arr);
  }

  const collisions: CollisionResult[] = [];
  for (const [, arr] of buckets) {
    if (arr.length < 2) continue;
    // distinct z required (same z + same r + same key = same signature, no leak)
    const distinctZ = new Set(arr.map((a) => a.z.toString(16)));
    if (distinctZ.size < 2) continue;
    const [a, b] = arr;
    let recovery: Recovery | null = null;
    let recoveryError: string | undefined;
    try {
      const compressed = a.pubkeyHex.length === 66;
      recovery = recoverFromNonceReuse(a.z, a.s, b.z, b.s, a.r, compressed);
    } catch (e) {
      recoveryError = (e as Error).message;
    }
    collisions.push({ pubkeyHex: a.pubkeyHex, r: a.r, sigs: arr, recovery, recoveryError });
  }

  return {
    address,
    txCount: txids.length,
    legacyInputs,
    signatures: sigs,
    collisions,
    skipped,
    durationMs: performance.now() - t0,
  };
}