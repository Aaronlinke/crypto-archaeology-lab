import { useEffect, useState } from "react";
import { generateProtectionStats } from "@/lib/guardian-data";
import { BarChart3, Eye, Bug, ShieldCheck, Zap, Network } from "lucide-react";
import PanelToolbar from "./PanelToolbar";
import { downloadJSON, downloadCSV } from "@/lib/export-utils";
import { useGuardianSettings } from "@/lib/guardian-settings";

const statConfig = [
  { key: "protectionCycles", label: "Protection Cycles", icon: Zap, color: "text-primary" },
  { key: "walletsScanned", label: "Wallets Scanned", icon: Eye, color: "text-cyber-blue" },
  { key: "vulnerabilitiesFound", label: "Vulnerabilities", icon: Bug, color: "text-cyber-orange" },
  { key: "walletsProtected", label: "Wallets Protected", icon: ShieldCheck, color: "text-primary" },
  { key: "activeThreats", label: "Active Threats", icon: BarChart3, color: "text-destructive" },
  { key: "networkNodes", label: "Network Nodes", icon: Network, color: "text-accent" },
] as const;

const StatsGrid = () => {
  const { settings } = useGuardianSettings();
  const [stats, setStats] = useState(generateProtectionStats());

  useEffect(() => {
    const interval = setInterval(() => setStats(generateProtectionStats()), settings.refreshRateMs);
    return () => clearInterval(interval);
  }, [settings.refreshRateMs]);

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] text-muted-foreground font-mono tracking-wider">LIVE METRICS</span>
        <PanelToolbar
          onDownloadJSON={() => downloadJSON({ ...stats, exportedAt: new Date().toISOString() }, "stats-snapshot")}
          onDownloadCSV={() =>
            downloadCSV(
              [{ ...stats, exportedAt: new Date().toISOString() }],
              "stats-snapshot"
            )
          }
        />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {statConfig.map(({ key, label, icon: Icon, color }) => (
          <div
            key={key}
            className="rounded-lg border border-border bg-card p-4 text-center transition-all hover:border-primary/30"
          >
            <Icon className={`h-5 w-5 ${color} mx-auto mb-2`} />
            <div className={`text-xl font-display font-bold ${color}`}>
              {stats[key].toLocaleString()}
            </div>
            <div className="text-[10px] text-muted-foreground tracking-wider mt-1">{label}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default StatsGrid;
