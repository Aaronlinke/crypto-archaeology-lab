import { useState } from "react";
import StatusHeader from "@/components/guardian/StatusHeader";
import StatsGrid from "@/components/guardian/StatsGrid";
import ThreatPredictionPanel from "@/components/guardian/ThreatPredictionPanel";
import WalletScannerPanel from "@/components/guardian/WalletScannerPanel";
import BreachHistoryPanel from "@/components/guardian/BreachHistoryPanel";
import ThreatTimelineChart from "@/components/guardian/ThreatTimelineChart";
import SystemModulesPanel from "@/components/guardian/SystemModulesPanel";
import LiveTerminal from "@/components/guardian/LiveTerminal";
import SettingsPanel from "@/components/guardian/SettingsPanel";
import ExploitDetailPanel from "@/components/guardian/ExploitDetailPanel";
import CustomWalletInput from "@/components/guardian/CustomWalletInput";
import ReverseChainVisualizer from "@/components/guardian/ReverseChainVisualizer";
import GhostShardDecomposer from "@/components/guardian/GhostShardDecomposer";
import NonceReuseDetector from "@/components/guardian/NonceReuseDetector";
import BatchNonceScanner from "@/components/guardian/BatchNonceScanner";
import LiveChainStats from "@/components/guardian/LiveChainStats";
import MathReferencePanel from "@/components/guardian/MathReferencePanel";
import CryptoPrimitivesNexus from "@/components/guardian/CryptoPrimitivesNexus";
import { Ghost } from "lucide-react";
import { GuardianSettingsProvider } from "@/lib/guardian-settings";
import { useEffect } from "react";

const Index = () => {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [ghostOpen, setGhostOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && (e.key === "G" || e.key === "g")) {
        e.preventDefault();
        setGhostOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <GuardianSettingsProvider>
      <div className="min-h-screen bg-background">
        <StatusHeader
          onToggleSettings={() => setSettingsOpen((o) => !o)}
          settingsOpen={settingsOpen}
          onOpenGhost={() => setGhostOpen(true)}
        />
        <main className="p-6 space-y-6 max-w-[1600px] mx-auto">
          {settingsOpen && <SettingsPanel />}

          {/* GHOST discoverability banner */}
          <button
            onClick={() => setGhostOpen(true)}
            className="w-full group relative overflow-hidden rounded-lg border border-accent/40 bg-gradient-to-r from-accent/10 via-background to-primary/10 px-4 py-3 text-left hover:border-accent transition-all"
          >
            <div
              className="pointer-events-none absolute inset-0 opacity-20"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(0deg, hsl(var(--accent)) 0, hsl(var(--accent)) 1px, transparent 1px, transparent 4px)",
              }}
            />
            <div className="relative flex items-center gap-3">
              <div className="relative">
                <Ghost className="h-6 w-6 text-accent" />
                <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-accent animate-ping" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[10px] tracking-[0.25em] text-accent">
                  CLASSIFIED // OPERATOR-LEVEL Ω
                </div>
                <div className="text-sm font-display tracking-wider text-foreground">
                  GHOST :: SHARD DECOMPOSER — Anfrage → 1000 Shards → 10 Vektoren → Kandidaten-Key
                </div>
              </div>
              <span className="hidden md:inline text-[10px] font-mono text-muted-foreground">
                CTRL+SHIFT+G
              </span>
              <span className="px-3 h-8 rounded-md bg-accent text-accent-foreground text-xs font-mono tracking-wider flex items-center group-hover:opacity-90">
                ÖFFNEN
              </span>
            </div>
          </button>

          <StatsGrid />

          <LiveChainStats />

          <NonceReuseDetector />

          <BatchNonceScanner />

          <MathReferencePanel />

          <CryptoPrimitivesNexus />

          {/* Custom Wallet Scanner + Reverse Chain Visualizer */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <CustomWalletInput />
            <div className="space-y-4">
              <ReverseChainVisualizer direction="forward" />
              <ReverseChainVisualizer direction="reverse" />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <ThreatPredictionPanel />
            <WalletScannerPanel />
            <BreachHistoryPanel />
          </div>
          <ExploitDetailPanel />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ThreatTimelineChart />
            <LiveTerminal />
          </div>
          <SystemModulesPanel />
        </main>
        <GhostShardDecomposer open={ghostOpen} onClose={() => setGhostOpen(false)} />
        {/* Floating ghost trigger — always reachable */}
        <button
          onClick={() => setGhostOpen(true)}
          title="GHOST :: Shard Decomposer (Ctrl+Shift+G)"
          aria-label="GHOST mode"
          className="fixed bottom-4 right-4 h-14 w-14 rounded-full bg-accent text-accent-foreground border-2 border-accent shadow-[0_0_24px_hsl(var(--accent)/0.6)] hover:shadow-[0_0_32px_hsl(var(--accent))] hover:scale-105 active:scale-95 transition-all z-50 flex items-center justify-center animate-pulse-glow"
        >
          <Ghost className="h-6 w-6" />
        </button>
      </div>
    </GuardianSettingsProvider>
  );
};

export default Index;
