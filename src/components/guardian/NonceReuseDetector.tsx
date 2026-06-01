import { useState } from "react";
import { Search, AlertTriangle, CheckCircle2, Loader2, KeyRound, ExternalLink, Download } from "lucide-react";
import { scanAddress, type ScanReport, type ScanProgress } from "@/lib/nonce-reuse-scanner";
import { downloadJSON, downloadCSV } from "@/lib/export-utils";

const short = (h: string, n = 10) => h.length <= 2 * n ? h : `${h.slice(0, n)}…${h.slice(-n)}`;
const bigHex = (n: bigint) => n.toString(16).padStart(64, "0");

export default function NonceReuseDetector() {
  const [address, setAddress] = useState("");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<ScanProgress | null>(null);
  const [report, setReport] = useState<ScanReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    setBusy(true); setReport(null); setError(null); setProgress({ phase: "Start" });
    try {
      const r = await scanAddress(address.trim(), (p) => setProgress(p));
      setReport(r);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false); setProgress(null);
    }
  };

  const exportJSON = () => {
    if (!report) return;
    const safe = {
      ...report,
      signatures: report.signatures.map((s) => ({
        ...s, r: bigHex(s.r), s: bigHex(s.s), z: bigHex(s.z),
      })),
      collisions: report.collisions.map((c) => ({
        pubkeyHex: c.pubkeyHex,
        r: bigHex(c.r),
        sigs: c.sigs.map((s) => ({ ...s, r: bigHex(s.r), s: bigHex(s.s), z: bigHex(s.z) })),
        recovery: c.recovery
          ? { k: bigHex(c.recovery.k), d: c.recovery.hex, wif: c.recovery.wif }
          : null,
        recoveryError: c.recoveryError,
      })),
    };
    downloadJSON(safe, `nonce-scan-${report.address}-${Date.now()}`);
  };

  const exportCSV = () => {
    if (!report) return;
    const rows = report.signatures.map((s) => ({
      txid: s.txid, vin: s.vin, pubkey: s.pubkeyHex,
      r: bigHex(s.r), s: bigHex(s.s), z: bigHex(s.z),
      sighashType: s.sighashType, prevTxid: s.prevTxid, prevVout: s.prevVout,
    }));
    downloadCSV(rows, `nonce-scan-${report.address}-${Date.now()}`);
  };

  return (
    <div className="rounded-lg border border-primary/30 bg-card/50 p-4 space-y-4">
      <div className="flex items-center gap-2">
        <KeyRound className="h-5 w-5 text-primary" />
        <h2 className="font-display tracking-widest text-primary">ECDSA NONCE-REUSE DETECTOR</h2>
        <span className="ml-auto text-[10px] font-mono text-muted-foreground">LIVE · BLOCKSTREAM · secp256k1</span>
      </div>

      <p className="text-xs text-muted-foreground leading-relaxed">
        Lädt jede Transaktion der angegebenen BTC-Adresse von Blockstream, parst alle legacy P2PKH-Inputs,
        berechnet den echten SIGHASH_ALL <code>z</code>, extrahiert <code>(r, s)</code> aus jeder DER-Signatur und
        sucht nach r-Kollisionen über alle Signaturen desselben Public Keys. Bei Treffer wird der private Schlüssel
        mathematisch rekonstruiert: <code>k = (z₁−z₂)·(s₁−s₂)⁻¹ mod n</code>,
        <code> d = (s₁·k − z₁)·r⁻¹ mod n</code>.
      </p>

      <div className="flex gap-2">
        <input
          value={address} onChange={(e) => setAddress(e.target.value)}
          placeholder="1AddressXYZ… (legacy P2PKH)"
          className="flex-1 bg-background border border-border rounded px-3 py-2 font-mono text-xs text-foreground"
        />
        <button onClick={run} disabled={busy || !address.trim()}
          className="px-4 py-2 rounded bg-primary text-primary-foreground font-mono text-xs disabled:opacity-50 flex items-center gap-2">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          SCAN
        </button>
      </div>

      {progress && (
        <div className="text-xs font-mono text-muted-foreground">
          {progress.phase}{progress.detail ? ` · ${progress.detail}` : ""}
          {progress.total ? ` · ${progress.done}/${progress.total}` : ""}
        </div>
      )}
      {error && <div className="text-xs font-mono text-destructive">FEHLER: {error}</div>}

      {report && (
        <div className="space-y-3">
          <div className="flex gap-2">
            <button onClick={exportJSON}
              className="px-3 py-1.5 rounded border border-primary/40 hover:bg-primary/10 text-xs font-mono flex items-center gap-1">
              <Download className="h-3 w-3" /> JSON ({report.signatures.length} sigs)
            </button>
            <button onClick={exportCSV}
              className="px-3 py-1.5 rounded border border-primary/40 hover:bg-primary/10 text-xs font-mono flex items-center gap-1">
              <Download className="h-3 w-3" /> CSV
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs font-mono">
            <div className="rounded border border-border p-2"><div className="text-muted-foreground">TXs</div><div className="text-foreground">{report.txCount}</div></div>
            <div className="rounded border border-border p-2"><div className="text-muted-foreground">Legacy Inputs</div><div className="text-foreground">{report.legacyInputs}</div></div>
            <div className="rounded border border-border p-2"><div className="text-muted-foreground">Signaturen</div><div className="text-foreground">{report.signatures.length}</div></div>
            <div className="rounded border border-border p-2"><div className="text-muted-foreground">Dauer</div><div className="text-foreground">{(report.durationMs/1000).toFixed(2)}s</div></div>
          </div>

          {report.collisions.length === 0 ? (
            <div className="flex items-center gap-2 rounded border border-primary/40 bg-primary/5 p-3 text-xs">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              <span>Keine r-Kollision gefunden. Jede Signatur dieser Adresse nutzt einen einzigartigen Nonce — keine Schlüsselrekonstruktion möglich.</span>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-2 rounded border border-destructive bg-destructive/10 p-3 text-xs">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                <span className="font-bold text-destructive">{report.collisions.length} r-Kollision(en) gefunden — privater Schlüssel rekonstruierbar.</span>
              </div>
              {report.collisions.map((c, i) => (
                <div key={i} className="rounded border border-destructive/60 p-3 space-y-2">
                  <div className="text-xs font-mono">
                    <span className="text-muted-foreground">pubkey:</span> {short(c.pubkeyHex, 16)}
                  </div>
                  <div className="text-xs font-mono break-all">
                    <span className="text-muted-foreground">r:</span> {bigHex(c.r)}
                  </div>
                  <div className="space-y-1">
                    {c.sigs.map((s, j) => (
                      <div key={j} className="text-[11px] font-mono border-l-2 border-destructive/40 pl-2">
                        <a className="text-primary inline-flex items-center gap-1" target="_blank" rel="noopener noreferrer"
                           href={`https://blockstream.info/tx/${s.txid}`}>
                          {short(s.txid)} vin#{s.vin} <ExternalLink className="h-3 w-3" />
                        </a>
                        <div className="break-all"><span className="text-muted-foreground">s:</span> {bigHex(s.s)}</div>
                        <div className="break-all"><span className="text-muted-foreground">z:</span> {bigHex(s.z)}</div>
                      </div>
                    ))}
                  </div>
                  {c.recovery ? (
                    <div className="rounded bg-destructive/10 border border-destructive p-2 text-xs font-mono space-y-1">
                      <div className="text-destructive font-bold">PRIVATKEY REKONSTRUIERT</div>
                      <div className="break-all"><span className="text-muted-foreground">k:</span> {bigHex(c.recovery.k)}</div>
                      <div className="break-all"><span className="text-muted-foreground">d:</span> {c.recovery.hex}</div>
                      <div className="break-all"><span className="text-muted-foreground">WIF:</span> {c.recovery.wif}</div>
                    </div>
                  ) : (
                    <div className="text-xs font-mono text-muted-foreground">Recovery fehlgeschlagen: {c.recoveryError}</div>
                  )}
                </div>
              ))}
            </div>
          )}

          {report.skipped.length > 0 && (
            <details className="text-xs font-mono">
              <summary className="cursor-pointer text-muted-foreground">{report.skipped.length} Input(s) übersprungen (nur legacy P2PKH wird unterstützt)</summary>
              <div className="mt-1 max-h-40 overflow-auto space-y-0.5">
                {report.skipped.slice(0, 100).map((s, i) => (
                  <div key={i} className="text-[10px] text-muted-foreground">{short(s.txid)} vin#{s.vin}: {s.reason}</div>
                ))}
              </div>
            </details>
          )}
        </div>
      )}
    </div>
  );
}