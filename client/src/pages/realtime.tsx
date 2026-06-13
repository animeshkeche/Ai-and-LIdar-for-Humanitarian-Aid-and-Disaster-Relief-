import { useState, useEffect, useRef } from "react";
import { useRealtime } from "@/hooks/use-realtime";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Activity, Wifi, WifiOff, Zap, Radio, Cpu, AlertTriangle,
  Wind, Eye, Thermometer, BarChart2, Clock, CheckCircle2, Layers
} from "lucide-react";
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { cn } from "@/lib/utils";

const disasterIcon: Record<string, string> = {
  earthquake: "🌍", flood: "🌊", cyclone: "🌀", wildfire: "🔥", landslide: "⛰️",
};

const severityRing = {
  low: "border-green-500/50 bg-green-500/5",
  moderate: "border-amber-500/50 bg-amber-500/5",
  severe: "border-red-500/50 bg-red-500/5",
  critical: "border-red-700/60 bg-red-700/10",
};

function fmt(n: number) { return n.toLocaleString(); }
function fmtUptime(s: number) {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  return `${h}h ${m}m ${sec}s`;
}

export default function RealtimePage() {
  const { status, clientId, events, getLatest } = useRealtime();
  const qc = useQueryClient();

  const liveMetrics = getLatest("metrics:live");
  const env = getLatest("environment:update");
  const latestScan = getLatest("scan:complete");
  const scanProgress = getLatest("scan:progress");
  const activeScan = getLatest("scan:start");
  const latestAlert = getLatest("alert:new");

  const [responseHistory, setResponseHistory] = useState<{ t: string; ms: number }[]>([]);
  const [accuracyHistory, setAccuracyHistory] = useState<{ t: string; acc: number }[]>([]);
  const [cnnLayers, setCnnLayers] = useState<{ layer: string; timeMs: number; activations: number }[]>([]);
  const [stages, setStages] = useState<{ stage: string; detail: string; durationMs: number }[]>([]);
  const alertsRef = useRef<{ id: string; title: string; severity: string; location: string; ts: number }[]>([]);
  const [alerts, setAlerts] = useState<typeof alertsRef.current>([]);

  useEffect(() => {
    if (liveMetrics) {
      const t = new Date().toLocaleTimeString("en", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
      setResponseHistory((p) => [...p.slice(-30), { t, ms: liveMetrics.avgResponseMs }]);
      setAccuracyHistory((p) => [...p.slice(-30), { t, acc: liveMetrics.modelAccuracy }]);
    }
  }, [liveMetrics]);

  useEffect(() => {
    const cnnEvts = events.filter((e) => e.type === "cnn:layer").slice(0, 8);
    if (cnnEvts.length > 0) {
      const layers = cnnEvts.map((e) => (e as any).payload);
      setCnnLayers(layers);
    }
    const stageEvts = events.filter((e) => e.type === "scan:stage").slice(0, 6);
    if (stageEvts.length > 0) setStages(stageEvts.map((e) => (e as any).payload));
    const alertEvts = events.filter((e) => e.type === "alert:new").slice(0, 5);
    if (alertEvts.length > 0) {
      const newAlerts = alertEvts.map((e) => ({ ...(e as any).payload, ts: (e as any).ts }));
      setAlerts(newAlerts);
      qc.invalidateQueries({ queryKey: ["/api/alerts"] });
      qc.invalidateQueries({ queryKey: ["/api/stats"] });
    }
  }, [events]);

  const isScanning = !!(activeScan && scanProgress && (scanProgress.pct ?? 0) < 100);

  const tooltipStyle = {
    contentStyle: { backgroundColor: "#1e293b", border: "1px solid #334155", borderRadius: "8px", fontSize: 11 },
    labelStyle: { color: "#e2e8f0" },
    itemStyle: { color: "#94a3b8" },
  };

  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Activity className="h-6 w-6 text-green-400" />
            Real-Time Monitor
          </h1>
          <p className="text-slate-400 text-sm mt-1">Live WebSocket feed · Automated LiDAR scan pipeline · CNN inference stream</p>
        </div>
        <div className="flex items-center gap-3">
          <div className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-mono font-semibold",
            status === "connected" ? "bg-green-500/10 border-green-500/20 text-green-400"
              : status === "connecting" ? "bg-yellow-500/10 border-yellow-500/20 text-yellow-400 animate-pulse"
              : "bg-red-500/10 border-red-500/20 text-red-400"
          )}>
            {status === "connected" ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
            {status === "connected" ? `WS LIVE · ${clientId}` : status.toUpperCase()}
          </div>
        </div>
      </div>

      {/* Top metrics row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Uptime", value: liveMetrics ? fmtUptime(liveMetrics.uptime) : "—", icon: Clock, color: "text-blue-400" },
          { label: "Total Scans", value: liveMetrics ? fmt(liveMetrics.totalScans) : "—", icon: Radio, color: "text-cyan-400" },
          { label: "Points Processed", value: liveMetrics ? `${(liveMetrics.totalPoints / 1_000_000).toFixed(2)}M` : "—", icon: Layers, color: "text-purple-400" },
          { label: "Avg Response", value: liveMetrics ? `${liveMetrics.avgResponseMs}ms` : "—", icon: Zap, color: "text-green-400" },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label} className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-3">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">{label}</span>
                <Icon className={`h-3.5 w-3.5 ${color}`} />
              </div>
              <div className={`text-xl font-bold tabular-nums font-mono ${color}`}>{value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Live scan status */}
        <Card className={cn("border transition-all duration-500", isScanning ? "bg-cyan-900/20 border-cyan-500/30" : "bg-slate-800/50 border-slate-700")}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <Radio className={cn("h-4 w-4", isScanning ? "text-cyan-400 animate-pulse" : "text-slate-500")} />
              Active Scan
              {isScanning && <Badge className="bg-cyan-500/20 text-cyan-300 border-cyan-500/30 text-[10px] animate-pulse ml-auto">SCANNING</Badge>}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {!activeScan ? (
              <div className="flex flex-col items-center justify-center h-28 text-slate-600">
                <Radio className="h-8 w-8 mb-2 opacity-30" />
                <p className="text-xs">Awaiting next scheduled scan…</p>
                <p className="text-[10px] mt-1 opacity-60">Auto-scans every 18–30s</p>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{disasterIcon[activeScan.disasterType] ?? "⚠️"}</span>
                  <div>
                    <div className="text-sm font-semibold text-slate-200">{activeScan.location}</div>
                    <div className="text-[10px] text-slate-400 capitalize font-mono">{activeScan.disasterType} · Alt {activeScan.droneAlt}m · {activeScan.scanMode}</div>
                  </div>
                </div>
                <div className="font-mono text-[10px] text-slate-400">ID: {activeScan.scanId}</div>

                {scanProgress && (
                  <>
                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-cyan-400">{fmt(scanProgress.pointsCollected)} pts</span>
                      <span className="text-slate-400">{fmt(scanProgress.totalPoints)} total</span>
                    </div>
                    <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-cyan-400 rounded-full transition-all duration-300"
                        style={{ width: `${scanProgress.pct}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-500">
                      <span>Beam: {scanProgress.beamAngle.toFixed(1)}°</span>
                      <span>{scanProgress.pct}% acquired</span>
                    </div>
                  </>
                )}

                {latestScan && !isScanning && (
                  <div className={cn("p-2 rounded-lg border", severityRing[latestScan.severity as keyof typeof severityRing] ?? "border-slate-600")}>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-200 uppercase">{latestScan.severity}</span>
                      <span className="text-xs text-green-400 font-mono">{latestScan.confidence}% conf</span>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1 font-mono">
                      {latestScan.structuresAffected} structures · {latestScan.affectedArea} km² · {latestScan.processingTime}ms
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* CNN layer stream */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <Cpu className="h-4 w-4 text-purple-400" />
              CNN Layer Processing
              <span className="text-[10px] text-slate-500 ml-auto font-mono">PointNet++</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {cnnLayers.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-slate-600">
                <Cpu className="h-8 w-8 mb-2 opacity-30" />
                <p className="text-xs">CNN layers stream here during scan</p>
              </div>
            ) : (
              <div className="space-y-1">
                {cnnLayers.slice(0, 7).map((l, i) => (
                  <div key={i} className="flex items-center gap-2 py-1 border-b border-slate-700/50 last:border-0">
                    <div className="w-1.5 h-1.5 rounded-full bg-purple-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] text-slate-300 font-mono truncate">{l.layer.split("(")[0].trim()}</div>
                      <div className="text-[9px] text-slate-500 font-mono">{l.inputDim} → {l.outputDim}</div>
                    </div>
                    <span className="text-[10px] text-purple-300 font-mono flex-shrink-0">{l.timeMs}ms</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Environment */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <Wind className="h-4 w-4 text-blue-400" />
              Environmental Conditions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {!env ? (
              <div className="flex flex-col items-center justify-center h-32 text-slate-600 text-xs">Connecting…</div>
            ) : (
              <>
                {[
                  { label: "Visibility", value: env.visibility, unit: "%", max: 100, color: "bg-blue-400", icon: Eye },
                  { label: "Smoke", value: env.smoke, unit: "%", max: 100, color: "bg-gray-400", icon: Wind },
                  { label: "Dust", value: env.dust, unit: "%", max: 100, color: "bg-amber-400", icon: Wind },
                  { label: "Humidity", value: env.humidity, unit: "%", max: 100, color: "bg-cyan-400", icon: Thermometer },
                  { label: "Wind", value: env.windSpeed, unit: "km/h", max: 80, color: "bg-slate-400", icon: Wind },
                ].map(({ label, value, unit, max, color }) => (
                  <div key={label}>
                    <div className="flex justify-between text-[10px] text-slate-400 mb-0.5">
                      <span>{label}</span>
                      <span className="font-mono font-semibold text-slate-300">{value}{unit}</span>
                    </div>
                    <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                      <div className={`h-full ${color} rounded-full transition-all duration-500`} style={{ width: `${(value / max) * 100}%` }} />
                    </div>
                  </div>
                ))}
                <div className="mt-2 p-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
                  <p className="text-[10px] text-blue-300 leading-relaxed">{env.impact}</p>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader className="pb-1">
            <CardTitle className="text-xs font-semibold text-slate-300 flex items-center gap-2">
              <Zap className="h-3.5 w-3.5 text-green-400" />Response Time (ms) — Live
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={130}>
              <LineChart data={responseHistory}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="t" tick={false} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 9, fill: "#475569" }} />
                <Tooltip {...tooltipStyle} />
                <Line type="monotone" dataKey="ms" stroke="#22c55e" strokeWidth={1.5} dot={false} name="Response ms" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader className="pb-1">
            <CardTitle className="text-xs font-semibold text-slate-300 flex items-center gap-2">
              <BarChart2 className="h-3.5 w-3.5 text-blue-400" />CNN Model Accuracy (%) — Live
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={130}>
              <LineChart data={accuracyHistory}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="t" tick={false} />
                <YAxis domain={[85, 95]} tick={{ fontSize: 9, fill: "#475569" }} unit="%" />
                <Tooltip {...tooltipStyle} />
                <Line type="monotone" dataKey="acc" stroke="#3b82f6" strokeWidth={1.5} dot={false} name="Accuracy %" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Bottom: preprocessing log + live event feed */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Preprocessing pipeline log */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-slate-300 flex items-center gap-2">
              <Layers className="h-3.5 w-3.5 text-amber-400" />
              Preprocessing Pipeline Log
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stages.length === 0 ? (
              <p className="text-xs text-slate-600 text-center py-4">Stages appear as scans run</p>
            ) : (
              <div className="space-y-1.5">
                {stages.map((s, i) => (
                  <div key={i} className="flex items-start gap-2 p-1.5 rounded bg-slate-700/30">
                    <CheckCircle2 className="h-3 w-3 text-green-400 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] font-semibold text-slate-200">{s.stage}</div>
                      <div className="text-[9px] text-slate-500 font-mono">{s.detail}</div>
                    </div>
                    <span className="text-[9px] text-amber-300 font-mono flex-shrink-0">{s.durationMs}ms</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Live event feed */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-slate-300 flex items-center gap-2">
              <Activity className="h-3.5 w-3.5 text-green-400" />
              Live Event Feed
              <span className="ml-auto text-[10px] font-mono text-slate-500">{events.length} events</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {events.slice(0, 20).map((e, i) => {
                const typeColor: Record<string, string> = {
                  "scan:start": "text-cyan-400",
                  "scan:complete": "text-green-400",
                  "alert:new": "text-red-400",
                  "cnn:layer": "text-purple-400",
                  "scan:stage": "text-amber-400",
                  "metrics:live": "text-slate-500",
                  "environment:update": "text-blue-400",
                  "stats:update": "text-slate-500",
                  "scan:progress": "text-cyan-600",
                };
                const skip = ["metrics:live", "stats:update", "scan:progress"].includes(e.type);
                if (skip && i > 0) return null;
                return (
                  <div key={i} className="flex items-center gap-2 py-0.5">
                    <div className="w-1 h-1 rounded-full bg-slate-500 flex-shrink-0" />
                    <span className={`text-[9px] font-mono ${typeColor[e.type] ?? "text-slate-400"}`}>{e.type}</span>
                    <span className="text-[9px] text-slate-500 truncate flex-1 font-mono">
                      {e.type === "scan:start" ? (e.payload as any).location
                        : e.type === "scan:complete" ? `${(e.payload as any).severity} · ${(e.payload as any).confidence}%`
                        : e.type === "alert:new" ? (e.payload as any).title
                        : e.type === "cnn:layer" ? (e.payload as any).layer?.split("(")[0]
                        : e.type === "scan:stage" ? (e.payload as any).stage
                        : e.type === "environment:update" ? `vis:${(e.payload as any).visibility}%`
                        : ""}
                    </span>
                    <span className="text-[9px] text-slate-600 font-mono flex-shrink-0">
                      {new Date(e.ts).toLocaleTimeString("en", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                    </span>
                  </div>
                );
              })}
              {events.length === 0 && <p className="text-xs text-slate-600 text-center py-4">Connecting to stream…</p>}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Auto-generated alerts */}
      {alerts.length > 0 && (
        <Card className="bg-red-900/20 border-red-500/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-red-300 flex items-center gap-2">
              <AlertTriangle className="h-3.5 w-3.5 animate-pulse" />
              Auto-Generated Alerts (this session)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {alerts.map((a) => (
              <div key={a.id} className="flex items-center gap-3 p-2 rounded-lg bg-red-900/20 border border-red-500/20">
                <AlertTriangle className="h-4 w-4 text-red-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-slate-200">{a.title}</div>
                  <div className="text-[10px] text-slate-400">{a.location} · {disasterIcon[a.disasterType] ?? "⚠️"} {a.disasterType}</div>
                </div>
                <Badge className="bg-red-500/20 text-red-300 border-red-500/30 text-[10px]">{a.severity}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
