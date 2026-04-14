import { useState, useCallback } from "react";
import { SCANNED_WALLETS, type WalletScan } from "@/lib/guardian-data";
import {
  Search, ShieldAlert, ShieldCheck, ShieldQuestion, Play, CheckCircle2,
  XCircle, AlertTriangle, Loader2, ChevronDown, ChevronUp, Terminal, Copy, Check, Download,
} from "lucide-react";
import PanelToolbar from "./PanelToolbar";
import { downloadJSON, downloadCSV, downloadText } from "@/lib/export-utils";
import {
  runExtractionAttempts, computeSecurityScore, determineOverallStatus,
  type ExtractionAttempt, type ComputationLog,
} from "@/lib/key-extraction-engine";

interface WalletScanState {
  address: string;
  scanning: boolean;
  completed: boolean;
  attempts: ExtractionAttempt[];
  securityScore: number;
  overallStatus: "safe" | "compromised" | "at-risk" | "unknown";
  currentStep: number;
  liveLog: string[];
}

const statusConfig = {
  compromised: { icon: ShieldAlert, color: "text-destructive", bg: "bg-destructive/10", label: "COMPROMISED" },
  "at-risk": { icon: ShieldQuestion, color: "text-cyber-orange", bg: "bg-cyber-orange/10", label: "AT RISK" },
  safe: { icon: ShieldCheck, color: "text-primary", bg: "bg-primary/10", label: "VERIFIED SAFE" },
  unknown: { icon: Search, color: "text-muted-foreground", bg: "bg-muted/10", label: "NOT SCANNED" },
};

const attemptStatusIcon = {
  running: <Loader2 className="h-3 w-3 animate-spin text-cyber-blue" />,
  failed: <XCircle className="h-3 w-3 text-primary" />,
  extracted: <AlertTriangle className="h-3 w-3 text-destructive" />,
  partial: <AlertTriangle className="h-3 w-3 text-cyber-orange" />,
};

const attemptStatusLabel = {
  running: "RUNNING",
  failed: "BLOCKED",
  extracted: "EXTRACTED",
  partial: "WEAK POINT",
};

const logTypeColor: Record<ComputationLog["type"], string> = {
  info: "text-cyber-blue",
  hex: "text-cyber-purple",
  iteration: "text-muted-foreground",
  result: "text-primary",
  warning: "text-cyber-orange",
  blocked: "text-destructive",
};

const WalletScannerPanel = () => {
  const [scanStates, setScanStates] = useState<Record<string, WalletScanState>>({});
  const [expandedWallet, setExpandedWallet] = useState<string | null>(null);
  const [expandedAttempt, setExpandedAttempt] = useState<string | null>(null);
  const [showLog, setShowLog] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const runScan = useCallback((wallet: WalletScan) => {
    const addr = wallet.address;
    setScanStates((prev) => ({
      ...prev,
      [addr]: {
        address: addr, scanning: true, completed: false, attempts: [],
        securityScore: 0, overallStatus: "unknown", currentStep: 0,
        liveLog: [`[00:00.000] ▶ Starte Extraktion für ${addr.slice(0, 16)}...`],
      },
    }));
    setExpandedWallet(addr);
    setShowLog(addr);

    const allAttempts = runExtractionAttempts(addr, wallet.generationEra);
    let step = 0;

    const interval = setInterval(() => {
      if (step >= allAttempts.length) {
        clearInterval(interval);
        const score = computeSecurityScore(allAttempts);
        const status = determineOverallStatus(allAttempts);
        setScanStates((prev) => ({
          ...prev,
          [addr]: {
            ...prev[addr], scanning: false, completed: true, attempts: allAttempts,
            securityScore: score, overallStatus: status, currentStep: allAttempts.length,
            liveLog: [
              ...prev[addr].liveLog,
              `[DONE] ═══ SCAN COMPLETE — ${score}/100 — ${status.toUpperCase()} ═══`,
            ],
          },
        }));
        return;
      }

      const attempt = allAttempts[step];
      const ts = `00:${String(step * 3).padStart(2, "0")}`;
      const newLines = [
        `[${ts}.000] ─── ${step + 1}/10: ${attempt.vectorName} ───`,
        ...attempt.computationLogs.map((log) => {
          const pfx = log.type === "warning" || log.type === "result" ? "  ★" : log.type === "blocked" ? "  ✗" : "  │";
          return `[${ts}.${String(log.timestamp).padStart(3, "0")}]${pfx} ${log.message}`;
        }),
        `[${ts}.999]   → ${attemptStatusLabel[attempt.status]} (${attempt.timeMs}ms)`,
      ];

      setScanStates((prev) => ({
        ...prev,
        [addr]: {
          ...prev[addr],
          attempts: allAttempts.slice(0, step + 1),
          currentStep: step + 1,
          liveLog: [...prev[addr].liveLog, ...newLines],
        },
      }));
      step++;
    }, 450);
  }, []);

  const getWalletDisplay = (wallet: WalletScan) => {
    const state = scanStates[wallet.address];
    if (state?.completed) return statusConfig[state.overallStatus] || statusConfig.unknown;
    if (state?.scanning) return { icon: Loader2, color: "text-cyber-blue", bg: "bg-cyber-blue/10", label: "SCANNING..." };
    return statusConfig.unknown;
  };

  const allReports = Object.values(scanStates).filter((s) => s.completed);

  return (
    <div className="rounded-lg border border-border bg-card p-5 glow-blue">
      <div className="flex items-center gap-2 mb-4">
        <Search className="h-5 w-5 text-cyber-blue" />
        <h2 className="font-display text-sm font-bold tracking-wider text-cyber-blue">
          KEY EXTRACTION SCANNER
        </h2>
        <div className="ml-auto">
          <PanelToolbar
            onDownloadJSON={() => downloadJSON(allReports, "extraction-reports")}
            onDownloadCSV={() =>
              downloadCSV(
                allReports.map((r) => ({
                  address: r.address, status: r.overallStatus, securityScore: r.securityScore,
                  extractedCount: r.attempts.filter((a) => a.status === "extracted").length,
                  weakPoints: r.attempts.filter((a) => a.status === "partial").length,
                })),
                "extraction-reports"
              )
            }
          />
        </div>
      </div>

      <p className="text-[10px] text-muted-foreground mb-3 leading-relaxed">
        Eine Wallet ist erst SAFE wenn alle Extraktionsversuche gescheitert sind. Jede Wallet
        durchläuft 10 Angriffsvektoren bevor ein Urteil gefällt wird.
      </p>

      <div className="space-y-2">
        {SCANNED_WALLETS.map((wallet) => {
          const display = getWalletDisplay(wallet);
          const Icon = display.icon;
          const state = scanStates[wallet.address];
          const isExpanded = expandedWallet === wallet.address;
          const isScanning = state?.scanning;
          const isCompleted = state?.completed;
          const isLogOpen = showLog === wallet.address;

          return (
            <div key={wallet.address} className={`rounded-md border transition-all ${isExpanded ? "border-primary/30 bg-primary/5" : "border-border bg-card"}`}>
              <div className="p-3 flex items-center gap-3">
                <Icon className={`h-4 w-4 shrink-0 ${display.color} ${isScanning ? "animate-spin" : ""}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono truncate">{wallet.address.slice(0, 16)}...{wallet.address.slice(-6)}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${display.bg} ${display.color}`}>{display.label}</span>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-[10px] text-muted-foreground">{wallet.generationEra}</span>
                    <span className="text-[10px] font-mono text-cyber-yellow">{wallet.balance} BTC</span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {(isCompleted || isScanning) && (
                    <button onClick={() => setShowLog(isLogOpen ? null : wallet.address)}
                      className={`p-1.5 rounded transition-colors ${isLogOpen ? "bg-cyber-blue/20 text-cyber-blue" : "hover:bg-muted/50 text-muted-foreground"}`}
                      title="Live Log">
                      <Terminal className="h-3.5 w-3.5" />
                    </button>
                  )}
                  {!isScanning && (
                    <button onClick={() => runScan(wallet)} className="p-1.5 rounded hover:bg-primary/10 transition-colors" title="Extraktion starten">
                      <Play className="h-3.5 w-3.5 text-primary" />
                    </button>
                  )}
                  {(isCompleted || isScanning) && (
                    <button onClick={() => setExpandedWallet(isExpanded ? null : wallet.address)} className="p-1.5 rounded hover:bg-muted/50 transition-colors">
                      {isExpanded ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
                    </button>
                  )}
                </div>
              </div>

              {/* Live Log */}
              {isLogOpen && state && state.liveLog.length > 0 && (
                <div className="mx-3 mb-2 rounded bg-background/80 border border-border/50 p-2 max-h-[180px] overflow-y-auto font-mono text-[9px] leading-relaxed scanline">
                  {state.liveLog.map((line, i) => {
                    const type: ComputationLog["type"] = line.includes("★") ? "result" : line.includes("✗") ? "blocked" : line.includes("⚠") ? "warning" : line.includes("0x") || line.includes("→") ? "hex" : line.includes("───") ? "info" : "iteration";
                    return <div key={i} className={`${logTypeColor[type]} ${line.includes("═══") ? "font-bold mt-1" : ""}`}>{line}</div>;
                  })}
                </div>
              )}

              {/* Score bar */}
              {isCompleted && (
                <div className="px-3 pb-2">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                      <div className={`h-full rounded-full transition-all duration-500 ${state!.securityScore >= 80 ? "bg-primary" : state!.securityScore >= 50 ? "bg-cyber-orange" : "bg-destructive"}`} style={{ width: `${state!.securityScore}%` }} />
                    </div>
                    <span className="text-[10px] font-bold font-mono">{state!.securityScore}/100</span>
                  </div>
                </div>
              )}

              {/* Expanded attempts */}
              {isExpanded && state && state.attempts.length > 0 && (
                <div className="px-3 pb-3 border-t border-border">
                  <div className="mt-2 space-y-1">
                    {state.attempts.map((attempt, idx) => {
                      const isAttemptExpanded = expandedAttempt === `${wallet.address}-${attempt.vectorId}`;
                      return (
                        <div key={attempt.vectorId}>
                          <button onClick={() => setExpandedAttempt(isAttemptExpanded ? null : `${wallet.address}-${attempt.vectorId}`)}
                            className="w-full text-left flex items-center gap-2 p-1.5 rounded hover:bg-muted/30 transition-colors">
                            <span className="text-[10px] text-muted-foreground w-4 text-right">{idx + 1}.</span>
                            {attemptStatusIcon[attempt.status]}
                            <span className="text-[10px] font-mono flex-1 truncate">{attempt.vectorName}</span>
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                              attempt.status === "extracted" ? "bg-destructive/10 text-destructive"
                              : attempt.status === "partial" ? "bg-cyber-orange/10 text-cyber-orange"
                              : attempt.status === "failed" ? "bg-primary/10 text-primary"
                              : "bg-cyber-blue/10 text-cyber-blue"
                            }`}>{attemptStatusLabel[attempt.status]}</span>
                            <span className="text-[9px] text-muted-foreground font-mono">{attempt.timeMs}ms</span>
                          </button>

                          {isAttemptExpanded && (
                            <div className="ml-6 mr-1 mb-1 p-2 rounded bg-muted/20 border border-border/50 space-y-1.5 animate-fade-in">
                              <div className="text-[10px] text-muted-foreground">
                                <span className="text-foreground font-semibold">Methode: </span>{attempt.method}
                              </div>
                              <div className="text-[10px]">
                                <span className="text-foreground font-semibold">Ergebnis: </span>
                                <span className={attempt.status === "extracted" ? "text-destructive" : attempt.status === "partial" ? "text-cyber-orange" : "text-primary"}>{attempt.result}</span>
                              </div>
                              {attempt.iterations && (
                                <div className="text-[10px] text-muted-foreground">
                                  <span className="text-foreground font-semibold">Iterationen: </span>
                                  <span className="font-mono">{attempt.iterations}</span>
                                </div>
                              )}
                              {attempt.extractedHex && (
                                <div className="text-[10px]">
                                  <span className="text-destructive font-semibold">Extrahierte Daten: </span>
                                  <div className="flex items-center gap-1 mt-0.5">
                                    <code className="text-[9px] font-mono text-destructive bg-destructive/5 px-1.5 py-0.5 rounded break-all">{attempt.extractedHex}</code>
                                    <button onClick={() => handleCopy(attempt.extractedHex!, `hex-${attempt.vectorId}`)} className="p-0.5 rounded hover:bg-muted/50 shrink-0">
                                      {copiedId === `hex-${attempt.vectorId}` ? <Check className="h-3 w-3 text-primary" /> : <Copy className="h-3 w-3 text-muted-foreground" />}
                                    </button>
                                  </div>
                                </div>
                              )}
                              <div className="text-[9px] text-muted-foreground leading-relaxed">{attempt.details}</div>
                              <details className="mt-1">
                                <summary className="text-[9px] text-cyber-blue cursor-pointer hover:text-cyber-blue/80">
                                  ▸ Computation Log ({attempt.computationLogs.length} Einträge)
                                </summary>
                                <div className="mt-1 p-1.5 rounded bg-background/60 border border-border/30 font-mono text-[8px] space-y-0.5 max-h-[120px] overflow-y-auto">
                                  {attempt.computationLogs.map((log, li) => (
                                    <div key={li} className={logTypeColor[log.type]}>[{String(log.timestamp).padStart(4, "0")}ms] {log.message}</div>
                                  ))}
                                </div>
                              </details>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {isCompleted && (
                    <div className="mt-3 pt-2 border-t border-border/50">
                      <div className="flex items-center gap-2">
                        {state.overallStatus === "safe" ? <CheckCircle2 className="h-4 w-4 text-primary" />
                          : state.overallStatus === "compromised" ? <ShieldAlert className="h-4 w-4 text-destructive" />
                          : <AlertTriangle className="h-4 w-4 text-cyber-orange" />}
                        <span className={`text-xs font-bold ${state.overallStatus === "safe" ? "text-primary" : state.overallStatus === "compromised" ? "text-destructive" : "text-cyber-orange"}`}>
                          {state.overallStatus === "safe" ? "VERIFIED SAFE — Alle 10 Extraktionsversuche gescheitert"
                            : state.overallStatus === "compromised" ? "COMPROMISED — Schlüsselextraktion möglich!"
                            : "AT RISK — Schwachstellen detektiert"}
                        </span>
                      </div>
                      <div className="text-[9px] text-muted-foreground mt-1 font-mono">
                        {state.attempts.filter((a) => a.status === "failed").length} blockiert · {state.attempts.filter((a) => a.status === "extracted").length} extrahiert · {state.attempts.filter((a) => a.status === "partial").length} Schwachstellen
                      </div>
                    </div>
                  )}

                  {isScanning && (
                    <div className="mt-2 flex items-center gap-2">
                      <Loader2 className="h-3 w-3 animate-spin text-cyber-blue" />
                      <span className="text-[10px] text-cyber-blue font-mono">Vektor {state.currentStep}/10...</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default WalletScannerPanel;
