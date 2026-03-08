import StatusHeader from "@/components/guardian/StatusHeader";
import StatsGrid from "@/components/guardian/StatsGrid";
import ThreatPredictionPanel from "@/components/guardian/ThreatPredictionPanel";
import WalletScannerPanel from "@/components/guardian/WalletScannerPanel";
import ThreatTimelineChart from "@/components/guardian/ThreatTimelineChart";
import SystemModulesPanel from "@/components/guardian/SystemModulesPanel";
import BreachHistoryPanel from "@/components/guardian/BreachHistoryPanel";
import LiveTerminal from "@/components/guardian/LiveTerminal";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <StatusHeader />
      <main className="p-6 space-y-6 max-w-[1600px] mx-auto">
        <StatsGrid />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <ThreatPredictionPanel />
          <WalletScannerPanel />
          <BreachHistoryPanel />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ThreatTimelineChart />
          <LiveTerminal />
        </div>
        <SystemModulesPanel />
      </main>
    </div>
  );
};

export default Index;
