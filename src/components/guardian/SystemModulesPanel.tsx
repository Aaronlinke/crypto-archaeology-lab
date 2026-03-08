import { SYSTEM_MODULES } from "@/lib/guardian-data";

const statusDot = {
  active: "bg-primary animate-pulse",
  scanning: "bg-cyber-blue animate-ping",
  idle: "bg-muted-foreground",
};

const SystemModulesPanel = () => {
  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <h2 className="font-display text-sm font-bold tracking-wider text-foreground mb-4">
        SYSTEM MODULES
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {SYSTEM_MODULES.map((mod) => (
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
