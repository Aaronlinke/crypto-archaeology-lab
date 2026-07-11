import { useMemo, useState } from "react";
import { Cpu, Download, RefreshCw, CheckCircle2, AlertTriangle } from "lucide-react";
import { secp256k1 } from "@noble/curves/secp256k1.js";
import { keccak_256 } from "@noble/hashes/sha3.js";
import { downloadJSON } from "@/lib/export-utils";

// secp256k1 constants (identical to user's Python engine)
const P = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEFFFFFC2Fn;
const N = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141n;
const GX = 0x79BE667EF9DCBBAC55A06295CE870B07029BFCDB2DCE28D959F2815B16F81798n;
const GY = 0x483ADA7726A3C4655DA4FBFC0E1108A8FD17B448A68554199C47D08FFB10D4B8n;

const mod = (a: bigint, m: bigint) => ((a % m) + m) % m;

// Extended Euclidean Algorithm — 1:1 Port der Python-Referenz (iterativ, kein Stack-Overflow)
function extendedGcd(a: bigint, b: bigint): { d: bigint; x: bigint; y: bigint } {
  let [oldR, r] = [a, b];
  let [oldS, s] = [1n, 0n];
  let [oldT, t] = [0n, 1n];
  while (r !== 0n) {
    const q = oldR / r;
    [oldR, r] = [r, oldR - q * r];
    [oldS, s] = [s, oldS - q * s];
    [oldT, t] = [t, oldT - q * t];
  }
  return { d: oldR, x: oldS, y: oldT };
}

function modInv(a: bigint, n: bigint): bigint {
  const { d, x } = extendedGcd(mod(a, n), n);
  if (d !== 1n) throw new Error("Modular inverse does not exist");
  return mod(x, n);
}

type Pt = { x: bigint; y: bigint } | null;

function pointAdd(p1: Pt, p2: Pt): Pt {
  if (p1 === null) return p2;
  if (p2 === null) return p1;
  const { x: x1, y: y1 } = p1;
  const { x: x2, y: y2 } = p2;
  if (x1 === x2 && y1 !== y2) return null;
  let m: bigint;
  if (x1 === x2) {
    m = mod(3n * x1 * x1 * modInv(2n * y1, P), P);
  } else {
    m = mod((y2 - y1) * modInv(x2 - x1, P), P);
  }
  const x3 = mod(m * m - x1 - x2, P);
  const y3 = mod(m * (x1 - x3) - y1, P);
  return { x: x3, y: y3 };
}

function scalarMult(k: bigint, point: Pt): Pt {
  let res: Pt = null;
  let addend: Pt = point;
  let kk = mod(k, N);
  while (kk > 0n) {
    if (kk & 1n) res = pointAdd(res, addend);
    addend = pointAdd(addend, addend);
    kk >>= 1n;
  }
  return res;
}

function toHex(n: bigint, bytes = 32): string {
  return n.toString(16).padStart(bytes * 2, "0");
}

function randScalar(): bigint {
  const buf = new Uint8Array(32);
  crypto.getRandomValues(buf);
  let n = 0n;
  for (const b of buf) n = (n << 8n) | BigInt(b);
  return (n % (N - 1n)) + 1n;
}

function deriveEth(pub: { x: bigint; y: bigint }): string {
  const bytes = new Uint8Array(64);
  const xh = toHex(pub.x), yh = toHex(pub.y);
  for (let i = 0; i < 32; i++) bytes[i] = parseInt(xh.substr(i * 2, 2), 16);
  for (let i = 0; i < 32; i++) bytes[32 + i] = parseInt(yh.substr(i * 2, 2), 16);
  const h = keccak_256(bytes);
  const addr = Array.from(h.slice(-20)).map((b) => b.toString(16).padStart(2, "0")).join("");
  return "0x" + addr;
}

export default function CryptoPrimitivesNexus() {
  const [priv, setPriv] = useState<bigint>(() => randScalar());
  const [tick, setTick] = useState(0);

  const result = useMemo(() => {
    // Native BigInt port
    const t0 = performance.now();
    const pub = scalarMult(priv, { x: GX, y: GY })!;
    const t1 = performance.now();
    const addr = deriveEth(pub);

    // Cross-verify against @noble/curves
    const nobleP = secp256k1.Point.BASE.multiply(mod(priv, N)).toAffine();
    const match = nobleP.x === pub.x && nobleP.y === pub.y;

    // Integrity checks (like the Python `assert`s)
    const g1 = scalarMult(1n, { x: GX, y: GY });
    const identityG = g1 !== null && g1.x === GX && g1.y === GY;
    const zeroG = scalarMult(0n, { x: GX, y: GY }) === null;

    return { pub, addr, ms: t1 - t0, match, identityG, zeroG };
  }, [priv, tick]);

  const exportJSON = () => {
    downloadJSON(
      {
        module: "CryptoPrimitivesNexus",
        curve: "secp256k1",
        constants: { P: toHex(P), N: toHex(N), Gx: toHex(GX), Gy: toHex(GY) },
        privateKey: toHex(priv),
        publicKey: { x: toHex(result.pub.x), y: toHex(result.pub.y) },
        ethAddress: result.addr,
        verification: {
          nobleMatch: result.match,
          identity_1G_eq_G: result.identityG,
          identity_0G_eq_O: result.zeroG,
          scalarMultMs: result.ms,
        },
        generatedAt: new Date().toISOString(),
      },
      `crypto-primitives-${result.addr.slice(2, 10)}`
    );
  };

  return (
    <div className="rounded-lg border border-primary/30 bg-card/50 p-4 space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <Cpu className="h-5 w-5 text-primary" />
        <h2 className="font-display tracking-widest text-primary">
          CRYPTO PRIMITIVES NEXUS · SECP256K1 ENGINE
        </h2>
        <span className="ml-auto text-[10px] font-mono text-muted-foreground">
          native BigInt · O(log N) · EEA modinv
        </span>
      </div>

      <p className="text-xs text-muted-foreground">
        Nativer Port der User-Python-Engine (<code>SECp256k1_Provider</code>) nach TypeScript-BigInt:
        Extended-Euclidean Modular Inverse, affine Punkt-Addition, Double-and-Add
        Skalarmultiplikation. Jede Berechnung wird live gegen <code>@noble/curves</code> gegengeprüft
        und die ETH-Adresse wird via Keccak-256(pubX ∥ pubY)[-20B] abgeleitet.
      </p>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setPriv(randScalar())}
          className="inline-flex items-center gap-2 px-3 h-8 rounded-md bg-primary/10 hover:bg-primary/20 border border-primary/40 text-primary text-xs font-mono tracking-wider"
        >
          <RefreshCw className="h-3.5 w-3.5" /> NEUER KEY (CSPRNG)
        </button>
        <button
          onClick={() => setTick((t) => t + 1)}
          className="inline-flex items-center gap-2 px-3 h-8 rounded-md bg-secondary/40 hover:bg-secondary/60 border border-border text-foreground text-xs font-mono tracking-wider"
        >
          RE-RUN
        </button>
        <button
          onClick={exportJSON}
          className="inline-flex items-center gap-2 px-3 h-8 rounded-md bg-accent/10 hover:bg-accent/20 border border-accent/40 text-accent text-xs font-mono tracking-wider"
        >
          <Download className="h-3.5 w-3.5" /> EXPORT JSON
        </button>
      </div>

      <div className="space-y-1 text-[11px] font-mono">
        <div className="grid grid-cols-[130px_1fr] gap-2">
          <span className="text-muted-foreground">priv</span>
          <span className="text-foreground break-all">{toHex(priv)}</span>
        </div>
        <div className="grid grid-cols-[130px_1fr] gap-2">
          <span className="text-muted-foreground">pub.x</span>
          <span className="text-foreground break-all">{toHex(result.pub.x)}</span>
        </div>
        <div className="grid grid-cols-[130px_1fr] gap-2">
          <span className="text-muted-foreground">pub.y</span>
          <span className="text-foreground break-all">{toHex(result.pub.y)}</span>
        </div>
        <div className="grid grid-cols-[130px_1fr] gap-2">
          <span className="text-muted-foreground">eth address</span>
          <span className="text-primary break-all">{result.addr}</span>
        </div>
        <div className="grid grid-cols-[130px_1fr] gap-2">
          <span className="text-muted-foreground">scalar_mult</span>
          <span className="text-foreground">{result.ms.toFixed(2)} ms</span>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 pt-2 border-t border-border/40">
        {[
          { ok: result.match, label: "noble ≡ nativ" },
          { ok: result.identityG, label: "1·G = G" },
          { ok: result.zeroG, label: "0·G = O" },
        ].map((c) => (
          <span
            key={c.label}
            className={`inline-flex items-center gap-1 px-2 h-6 rounded border text-[10px] font-mono ${
              c.ok
                ? "border-primary/40 text-primary bg-primary/10"
                : "border-destructive/40 text-destructive bg-destructive/10"
            }`}
          >
            {c.ok ? <CheckCircle2 className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
            {c.label}
          </span>
        ))}
      </div>
    </div>
  );
}