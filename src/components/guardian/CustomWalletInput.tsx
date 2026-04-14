import { useState, useCallback, useRef } from "react";
import {
  Search, ShieldAlert, ShieldCheck, ShieldQuestion, Play, CheckCircle2,
  XCircle, AlertTriangle, Loader2, ChevronDown, ChevronUp, Save, Terminal,
  Copy, Check, Download,
} from "lucide-react";
import PanelToolbar from "./PanelToolbar";
import { downloadJSON, downloadCSV, downloadText } from "@/lib/export-utils";
import {
  runExtractionAttempts, computeSecurityScore, determineOverallStatus,
  type ExtractionAttempt, type ComputationLog,
} from "@/lib/key-extraction-engine";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ScanResult {
  address: string;
  era: string;
  scanning: boolean;
  completed: boolean;
  attempts: ExtractionAttempt[];
  securityScore: number;
  overallStatus: "safe" | "compromised" | "at-risk" | "unknown";
  currentStep: number;
  savedToCloud: boolean;
  liveLog: string[];
}

const eraOptions = [
  "2009 (Genesis)",
  "2008-2009 (Debian Bug Era)",
  "2010-2012 (Early Era)",
  "2013-2016 (Mid Era)",
  "2017-2019 (SegWit Era)",
  "2020+ (Modern)",
];

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

const CustomWalletInput = () => {
  const [address, setAddress] = useState("");
  const [era, setEra] = useState(eraOptions[5]);
  const [results, setResults] = useState<ScanResult[]>([]);
  const [expandedResult, setExpandedResult] = useState<string | null>(null);
  const [expandedAttempt, setExpandedAttempt] = useState<string | null>(null);
  const [showLiveLog, setShowLiveLog] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const { toast } = useToast();
  const logEndRef = useRef<HTMLDivElement>(null);

  const isValidAddress = (addr: string) => {
    return (
      (addr.startsWith("1") && addr.length >= 25 && addr.length <= 34) ||
      (addr.startsWith("3") && addr.length >= 25 && addr.length <= 34) ||
      (addr.startsWith("bc1") && addr.length >= 39 && addr.length <= 62)
    );
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const runScan = useCallback(() => {
    if (!address.trim()) return;
    const addr = address.trim();

    const newResult: ScanResult = {
      address: addr, era, scanning: true, completed: false, attempts: [],
      securityScore: 0, overallStatus: "unknown", currentStep: 0, savedToCloud: false,
      liveLog: [`[00:00.000] ▶ Starte 10-Vektor-Extraktion für ${addr.slice(0, 20)}...`],
    };

    setResults((prev) => [newResult, ...prev.filter((r) => r.address !== addr)]);
    setExpandedResult(addr);
    setShowLiveLog(addr);

    const allAttempts = runExtractionAttempts(addr, era);
    let step = 0;

    const interval = setInterval(() => {
      if (step >= allAttempts.length) {
        clearInterval(interval);
        const score = computeSecurityScore(allAttempts);
        const status = determineOverallStatus(allAttempts);
        setResults((prev) =>
          prev.map((r) =>
            r.address === addr
              ? {
                  ...r, scanning: false, completed: true, attempts: allAttempts,
                  securityScore: score, overallStatus: status, currentStep: allAttempts.length,
                  liveLog: [
                    ...r.liveLog,
                    `[00:${String(step * 3 + 2).padStart(2, "0")}.000] ═══════════════════════════════════════`,
                    `[00:${String(step * 3 + 2).padStart(2, "0")}.001] ▶ SCAN COMPLETE — Score: ${score}/100 — Status: ${status.toUpperCase()}`,
                    status === "safe"
                      ? `[00:${String(step * 3 + 2).padStart(2, "0")}.002] ✓ Alle 10 Extraktionsversuche GESCHEITERT — Wallet ist sicher`
                      : status === "compromised"
                      ? `[00:${String(step * 3 + 2).padStart(2, "0")}.002] ⚠ SCHLÜSSELEXTRAKTION MÖGLICH — Wallet ist KOMPROMITTIERT`
                      : `[00:${String(step * 3 + 2).padStart(2, "0")}.002] ⚠ Schwachstellen detektiert — Wallet AT RISK`,
                  ],
                }
              : r
          )
        );
        return;
      }

      const current = allAttempts.slice(0, step + 1);
      const attempt = allAttempts[step];
      const ts = `00:${String(step * 3).padStart(2, "0")}`;

      // Build log lines from computation logs
      const newLogLines = [
        `[${ts}.000] ─── Vektor ${step + 1}/10: ${attempt.vectorName} ───`,
        ...attempt.computationLogs.map((log) => {
          const prefix = log.type === "warning" || log.type === "result" ? "  ★" : log.type === "blocked" ? "  ✗" : "  │";
          return `[${ts}.${String(log.timestamp).padStart(3, "0")}]${prefix} ${log.message}`;
        }),
        `[${ts}.999]   Status: ${attemptStatusLabel[attempt.status]} (${attempt.timeMs}ms)${attempt.iterations ? ` — ${attempt.iterations}` : ""}`,
      ];

      setResults((prev) =>
        prev.map((r) =>
          r.address === addr
            ? { ...r, attempts: current, currentStep: step + 1, liveLog: [...r.liveLog, ...newLogLines] }
            : r
        )
      );
      step++;
    }, 450);

    setAddress("");
  }, [address, era]);

  const saveToCloud = async (result: ScanResult) => {
    try {
      const payload = {
        address: result.address,
        security_score: result.securityScore,
        overall_status: result.overallStatus,
        attempts: JSON.parse(JSON.stringify(result.attempts)),
        generation_era: result.era,
      };
      // @ts-ignore
      const { error } = await supabase.from("wallet_scans").insert(payload);
      if (error) {
        toast({ title: "Cloud-Fehler", description: error.message, variant: "destructive" });
        return;
      }
      setResults((prev) => prev.map((r) => (r.address === result.address ? { ...r, savedToCloud: true } : r)));
      toast({ title: "Gespeichert", description: `Scan für ${result.address.slice(0, 12)}... in Cloud gespeichert` });
    } catch {
      toast({ title: "Fehler", description: "Cloud nicht verfügbar", variant: "destructive" });
    }
  };

  const exportFullReport = (result: ScanResult) => {
    const lines = [
      `CryptoGuardian X — Wallet Extraction Report`,
      `${"=".repeat(60)}`,
      `Address: ${result.address}`,
      `Era: ${result.era}`,
      `Score: ${result.securityScore}/100`,
      `Status: ${result.overallStatus.toUpperCase()}`,
      `Timestamp: ${new Date().toISOString()}`,
      ``,
      `EXTRACTION LOG`,
      `${"─".repeat(60)}`,
      ...result.liveLog,
      ``,
      `VECTOR DETAILS`,
      `${"─".repeat(60)}`,
      ...result.attempts.map((a, i) => [
        `${i + 1}. ${a.vectorName}`,
        `   Status: ${attemptStatusLabel[a.status]}`,
        `   Method: ${a.method}`,
        `   Result: ${a.result}`,
        `   Time: ${a.timeMs}ms`,
        a.extractedHex ? `   Extracted Hex: ${a.extractedHex}` : "",
        a.iterations ? `   Iterations: ${a.iterations}` : "",
        `   Details: ${a.details}`,
        "",
      ].filter(Boolean).join("\n")),
    ];
    downloadText(lines.join("\n"), `extraction-report-${result.address.slice(0, 12)}.txt`);
  };

  const completedResults = results.filter((r) => r.completed);

  return (
    <div className="rounded-lg border border-border bg-card p-5 glow-green">
      <div className="flex items-center gap-2 mb-4">
        <Search className="h-5 w-5 text-primary" />
        <h2 className="font-display text-sm font-bold tracking-wider text-primary">
          CUSTOM WALLET SCANNER
        </h2>
        <div className="ml-auto">
          <PanelToolbar
            onDownloadJSON={() => downloadJSON(completedResults, "custom-scan-results")}
            onDownloadCSV={() =>
              downloadCSV(
                completedResults.map((r) => ({
                  address: r.address, era: r.era, status: r.overallStatus, score: r.securityScore,
                  extracted: r.attempts.filter((a) => a.status === "extracted").length,
                  weakPoints: r.attempts.filter((a) => a.status === "partial").length,
                })),
                "custom-scan-results"
              )
            }
          />
        </div>
      </div>

      {/* Input area */}
      <div className="space-y-2 mb-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Bitcoin-Adresse eingeben (1..., 3..., bc1...)"
            className="flex-1 bg-muted/30 border border-border rounded px-3 py-2 text-xs font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30"
            onKeyDown={(e) => e.key === "Enter" && runScan()}
          />
          <button
            onClick={runScan}
            disabled={!address.trim()}
            className="px-4 py-2 rounded bg-primary/20 border border-primary/30 text-primary text-xs font-bold hover:bg-primary/30 transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1.5"
          >
            <Play className="h-3 w-3" />
            SCAN
          </button>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground">Era:</span>
          <select
            value={era}
            onChange={(e) => setEra(e.target.value)}
            className="bg-muted/30 border border-border rounded px-2 py-1 text-[10px] font-mono text-foreground focus:outline-none focus:border-primary/50"
          >
            {eraOptions.map((o) => (
              <option key={o} value={o}>{o}</option>
            ))}
          </select>
          {address.trim() && !isValidAddress(address.trim()) && (
            <span className="text-[9px] text-cyber-orange">⚠ Format prüfen</span>
          )}
        </div>
      </div>

      {/* Results */}
      <div className="space-y-2 max-h-[600px] overflow-y-auto">
        {results.map((result) => {
          const cfg = statusConfig[result.overallStatus] || statusConfig.unknown;
          const Icon = result.scanning ? Loader2 : cfg.icon;
          const isExpanded = expandedResult === result.address;
          const isLogOpen = showLiveLog === result.address;

          return (
            <div
              key={result.address}
              className={`rounded-md border transition-all ${isExpanded ? "border-primary/30 bg-primary/5" : "border-border bg-card"}`}
            >
              <div className="p-3 flex items-center gap-3">
                <Icon className={`h-4 w-4 shrink-0 ${result.scanning ? "animate-spin text-cyber-blue" : cfg.color}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono truncate">
                      {result.address.slice(0, 16)}...{result.address.slice(-6)}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${result.scanning ? "bg-cyber-blue/10 text-cyber-blue" : `${cfg.bg} ${cfg.color}`}`}>
                      {result.scanning ? "SCANNING..." : cfg.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] text-muted-foreground">{result.era}</span>
                    {result.scanning && (
                      <span className="text-[10px] text-cyber-blue font-mono animate-pulse">
                        Vektor {result.currentStep}/10
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {/* Live Log Toggle */}
                  <button
                    onClick={() => setShowLiveLog(isLogOpen ? null : result.address)}
                    className={`p-1.5 rounded transition-colors ${isLogOpen ? "bg-cyber-blue/20 text-cyber-blue" : "hover:bg-muted/50 text-muted-foreground"}`}
                    title="Live Computation Log"
                  >
                    <Terminal className="h-3.5 w-3.5" />
                  </button>
                  {result.completed && !result.savedToCloud && (
                    <button onClick={() => saveToCloud(result)} className="p-1.5 rounded hover:bg-primary/10 transition-colors" title="In Cloud speichern">
                      <Save className="h-3.5 w-3.5 text-primary" />
                    </button>
                  )}
                  {result.completed && (
                    <button onClick={() => exportFullReport(result)} className="p-1.5 rounded hover:bg-muted/50 transition-colors" title="Full Report Download">
                      <Download className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                  )}
                  {result.savedToCloud && <CheckCircle2 className="h-3.5 w-3.5 text-primary" />}
                  <button onClick={() => setExpandedResult(isExpanded ? null : result.address)} className="p-1.5 rounded hover:bg-muted/50 transition-colors">
                    {isExpanded ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
                  </button>
                </div>
              </div>

              {/* Live Terminal Log */}
              {isLogOpen && result.liveLog.length > 0 && (
                <div className="mx-3 mb-2 rounded bg-background/80 border border-border/50 p-2 max-h-[200px] overflow-y-auto font-mono text-[9px] leading-relaxed scanline">
                  {result.liveLog.map((line, i) => {
                    const type: ComputationLog["type"] = line.includes("★") ? "result" : line.includes("✗") ? "blocked" : line.includes("⚠") ? "warning" : line.includes("0x") || line.includes("→") ? "hex" : line.includes("───") ? "info" : "iteration";
                    return (
                      <div key={i} className={`${logTypeColor[type]} ${line.includes("═══") ? "font-bold mt-1" : ""}`}>
                        {line}
                      </div>
                    );
                  })}
                  <div ref={logEndRef} />
                </div>
              )}

              {/* Score bar */}
              {result.completed && (
                <div className="px-3 pb-2">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          result.securityScore >= 80 ? "bg-primary" : result.securityScore >= 50 ? "bg-cyber-orange" : "bg-destructive"
                        }`}
                        style={{ width: `${result.securityScore}%` }}
                      />
                    </div>
                    <span className="text-[10px] font-bold font-mono">{result.securityScore}/100</span>
                  </div>
                </div>
              )}

              {/* Expanded attempts */}
              {isExpanded && result.attempts.length > 0 && (
                <div className="px-3 pb-3 border-t border-border">
                  <div className="mt-2 space-y-1">
                    {result.attempts.map((attempt, idx) => {
                      const isAttemptExp = expandedAttempt === `${result.address}-${attempt.vectorId}`;
                      return (
                        <div key={attempt.vectorId}>
                          <button
                            onClick={() => setExpandedAttempt(isAttemptExp ? null : `${result.address}-${attempt.vectorId}`)}
                            className="w-full text-left flex items-center gap-2 p-1.5 rounded hover:bg-muted/30 transition-colors"
                          >
                            <span className="text-[10px] text-muted-foreground w-4 text-right">{idx + 1}.</span>
                            {attemptStatusIcon[attempt.status]}
                            <span className="text-[10px] font-mono flex-1 truncate">{attempt.vectorName}</span>
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                              attempt.status === "extracted" ? "bg-destructive/10 text-destructive"
                              : attempt.status === "partial" ? "bg-cyber-orange/10 text-cyber-orange"
                              : attempt.status === "failed" ? "bg-primary/10 text-primary"
                              : "bg-cyber-blue/10 text-cyber-blue"
                            }`}>
                              {attemptStatusLabel[attempt.status]}
                            </span>
                            <span className="text-[9px] text-muted-foreground font-mono">{attempt.timeMs}ms</span>
                          </button>
                          {isAttemptExp && (
                            <div className="ml-6 mr-1 mb-1 p-2 rounded bg-muted/20 border border-border/50 space-y-1.5 animate-fade-in">
                              <div className="text-[10px] text-muted-foreground">
                                <span className="text-foreground font-semibold">Methode: </span>{attempt.method}
                              </div>
                              <div className="text-[10px]">
                                <span className="text-foreground font-semibold">Ergebnis: </span>
                                <span className={attempt.status === "extracted" ? "text-destructive" : attempt.status === "partial" ? "text-cyber-orange" : "text-primary"}>
                                  {attempt.result}
                                </span>
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
                                    <code className="text-[9px] font-mono text-destructive bg-destructive/5 px-1.5 py-0.5 rounded break-all">
                                      {attempt.extractedHex}
                                    </code>
                                    <button
                                      onClick={() => handleCopy(attempt.extractedHex!, `hex-${attempt.vectorId}`)}
                                      className="p-0.5 rounded hover:bg-muted/50 shrink-0"
                                    >
                                      {copiedId === `hex-${attempt.vectorId}` ? <Check className="h-3 w-3 text-primary" /> : <Copy className="h-3 w-3 text-muted-foreground" />}
                                    </button>
                                  </div>
                                </div>
                              )}
                              <div className="text-[9px] text-muted-foreground leading-relaxed">{attempt.details}</div>

                              {/* Inline computation log */}
                              <details className="mt-1">
                                <summary className="text-[9px] text-cyber-blue cursor-pointer hover:text-cyber-blue/80">
                                  ▸ Computation Log ({attempt.computationLogs.length} Einträge)
                                </summary>
                                <div className="mt-1 p-1.5 rounded bg-background/60 border border-border/30 font-mono text-[8px] space-y-0.5 max-h-[120px] overflow-y-auto">
                                  {attempt.computationLogs.map((log, li) => (
                                    <div key={li} className={logTypeColor[log.type]}>
                                      [{String(log.timestamp).padStart(4, "0")}ms] {log.message}
                                    </div>
                                  ))}
                                </div>
                              </details>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {result.completed && (
                    <div className="mt-3 pt-2 border-t border-border/50">
                      <div className="flex items-center gap-2">
                        {result.overallStatus === "safe" ? <CheckCircle2 className="h-4 w-4 text-primary" />
                          : result.overallStatus === "compromised" ? <ShieldAlert className="h-4 w-4 text-destructive" />
                          : <AlertTriangle className="h-4 w-4 text-cyber-orange" />}
                        <span className={`text-xs font-bold ${
                          result.overallStatus === "safe" ? "text-primary"
                          : result.overallStatus === "compromised" ? "text-destructive"
                          : "text-cyber-orange"
                        }`}>
                          {result.overallStatus === "safe" ? "VERIFIED SAFE — Alle 10 Extraktionsversuche gescheitert"
                            : result.overallStatus === "compromised" ? "COMPROMISED — Schlüsselextraktion möglich!"
                            : "AT RISK — Schwachstellen detektiert"}
                        </span>
                      </div>
                      <div className="text-[9px] text-muted-foreground mt-1 font-mono">
                        {result.attempts.filter((a) => a.status === "failed").length} blockiert · {result.attempts.filter((a) => a.status === "extracted").length} extrahiert · {result.attempts.filter((a) => a.status === "partial").length} Schwachstellen
                      </div>
                    </div>
                  )}

                  {result.scanning && (
                    <div className="mt-2 flex items-center gap-2">
                      <Loader2 className="h-3 w-3 animate-spin text-cyber-blue" />
                      <span className="text-[10px] text-cyber-blue font-mono">Vektor {result.currentStep}/10...</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {results.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Search className="h-8 w-8 mx-auto mb-2 opacity-30" />
            <p className="text-xs">Gib eine Bitcoin-Adresse ein und starte den Scan</p>
            <p className="text-[10px] mt-1">10 Angriffsvektoren · Live-Extraktion · Hex-Output · Cloud-Persistenz</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomWalletInput;
