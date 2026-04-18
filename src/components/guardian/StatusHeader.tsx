import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Shield, Activity, Settings, History as HistoryIcon } from "lucide-react";

interface StatusHeaderProps {
  onToggleSettings?: () => void;
  settingsOpen?: boolean;
}

const StatusHeader = ({ onToggleSettings, settingsOpen }: StatusHeaderProps) => {
  const [time, setTime] = useState(new Date());
  const [cycleCount, setCycleCount] = useState(1847);

  useEffect(() => {
    const interval = setInterval(() => {
      setTime(new Date());
      setCycleCount((c) => c + 1);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="border-b border-border bg-card/50 backdrop-blur-sm px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Shield className="h-10 w-10 text-primary animate-pulse-glow" />
            <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-primary animate-ping" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold tracking-wider text-primary text-glow-green">
              CRYPTOGUARDIAN X
            </h1>
            <p className="text-xs text-muted-foreground tracking-widest">
              PREDICTIVE IMMUNE SYSTEM v2.0
            </p>
          </div>
        </div>

        <div className="flex items-center gap-8 text-xs">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            <span className="text-muted-foreground">CYCLE</span>
            <span className="text-primary font-bold">#{cycleCount}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
            <span className="text-primary font-bold">SYSTEM ACTIVE</span>
          </div>
          <div className="text-muted-foreground font-mono">
            {time.toLocaleTimeString("de-DE")} UTC
          </div>
          <Link
            to="/history"
            className="h-8 px-3 flex items-center gap-1.5 rounded-md border border-border hover:border-primary/40 text-muted-foreground hover:text-primary transition-colors text-xs font-mono tracking-wider"
            title="Scan-Historie"
          >
            <HistoryIcon className="h-3.5 w-3.5" />
            HISTORY
          </Link>
          {onToggleSettings && (
            <button
              onClick={onToggleSettings}
              className={`h-8 w-8 flex items-center justify-center rounded-md border transition-colors ${
                settingsOpen
                  ? "border-accent bg-accent/10 text-accent"
                  : "border-border hover:border-primary/40 text-muted-foreground hover:text-primary"
              }`}
              title="System Settings"
            >
              <Settings className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

export default StatusHeader;
