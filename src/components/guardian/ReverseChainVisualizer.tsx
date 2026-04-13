import { useState, useEffect, useRef } from "react";
import { ArrowDown, Lock, Unlock, Shield, Hash, Key, Fingerprint } from "lucide-react";

interface ChainLayer {
  id: string;
  label: string;
  icon: React.ReactNode;
  color: string;
  securityBits: number;
  description: string;
  forwardOp: string;
  reverseOp: string;
  status: "idle" | "active" | "complete";
}

const CHAIN_LAYERS: Omit<ChainLayer, "status">[] = [
  {
    id: "privkey",
    label: "Private Key (256-bit)",
    icon: <Key className="h-4 w-4" />,
    color: "text-destructive",
    securityBits: 256,
    description: "256-bit zufälliger Skalar k ∈ [1, n-1]",
    forwardOp: "k → k·G (ECDSA secp256k1)",
    reverseOp: "ECDLP: P → k — O(2^128) Pollard-ρ",
  },
  {
    id: "pubkey",
    label: "Public Key (512-bit)",
    icon: <Fingerprint className="h-4 w-4" />,
    color: "text-cyber-purple",
    securityBits: 128,
    description: "Punkt P = (x,y) auf secp256k1",
    forwardOp: "PubKey → SHA-256(PubKey)",
    reverseOp: "Preimage: O(2^256) — nicht machbar",
  },
  {
    id: "sha256",
    label: "SHA-256 Hash",
    icon: <Hash className="h-4 w-4" />,
    color: "text-cyber-blue",
    securityBits: 256,
    description: "64 Runden ARX + Ch/Maj Kompression",
    forwardOp: "SHA-256 → RIPEMD-160",
    reverseOp: "Preimage: O(2^160) — nicht machbar",
  },
  {
    id: "ripemd160",
    label: "RIPEMD-160 (Hash160)",
    icon: <Hash className="h-4 w-4" />,
    color: "text-cyber-orange",
    securityBits: 160,
    description: "80 Runden, 160-bit Digest",
    forwardOp: "Hash160 → Base58Check",
    reverseOp: "Encoding — trivial umkehrbar",
  },
  {
    id: "address",
    label: "Bitcoin Address",
    icon: <Shield className="h-4 w-4" />,
    color: "text-primary",
    securityBits: 0,
    description: "Version + Hash160 + Checksum → Base58",
    forwardOp: "Fertig — öffentliche Adresse",
    reverseOp: "Base58Decode → Hash160 sofort",
  },
];

interface Props {
  animating?: boolean;
  direction?: "forward" | "reverse";
}

const ReverseChainVisualizer = ({ animating = false, direction = "forward" }: Props) => {
  const [activeLayer, setActiveLayer] = useState(-1);
  const [isRunning, setIsRunning] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const layers = direction === "reverse" ? [...CHAIN_LAYERS].reverse() : CHAIN_LAYERS;

  const startAnimation = () => {
    if (isRunning) return;
    setIsRunning(true);
    setActiveLayer(0);
    let step = 0;
    intervalRef.current = setInterval(() => {
      step++;
      if (step >= layers.length) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        setIsRunning(false);
        setActiveLayer(layers.length);
        return;
      }
      setActiveLayer(step);
    }, 800);
  };

  useEffect(() => {
    if (animating) startAnimation();
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [animating]);

  return (
    <div className="rounded-lg border border-border bg-card p-5 glow-purple">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {direction === "forward" ? (
            <Lock className="h-5 w-5 text-cyber-purple" />
          ) : (
            <Unlock className="h-5 w-5 text-destructive" />
          )}
          <h2 className="font-display text-sm font-bold tracking-wider text-cyber-purple">
            {direction === "forward" ? "FORWARD CHAIN" : "REVERSE CHAIN"} VISUALIZER
          </h2>
        </div>
        <button
          onClick={startAnimation}
          disabled={isRunning}
          className="text-[10px] font-bold px-3 py-1.5 rounded border border-cyber-purple/30 bg-cyber-purple/10 text-cyber-purple hover:bg-cyber-purple/20 transition-colors disabled:opacity-50"
        >
          {isRunning ? "RUNNING..." : direction === "forward" ? "▶ FORWARD" : "◀ REVERSE"}
        </button>
      </div>

      <div className="space-y-0">
        {layers.map((layer, idx) => {
          const isActive = idx === activeLayer;
          const isComplete = idx < activeLayer;
          const isLocked = direction === "reverse" && layer.securityBits > 0 && isComplete;

          return (
            <div key={layer.id}>
              {/* Layer node */}
              <div
                className={`relative p-3 rounded-lg border transition-all duration-500 ${
                  isActive
                    ? "border-cyber-purple/60 bg-cyber-purple/10 scale-[1.02] glow-purple"
                    : isComplete
                    ? "border-primary/30 bg-primary/5"
                    : "border-border/50 bg-card"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`p-1.5 rounded ${
                      isActive ? "bg-cyber-purple/20" : isComplete ? "bg-primary/10" : "bg-muted/30"
                    }`}
                  >
                    <span className={isActive ? "text-cyber-purple" : isComplete ? layer.color : "text-muted-foreground"}>
                      {layer.icon}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-bold font-mono ${isActive ? "text-cyber-purple" : "text-foreground"}`}>
                        {layer.label}
                      </span>
                      {layer.securityBits > 0 && (
                        <span className="text-[9px] font-mono text-muted-foreground">
                          {layer.securityBits}-bit
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{layer.description}</p>
                    {isActive && (
                      <div className="mt-1.5 p-1.5 rounded bg-muted/30 animate-fade-in">
                        <p className="text-[9px] text-cyber-purple font-mono">
                          {direction === "forward" ? `→ ${layer.forwardOp}` : `← ${layer.reverseOp}`}
                        </p>
                      </div>
                    )}
                    {isLocked && (
                      <div className="mt-1 flex items-center gap-1">
                        <Lock className="h-3 w-3 text-destructive" />
                        <span className="text-[9px] text-destructive font-bold">
                          BLOCKED — {layer.securityBits}-bit Sicherheit
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Security bar */}
                {layer.securityBits > 0 && (
                  <div className="mt-2 h-1 rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${
                        isLocked ? "bg-destructive" : isComplete ? "bg-primary" : "bg-muted-foreground/30"
                      }`}
                      style={{ width: `${Math.min(100, (layer.securityBits / 256) * 100)}%` }}
                    />
                  </div>
                )}
              </div>

              {/* Arrow between layers */}
              {idx < layers.length - 1 && (
                <div className="flex justify-center py-1">
                  <ArrowDown
                    className={`h-4 w-4 transition-colors duration-300 ${
                      isComplete ? "text-primary" : isActive ? "text-cyber-purple animate-bounce" : "text-muted-foreground/30"
                    }`}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Result */}
      {activeLayer >= layers.length && (
        <div className="mt-4 p-3 rounded-lg border border-border bg-muted/20 animate-fade-in">
          {direction === "forward" ? (
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              <span className="text-xs font-bold text-primary">
                Chain vollständig — Adresse generiert
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-destructive" />
              <span className="text-xs font-bold text-destructive">
                Reverse-Chain blockiert bei SHA-256/RIPEMD-160/ECDLP
              </span>
            </div>
          )}
          <p className="text-[9px] text-muted-foreground mt-1">
            {direction === "forward"
              ? "PrivKey → PubKey → SHA-256 → RIPEMD-160 → Base58Check → Adresse"
              : "Adresse → Hash160 (trivial) → PubKey (2^160) → PrivKey (2^128) — NICHT MACHBAR"}
          </p>
        </div>
      )}
    </div>
  );
};

export default ReverseChainVisualizer;
