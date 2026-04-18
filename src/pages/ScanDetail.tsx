import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft, ShieldAlert, ShieldCheck, ShieldQuestion, Search, Cloud, HardDrive,
  Download, RefreshCw, Copy, Check, Clock, Hash, AlertTriangle, XCircle,
  CheckCircle2, Activity, ChevronRight,
} from "lucide-react";
import { loadScans, saveScan, type StoredScan } from "@/lib/scan-history";
import {
  runExtractionAttempts, computeSecurityScore, determineOverallStatus,
  type ExtractionAttempt, type ComputationLog,
} from "@/lib/key-extraction-engine";
import { downloadJSON, downloadText } from "@/lib/export-utils";
import { useToast } from "@/hooks/use-toast";

const statusMeta = {
  safe: { icon: ShieldCheck, color: "text-primary", bg: "bg-primary/10 border-primary/30", label: "VERIFIED SAFE", glow: "glow-green" },
  compromised: { icon: ShieldAlert, color: "text-destructive", bg: "bg-destructive/10 border-destructive/30", label: "COMPROMISED", glow: "" },
  "at-risk": { icon: ShieldQuestion, color: "text-cyber-orange", bg: "bg-cyber-orange/10 border-cyber-orange/30", label: "AT RISK", glow: "" },
  unknown: { icon: Search, color: "text-muted-foreground", bg: "bg-muted/10 border-border", label: "UNKNOWN", glow: "" },
} as const;

const attemptStatusMeta = {
  extracted: { icon: AlertTriangle, color: "text-destructive", bg: "bg-destructive/5 border-destructive/30", label: "EXTRACTED" },
  partial: { icon: AlertTriangle, color: "text-cyber-orange", bg: "bg-cyber-orange/5 border-cyber-orange/30", label: "WEAK POINT" },
  failed: { icon: CheckCircle2, color: "text-primary", bg: "bg-primary/5 border-primary/30", label: "BLOCKED" },
  running: { icon: Activity, color: "text-cyber-blue", bg: "bg-cyber-blue/5 border-cyber-blue/30", label: "RUNNING" },
} as const;

const logTypeColor: Record<ComputationLog["type"], string> = {
  info: "text-cyber-blue",
  hex: "text-cyber-purple",
  iteration: "text-muted-foreground",
  result: "text-cyber-orange",
  warning: "text-cyber-orange",
  blocked: "text-primary",
};

const ScanDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [scan, setScan] = useState<StoredScan | null>(null);
  const [loading, setLoading] = useState(true);
  const [rescanning, setRescanning] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [expandedVector, setExpandedVector] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const all = await loadScans();
      setScan(all.find((s) => s.id === id) ?? null);
      setLoading(false);
    })();
  }, [id]);

  const copy = (label: string, value: string) => {
    navigator.clipboard.writeText(value);
    setCopiedKey(label);
    setTimeout(() => setCopiedKey(null), 1500);
  };

  const handleRescan = async () => {
    if (!scan) return;
    setRescanning(true);
    toast({ title: "Re-Scan gestartet", description: `Führe 10-Vektor-Extraktion für ${scan.address.slice(0, 12)}... aus` });

    // Simulate delay so UI feels real
    await new Promise((r) => setTimeout(r, 800));
    const attempts = runExtractionAttempts(scan.address, scan.generation_era ?? "");
    const score = computeSecurityScore(attempts);
    const status = determineOverallStatus(attempts);

    const res = await saveScan({
      address: scan.address,
      security_score: score,
      overall_status: status,
      generation_era: scan.generation_era ?? "",
      attempts,
    });

    toast({
      title: "Re-Scan abgeschlossen",
      description: `Score: ${score}/100 — ${status.toUpperCase()} — gespeichert in ${res.source.toUpperCase()}`,
    });
    setRescanning(false);
    // Reload list and find newest matching address
    const all = await loadScans();
    const newest = all.find((s) => s.address === scan.address);
    if (newest && newest.id !== scan.id) navigate(`/history/${newest.id}`);
    else setScan(newest ?? scan);
  };

  const exportFullReport = () => {
    if (!scan) return;
    const lines = [
      `CryptoGuardian X — Detaillierter Wallet-Scan Report`,
      `${"=".repeat(70)}`,
      `Scan ID: ${scan.id}`,
      `Adresse: ${scan.address}`,
      `Era: ${scan.generation_era ?? "—"}`,
      `Score: ${scan.security_score}/100`,
      `Status: ${scan.overall_status.toUpperCase()}`,
      `Vektoren: ${scan.vectors_breached}/${scan.vectors_tested} durchbrochen`,
      `Quelle: ${scan.source.toUpperCase()}`,
      `Zeitpunkt: ${new Date(scan.created_at).toISOString()}`,
      ``,
      `${"─".repeat(70)}`,
      `VEKTOR-DETAILS`,
      `${"─".repeat(70)}`,
      ...scan.attempts.flatMap((a, i) => [
        ``,
        `[${i + 1}/${scan.attempts.length}] ${a.vectorName}`,
        `  Methode:  ${a.method}`,
        `  Status:   ${a.status.toUpperCase()}`,
        `  Ergebnis: ${a.result}`,
        `  Dauer:    ${a.timeMs}ms`,
        a.iterations ? `  Iter:     ${a.iterations}` : "",
        a.extractedHex ? `  Hex:      ${a.extractedHex}` : "",
        `  Details:  ${a.details}`,
        `  Logs:`,
        ...a.computationLogs.map((l) => `    [${String(l.timestamp).padStart(3, "0")}] [${l.type.toUpperCase()}] ${l.message}`),
      ].filter(Boolean)),
    ];
    downloadText(lines.join("\n"), `scan-${scan.address.slice(0, 12)}-${scan.id.slice(0, 8)}.txt`);
  };

  const summary = useMemo(() => {
    if (!scan) return null;
    const breached = scan.attempts.filter((a) => a.status === "extracted").length;
    const partial = scan.attempts.filter((a) => a.status === "partial").length;
    const blocked = scan.attempts.filter((a) => a.status === "failed").length;
    const totalTime = scan.attempts.reduce((sum, a) => sum + a.timeMs, 0);
    const extractedHashes = scan.attempts.filter((a) => a.extractedHex).length;
    return { breached, partial, blocked, totalTime, extractedHashes };
  }, [scan]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-xs font-mono text-cyber-blue animate-pulse">LADE SCAN-DETAILS...</div>
      </div>
    );
  }

  if (!scan) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 p-6">
        <Search className="h-12 w-12 text-muted-foreground opacity-40" />
        <p className="text-sm font-mono text-muted-foreground">Scan nicht gefunden</p>
        <Link
          to="/history"
          className="px-4 py-2 rounded bg-primary/20 border border-primary/30 text-primary text-xs font-bold hover:bg-primary/30 transition-colors"
        >
          ZURÜCK ZUR HISTORIE
        </Link>
      </div>
    );
  }

  const meta = statusMeta[scan.overall_status];
  const Icon = meta.icon;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-[1600px] mx-auto px-6 py-4 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3 min-w-0 flex-wrap">
            <Link to="/" className="flex items-center gap-1 text-xs font-mono text-muted-foreground hover:text-primary transition-colors">
              DASHBOARD
            </Link>
            <ChevronRight className="h-3 w-3 text-muted-foreground" />
            <Link to="/history" className="flex items-center gap-1 text-xs font-mono text-muted-foreground hover:text-primary transition-colors">
              HISTORIE
            </Link>
            <ChevronRight className="h-3 w-3 text-muted-foreground" />
            <span className="text-xs font-mono text-primary truncate">
              {scan.address.slice(0, 16)}...
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/history"
              className="px-3 py-1.5 rounded bg-muted/30 border border-border text-xs font-mono text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors flex items-center gap-1.5"
            >
              <ArrowLeft className="h-3 w-3" />
              HISTORIE
            </Link>
            <button
              onClick={handleRescan}
              disabled={rescanning}
              className="px-3 py-1.5 rounded bg-cyber-blue/10 border border-cyber-blue/30 text-cyber-blue text-xs font-mono hover:bg-cyber-blue/20 transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              <RefreshCw className={`h-3 w-3 ${rescanning ? "animate-spin" : ""}`} />
              {rescanning ? "SCANNING..." : "RE-SCAN"}
            </button>
            <button
              onClick={exportFullReport}
              className="px-3 py-1.5 rounded bg-muted/30 border border-border text-xs font-mono text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors flex items-center gap-1.5"
            >
              <Download className="h-3 w-3" />
              REPORT
            </button>
            <button
              onClick={() => downloadJSON(scan, `scan-${scan.id.slice(0, 8)}`)}
              className="px-3 py-1.5 rounded bg-muted/30 border border-border text-xs font-mono text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors flex items-center gap-1.5"
            >
              <Download className="h-3 w-3" />
              JSON
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto p-6 space-y-6">
        {/* Hero status card */}
        <div className={`rounded-lg border p-5 ${meta.bg} ${meta.glow}`}>
          <div className="flex items-start gap-4 flex-wrap">
            <div className={`shrink-0 p-3 rounded-lg border ${meta.bg}`}>
              <Icon className={`h-8 w-8 ${meta.color}`} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <h1 className={`text-xl font-display font-bold tracking-wider ${meta.color}`}>
                  {meta.label}
                </h1>
                <span className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono tracking-wider border ${
                  scan.source === "cloud"
                    ? "bg-cyber-purple/10 border-cyber-purple/30 text-cyber-purple"
                    : "bg-muted/30 border-border text-muted-foreground"
                }`}>
                  {scan.source === "cloud" ? <Cloud className="h-2.5 w-2.5" /> : <HardDrive className="h-2.5 w-2.5" />}
                  {scan.source.toUpperCase()}
                </span>
              </div>
              <button
                onClick={() => copy("address", scan.address)}
                className="font-mono text-xs text-foreground hover:text-primary transition-colors flex items-center gap-1.5 group"
              >
                <span className="break-all text-left">{scan.address}</span>
                {copiedKey === "address"
                  ? <Check className="h-3 w-3 text-primary shrink-0" />
                  : <Copy className="h-3 w-3 opacity-50 group-hover:opacity-100 shrink-0" />}
              </button>
              <div className="mt-2 flex items-center gap-4 text-[10px] font-mono text-muted-foreground tracking-wider flex-wrap">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {new Date(scan.created_at).toLocaleString("de-DE")}
                </span>
                {scan.generation_era && (
                  <span>ERA: <span className="text-foreground">{scan.generation_era}</span></span>
                )}
                <span>ID: <span className="text-foreground">{scan.id.slice(0, 8)}</span></span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-[10px] font-mono text-muted-foreground tracking-wider">SECURITY SCORE</div>
              <div className={`text-4xl font-display font-bold ${meta.color}`}>{scan.security_score}</div>
              <div className="text-[10px] font-mono text-muted-foreground">/100</div>
            </div>
          </div>
        </div>

        {/* Summary stats */}
        {summary && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              { label: "VEKTOREN", value: scan.vectors_tested, color: "text-foreground" },
              { label: "EXTRAHIERT", value: summary.breached, color: "text-destructive" },
              { label: "WEAK POINTS", value: summary.partial, color: "text-cyber-orange" },
              { label: "BLOCKIERT", value: summary.blocked, color: "text-primary" },
              { label: "GESAMT-DAUER", value: `${summary.totalTime}ms`, color: "text-cyber-blue" },
            ].map((s) => (
              <div key={s.label} className="rounded-lg border border-border bg-card p-3">
                <div className="text-[10px] font-mono text-muted-foreground tracking-wider mb-1">{s.label}</div>
                <div className={`text-xl font-display font-bold ${s.color}`}>{s.value}</div>
              </div>
            ))}
          </div>
        )}

        {/* Vector breakdown */}
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex items-center gap-2">
            <Hash className="h-4 w-4 text-primary" />
            <h2 className="font-display text-xs font-bold tracking-wider text-primary">
              VEKTOR-AUFSCHLÜSSELUNG
            </h2>
            <span className="ml-auto text-[10px] font-mono text-muted-foreground">
              Klick zum Aufklappen
            </span>
          </div>

          <div className="divide-y divide-border">
            {scan.attempts.map((a, i) => {
              const am = attemptStatusMeta[a.status];
              const AIcon = am.icon;
              const expanded = expandedVector === a.vectorId;
              return (
                <div key={a.vectorId}>
                  <button
                    onClick={() => setExpandedVector(expanded ? null : a.vectorId)}
                    className="w-full px-4 py-3 flex items-center gap-3 hover:bg-muted/20 transition-colors text-left"
                  >
                    <span className="text-[10px] font-mono text-muted-foreground w-8 shrink-0">
                      #{String(i + 1).padStart(2, "0")}
                    </span>
                    <div className={`shrink-0 p-1.5 rounded border ${am.bg}`}>
                      <AIcon className={`h-3.5 w-3.5 ${am.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-mono font-bold text-foreground truncate">
                        {a.vectorName}
                      </div>
                      <div className="text-[10px] font-mono text-muted-foreground truncate mt-0.5">
                        {a.result}
                      </div>
                    </div>
                    <div className="shrink-0 flex items-center gap-3">
                      <span className={`text-[10px] font-mono font-bold tracking-wider ${am.color}`}>
                        {am.label}
                      </span>
                      <span className="text-[10px] font-mono text-muted-foreground hidden sm:inline">
                        {a.timeMs}ms
                      </span>
                      <ChevronRight
                        className={`h-3 w-3 text-muted-foreground transition-transform ${expanded ? "rotate-90" : ""}`}
                      />
                    </div>
                  </button>

                  {expanded && (
                    <div className="px-4 pb-4 bg-muted/10 space-y-3">
                      {/* Method + Details */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-3">
                        <div className="rounded border border-border bg-background/50 p-2.5">
                          <div className="text-[10px] font-mono text-muted-foreground tracking-wider mb-1">METHODE</div>
                          <div className="text-xs font-mono text-foreground">{a.method}</div>
                        </div>
                        <div className="rounded border border-border bg-background/50 p-2.5">
                          <div className="text-[10px] font-mono text-muted-foreground tracking-wider mb-1">DETAILS</div>
                          <div className="text-xs font-mono text-foreground">{a.details}</div>
                        </div>
                      </div>

                      {a.iterations && (
                        <div className="rounded border border-cyber-blue/30 bg-cyber-blue/5 p-2.5">
                          <div className="text-[10px] font-mono text-cyber-blue tracking-wider mb-1">ITERATIONEN</div>
                          <div className="text-xs font-mono text-foreground">{a.iterations}</div>
                        </div>
                      )}

                      {a.extractedHex && (
                        <div className={`rounded border p-2.5 ${am.bg}`}>
                          <div className="flex items-center justify-between mb-1">
                            <span className={`text-[10px] font-mono tracking-wider ${am.color}`}>
                              EXTRAHIERTE DATEN (HEX)
                            </span>
                            <button
                              onClick={() => copy(`hex-${a.vectorId}`, a.extractedHex!)}
                              className="text-[10px] font-mono text-muted-foreground hover:text-foreground flex items-center gap-1"
                            >
                              {copiedKey === `hex-${a.vectorId}` ? <Check className="h-3 w-3 text-primary" /> : <Copy className="h-3 w-3" />}
                              KOPIEREN
                            </button>
                          </div>
                          <div className="text-xs font-mono text-foreground break-all">{a.extractedHex}</div>
                        </div>
                      )}

                      {/* Computation log */}
                      {a.computationLogs.length > 0 && (
                        <div className="rounded border border-border bg-background/80 overflow-hidden">
                          <div className="px-2.5 py-1.5 border-b border-border bg-muted/20 text-[10px] font-mono text-muted-foreground tracking-wider">
                            COMPUTATION LOG ({a.computationLogs.length})
                          </div>
                          <div className="max-h-64 overflow-y-auto p-2 space-y-0.5 font-mono text-[10px]">
                            {a.computationLogs.map((log, li) => (
                              <div key={li} className="flex gap-2">
                                <span className="text-muted-foreground/60 shrink-0 w-12">
                                  [{String(log.timestamp).padStart(3, "0")}]
                                </span>
                                <span className={`${logTypeColor[log.type]} break-all`}>
                                  {log.message}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
};

export default ScanDetail;
