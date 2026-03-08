import { useState } from "react";
import { SCANNED_WALLETS, type WalletScan } from "@/lib/guardian-data";
import { Search, ShieldAlert, ShieldCheck, ShieldQuestion } from "lucide-react";

const statusConfig = {
  critical: { icon: ShieldAlert, color: "text-destructive", bg: "bg-destructive/10", label: "CRITICAL" },
  warning: { icon: ShieldQuestion, color: "text-cyber-orange", bg: "bg-cyber-orange/10", label: "WARNING" },
  safe: { icon: ShieldCheck, color: "text-primary", bg: "bg-primary/10", label: "SAFE" },
};

const WalletScannerPanel = () => {
  const [selectedWallet, setSelectedWallet] = useState<WalletScan | null>(null);

  return (
    <div className="rounded-lg border border-border bg-card p-5 glow-blue">
      <div className="flex items-center gap-2 mb-4">
        <Search className="h-5 w-5 text-cyber-blue" />
        <h2 className="font-display text-sm font-bold tracking-wider text-cyber-blue">
          WALLET SCANNER
        </h2>
        <span className="ml-auto text-[10px] text-muted-foreground font-mono animate-pulse">
          LIVE SCANNING...
        </span>
      </div>

      <div className="space-y-2">
        {SCANNED_WALLETS.map((wallet) => {
          const config = statusConfig[wallet.status];
          const Icon = config.icon;
          const isSelected = selectedWallet?.address === wallet.address;

          return (
            <button
              key={wallet.address}
              onClick={() => setSelectedWallet(isSelected ? null : wallet)}
              className={`w-full text-left rounded-md border border-border p-3 transition-all hover:border-primary/30 ${
                isSelected ? "border-primary/50 bg-primary/5" : "bg-card"
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`h-4 w-4 ${config.color} shrink-0`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono truncate">
                      {wallet.address.slice(0, 16)}...{wallet.address.slice(-6)}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${config.bg} ${config.color}`}>
                      {config.label}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-[10px] text-muted-foreground">{wallet.generationEra}</span>
                    <span className="text-[10px] font-mono text-cyber-yellow">{wallet.balance} BTC</span>
                  </div>
                </div>
              </div>

              {isSelected && (
                <div className="mt-3 pt-3 border-t border-border space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-muted-foreground">Risk Score</span>
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            wallet.riskScore > 70 ? "bg-destructive" :
                            wallet.riskScore > 40 ? "bg-cyber-orange" : "bg-primary"
                          }`}
                          style={{ width: `${wallet.riskScore}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-bold font-mono">{wallet.riskScore}/100</span>
                    </div>
                  </div>
                  {wallet.riskFactors.length > 0 && (
                    <div>
                      <span className="text-[10px] text-muted-foreground">Risk Factors:</span>
                      {wallet.riskFactors.map((factor) => (
                        <div key={factor} className="text-[10px] text-destructive/80 ml-2">• {factor}</div>
                      ))}
                    </div>
                  )}
                  <div className="text-[10px] text-muted-foreground">
                    Last checked: {wallet.lastChecked}
                  </div>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default WalletScannerPanel;
