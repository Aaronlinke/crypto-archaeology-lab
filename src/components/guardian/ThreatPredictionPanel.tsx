import { THREAT_PREDICTIONS } from "@/lib/guardian-data";
import { AlertTriangle, TrendingUp } from "lucide-react";
import PanelToolbar from "./PanelToolbar";
import { downloadJSON, downloadCSV } from "@/lib/export-utils";

const categoryColors = {
  critical: "text-destructive border-destructive/30 bg-destructive/5",
  high: "text-cyber-orange border-cyber-orange/30 bg-cyber-orange/5",
  medium: "text-cyber-yellow border-cyber-yellow/30 bg-cyber-yellow/5",
  low: "text-primary border-primary/30 bg-primary/5",
};

const barColors = {
  critical: "bg-destructive",
  high: "bg-cyber-orange",
  medium: "bg-cyber-yellow",
  low: "bg-primary",
};

const ThreatPredictionPanel = () => {
  return (
    <div className="rounded-lg border border-border bg-card p-5 glow-purple">
      <div className="flex items-center gap-2 mb-4">
        <AlertTriangle className="h-5 w-5 text-accent" />
        <h2 className="font-display text-sm font-bold tracking-wider text-accent">
          THREAT PREDICTION
        </h2>
        <div className="ml-auto flex items-center gap-1">
          <PanelToolbar
            onDownloadJSON={() => downloadJSON(THREAT_PREDICTIONS, "threat-predictions")}
            onDownloadCSV={() =>
              downloadCSV(
                THREAT_PREDICTIONS.map((t) => ({
                  name: t.name,
                  confidence: t.confidence,
                  riskScore: t.riskScore,
                  timeframe: t.timeframe,
                  impact: t.impact,
                  category: t.category,
                })),
                "threat-predictions"
              )
            }
          />
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>

      <div className="space-y-3">
        {THREAT_PREDICTIONS.map((threat) => (
          <div
            key={threat.name}
            className={`rounded-md border p-3 ${categoryColors[threat.category]} transition-all hover:scale-[1.01]`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold tracking-wide">{threat.name}</span>
              <span className="text-[10px] font-mono opacity-70">{threat.timeframe}</span>
            </div>
            <p className="text-[10px] opacity-60 mb-2">{threat.impact}</p>
            <div className="flex items-center gap-3">
              <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className={`h-full rounded-full ${barColors[threat.category]} transition-all duration-1000`}
                  style={{ width: `${threat.confidence * 100}%` }}
                />
              </div>
              <span className="text-[10px] font-mono font-bold">
                {(threat.confidence * 100).toFixed(0)}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ThreatPredictionPanel;
