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
import { GuardianSettingsProvider } from "@/lib/guardian-settings";

const Index = () => {
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <GuardianSettingsProvider>
      <div className="min-h-screen bg-background">
        <StatusHeader
          onToggleSettings={() => setSettingsOpen((o) => !o)}
          settingsOpen={settingsOpen}
        />
        <main className="p-6 space-y-6 max-w-[1600px] mx-auto">
          {settingsOpen && <SettingsPanel />}
          <StatsGrid />

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
      </div>
    </GuardianSettingsProvider>
  );
};

export default Index;
