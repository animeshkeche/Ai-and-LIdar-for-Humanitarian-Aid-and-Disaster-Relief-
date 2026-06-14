import { useQuery } from "@tanstack/react-query";
import { ScanSearch, Bell, AlertTriangle, CheckCircle2, TrendingUp, Zap, MapPin, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid, Legend, RadarChart, Radar, PolarGrid, PolarAngleAxis,
} from "recharts";
import type { DamageAssessment, Alert } from "@shared/schema";

const severityColor = {
  low: "bg-green-500/20 text-green-300 border-green-500/30",
  moderate: "bg-amber-500/20 text-amber-300 border-amber-500/30",
  severe: "bg-red-500/20 text-red-300 border-red-500/30",
  critical: "bg-red-700/30 text-red-200 border-red-600/40",
};

const disasterIcon: Record<string, string> = {
  earthquake: "🌍",
  flood: "🌊",
  cyclone: "🌀",
  wildfire: "🔥",
  landslide: "⛰️",
};

function timeAgo(date: string | Date) {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

const performanceData = [
  { method: "Satellite", accuracy: 71, precision: 69, recall: 68, f1: 68.5 },
  { method: "UAV Camera", accuracy: 78, precision: 76, recall: 75, f1: 75.5 },
  { method: "AI + LiDAR", accuracy: 89, precision: 88, recall: 90, f1: 89 },
];

const responseTimeData = [
  { method: "Satellite", time: 180 },
  { method: "UAV Camera", time: 95 },
  { method: "AI + LiDAR", time: 28 },
];

const trendData = [
  { hour: "00:00", assessments: 2, alerts: 1 },
  { hour: "04:00", assessments: 1, alerts: 0 },
  { hour: "08:00", assessments: 4, alerts: 2 },
  { hour: "12:00", assessments: 7, alerts: 3 },
  { hour: "16:00", assessments: 5, alerts: 2 },
  { hour: "20:00", assessments: 8, alerts: 4 },
  { hour: "Now", assessments: 6, alerts: 3 },
];

export default function Dashboard() {
  const { data: stats } = useQuery<{
    totalAssessments: number;
    activeAlerts: number;
    severeAreas: number;
    avgConfidence: number;
    totalAffectedArea: number;
    totalStructures: number;
  }>({ queryKey: ["/api/stats"] });

  const { data: assessments } = useQuery<DamageAssessment[]>({
    queryKey: ["/api/assessments"],
  });

  const { data: alerts } = useQuery<Alert[]>({
    queryKey: ["/api/alerts"],
  });

  const recentAssessments = assessments?.slice(0, 5) ?? [];
  const unresolvedAlerts = alerts?.filter((a) => !a.acknowledged).slice(0, 3) ?? [];

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Critical alert banner */}
      {unresolvedAlerts.some((a) => a.severity === "critical") && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-red-900/40 border border-red-500/40 animate-pulse">
          <AlertTriangle className="h-5 w-5 text-red-400 flex-shrink-0" />
          <p className="text-sm text-red-200 font-medium">
            CRITICAL: {unresolvedAlerts.find((a) => a.severity === "critical")?.title} —{" "}
            <Link href="/alerts">
              <span className="underline cursor-pointer">View all alerts</span>
            </Link>
          </p>
        </div>
      )}

      <div>
        <h1 className="text-2xl font-bold text-white">Operations Dashboard</h1>
        <p className="text-slate-400 text-sm mt-1">AI-LiDAR Disaster Damage Assessment System · Real-time situational awareness</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Assessments</span>
              <ScanSearch className="h-4 w-4 text-blue-400" />
            </div>
            <div className="text-3xl font-bold text-white tabular-nums">{stats?.totalAssessments ?? "—"}</div>
            <div className="text-xs text-slate-500 mt-1">LiDAR scans processed</div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Active Alerts</span>
              <Bell className="h-4 w-4 text-red-400" />
            </div>
            <div className="text-3xl font-bold text-red-400 tabular-nums">{stats?.activeAlerts ?? "—"}</div>
            <div className="text-xs text-slate-500 mt-1">Require immediate action</div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Severe Zones</span>
              <AlertTriangle className="h-4 w-4 text-orange-400" />
            </div>
            <div className="text-3xl font-bold text-orange-400 tabular-nums">{stats?.severeAreas ?? "—"}</div>
            <div className="text-xs text-slate-500 mt-1">High-priority rescue areas</div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">CNN Confidence</span>
              <CheckCircle2 className="h-4 w-4 text-green-400" />
            </div>
            <div className="text-3xl font-bold text-green-400 tabular-nums">{stats?.avgConfidence ?? "—"}%</div>
            <div className="text-xs text-slate-500 mt-1">Average model accuracy</div>
          </CardContent>
        </Card>
      </div>

      {/* Secondary stats */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
              <MapPin className="h-5 w-5 text-purple-400" />
            </div>
            <div>
              <div className="text-2xl font-bold text-white tabular-nums">{stats?.totalAffectedArea ?? "—"} km²</div>
              <div className="text-xs text-slate-400">Total affected area</div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
              <Zap className="h-5 w-5 text-amber-400" />
            </div>
            <div>
              <div className="text-2xl font-bold text-white tabular-nums">{stats?.totalStructures ?? "—"}</div>
              <div className="text-xs text-slate-400">Structures affected</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Method Comparison */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-blue-400" />
              Method Performance Comparison
            </CardTitle>
            <p className="text-xs text-slate-400">AI+LiDAR vs Traditional Methods (from paper)</p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={performanceData} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="method" tick={{ fontSize: 11, fill: "#94a3b8" }} />
                <YAxis domain={[60, 95]} tick={{ fontSize: 11, fill: "#94a3b8" }} unit="%" />
                <Tooltip
                  contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #334155", borderRadius: "8px" }}
                  labelStyle={{ color: "#e2e8f0" }}
                  itemStyle={{ color: "#94a3b8" }}
                />
                <Legend wrapperStyle={{ fontSize: 11, color: "#94a3b8" }} />
                <Bar dataKey="accuracy" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Accuracy" />
                <Bar dataKey="precision" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="Precision" />
                <Bar dataKey="f1" fill="#06b6d4" radius={[4, 4, 0, 0]} name="F1-Score" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Activity trend */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <Activity className="h-4 w-4 text-green-400" />
              24-Hour Activity
            </CardTitle>
            <p className="text-xs text-slate-400">Assessments and alerts over time</p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="hour" tick={{ fontSize: 11, fill: "#94a3b8" }} />
                <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #334155", borderRadius: "8px" }}
                  labelStyle={{ color: "#e2e8f0" }}
                  itemStyle={{ color: "#94a3b8" }}
                />
                <Legend wrapperStyle={{ fontSize: 11, color: "#94a3b8" }} />
                <Line type="monotone" dataKey="assessments" stroke="#3b82f6" strokeWidth={2} dot={false} name="Assessments" />
                <Line type="monotone" dataKey="alerts" stroke="#ef4444" strokeWidth={2} dot={false} name="Alerts" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent Assessments */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-slate-200">Recent Assessments</CardTitle>
              <Link href="/assessment">
                <span className="text-xs text-blue-400 hover:text-blue-300 cursor-pointer">View all →</span>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 pt-0">
            {recentAssessments.map((a) => (
              <div key={a.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-slate-700/40 hover:bg-slate-700/60 transition-colors">
                <span className="text-xl leading-none">{disasterIcon[a.disasterType] ?? "⚠️"}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-slate-200 truncate">{a.location}</div>
                  <div className="text-xs text-slate-400">{a.structuresAffected} structures · {a.affectedArea} km²</div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Badge className={`text-[10px] px-1.5 py-0 border ${severityColor[a.severity as keyof typeof severityColor]}`}>
                    {a.severity}
                  </Badge>
                  <span className="text-[10px] text-slate-500 flex items-center gap-1">
                    <Clock className="h-3 w-3" />{timeAgo(a.createdAt)}
                  </span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Active Alerts */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-slate-200">Active Alerts</CardTitle>
              <Link href="/alerts">
                <span className="text-xs text-blue-400 hover:text-blue-300 cursor-pointer">View all →</span>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 pt-0">
            {unresolvedAlerts.length === 0 ? (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                <CheckCircle2 className="h-4 w-4 text-green-400" />
                <span className="text-sm text-green-300">All alerts acknowledged</span>
              </div>
            ) : (
              unresolvedAlerts.map((a) => (
                <div key={a.id} className={`p-2.5 rounded-lg border ${
                  a.severity === "critical" ? "bg-red-900/20 border-red-500/30" :
                  a.severity === "severe" ? "bg-orange-900/20 border-orange-500/30" :
                  "bg-amber-900/20 border-amber-500/30"
                }`}>
                  <div className="flex items-start gap-2">
                    <AlertTriangle className={`h-4 w-4 mt-0.5 flex-shrink-0 ${
                      a.severity === "critical" ? "text-red-400" :
                      a.severity === "severe" ? "text-orange-400" : "text-amber-400"
                    }`} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-slate-200 leading-tight">{a.title}</div>
                      <div className="text-xs text-slate-400 mt-0.5 truncate">{a.location} · {timeAgo(a.createdAt)}</div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Activity({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  );
}
