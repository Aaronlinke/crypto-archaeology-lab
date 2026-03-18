import { createContext, useContext, useState, ReactNode } from "react";

export interface GuardianSettings {
  scanIntervalSec: number;
  alertThreshold: number; // risk score 0-100
  autoRescue: boolean;
  emailAlerts: boolean;
  terminalVisible: boolean;
  maxLogEntries: number;
  enabledModules: string[];
  refreshRateMs: number;
  darkMode: boolean;
}

const DEFAULT_SETTINGS: GuardianSettings = {
  scanIntervalSec: 30,
  alertThreshold: 70,
  autoRescue: true,
  emailAlerts: false,
  terminalVisible: true,
  maxLogEntries: 50,
  enabledModules: [
    "NeuroGenesis Engine",
    "Cross-Chain Sentinel",
    "ZK-Threat Proof",
    "Immune Network",
    "Defense Matrix",
    "Quantum Vault",
  ],
  refreshRateMs: 5000,
  darkMode: true,
};

interface SettingsContextType {
  settings: GuardianSettings;
  updateSettings: (partial: Partial<GuardianSettings>) => void;
  resetSettings: () => void;
}

const SettingsContext = createContext<SettingsContextType>({
  settings: DEFAULT_SETTINGS,
  updateSettings: () => {},
  resetSettings: () => {},
});

export function GuardianSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<GuardianSettings>(() => {
    try {
      const stored = localStorage.getItem("guardian-settings");
      return stored ? { ...DEFAULT_SETTINGS, ...JSON.parse(stored) } : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  });

  const updateSettings = (partial: Partial<GuardianSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...partial };
      localStorage.setItem("guardian-settings", JSON.stringify(next));
      return next;
    });
  };

  const resetSettings = () => {
    localStorage.removeItem("guardian-settings");
    setSettings(DEFAULT_SETTINGS);
  };

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, resetSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}

export const useGuardianSettings = () => useContext(SettingsContext);
export { DEFAULT_SETTINGS };
