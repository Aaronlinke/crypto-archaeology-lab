// Simulated threat intelligence and blockchain data for the dashboard

export interface ThreatPrediction {
  name: string;
  confidence: number;
  riskScore: number;
  timeframe: string;
  impact: string;
  category: "critical" | "high" | "medium" | "low";
}

export interface WalletScan {
  address: string;
  riskScore: number;
  balance: number;
  riskFactors: string[];
  generationEra: string;
  lastChecked: string;
  status: "critical" | "warning" | "safe";
}

export interface ProtectionStats {
  protectionCycles: number;
  walletsScanned: number;
  vulnerabilitiesFound: number;
  walletsProtected: number;
  activeThreats: number;
  networkNodes: number;
}

export interface SystemModule {
  name: string;
  icon: string;
  status: "active" | "scanning" | "idle";
  lastUpdate: string;
  metrics: Record<string, number>;
}

export const THREAT_PREDICTIONS: ThreatPrediction[] = [
  {
    name: "Mobile RNG Weakness",
    confidence: 0.92,
    riskScore: 87,
    timeframe: "Q2 2026",
    impact: "Android wallet key generation using predictable entropy sources",
    category: "critical",
  },
  {
    name: "Cloud Key Leakage",
    confidence: 0.78,
    riskScore: 72,
    timeframe: "Q3 2026",
    impact: "Misconfigured cloud KMS exposing hot wallet keys",
    category: "high",
  },
  {
    name: "MultiSig Implementation Flaw",
    confidence: 0.65,
    riskScore: 65,
    timeframe: "Q4 2026",
    impact: "Threshold bypass in popular multisig libraries",
    category: "high",
  },
  {
    name: "Bridge Signature Replay",
    confidence: 0.54,
    riskScore: 58,
    timeframe: "Q1 2027",
    impact: "Cross-chain bridge signature validation weakness",
    category: "medium",
  },
  {
    name: "Post-Quantum Migration Gap",
    confidence: 0.41,
    riskScore: 45,
    timeframe: "2027+",
    impact: "ECDSA keys vulnerable to future quantum attacks",
    category: "medium",
  },
];

export const SCANNED_WALLETS: WalletScan[] = [
  {
    address: "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa",
    riskScore: 15,
    balance: 68.59,
    riskFactors: ["Genesis-era address", "Historical significance"],
    generationEra: "2009 (Genesis)",
    lastChecked: "2 min ago",
    status: "safe",
  },
  {
    address: "1DEP8i3QJCsomS4BSMY2RpU1upv62aGvhD",
    riskScore: 78,
    balance: 12.5,
    riskFactors: ["Debian OpenSSL Bug era", "Low entropy detected", "PID-based key generation"],
    generationEra: "2008-2009 (Debian Bug Era)",
    lastChecked: "5 min ago",
    status: "critical",
  },
  {
    address: "1GY2Vb8BZskcgNKy1L1v8jK3uZ3s3JQ1X",
    riskScore: 52,
    balance: 7.3,
    riskFactors: ["Early generation patterns", "Single-sig only"],
    generationEra: "2011 (Early Era)",
    lastChecked: "8 min ago",
    status: "warning",
  },
  {
    address: "3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy",
    riskScore: 8,
    balance: 2.1,
    riskFactors: [],
    generationEra: "2018 (Modern SegWit)",
    lastChecked: "1 min ago",
    status: "safe",
  },
  {
    address: "bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq",
    riskScore: 5,
    balance: 0.45,
    riskFactors: [],
    generationEra: "2021 (Native SegWit)",
    lastChecked: "30 sec ago",
    status: "safe",
  },
];

export const HISTORICAL_BREACHES = [
  { year: 2008, name: "Debian OpenSSL Bug", impact: "32,768 vulnerable keys", severity: "critical" },
  { year: 2011, name: "Android SecureRandom", impact: "Weak PRNG on early Android", severity: "high" },
  { year: 2013, name: "Brainwallet Attacks", impact: "Dictionary-vulnerable passphrases", severity: "critical" },
  { year: 2014, name: "Mt. Gox Breach", impact: "850,000 BTC lost", severity: "critical" },
  { year: 2016, name: "Bitfinex Hack", impact: "119,756 BTC stolen", severity: "critical" },
  { year: 2022, name: "Ronin Bridge", impact: "$625M cross-chain exploit", severity: "critical" },
  { year: 2023, name: "Multichain Exploit", impact: "$126M bridge vulnerability", severity: "high" },
];

export const SYSTEM_MODULES: SystemModule[] = [
  {
    name: "NeuroGenesis Engine",
    icon: "🧠",
    status: "active",
    lastUpdate: "Live",
    metrics: { patternsLearned: 2847, predictionAccuracy: 94 },
  },
  {
    name: "Cross-Chain Sentinel",
    icon: "🌉",
    status: "scanning",
    lastUpdate: "3s ago",
    metrics: { chainsMonitored: 10, anomaliesDetected: 3 },
  },
  {
    name: "ZK-Threat Proof",
    icon: "🔐",
    status: "active",
    lastUpdate: "12s ago",
    metrics: { proofsGenerated: 156, verificationsComplete: 149 },
  },
  {
    name: "Immune Network",
    icon: "🕸️",
    status: "active",
    lastUpdate: "1s ago",
    metrics: { activeNodes: 47, consensusRate: 99 },
  },
  {
    name: "Defense Matrix",
    icon: "🛡️",
    status: "active",
    lastUpdate: "Live",
    metrics: { activeShields: 12, threatsBlocked: 89 },
  },
  {
    name: "Quantum Vault",
    icon: "⚛️",
    status: "idle",
    lastUpdate: "1m ago",
    metrics: { pqcMigrations: 34, quantumReadyWallets: 1205 },
  },
];

export function generateProtectionStats(): ProtectionStats {
  return {
    protectionCycles: 1847 + Math.floor(Math.random() * 10),
    walletsScanned: 284592 + Math.floor(Math.random() * 100),
    vulnerabilitiesFound: 1293 + Math.floor(Math.random() * 5),
    walletsProtected: 847 + Math.floor(Math.random() * 3),
    activeThreats: 3 + Math.floor(Math.random() * 2),
    networkNodes: 47,
  };
}

export function generateThreatTimeline() {
  const hours = Array.from({ length: 24 }, (_, i) => i);
  return hours.map((h) => ({
    hour: `${h.toString().padStart(2, "0")}:00`,
    threats: Math.floor(Math.random() * 15) + 2,
    blocked: Math.floor(Math.random() * 12) + 1,
    scans: Math.floor(Math.random() * 500) + 100,
  }));
}
