import { useEffect, useMemo, useRef, useState } from "react";
import { X, Cpu, Zap, Download, Layers, Activity, Binary, Hash } from "lucide-react";

interface GhostShardDecomposerProps {
  open: boolean;
  onClose: () => void;
}

interface Shard {
  id: number;
  hash: string;
  category: string;
  weight: number;
  status: "queued" | "processing" | "done";
  payload: string;
}

const CATEGORIES = [
  "LEXICAL", "SEMANTIC", "SYNTACTIC", "ENTITY", "INTENT",
  "CONSTRAINT", "DEPENDENCY", "CONTEXT", "TEMPORAL", "NUMERIC",
  "BOOLEAN", "REFERENCE", "META", "EMBEDDING", "FEATURE",
  "TOKEN", "NGRAM", "VECTOR", "GRAPH-NODE", "GRAPH-EDGE",
] as const;

const SHARD_COUNT = 1000;

// FNV-1a 32-bit hash — deterministic
function fnv1a(str: string, seed = 0x811c9dc5): number {
  let h = seed;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

function hex(n: number, len = 8): string {
  return n.toString(16).padStart(len, "0").toUpperCase();
}

function buildShards(input: string): Shard[] {
  const base = input.trim() || "<empty>";
  const shards: Shard[] = [];
  for (let i = 0; i < SHARD_COUNT; i++) {
    const h1 = fnv1a(base + ":" + i);
    const h2 = fnv1a(base + ":x:" + i, h1);
    const cat = CATEGORIES[h1 % CATEGORIES.length];
    const weight = ((h2 % 1000) / 1000);
    shards.push({
      id: i,
      hash: `${hex(h1)}${hex(h2)}`,
      category: cat,
      weight,
      status: "queued",
      payload: `seg[${i.toString().padStart(4, "0")}] :: ${base.slice((i * 3) % Math.max(base.length, 1), ((i * 3) % Math.max(base.length, 1)) + 12)}`,
    });
  }
  return shards;
}

const GhostShardDecomposer = ({ open, onClose }: GhostShardDecomposerProps) => {
  const [input, setInput] = useState("");
  const [shards, setShards] = useState<Shard[]>([]);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  const rafRef = useRef<number | null>(null);
  const idxRef = useRef(0);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const start = () => {
    if (!input.trim() || running) return;
    const s = buildShards(input);
    setShards(s);
    setDone(0);
    setRunning(true);
    idxRef.current = 0;
    setLogs([
      `[GHOST] decomposer engaged :: payload=${input.length}b`,
      `[GHOST] generating ${SHARD_COUNT} shards :: seed=0x${hex(fnv1a(input))}`,
      `[GHOST] dispatch :: 32 parallel workers online`,
    ]);

    const tick = () => {
      const batch = 18; // shards per frame
      setShards((prev) => {
        const next = prev.slice();
        for (let k = 0; k < batch && idxRef.current < SHARD_COUNT; k++, idxRef.current++) {
          next[idxRef.current] = { ...next[idxRef.current], status: "done" };
        }
        return next;
      });
      setDone(idxRef.current);

      if (idxRef.current % 120 === 0 && idxRef.current > 0) {
        setLogs((l) => [
          ...l,
          `[GHOST] ${idxRef.current.toString().padStart(4, "0")}/1000 shards processed :: entropy=${(Math.random() * 8).toFixed(3)}b`,
        ].slice(-12));
      }

      if (idxRef.current < SHARD_COUNT) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        setRunning(false);
        setLogs((l) => [
          ...l,
          `[GHOST] decomposition complete :: 1000/1000`,
          `[GHOST] reassembly map cached :: ready for export`,
        ].slice(-12));
      }
    };
    rafRef.current = requestAnimationFrame(tick);
  };

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const stats = useMemo(() => {
    const byCat: Record<string, number> = {};
    for (const s of shards) byCat[s.category] = (byCat[s.category] || 0) + 1;
    return byCat;
  }, [shards]);

  const exportReport = () => {
    const lines = [
      `# GHOST SHARD REPORT`,
      `# input: ${input}`,
      `# shards: ${SHARD_COUNT}`,
      `# generated: ${new Date().toISOString()}`,
      ``,
      ...shards.map(
        (s) =>
          `${s.id.toString().padStart(4, "0")}\t0x${s.hash}\t${s.category}\tw=${s.weight.toFixed(3)}\t${s.payload}`,
      ),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ghost-shards-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!open) return null;

  const progress = (done / SHARD_COUNT) * 100;

  return (
    <div className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-md overflow-y-auto">
      {/* scanline overlay */}
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.08]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, hsl(var(--primary)) 0, hsl(var(--primary)) 1px, transparent 1px, transparent 3px)",
        }}
      />
      <div className="relative max-w-[1400px] mx-auto p-6 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-accent/40 pb-4">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Cpu className="h-8 w-8 text-accent" />
              <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-accent animate-ping" />
            </div>
            <div>
              <h2 className="text-2xl font-display font-bold tracking-[0.2em] text-accent">
                GHOST :: SHARD DECOMPOSER
              </h2>
              <p className="text-[10px] tracking-[0.3em] text-muted-foreground">
                CLASSIFIED // EYES-ONLY // OPERATOR LEVEL Ω
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="h-9 w-9 rounded-md border border-border hover:border-accent text-muted-foreground hover:text-accent transition-colors flex items-center justify-center"
            title="Schließen (ESC)"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Input */}
        <div className="rounded-lg border border-accent/30 bg-card/60 p-4 space-y-3">
          <label className="text-[10px] tracking-[0.25em] text-accent flex items-center gap-2">
            <Zap className="h-3 w-3" /> ANFRAGE / PAYLOAD
          </label>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Gib einfach deine Anfrage ein — sie wird in 1000 Shards zerlegt, klassifiziert und parallel verarbeitet …"
            rows={3}
            disabled={running}
            className="w-full bg-background/80 border border-border focus:border-accent rounded-md px-3 py-2 font-mono text-sm text-foreground placeholder:text-muted-foreground/60 outline-none resize-none"
          />
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={start}
              disabled={!input.trim() || running}
              className="px-4 h-9 rounded-md bg-accent text-accent-foreground font-mono text-xs tracking-wider hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Activity className="h-3.5 w-3.5" />
              {running ? `DEKOMPONIERE… ${done}/1000` : "DEKOMPONIEREN (×1000)"}
            </button>
            <button
              onClick={exportReport}
              disabled={done === 0}
              className="px-3 h-9 rounded-md border border-border hover:border-accent text-muted-foreground hover:text-accent font-mono text-xs tracking-wider disabled:opacity-30 flex items-center gap-2"
            >
              <Download className="h-3.5 w-3.5" /> SHARD-MAP (.txt)
            </button>
            <span className="ml-auto text-[10px] font-mono text-muted-foreground">
              shortcut: <span className="text-accent">CTRL+SHIFT+G</span>
            </span>
          </div>

          {/* progress */}
          <div className="space-y-1">
            <div className="flex justify-between text-[10px] font-mono text-muted-foreground">
              <span>PROGRESS</span>
              <span className="text-accent">{progress.toFixed(1)}%</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-primary to-accent transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>

        {shards.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Shard matrix */}
            <div className="lg:col-span-2 rounded-lg border border-border bg-card/60 p-3">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-mono tracking-widest text-accent flex items-center gap-2">
                  <Layers className="h-3.5 w-3.5" /> SHARD MATRIX · 1000
                </h3>
                <span className="text-[10px] font-mono text-muted-foreground">
                  {done} done · {SHARD_COUNT - done} queued
                </span>
              </div>
              <div
                className="grid gap-[2px]"
                style={{ gridTemplateColumns: "repeat(40, minmax(0, 1fr))" }}
              >
                {shards.map((s) => (
                  <div
                    key={s.id}
                    title={`#${s.id} · ${s.category} · 0x${s.hash}`}
                    className={`aspect-square rounded-[1px] transition-colors ${
                      s.status === "done"
                        ? "bg-accent shadow-[0_0_4px_hsl(var(--accent))]"
                        : "bg-muted/60"
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Stats + log */}
            <div className="space-y-4">
              <div className="rounded-lg border border-border bg-card/60 p-3">
                <h3 className="text-xs font-mono tracking-widest text-accent flex items-center gap-2 mb-2">
                  <Binary className="h-3.5 w-3.5" /> KATEGORIE-VERTEILUNG
                </h3>
                <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                  {Object.entries(stats)
                    .sort((a, b) => b[1] - a[1])
                    .map(([cat, n]) => (
                      <div key={cat} className="flex items-center gap-2 text-[10px] font-mono">
                        <span className="w-24 text-muted-foreground">{cat}</span>
                        <div className="flex-1 h-1 bg-muted rounded overflow-hidden">
                          <div
                            className="h-full bg-accent/70"
                            style={{ width: `${(n / SHARD_COUNT) * 100 * 4}%` }}
                          />
                        </div>
                        <span className="text-accent w-8 text-right">{n}</span>
                      </div>
                    ))}
                </div>
              </div>

              <div className="rounded-lg border border-border bg-black/60 p-3">
                <h3 className="text-xs font-mono tracking-widest text-primary flex items-center gap-2 mb-2">
                  <Hash className="h-3.5 w-3.5" /> GHOST LOG
                </h3>
                <div className="space-y-0.5 font-mono text-[10px] text-primary/80 max-h-40 overflow-y-auto">
                  {logs.map((l, i) => (
                    <div key={i}>{l}</div>
                  ))}
                  {logs.length === 0 && (
                    <div className="text-muted-foreground">// stand-by …</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {shards.length === 0 && (
          <div className="rounded-lg border border-dashed border-accent/30 bg-card/30 p-12 text-center">
            <p className="text-xs font-mono tracking-widest text-muted-foreground">
              // GEHEIM-MODUS BEREIT — gib eine Anfrage ein und drücke DEKOMPONIEREN
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default GhostShardDecomposer;