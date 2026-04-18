import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft, Search, ShieldAlert, ShieldCheck, ShieldQuestion, Cloud, HardDrive,
  Trash2, RefreshCw, Download, Filter,
} from "lucide-react";
import { loadScans, clearLocalHistory, type StoredScan } from "@/lib/scan-history";
import { downloadJSON, downloadCSV } from "@/lib/export-utils";
import { useToast } from "@/hooks/use-toast";

type StatusFilter = "all" | "safe" | "compromised" | "at-risk" | "unknown";
type SourceFilter = "all" | "cloud" | "local";
type SortKey = "newest" | "oldest" | "score-asc" | "score-desc" | "breached-desc";

const statusMeta: Record<StoredScan["overall_status"], { icon: typeof ShieldCheck; color: string; bg: string; label: string }> = {
  safe: { icon: ShieldCheck, color: "text-primary", bg: "bg-primary/10 border-primary/30", label: "VERIFIED SAFE" },
  compromised: { icon: ShieldAlert, color: "text-destructive", bg: "bg-destructive/10 border-destructive/30", label: "COMPROMISED" },
  "at-risk": { icon: ShieldQuestion, color: "text-cyber-orange", bg: "bg-cyber-orange/10 border-cyber-orange/30", label: "AT RISK" },
  unknown: { icon: Search, color: "text-muted-foreground", bg: "bg-muted/10 border-border", label: "UNKNOWN" },
};

const History = () => {
  const { toast } = useToast();
  const [scans, setScans] = useState<StoredScan[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("newest");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const refresh = async () => {
    setLoading(true);
    const data = await loadScans();
    setScans(data);
    setLoading(false);
  };

  useEffect(() => {
    refresh();
  }, []);

  const filtered = useMemo(() => {
    let list = scans;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((s) => s.address.toLowerCase().includes(q));
    }
    if (statusFilter !== "all") list = list.filter((s) => s.overall_status === statusFilter);
    if (sourceFilter !== "all") list = list.filter((s) => s.source === sourceFilter);

    const sorted = [...list];
    switch (sortKey) {
      case "newest":
        sorted.sort((a, b) => b.created_at.localeCompare(a.created_at));
        break;
      case "oldest":
        sorted.sort((a, b) => a.created_at.localeCompare(b.created_at));
        break;
      case "score-asc":
        sorted.sort((a, b) => a.security_score - b.security_score);
        break;
      case "score-desc":
        sorted.sort((a, b) => b.security_score - a.security_score);
        break;
      case "breached-desc":
        sorted.sort((a, b) => b.vectors_breached - a.vectors_breached);
        break;
    }
    return sorted;
  }, [scans, search, statusFilter, sourceFilter, sortKey]);

  const stats = useMemo(() => {
    const total = scans.length;
    const safe = scans.filter((s) => s.overall_status === "safe").length;
    const compromised = scans.filter((s) => s.overall_status === "compromised").length;
    const atRisk = scans.filter((s) => s.overall_status === "at-risk").length;
    const cloud = scans.filter((s) => s.source === "cloud").length;
    const avgScore = total ? Math.round(scans.reduce((sum, s) => sum + s.security_score, 0) / total) : 0;
    return { total, safe, compromised, atRisk, cloud, avgScore };
  }, [scans]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-[1600px] mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              to="/"
              className="flex items-center gap-2 text-xs font-mono text-muted-foreground hover:text-primary transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              ZURÜCK ZUM DASHBOARD
            </Link>
            <div className="h-4 w-px bg-border" />
            <h1 className="font-display text-sm font-bold tracking-wider text-primary">
              SCAN-HISTORIE
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={refresh}
              className="px-3 py-1.5 rounded bg-muted/30 border border-border text-xs font-mono text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors flex items-center gap-1.5"
            >
              <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
              REFRESH
            </button>
            <button
              onClick={() => downloadJSON(filtered, "scan-history")}
              className="px-3 py-1.5 rounded bg-muted/30 border border-border text-xs font-mono text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors flex items-center gap-1.5"
            >
              <Download className="h-3 w-3" />
              JSON
            </button>
            <button
              onClick={() =>
                downloadCSV(
                  filtered.map((s) => ({
                    address: s.address,
                    status: s.overall_status,
                    score: s.security_score,
                    breached: s.vectors_breached,
                    tested: s.vectors_tested,
                    era: s.generation_era ?? "",
                    source: s.source,
                    created_at: s.created_at,
                  })),
                  "scan-history"
                )
              }
              className="px-3 py-1.5 rounded bg-muted/30 border border-border text-xs font-mono text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors flex items-center gap-1.5"
            >
              <Download className="h-3 w-3" />
              CSV
            </button>
            <button
              onClick={() => {
                clearLocalHistory();
                toast({ title: "Lokale Historie gelöscht" });
                refresh();
              }}
              className="px-3 py-1.5 rounded bg-destructive/10 border border-destructive/30 text-xs font-mono text-destructive hover:bg-destructive/20 transition-colors flex items-center gap-1.5"
            >
              <Trash2 className="h-3 w-3" />
              LOCAL CLEAR
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: "TOTAL SCANS", value: stats.total, color: "text-foreground" },
            { label: "SAFE", value: stats.safe, color: "text-primary" },
            { label: "COMPROMISED", value: stats.compromised, color: "text-destructive" },
            { label: "AT RISK", value: stats.atRisk, color: "text-cyber-orange" },
            { label: "AVG SCORE", value: `${stats.avgScore}/100`, color: "text-cyber-blue" },
            { label: "CLOUD SYNCED", value: stats.cloud, color: "text-cyber-purple" },
          ].map((stat) => (
            <div key={stat.label} className="rounded-lg border border-border bg-card p-3">
              <div className="text-[10px] font-mono text-muted-foreground tracking-wider mb-1">
                {stat.label}
              </div>
              <div className={`text-xl font-display font-bold ${stat.color}`}>{stat.value}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="h-4 w-4 text-primary" />
            <h2 className="font-display text-xs font-bold tracking-wider text-primary">FILTER & SORT</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="md:col-span-2">
              <label className="text-[10px] font-mono text-muted-foreground tracking-wider block mb-1">
                ADRESSE SUCHEN
              </label>
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="1A1zP1eP5..."
                  className="w-full bg-muted/30 border border-border rounded pl-7 pr-3 py-1.5 text-xs font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
                />
              </div>
            </div>
            <div>
              <label className="text-[10px] font-mono text-muted-foreground tracking-wider block mb-1">
                STATUS
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                className="w-full bg-muted/30 border border-border rounded px-2 py-1.5 text-xs font-mono text-foreground focus:outline-none focus:border-primary/50"
              >
                <option value="all">Alle Status</option>
                <option value="safe">Verified Safe</option>
                <option value="compromised">Compromised</option>
                <option value="at-risk">At Risk</option>
                <option value="unknown">Unknown</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-mono text-muted-foreground tracking-wider block mb-1">
                QUELLE
              </label>
              <select
                value={sourceFilter}
                onChange={(e) => setSourceFilter(e.target.value as SourceFilter)}
                className="w-full bg-muted/30 border border-border rounded px-2 py-1.5 text-xs font-mono text-foreground focus:outline-none focus:border-primary/50"
              >
                <option value="all">Cloud + Lokal</option>
                <option value="cloud">Nur Cloud</option>
                <option value="local">Nur Lokal</option>
              </select>
            </div>
            <div className="md:col-span-4">
              <label className="text-[10px] font-mono text-muted-foreground tracking-wider block mb-1">
                SORTIERUNG
              </label>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { k: "newest", label: "Neueste zuerst" },
                  { k: "oldest", label: "Älteste zuerst" },
                  { k: "score-asc", label: "Score ↑" },
                  { k: "score-desc", label: "Score ↓" },
                  { k: "breached-desc", label: "Meiste Breaches" },
                ].map((opt) => (
                  <button
                    key={opt.k}
                    onClick={() => setSortKey(opt.k as SortKey)}
                    className={`px-2.5 py-1 rounded text-[10px] font-mono tracking-wider border transition-colors ${
                      sortKey === opt.k
                        ? "bg-primary/20 border-primary/50 text-primary"
                        : "bg-muted/30 border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {opt.label.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* List */}
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <span className="text-xs font-mono text-muted-foreground">
              {filtered.length} von {scans.length} Scans
            </span>
            {loading && <span className="text-xs font-mono text-cyber-blue animate-pulse">LADE...</span>}
          </div>

          {filtered.length === 0 ? (
            <div className="p-12 text-center">
              <Search className="h-8 w-8 text-muted-foreground mx-auto mb-3 opacity-50" />
              <p className="text-sm font-mono text-muted-foreground">
                {scans.length === 0
                  ? "Noch keine Scans gespeichert. Führe einen Scan im Dashboard aus."
                  : "Keine Treffer mit den aktuellen Filtern."}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filtered.map((scan) => {
                const meta = statusMeta[scan.overall_status];
                const Icon = meta.icon;
                const expanded = expandedId === scan.id;
                return (
                  <div key={scan.id}>
                    <button
                      onClick={() => setExpandedId(expanded ? null : scan.id)}
                      className="w-full px-4 py-3 flex items-center gap-3 hover:bg-muted/20 transition-colors text-left"
                    >
                      <div className={`shrink-0 p-1.5 rounded border ${meta.bg}`}>
                        <Icon className={`h-4 w-4 ${meta.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-mono text-xs text-foreground truncate">{scan.address}</div>
                        <div className="flex items-center gap-3 mt-0.5">
                          <span className={`text-[10px] font-mono font-bold tracking-wider ${meta.color}`}>
                            {meta.label}
                          </span>
                          <span className="text-[10px] font-mono text-muted-foreground">
                            SCORE {scan.security_score}/100
                          </span>
                          <span className="text-[10px] font-mono text-muted-foreground">
                            {scan.vectors_breached}/{scan.vectors_tested} BREACHED
                          </span>
                          {scan.generation_era && (
                            <span className="text-[10px] font-mono text-muted-foreground hidden md:inline">
                              {scan.generation_era}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="shrink-0 flex items-center gap-2">
                        <span
                          className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono tracking-wider border ${
                            scan.source === "cloud"
                              ? "bg-cyber-purple/10 border-cyber-purple/30 text-cyber-purple"
                              : "bg-muted/30 border-border text-muted-foreground"
                          }`}
                        >
                          {scan.source === "cloud" ? <Cloud className="h-2.5 w-2.5" /> : <HardDrive className="h-2.5 w-2.5" />}
                          {scan.source.toUpperCase()}
                        </span>
                        <span className="text-[10px] font-mono text-muted-foreground hidden md:inline">
                          {new Date(scan.created_at).toLocaleString("de-DE", {
                            day: "2-digit", month: "2-digit", year: "2-digit",
                            hour: "2-digit", minute: "2-digit",
                          })}
                        </span>
                      </div>
                    </button>

                    {expanded && (
                      <div className="px-4 pb-4 bg-muted/10">
                        <div className="rounded border border-border bg-background/50 p-3 space-y-2">
                          <div className="text-[10px] font-mono text-muted-foreground tracking-wider mb-2">
                            VEKTOR-DETAILS ({scan.attempts.length})
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
                            {scan.attempts.map((a, i) => (
                              <div
                                key={i}
                                className={`rounded border px-2 py-1.5 text-[10px] font-mono ${
                                  a.status === "extracted"
                                    ? "border-destructive/30 bg-destructive/5 text-destructive"
                                    : a.status === "partial"
                                    ? "border-cyber-orange/30 bg-cyber-orange/5 text-cyber-orange"
                                    : "border-border bg-muted/10 text-muted-foreground"
                                }`}
                              >
                                <div className="flex justify-between gap-2">
                                  <span className="font-bold truncate">{a.vectorName}</span>
                                  <span className="shrink-0">{a.status.toUpperCase()}</span>
                                </div>
                                <div className="text-muted-foreground/80 truncate mt-0.5">{a.result}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default History;
