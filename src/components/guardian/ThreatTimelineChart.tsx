import { useEffect, useState } from "react";
import { generateThreatTimeline } from "@/lib/guardian-data";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

const ThreatTimelineChart = () => {
  const [data, setData] = useState(generateThreatTimeline());

  useEffect(() => {
    const interval = setInterval(() => setData(generateThreatTimeline()), 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="rounded-lg border border-border bg-card p-5 glow-green">
      <h2 className="font-display text-sm font-bold tracking-wider text-primary mb-4">
        THREAT ACTIVITY (24H)
      </h2>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="threatGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(0, 80%, 55%)" stopOpacity={0.4} />
                <stop offset="100%" stopColor="hsl(0, 80%, 55%)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="blockedGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(160, 100%, 45%)" stopOpacity={0.4} />
                <stop offset="100%" stopColor="hsl(160, 100%, 45%)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="hour"
              tick={{ fill: "hsl(220, 10%, 50%)", fontSize: 9 }}
              axisLine={{ stroke: "hsl(180, 40%, 15%)" }}
              tickLine={false}
              interval={3}
            />
            <YAxis
              tick={{ fill: "hsl(220, 10%, 50%)", fontSize: 9 }}
              axisLine={false}
              tickLine={false}
              width={30}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(220, 25%, 7%)",
                border: "1px solid hsl(180, 40%, 15%)",
                borderRadius: "8px",
                fontSize: 11,
                fontFamily: "JetBrains Mono",
              }}
            />
            <Area
              type="monotone"
              dataKey="threats"
              stroke="hsl(0, 80%, 55%)"
              fill="url(#threatGradient)"
              strokeWidth={2}
              name="Threats"
            />
            <Area
              type="monotone"
              dataKey="blocked"
              stroke="hsl(160, 100%, 45%)"
              fill="url(#blockedGradient)"
              strokeWidth={2}
              name="Blocked"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="flex items-center gap-6 mt-3 text-[10px]">
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-destructive" />
          <span className="text-muted-foreground">Threats Detected</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-primary" />
          <span className="text-muted-foreground">Threats Blocked</span>
        </div>
      </div>
    </div>
  );
};

export default ThreatTimelineChart;
