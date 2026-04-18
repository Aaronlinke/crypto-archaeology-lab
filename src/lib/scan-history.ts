import { supabase } from "@/integrations/supabase/client";
import type { ExtractionAttempt } from "./key-extraction-engine";

export interface StoredScan {
  id: string;
  address: string;
  security_score: number;
  overall_status: "safe" | "compromised" | "at-risk" | "unknown";
  generation_era: string | null;
  attempts: ExtractionAttempt[];
  vectors_tested: number;
  vectors_breached: number;
  scan_duration_ms: number | null;
  created_at: string;
  source: "cloud" | "local";
}

const LOCAL_KEY = "guardian_scan_history_v1";

function readLocal(): StoredScan[] {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function writeLocal(scans: StoredScan[]) {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(scans.slice(0, 200)));
  } catch {
    /* quota exceeded — ignore */
  }
}

export interface SaveScanInput {
  address: string;
  security_score: number;
  overall_status: StoredScan["overall_status"];
  generation_era: string;
  attempts: ExtractionAttempt[];
  scan_duration_ms?: number;
}

export async function saveScan(input: SaveScanInput): Promise<{ ok: boolean; source: "cloud" | "local"; error?: string }> {
  const breached = input.attempts.filter((a) => a.status === "extracted").length;
  const tested = input.attempts.length;

  const localEntry: StoredScan = {
    id: crypto.randomUUID(),
    address: input.address,
    security_score: input.security_score,
    overall_status: input.overall_status,
    generation_era: input.generation_era,
    attempts: input.attempts,
    vectors_tested: tested,
    vectors_breached: breached,
    scan_duration_ms: input.scan_duration_ms ?? null,
    created_at: new Date().toISOString(),
    source: "local",
  };

  // Always write local first as a guaranteed fallback
  const existing = readLocal();
  writeLocal([localEntry, ...existing.filter((s) => s.address !== input.address || s.source !== "local")]);

  // Try cloud
  try {
    // @ts-ignore — table may not be in generated types yet
    const { error } = await supabase.from("wallet_scans").insert({
      address: input.address,
      security_score: input.security_score,
      overall_status: input.overall_status,
      generation_era: input.generation_era,
      attempts: JSON.parse(JSON.stringify(input.attempts)),
      vectors_tested: tested,
      vectors_breached: breached,
      scan_duration_ms: input.scan_duration_ms ?? null,
    });
    if (error) return { ok: true, source: "local", error: error.message };
    return { ok: true, source: "cloud" };
  } catch (e) {
    return { ok: true, source: "local", error: e instanceof Error ? e.message : "unknown" };
  }
}

export async function loadScans(): Promise<StoredScan[]> {
  const local = readLocal();

  try {
    // @ts-ignore — table may not be in generated types yet
    const { data, error } = await supabase
      .from("wallet_scans")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);

    if (error || !data) return local;

    const cloud: StoredScan[] = (data as any[]).map((row) => ({
      id: row.id,
      address: row.address,
      security_score: row.security_score,
      overall_status: row.overall_status,
      generation_era: row.generation_era,
      attempts: Array.isArray(row.attempts) ? row.attempts : [],
      vectors_tested: row.vectors_tested ?? (Array.isArray(row.attempts) ? row.attempts.length : 0),
      vectors_breached:
        row.vectors_breached ??
        (Array.isArray(row.attempts) ? row.attempts.filter((a: any) => a.status === "extracted").length : 0),
      scan_duration_ms: row.scan_duration_ms ?? null,
      created_at: row.created_at,
      source: "cloud",
    }));

    // Merge: cloud first, then local entries not duplicated by address+timestamp
    const cloudKeys = new Set(cloud.map((c) => `${c.address}|${c.created_at.slice(0, 16)}`));
    const localOnly = local.filter((l) => !cloudKeys.has(`${l.address}|${l.created_at.slice(0, 16)}`));
    return [...cloud, ...localOnly].sort((a, b) => b.created_at.localeCompare(a.created_at));
  } catch {
    return local;
  }
}

export function clearLocalHistory() {
  localStorage.removeItem(LOCAL_KEY);
}
