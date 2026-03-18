import { useEffect, useRef, useState } from "react";
import { Terminal, Trash2 } from "lucide-react";
import PanelToolbar from "./PanelToolbar";
import { downloadText } from "@/lib/export-utils";
import { useGuardianSettings } from "@/lib/guardian-settings";

const LOG_MESSAGES = [
  { type: "info", msg: "🔍 Scanning block #834,291..." },
  { type: "success", msg: "✅ Block scan complete. 0 anomalies." },
  { type: "info", msg: "🧠 NeuroGenesis pattern analysis running..." },
  { type: "warning", msg: "⚠️ Elevated entropy deviation in tx 0xa3f2..." },
  { type: "success", msg: "🛡️ Defense matrix adapted. New rule applied." },
  { type: "info", msg: "🌉 Cross-chain sentinel checking Ethereum bridge..." },
  { type: "success", msg: "✅ Bridge validation passed." },
  { type: "info", msg: "🔐 ZK-Proof verification #157 complete." },
  { type: "info", msg: "🕸️ Immune network consensus: 99.2% agreement." },
  { type: "warning", msg: "⚠️ Mobile RNG weakness pattern detected in new wallet." },
  { type: "success", msg: "📧 Alert sent to wallet owner." },
  { type: "info", msg: "⚛️ Quantum resistance check: ECDSA migration recommended." },
  { type: "success", msg: "✅ Protection cycle #1848 complete." },
];

const typeColors = {
  info: "text-cyber-blue",
  success: "text-primary",
  warning: "text-cyber-orange",
  error: "text-destructive",
};

const LiveTerminal = () => {
  const { settings } = useGuardianSettings();
  const [logs, setLogs] = useState<Array<{ time: string; type: string; msg: string }>>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!settings.terminalVisible) return;
    let idx = 0;
    const interval = setInterval(() => {
      const logEntry = LOG_MESSAGES[idx % LOG_MESSAGES.length];
      const time = new Date().toLocaleTimeString("de-DE");
      setLogs((prev) => [...prev.slice(-(settings.maxLogEntries - 1)), { time, ...logEntry }]);
      idx++;
    }, 2500);
    return () => clearInterval(interval);
  }, [settings.terminalVisible, settings.maxLogEntries]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [logs]);

  if (!settings.terminalVisible) return null;

  const handleExportLogs = () => {
    const text = logs.map((l) => `[${l.time}] [${l.type.toUpperCase()}] ${l.msg}`).join("\n");
    downloadText(text, `terminal-logs-${new Date().toISOString().slice(0, 19)}.log`);
  };

  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="flex items-center gap-2 mb-3">
        <Terminal className="h-5 w-5 text-primary" />
        <h2 className="font-display text-sm font-bold tracking-wider text-primary">
          LIVE TERMINAL
        </h2>
        <div className="ml-auto flex items-center gap-1">
          <button
            onClick={() => setLogs([])}
            className="h-6 w-6 flex items-center justify-center rounded hover:bg-muted transition-colors"
            title="Clear"
          >
            <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive transition-colors" />
          </button>
          <PanelToolbar
            onDownloadJSON={() => handleExportLogs()}
          />
          <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
        </div>
      </div>
      <div
        ref={scrollRef}
        className="h-48 overflow-y-auto rounded bg-background/50 p-3 scanline text-[11px] font-mono space-y-1"
      >
        {logs.map((log, i) => (
          <div key={i} className="flex gap-2">
            <span className="text-muted-foreground shrink-0">[{log.time}]</span>
            <span className={typeColors[log.type as keyof typeof typeColors]}>{log.msg}</span>
          </div>
        ))}
        {logs.length === 0 && (
          <span className="text-muted-foreground animate-pulse">Initializing system...</span>
        )}
      </div>
    </div>
  );
};

export default LiveTerminal;
