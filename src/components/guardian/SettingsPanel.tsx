import { useGuardianSettings, DEFAULT_SETTINGS } from "@/lib/guardian-settings";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Settings, RotateCcw, Download } from "lucide-react";
import { downloadJSON } from "@/lib/export-utils";
import {
  THREAT_PREDICTIONS,
  SCANNED_WALLETS,
  HISTORICAL_BREACHES,
  SYSTEM_MODULES,
} from "@/lib/guardian-data";

const AVAILABLE_MODULES = [
  "NeuroGenesis Engine",
  "Cross-Chain Sentinel",
  "ZK-Threat Proof",
  "Immune Network",
  "Defense Matrix",
  "Quantum Vault",
];

const SettingsPanel = () => {
  const { settings, updateSettings, resetSettings } = useGuardianSettings();

  const toggleModule = (name: string) => {
    const modules = settings.enabledModules.includes(name)
      ? settings.enabledModules.filter((m) => m !== name)
      : [...settings.enabledModules, name];
    updateSettings({ enabledModules: modules });
  };

  const handleFullExport = () => {
    downloadJSON(
      {
        exportDate: new Date().toISOString(),
        settings,
        threatPredictions: THREAT_PREDICTIONS,
        scannedWallets: SCANNED_WALLETS,
        breachHistory: HISTORICAL_BREACHES,
        systemModules: SYSTEM_MODULES,
      },
      `cryptoguardian-full-export-${new Date().toISOString().slice(0, 10)}`
    );
  };

  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <Settings className="h-5 w-5 text-accent" />
          <h2 className="font-display text-sm font-bold tracking-wider text-accent">
            SYSTEM SETTINGS
          </h2>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleFullExport}
            className="flex items-center gap-1.5 text-[10px] px-3 py-1.5 rounded border border-border hover:border-primary/40 hover:bg-primary/5 transition-colors text-muted-foreground hover:text-primary"
          >
            <Download className="h-3 w-3" />
            Full Export
          </button>
          <button
            onClick={resetSettings}
            className="flex items-center gap-1.5 text-[10px] px-3 py-1.5 rounded border border-border hover:border-destructive/40 hover:bg-destructive/5 transition-colors text-muted-foreground hover:text-destructive"
          >
            <RotateCcw className="h-3 w-3" />
            Reset
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Scan Settings */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold text-foreground tracking-wide border-b border-border pb-2">
            SCAN CONFIG
          </h3>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-muted-foreground">Scan Interval</span>
              <span className="text-[11px] font-mono text-primary font-bold">{settings.scanIntervalSec}s</span>
            </div>
            <Slider
              value={[settings.scanIntervalSec]}
              onValueChange={([v]) => updateSettings({ scanIntervalSec: v })}
              min={5}
              max={120}
              step={5}
              className="w-full"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-muted-foreground">Alert Threshold</span>
              <span className="text-[11px] font-mono text-cyber-orange font-bold">{settings.alertThreshold}/100</span>
            </div>
            <Slider
              value={[settings.alertThreshold]}
              onValueChange={([v]) => updateSettings({ alertThreshold: v })}
              min={10}
              max={100}
              step={5}
              className="w-full"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-muted-foreground">Refresh Rate</span>
              <span className="text-[11px] font-mono text-primary font-bold">{settings.refreshRateMs / 1000}s</span>
            </div>
            <Slider
              value={[settings.refreshRateMs]}
              onValueChange={([v]) => updateSettings({ refreshRateMs: v })}
              min={1000}
              max={30000}
              step={1000}
              className="w-full"
            />
          </div>
        </div>

        {/* Toggle Settings */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold text-foreground tracking-wide border-b border-border pb-2">
            FEATURES
          </h3>

          {[
            { key: "autoRescue" as const, label: "Auto-Rescue Mode", desc: "Automatically initiate rescue for critical wallets" },
            { key: "emailAlerts" as const, label: "Email Alerts", desc: "Send email on critical threat detection" },
            { key: "terminalVisible" as const, label: "Live Terminal", desc: "Show real-time system logs" },
          ].map(({ key, label, desc }) => (
            <div key={key} className="flex items-start justify-between gap-3">
              <div>
                <div className="text-[11px] font-bold text-foreground">{label}</div>
                <div className="text-[10px] text-muted-foreground">{desc}</div>
              </div>
              <Switch
                checked={settings[key]}
                onCheckedChange={(v) => updateSettings({ [key]: v })}
              />
            </div>
          ))}

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-muted-foreground">Max Log Entries</span>
              <span className="text-[11px] font-mono text-primary font-bold">{settings.maxLogEntries}</span>
            </div>
            <Slider
              value={[settings.maxLogEntries]}
              onValueChange={([v]) => updateSettings({ maxLogEntries: v })}
              min={10}
              max={200}
              step={10}
              className="w-full"
            />
          </div>
        </div>

        {/* Module Toggles */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold text-foreground tracking-wide border-b border-border pb-2">
            MODULES
          </h3>

          {AVAILABLE_MODULES.map((mod) => (
            <div key={mod} className="flex items-center justify-between">
              <span className="text-[11px] text-foreground">{mod}</span>
              <Switch
                checked={settings.enabledModules.includes(mod)}
                onCheckedChange={() => toggleModule(mod)}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SettingsPanel;
