import { useState } from "react";
import { Layers, Loader2, Download, Play, Square } from "lucide-react";
import { scanAddress, type ScanReport } from "@/lib/nonce-reuse-scanner";
import { downloadJSON, downloadCSV } from "@/lib/export-utils";

interface Row {
  address: string;
  status: "queued" | "running" | "done" | "error";
  txCount?: number;
  sigs?: number;
  collisions?: number;
  recovered?: number;
  durationMs?: number;
  error?: string;
  report?: ScanReport;
}

const DEFAULT_LIST = [
  "1HKywxiL4JziqXrzLKhmB6a74ma6kxbSDj",
  "1BFhrfTTZP3Nw8BNxAtR4Xs7rQH6vsfPgN",
  "1NTMakcgVwQpMdGxRQnFKyb3G1FAJysSfz",
].join("\n");

export default function BatchNonceScanner() {
  const [text, setText] = useState(DEFAULT_LIST);
  const [rows, setRows] = useState<Row[]>([]);
  const [busy, setBusy] = useState(false);
  const [cancel, setCancel] = useState(false);

  const run = async () => {
    const addrs = text.split(/\s+/).map((s) => s.trim()).filter(Boolean);
    const initial: Row[] = addrs.map((a) => ({ address: a, status: "queued" }));
    setRows(initial); setBusy(true); setCancel(false);
    for (let i = 0; i < addrs.length; i++) {
      if (cancel) break;
      setRows((rs) => rs.map((r, j) => j === i ? { ...r, status: "running" } : r));
      const t0 = performance.now();
      try {
        const rep = await scanAddress(addrs[i]);
        const recovered = rep.collisions.filter((c) => c.recovery).length;
        setRows((rs) => rs.map((r, j) => j === i ? {
          ...r, status: "done", report: rep,
          txCount: rep.txCount, sigs: rep.signatures.length,
          collisions: rep.collisions.length, recovered,
          durationMs: performance.now() - t0,
        } : r));
      } catch (e) {
        setRows((rs) => rs.map((r, j) => j === i ? {
          ...r, status: "error", error: (e as Error).message,
          durationMs: performance.now() - t0,
        } : r));
      }
    }
    setBusy(false);
  };

  const exportSummaryCSV = () => {
    const data = rows.map((r) => ({
      address: r.address, status: r.status,
      tx_count: r.txCount ?? "", signatures: r.sigs ?? "",
      r_collisions: r.collisions ?? "", recovered_keys: r.recovered ?? "",
      duration_ms: r.durationMs?.toFixed(0) ?? "",
      error: r.error ?? "",
    }));
    downloadCSV(data, `batch-nonce-summary-${Date.now()}`);
  };

  const exportSignaturesCSV = () => {
    const data = rows.flatMap((r) => (r.report?.signatures ?? []).map((s) => ({
      address: r.address, txid: s.txid, vin: s.vin, pubkey: s.pubkeyHex,
      r: s.r.toString(16).padStart(64, "0"),
      s: s.s.toString(16).padStart(64, "0"),
      z: s.z.toString(16).padStart(64, "0"),
      sighashType: s.sighashType,
    })));
    if (data.length === 0) return;
    downloadCSV(data, `batch-nonce-signatures-${Date.now()}`);
  };

  const exportFullJSON = () => {
    const data = rows.map((r) => ({
      address: r.address, status: r.status, error: r.error,
      durationMs: r.durationMs,
      report: r.report ? {
        ...r.report,
        signatures: r.report.signatures.map((s) => ({
          ...s,
          r: s.r.toString(16).padStart(64, "0"),
          s: s.s.toString(16).padStart(64, "0"),
          z: s.z.toString(16).padStart(64, "0"),
        })),
        collisions: r.report.collisions.map((c) => ({
          pubkeyHex: c.pubkeyHex,
          r: c.r.toString(16).padStart(64, "0"),
          sigCount: c.sigs.length,
          recovery: c.recovery ? { d: c.recovery.hex, wif: c.recovery.wif } : null,
          recoveryError: c.recoveryError,
        })),
      } : null,
    }));
    downloadJSON(data, `batch-nonce-full-${Date.now()}`);
  };

  return (
    <div className="rounded-lg border border-primary/30 bg-card/50 p-4 space-y-4">
      <div className="flex items-center gap-2">
        <Layers className="h-5 w-5 text-primary" />
        <h2 className="font-display tracking-widest text-primary">BATCH NONCE-REUSE SCANNER</h2>
        <span className="ml-auto text-[10px] font-mono text-muted-foreground">N-ADRESSEN · LIVE · CSV/JSON EXPORT</span>
      </div>
      <p className="text-xs text-muted-foreground">
        Eine Adresse pro Zeile. Jede wird sequentiell live über Blockstream gescannt, alle Signaturen
        werden mathematisch verifiziert und r-Kollisionen geprüft. Der vollständige Datensatz (echte
        z/r/s pro TX-Input) ist als CSV/JSON exportierbar — reproduzierbar Byte-für-Byte.
      </p>
      <textarea
        value={text} onChange={(e) => setText(e.target.value)}
        rows={5}
        className="w-full bg-background border border-border rounded px-3 py-2 font-mono text-xs"
        placeholder="1Adresse...&#10;1AndereAdresse..."
      />
      <div className="flex flex-wrap gap-2">
        <button onClick={run} disabled={busy}
          className="px-4 py-2 rounded bg-primary text-primary-foreground font-mono text-xs disabled:opacity-50 flex items-center gap-2">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
          START BATCH
        </button>
        {busy && (
          <button onClick={() => setCancel(true)}
            className="px-3 py-2 rounded border border-destructive text-destructive font-mono text-xs flex items-center gap-1">
            <Square className="h-3 w-3" /> STOP
          </button>
        )}
        {rows.length > 0 && (
          <>
            <button onClick={exportSummaryCSV}
              className="px-3 py-2 rounded border border-primary/40 hover:bg-primary/10 font-mono text-xs flex items-center gap-1">
              <Download className="h-3 w-3" /> Summary CSV
            </button>
            <button onClick={exportSignaturesCSV}
              className="px-3 py-2 rounded border border-primary/40 hover:bg-primary/10 font-mono text-xs flex items-center gap-1">
              <Download className="h-3 w-3" /> Signaturen CSV
            </button>
            <button onClick={exportFullJSON}
              className="px-3 py-2 rounded border border-primary/40 hover:bg-primary/10 font-mono text-xs flex items-center gap-1">
              <Download className="h-3 w-3" /> Full JSON
            </button>
          </>
        )}
      </div>

      {rows.length > 0 && (
        <div className="rounded border border-border overflow-x-auto">
          <table className="w-full text-xs font-mono">
            <thead className="bg-muted/30 text-muted-foreground">
              <tr>
                <th className="text-left p-2">Adresse</th>
                <th className="text-left p-2">Status</th>
                <th className="text-right p-2">TXs</th>
                <th className="text-right p-2">Sigs</th>
                <th className="text-right p-2">r-Koll.</th>
                <th className="text-right p-2">Keys</th>
                <th className="text-right p-2">ms</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="border-t border-border">
                  <td className="p-2 break-all">{r.address}</td>
                  <td className="p-2">
                    <span className={
                      r.status === "done" ? "text-primary" :
                      r.status === "error" ? "text-destructive" :
                      r.status === "running" ? "text-accent" : "text-muted-foreground"
                    }>{r.status}</span>
                    {r.error && <span className="block text-[10px] text-destructive">{r.error}</span>}
                  </td>
                  <td className="p-2 text-right">{r.txCount ?? "—"}</td>
                  <td className="p-2 text-right">{r.sigs ?? "—"}</td>
                  <td className="p-2 text-right">{r.collisions ?? "—"}</td>
                  <td className={`p-2 text-right ${r.recovered ? "text-destructive font-bold" : ""}`}>
                    {r.recovered ?? "—"}
                  </td>
                  <td className="p-2 text-right">{r.durationMs?.toFixed(0) ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}