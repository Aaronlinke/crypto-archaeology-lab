import { SYSTEM_MODULES } from "@/lib/guardian-data";
import PanelToolbar from "./PanelToolbar";
import { downloadJSON, downloadCSV } from "@/lib/export-utils";
import { useGuardianSettings } from "@/lib/guardian-settings";

const statusDot = {
  active: "bg-primary animate-pulse",
  scanning: "bg-cyber-blue animate-ping",
  idle: "bg-muted-foreground",
};

const SystemModulesPanel = () => {
  const { settings } = useGuardianSettings();

  const filteredModules = SYSTEM_MODULES.filter((mod) =>
    settings.enabledModules.includes(mod.name)
  );

  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display text-sm font-bold tracking-wider text-foreground">
          SYSTEM MODULES
        </h2>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground font-mono">
            {filteredModules.length}/{SYSTEM_MODULES.length} active
          </span>
          <PanelToolbar
            onDownloadJSON={() => downloadJSON(filteredModules, "system-modules")}
            onDownloadCSV={() =>
              downloadCSV(
                filteredModules.map((m) => ({
                  name: m.name,
                  status: m.status,
                  lastUpdate: m.lastUpdate,
                  ...m.metrics,
                })),
                "system-modules"
              )
            }
          />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filteredModules.map((mod) => (
          <div
            key={mod.name}
            className="rounded-md border border-border bg-muted/30 p-3 transition-all hover:border-primary/30"
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">{mod.icon}</span>
              <span className="text-xs font-bold tracking-wide flex-1">{mod.name}</span>
              <span className={`h-2 w-2 rounded-full ${statusDot[mod.status]}`} />
            </div>
            <div className="space-y-1">
              {Object.entries(mod.metrics).map(([key, val]) => (
                <div key={key} className="flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground">
                    {key.replace(/([A-Z])/g, " $1").trim()}
                  </span>
                  <span className="text-[10px] font-mono text-primary font-bold">
                    {typeof val === "number" && val > 100 ? val.toLocaleString() : val}
                    {key.toLowerCase().includes("accuracy") || key.toLowerCase().includes("rate") ? "%" : ""}
                  </span>
                </div>
              ))}
            </div>
            <div className="text-[9px] text-muted-foreground mt-2">Updated: {mod.lastUpdate}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SystemModulesPanel;
