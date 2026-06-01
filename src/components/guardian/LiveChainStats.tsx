import { useEffect, useState } from "react";
import { Activity, Loader2, Download, RefreshCw } from "lucide-react";
import { downloadJSON, downloadCSV } from "@/lib/export-utils";

interface Snapshot {
  ts: number;
  tipHeight: number;
  tipHash: string;
  mempoolCount: number;
  mempoolVsize: number;
  feeFastest: number;
  feeHalfHour: number;
  feeHour: number;
  feeEconomy: number;
  difficulty: number;
  hashrate: number | null;
}

async function fetchSnapshot(): Promise<Snapshot> {
  const [tipHeight, tipHash, mempool, fees, difficulty, hashrate] = await Promise.all([
    fetch("https://mempool.space/api/blocks/tip/height").then((r) => r.text()),
    fetch("https://mempool.space/api/blocks/tip/hash").then((r) => r.text()),
    fetch("https://mempool.space/api/mempool").then((r) => r.json()),
    fetch("https://mempool.space/api/v1/fees/recommended").then((r) => r.json()),
    fetch("https://mempool.space/api/v1/difficulty-adjustment").then((r) => r.json()),
    fetch("https://mempool.space/api/v1/mining/hashrate/3d").then((r) => r.json()).catch(() => null),
  ]);
  return {
    ts: Date.now(),
    tipHeight: parseInt(tipHeight, 10),
    tipHash: tipHash.trim(),
    mempoolCount: mempool.count,
    mempoolVsize: mempool.vsize,
    feeFastest: fees.fastestFee,
    feeHalfHour: fees.halfHourFee,
    feeHour: fees.hourFee,
    feeEconomy: fees.economyFee,
    difficulty: difficulty.difficulty ?? difficulty.estimatedRetargetDate ?? 0,
    hashrate: hashrate?.currentHashrate ?? null,
  };
}

export default function LiveChainStats() {
  const [history, setHistory] = useState<Snapshot[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [auto, setAuto] = useState(false);

  const refresh = async () => {
    setBusy(true); setError(null);
    try {
      const s = await fetchSnapshot();
      setHistory((h) => [s, ...h].slice(0, 200));
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  };

  useEffect(() => { refresh(); }, []);
  useEffect(() => {
    if (!auto) return;
    const id = setInterval(refresh, 30_000);
    return () => clearInterval(id);
  }, [auto]);

  const latest = history[0];

  return (
    <div className="rounded-lg border border-primary/30 bg-card/50 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Activity className="h-5 w-5 text-primary" />
        <h2 className="font-display tracking-widest text-primary">LIVE CHAIN TELEMETRY</h2>
        <span className="ml-auto text-[10px] font-mono text-muted-foreground">mempool.space · BTC mainnet</span>
      </div>
      <div className="flex flex-wrap gap-2">
        <button onClick={refresh} disabled={busy}
          className="px-3 py-1.5 rounded bg-primary text-primary-foreground font-mono text-xs flex items-center gap-1 disabled:opacity-50">
          {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />} REFRESH
        </button>
        <label className="flex items-center gap-1 text-xs font-mono text-muted-foreground">
          <input type="checkbox" checked={auto} onChange={(e) => setAuto(e.target.checked)} />
          AUTO 30s
        </label>
        {history.length > 0 && (
          <>
            <button onClick={() => downloadCSV(history as unknown as Record<string, unknown>[], `chain-telemetry-${Date.now()}`)}
              className="px-3 py-1.5 rounded border border-primary/40 hover:bg-primary/10 font-mono text-xs flex items-center gap-1">
              <Download className="h-3 w-3" /> CSV ({history.length})
            </button>
            <button onClick={() => downloadJSON(history, `chain-telemetry-${Date.now()}`)}
              className="px-3 py-1.5 rounded border border-primary/40 hover:bg-primary/10 font-mono text-xs flex items-center gap-1">
              <Download className="h-3 w-3" /> JSON
            </button>
          </>
        )}
      </div>
      {error && <div className="text-xs font-mono text-destructive">FEHLER: {error}</div>}
      {latest && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs font-mono">
          <Stat label="Block-Höhe" value={latest.tipHeight.toLocaleString()} />
          <Stat label="Mempool TXs" value={latest.mempoolCount.toLocaleString()} />
          <Stat label="Mempool vsize" value={`${(latest.mempoolVsize / 1e6).toFixed(2)} MB`} />
          <Stat label="Fee (1 Block)" value={`${latest.feeFastest} sat/vB`} />
          <Stat label="Fee (30min)" value={`${latest.feeHalfHour} sat/vB`} />
          <Stat label="Fee (1h)" value={`${latest.feeHour} sat/vB`} />
          <Stat label="Fee (econ)" value={`${latest.feeEconomy} sat/vB`} />
          <Stat label="Hashrate" value={latest.hashrate ? `${(latest.hashrate / 1e18).toFixed(2)} EH/s` : "—"} />
        </div>
      )}
      {latest && (
        <div className="text-[10px] font-mono text-muted-foreground break-all">
          tip: {latest.tipHash}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-border p-2">
      <div className="text-muted-foreground">{label}</div>
      <div className="text-foreground">{value}</div>
    </div>
  );
}