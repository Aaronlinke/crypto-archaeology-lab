import { HISTORICAL_BREACHES } from "@/lib/guardian-data";
import { History } from "lucide-react";

const severityColor = {
  critical: "border-l-destructive text-destructive",
  high: "border-l-cyber-orange text-cyber-orange",
  medium: "border-l-cyber-yellow text-cyber-yellow",
};

const BreachHistoryPanel = () => {
  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="flex items-center gap-2 mb-4">
        <History className="h-5 w-5 text-muted-foreground" />
        <h2 className="font-display text-sm font-bold tracking-wider text-foreground">
          BREACH HISTORY
        </h2>
      </div>
      <div className="space-y-2">
        {HISTORICAL_BREACHES.map((breach) => (
          <div
            key={breach.name}
            className={`border-l-2 pl-3 py-2 ${severityColor[breach.severity as keyof typeof severityColor]}`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold">{breach.name}</span>
              <span className="text-[10px] font-mono opacity-60">{breach.year}</span>
            </div>
            <p className="text-[10px] opacity-50 mt-0.5">{breach.impact}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default BreachHistoryPanel;
