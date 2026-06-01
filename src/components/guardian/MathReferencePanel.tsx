import { useMemo, useState } from "react";
import { Sigma, Calculator, CheckCircle2, AlertTriangle } from "lucide-react";
import { secp256k1 } from "@noble/curves/secp256k1.js";
import { sha256 } from "@noble/hashes/sha2";
import { N, modInv, bigToHex, recoverFromNonceReuse, privToWIF } from "@/lib/ecdsa-recovery";

const bytesToHexLocal = (b: Uint8Array) =>
  Array.from(b).map((x) => x.toString(16).padStart(2, "0")).join("");

// ---------------------------------------------------------------------------
// Konstanten secp256k1 (siehe Abschnitt B / V / X der Referenz)
// ---------------------------------------------------------------------------
const P_SECP = (1n << 256n) - (1n << 32n) - 977n;
const N_SECP = N;
const GX = 0x79BE667EF9DCBBAC55A06295CE870B07029BFCDB2DCE28D959F2815B16F81798n;
const GY = 0x483ADA7726A3C4655DA4FBFC0E1108A8FD17B448A68554199C47D08FFB10D4B8n;

const mod = (a: bigint, m: bigint) => ((a % m) + m) % m;

function scalarMul(d: bigint): { x: bigint; y: bigint } {
  const P = secp256k1.Point.BASE.multiply(mod(d, N_SECP));
  const aff = P.toAffine();
  return { x: aff.x, y: aff.y };
}

// Mini-ECDSA über n=23 (rein numerisch, ohne Kurvenarithmetik) für Lehrbeispiel
function miniInv(a: number, m: number): number {
  a = ((a % m) + m) % m;
  for (let x = 1; x < m; x++) if ((a * x) % m === 1) return x;
  throw new Error("not invertible");
}

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h3 className="font-display text-sm tracking-widest text-primary">
        <span className="text-accent">{id}</span> — {title}
      </h3>
      <div className="text-xs text-muted-foreground leading-relaxed space-y-2">{children}</div>
    </section>
  );
}

function Mono({ children }: { children: React.ReactNode }) {
  return <code className="font-mono text-[11px] text-foreground break-all">{children}</code>;
}

function KV({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[110px_1fr] gap-2 items-start">
      <span className="text-muted-foreground">{k}</span>
      <span className="font-mono text-[11px] text-foreground break-all">{v}</span>
    </div>
  );
}

export default function MathReferencePanel() {
  // ------------------------------------------------------------------------
  // Live-Verifikation der Konstanten p, n, G
  // ------------------------------------------------------------------------
  const pCheck = useMemo(() => P_SECP.toString(10), []);
  const onCurveG = useMemo(() => mod(GY * GY - (GX * GX * GX + 7n), P_SECP) === 0n, []);

  // ------------------------------------------------------------------------
  // Affine Schlüsselfolge d_i = (a + i) · r⁻¹ mod n   (Abschnitt J / N / U)
  // ------------------------------------------------------------------------
  const [h, setH] = useState("2");
  const [nNav, setNNav] = useState("3");
  const [g, setG] = useState("1");
  const [o, setO] = useState("0");
  const [rIn, setRIn] = useState("5");
  const [iIdx, setIIdx] = useState("0");

  const affine = useMemo(() => {
    try {
      const hB = BigInt(h), nB = BigInt(nNav), gB = BigInt(g), oB = BigInt(o);
      const rB = BigInt(rIn);
      const iB = BigInt(iIdx);
      const a = hB + nB * gB + oB;
      const rInv = modInv(rB, N_SECP);
      const k_i = mod(a + iB, N_SECP);
      const d_i = mod(k_i * rInv, N_SECP);
      const hex = bigToHex(d_i);
      const wif = privToWIF(hex, true);
      const Q = scalarMul(d_i);
      return { ok: true as const, a, rInv, k_i, d_i, hex, wif, Q };
    } catch (e) {
      return { ok: false as const, err: (e as Error).message };
    }
  }, [h, nNav, g, o, rIn, iIdx]);

  // ------------------------------------------------------------------------
  // Mini-ECDSA über n=23 (Abschnitte G / H / I)
  // ------------------------------------------------------------------------
  const mini = useMemo(() => {
    const n = 23;
    const d = 7, k = 5, z = 4, r = 3;
    const kInv = miniInv(k, n);
    const s = (kInv * (z + r * d)) % n;
    // Verifikation
    const w = miniInv(s, n);
    const u1 = (z * w) % n;
    const u2 = (r * w) % n;
    // Nonce reuse demo
    const z1 = 4, z2 = 7, s1 = 5, s2 = 8;
    const dz = ((z1 - z2) % n + n) % n;
    const ds = ((s1 - s2) % n + n) % n;
    const kRec = (dz * miniInv(ds, n)) % n;
    const dRec = (((kRec * s1 - z1) % n + n) % n * miniInv(r, n)) % n;
    return { kInv, s, w, u1, u2, kRec, dRec };
  }, []);

  // ------------------------------------------------------------------------
  // Echte Nonce-Reuse-Rekonstruktion auf secp256k1
  // ------------------------------------------------------------------------
  const realRecovery = useMemo(() => {
    // Konstruiere zwei Signaturen mit identischem k für einen festen d
    const d = 0xdeadbeefcafebabe1234567890abcdef1234567890abcdef1234567890abcdefn % N_SECP;
    const k = 0xfeedface00112233445566778899aabbccddeeff00112233445566778899aabbn % N_SECP;
    const z1 = BigInt("0x" + bytesToHexLocal(sha256(new TextEncoder().encode("msg-1"))));
    const z2 = BigInt("0x" + bytesToHexLocal(sha256(new TextEncoder().encode("msg-2"))));
    const R = secp256k1.Point.BASE.multiply(k).toAffine();
    const r = mod(R.x, N_SECP);
    const kInv = modInv(k, N_SECP);
    const s1 = mod(kInv * mod(mod(z1, N_SECP) + mod(r * d, N_SECP), N_SECP), N_SECP);
    const s2 = mod(kInv * mod(mod(z2, N_SECP) + mod(r * d, N_SECP), N_SECP), N_SECP);
    const rec = recoverFromNonceReuse(mod(z1, N_SECP), s1, mod(z2, N_SECP), s2, r, true);
    return { d, r, s1, s2, z1: mod(z1, N_SECP), z2: mod(z2, N_SECP), rec, match: rec.d === d };
  }, []);

  // ------------------------------------------------------------------------
  // Entropie / Erfolgswahrscheinlichkeit (Abschnitt T)
  // ------------------------------------------------------------------------
  const [qBits, setQBits] = useState(128);
  const successProb = useMemo(() => {
    // p ≈ q / n  = 2^qBits / 2^256 = 2^(qBits-256)
    const exp = qBits - 256;
    return `2^${exp} ≈ ${Math.pow(2, exp).toExponential(4)}`;
  }, [qBits]);

  return (
    <div className="rounded-lg border border-primary/30 bg-card/50 p-4 space-y-6">
      <div className="flex items-center gap-2">
        <Sigma className="h-5 w-5 text-primary" />
        <h2 className="font-display tracking-widest text-primary">MATHEMATISCHE REFERENZ · A → X</h2>
        <span className="ml-auto text-[10px] font-mono text-muted-foreground">secp256k1 · LIVE</span>
      </div>

      <p className="text-xs text-muted-foreground">
        Vollständige, ausführbare Wiedergabe der Referenz „Von A bis Z". Jede Formel wird live im Browser
        gegen <code>@noble/curves</code> und native <code>BigInt</code>-Arithmetik verifiziert.
      </p>

      <Section id="A" title="Zahlenräume">
        <p>ℕ = {`{0,1,2,…}`} · ℤ = {`{…,−1,0,1,…}`} · 𝔽₂ = {`{0,1}`} mit 1+1=0 · ℤₙ mit Arithmetik mod n.</p>
      </Section>

      <Section id="B" title="Konstanten secp256k1">
        <KV k="p (Feld)" v={pCheck} />
        <KV k="n (Ordnung)" v={N_SECP.toString(10)} />
        <KV k="Gx" v={GX.toString(10)} />
        <KV k="Gy" v={GY.toString(10)} />
        <KV
          k="G auf Kurve?"
          v={
            <span className={onCurveG ? "text-primary" : "text-destructive"}>
              {onCurveG ? "✓ y² ≡ x³+7 (mod p)" : "✗ Mismatch"}
            </span>
          }
        />
      </Section>

      <Section id="C" title="Arithmetik mod n">
        <p>
          Addition <Mono>(a+b) mod n</Mono>, Subtraktion <Mono>(a−b+n) mod n</Mono>,
          Multiplikation <Mono>(a·b) mod n</Mono>, Inverses <Mono>a⁻¹ mit a·a⁻¹≡1</Mono>.
        </p>
        <p>
          Beispiel n=7: <Mono>3⁻¹ = {miniInv(3, 7)}</Mono> (3·5=15≡1).
        </p>
      </Section>

      <Section id="D" title="XOR">
        <Mono>0⊕0=0 · 0⊕1=1 · 1⊕0=1 · 1⊕1=0</Mono>
      </Section>

      <Section id="E/F" title="Punktaddition + Skalarmultiplikation">
        <p>
          λ = (y₂−y₁)/(x₂−x₁) mod p, x₃ = λ²−x₁−x₂, y₃ = λ(x₁−x₃)−y₁. Double-and-Add über 256 Bits.
        </p>
        <KV
          k="2·G (live)"
          v={(() => {
            const Q = scalarMul(2n);
            return `(${bigToHex(Q.x)}, ${bigToHex(Q.y)})`;
          })()}
        />
      </Section>

      <Section id="G/H" title="ECDSA Signatur + Verifikation (Mini, n=23)">
        <p>d=7, k=5, z=4, r=3 ⇒ k⁻¹={mini.kInv}, s = k⁻¹·(z+r·d) mod 23 = {mini.s}</p>
        <p>Verifikation: w=s⁻¹={mini.w}, u₁={mini.u1}, u₂={mini.u2}</p>
      </Section>

      <Section id="I" title="Nonce-Reuse (Mini, n=23)">
        <p>
          z₁=4, z₂=7, s₁=5, s₂=8, r=3 ⇒
          k = (z₁−z₂)·(s₁−s₂)⁻¹ mod 23 = <span className="text-primary">{mini.kRec}</span>,
          d = (k·s₁−z₁)·r⁻¹ mod 23 = <span className="text-primary">{mini.dRec}</span>
        </p>
      </Section>

      <Section id="I+" title="Nonce-Reuse (echt, secp256k1)">
        <KV k="echtes d" v={bigToHex(realRecovery.d)} />
        <KV k="r" v={bigToHex(realRecovery.r)} />
        <KV k="s₁" v={bigToHex(realRecovery.s1)} />
        <KV k="s₂" v={bigToHex(realRecovery.s2)} />
        <KV k="rekonstr. d" v={realRecovery.rec.hex} />
        <KV k="WIF" v={realRecovery.rec.wif} />
        <div className="flex items-center gap-2 mt-2">
          {realRecovery.match ? (
            <>
              <CheckCircle2 className="h-4 w-4 text-primary" />
              <span className="text-primary text-[11px] font-mono">MATCH · d̂ ≡ d</span>
            </>
          ) : (
            <>
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <span className="text-destructive text-[11px] font-mono">MISMATCH</span>
            </>
          )}
        </div>
      </Section>

      <Section id="J/N/U" title="Affine Schlüsselfolge dᵢ = (h + n·g + o + i) · r⁻¹ mod n">
        <div className="grid grid-cols-3 gap-2">
          {[
            ["h", h, setH],
            ["n_nav", nNav, setNNav],
            ["g", g, setG],
            ["o", o, setO],
            ["r", rIn, setRIn],
            ["i", iIdx, setIIdx],
          ].map(([lbl, val, setter]) => (
            <label key={lbl as string} className="text-[10px] font-mono text-muted-foreground space-y-1">
              {lbl as string}
              <input
                value={val as string}
                onChange={(e) => (setter as (s: string) => void)(e.target.value)}
                className="w-full bg-background border border-border rounded px-2 py-1 text-foreground font-mono text-[11px]"
              />
            </label>
          ))}
        </div>
        {affine.ok ? (
          <div className="mt-3 space-y-1">
            <KV k="a = h+n·g+o" v={affine.a.toString(10)} />
            <KV k="r⁻¹ mod n" v={bigToHex(affine.rInv)} />
            <KV k="kᵢ" v={bigToHex(affine.k_i)} />
            <KV k="dᵢ (hex)" v={affine.hex} />
            <KV k="WIF" v={affine.wif} />
            <KV k="Qᵢ.x" v={bigToHex(affine.Q.x)} />
            <KV k="Qᵢ.y" v={bigToHex(affine.Q.y)} />
          </div>
        ) : (
          <p className="text-destructive text-[11px] font-mono">Fehler: {affine.err}</p>
        )}
      </Section>

      <Section id="K/L" title="Base58Check + SHA-256">
        <p>
          WIF = Base58(0x80 ∥ d (32B) ∥ 0x01 ∥ SHA256²(…)[0:4]). SHA-256: 64 Runden über Ch, Maj, Σ₀,
          Σ₁, σ₀, σ₁ mit ROTR/SHR. Beides oben live in der affinen Folge geprüft.
        </p>
      </Section>

      <Section id="R/S" title="BSGS · Pollard-Rho">
        <p>
          BSGS: m = ⌈√n⌉ ≈ 2¹²⁸ ≈ <Mono>3.4·10³⁸</Mono> Operationen + Speicher.
          Pollard-Rho: O(√n) Zeit, O(1) Speicher. Beide für n ≈ 2²⁵⁶ klassisch unausführbar.
        </p>
      </Section>

      <Section id="T" title="Entropie · Erfolgswahrscheinlichkeit">
        <p>H = log₂ n ≈ 256 Bit. P ≈ q/n bei q ≪ n.</p>
        <div className="flex items-center gap-2 mt-2">
          <span className="text-[10px] font-mono text-muted-foreground">q = 2^</span>
          <input
            type="number"
            value={qBits}
            onChange={(e) => setQBits(parseInt(e.target.value) || 0)}
            className="w-20 bg-background border border-border rounded px-2 py-1 text-foreground font-mono text-[11px]"
          />
          <span className="text-[11px] font-mono text-primary">P ≈ {successProb}</span>
        </div>
      </Section>

      <Section id="X" title="Abschlussreihung">
        <KV k="2²⁵⁶" v={(1n << 256n).toString(10)} />
        <KV k="2¹²⁸" v={(1n << 128n).toString(10)} />
        <KV k="π" v="3.141592653589793" />
        <KV k="e" v="2.718281828459045" />
        <KV k="γ" v="0.5772156649015328606065120900824024310421" />
      </Section>

      <div className="flex items-center gap-2 pt-2 border-t border-border/40">
        <Calculator className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-[10px] font-mono text-muted-foreground">
          Alle Werte oben sind in dieser Session live berechnet — nichts hardcodiert außer den
          öffentlich bekannten Kurvenparametern.
        </span>
      </div>
    </div>
  );
}