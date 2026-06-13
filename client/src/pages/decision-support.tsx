import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useRealtime } from "@/hooks/use-realtime";
import {
  Navigation, Users, Package, Truck, AlertTriangle, CheckCircle2,
  MapPin, Clock, ArrowRight, Shield, Heart, Building
} from "lucide-react";
import type { DamageAssessment } from "@shared/schema";

const severityWeight = { severe: 3, moderate: 2, low: 1 };
const disasterIcon: Record<string, string> = {
  earthquake: "🌍", flood: "🌊", cyclone: "🌀", wildfire: "🔥", landslide: "⛰️",
};

function timeAgo(date: string | Date) {
  const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ago`;
}

function priorityScore(a: DamageAssessment): number {
  return (severityWeight[a.severity as keyof typeof severityWeight] ?? 1) * a.structuresAffected * a.confidence * (a.status === "active" ? 1.5 : 1);
}

function resourceEstimate(a: DamageAssessment) {
  const base = a.severity === "severe" ? 3 : a.severity === "moderate" ? 2 : 1;
  return {
    rescueTeams: base * Math.ceil(a.structuresAffected / 40),
    vehicles: base * Math.ceil(a.structuresAffected / 60) + 2,
    medics: base * Math.ceil(a.structuresAffected / 50),
    supplyTons: Math.round((a.affectedArea * 0.8 + base) * 10) / 10,
  };
}

function approachRisk(a: DamageAssessment): "safe" | "caution" | "hazardous" {
  if (a.severity === "severe" && a.confidence > 88) return "hazardous";
  if (a.severity === "moderate" || a.confidence > 80) return "caution";
  return "safe";
}

const riskStyle = {
  safe: "bg-green-500/20 text-green-300 border-green-500/30",
  caution: "bg-amber-500/20 text-amber-300 border-amber-500/30",
  hazardous: "bg-red-500/20 text-red-300 border-red-500/30",
};

export default function DecisionSupportPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { getLatest } = useRealtime();
  const completedScan = getLatest("scan:complete");

  const { data: assessments } = useQuery<DamageAssessment[]>({ queryKey: ["/api/assessments"] });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      await apiRequest("PATCH", `/api/assessments/${id}/status`, { status });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/assessments"] });
      toast({ title: "Assessment status updated" });
    },
  });

  const active = (assessments ?? [])
    .filter((a) => a.status === "active")
    .sort((a, b) => priorityScore(b) - priorityScore(a));

  const totalTeams = active.reduce((s, a) => s + resourceEstimate(a).rescueTeams, 0);
  const totalVehicles = active.reduce((s, a) => s + resourceEstimate(a).vehicles, 0);
  const totalSupply = active.reduce((s, a) => s + resourceEstimate(a).supplyTons, 0);
  const criticalZones = active.filter((a) => a.severity === "severe").length;

  return (
    <div className="p-4 md:p-6 space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Navigation className="h-6 w-6 text-green-400" />
          Decision Support System
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          AI-LiDAR derived priority rankings · Resource allocation · Rescue deployment recommendations
        </p>
      </div>

      {/* Real-time scan result notification */}
      {completedScan && (
        <Card className={`border ${completedScan.severity === "severe" ? "bg-red-900/20 border-red-500/30" : "bg-green-900/10 border-green-500/20"}`}>
          <CardContent className="p-3 flex items-center gap-3">
            <AlertTriangle className={`h-5 w-5 ${completedScan.severity === "severe" ? "text-red-400 animate-pulse" : "text-green-400"}`} />
            <div className="flex-1">
              <div className="text-xs font-semibold text-slate-200">
                Live Scan Complete — {completedScan.severity.toUpperCase()} damage detected
              </div>
              <div className="text-[10px] text-slate-400 font-mono">
                Scan {completedScan.scanId} · {completedScan.confidence}% confidence · {completedScan.structuresAffected} structures · {completedScan.processingTime}ms
              </div>
            </div>
            <Badge className={`text-[10px] ${completedScan.severity === "severe" ? "bg-red-500/20 text-red-300 border-red-500/30" : "bg-green-500/20 text-green-300 border-green-500/30"}`}>
              {completedScan.severity.toUpperCase()}
            </Badge>
          </CardContent>
        </Card>
      )}

      {/* Aggregate resource summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Critical Zones", value: criticalZones, icon: AlertTriangle, color: "text-red-400", bg: "bg-red-500/10" },
          { label: "Rescue Teams", value: totalTeams, icon: Users, color: "text-blue-400", bg: "bg-blue-500/10" },
          { label: "Vehicles Req.", value: totalVehicles, icon: Truck, color: "text-amber-400", bg: "bg-amber-500/10" },
          { label: "Supply (tons)", value: `${totalSupply.toFixed(1)}t`, icon: Package, color: "text-green-400", bg: "bg-green-500/10" },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <Card key={label} className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-3">
              <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center mb-2`}>
                <Icon className={`h-4 w-4 ${color}`} />
              </div>
              <div className={`text-xl font-bold tabular-nums ${color}`}>{value}</div>
              <div className="text-[10px] text-slate-400 mt-0.5">{label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Priority zones */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-slate-200 flex items-center gap-2">
            <Shield className="h-4 w-4 text-red-400" />
            Priority Zone Rankings
            <span className="ml-auto text-[10px] text-slate-500 font-mono">Ranked by: severity × structures × confidence</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {active.length === 0 ? (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
              <CheckCircle2 className="h-4 w-4 text-green-400" />
              <span className="text-sm text-green-300">No active zones — all assessments resolved</span>
            </div>
          ) : active.map((a, idx) => {
            const res = resourceEstimate(a);
            const risk = approachRisk(a);
            const score = Math.round(priorityScore(a));
            return (
              <div
                key={a.id}
                className={`p-4 rounded-xl border ${a.severity === "severe" ? "border-red-500/30 bg-red-500/5" : a.severity === "moderate" ? "border-amber-500/30 bg-amber-500/5" : "border-green-500/20 bg-green-500/5"}`}
              >
                {/* Header row */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-800 border border-slate-600 text-sm font-bold text-slate-200">
                      {idx + 1}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-slate-100">{a.location}</span>
                        <span className="text-xl leading-none">{disasterIcon[a.disasterType] ?? "⚠️"}</span>
                        <Badge className={`text-[10px] px-1.5 py-0 border ${a.severity === "severe" ? "bg-red-500/20 text-red-300 border-red-500/30" : a.severity === "moderate" ? "bg-amber-500/20 text-amber-300 border-amber-500/30" : "bg-green-500/20 text-green-300 border-green-500/30"}`}>
                          {a.severity.toUpperCase()}
                        </Badge>
                        <Badge className={`text-[10px] px-1.5 py-0 border ${riskStyle[risk]}`}>
                          {risk.toUpperCase()} APPROACH
                        </Badge>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-3">
                        <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{a.latitude.toFixed(4)}, {a.longitude.toFixed(4)}</span>
                        <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{timeAgo(a.createdAt)}</span>
                        <span>Score: <strong className="text-slate-300">{score}</strong></span>
                      </div>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs border-slate-600 text-slate-300 hover:bg-slate-700 flex-shrink-0"
                    onClick={() => updateStatus.mutate({ id: a.id, status: "resolved" })}
                  >
                    <CheckCircle2 className="h-3 w-3 mr-1" />Resolve
                  </Button>
                </div>

                {/* Stats row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
                  {[
                    { label: "Structures", value: a.structuresAffected, icon: Building },
                    { label: "Area", value: `${a.affectedArea} km²`, icon: MapPin },
                    { label: "CNN Confidence", value: `${a.confidence}%`, icon: CheckCircle2 },
                    { label: "Point Cloud", value: `${(a.pointCloudDensity / 1000).toFixed(0)}K pts`, icon: Navigation },
                  ].map(({ label, value, icon: Icon }) => (
                    <div key={label} className="p-2 rounded-lg bg-slate-800/50 flex items-center gap-2">
                      <Icon className="h-3 w-3 text-slate-400 flex-shrink-0" />
                      <div>
                        <div className="text-[9px] text-slate-500 uppercase">{label}</div>
                        <div className="text-xs font-semibold text-slate-200">{value}</div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Resource allocation */}
                <div className="p-3 rounded-lg bg-slate-800/60 border border-slate-700/50">
                  <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mb-2">
                    AI-Recommended Deployment
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { icon: Users, label: "Rescue Teams", value: res.rescueTeams, color: "text-blue-400" },
                      { icon: Truck, label: "Vehicles", value: res.vehicles, color: "text-amber-400" },
                      { icon: Heart, label: "Medics", value: res.medics, color: "text-red-400" },
                      { icon: Package, label: "Supplies", value: `${res.supplyTons}t`, color: "text-green-400" },
                    ].map(({ icon: Icon, label, value, color }) => (
                      <div key={label} className="flex items-center gap-2">
                        <Icon className={`h-3.5 w-3.5 ${color} flex-shrink-0`} />
                        <div>
                          <div className="text-[9px] text-slate-500">{label}</div>
                          <div className={`text-sm font-bold ${color} tabular-nums`}>{value}</div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Approach recommendation */}
                  <div className={`mt-2 p-2 rounded-lg border text-[10px] leading-relaxed flex items-start gap-2 ${riskStyle[risk]}`}>
                    <ArrowRight className="h-3 w-3 mt-0.5 flex-shrink-0" />
                    <span>
                      {risk === "hazardous"
                        ? `HIGH RISK ZONE: Deploy only trained USAR teams with PPE. Secondary LiDAR scan recommended before entry. Maintain 50m exclusion perimeter. Coordinate with structural engineers before rescue ops.`
                        : risk === "caution"
                        ? `CAUTION: Use established safe corridors. Teams should carry personal locators. Avoid building interiors until cleared. Continuous monitoring recommended.`
                        : `SAFE APPROACH: Standard relief protocols apply. Access via main roads. Teams may enter cleared structures. Regular check-ins every 30 minutes.`}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Resolved zones */}
      {(assessments ?? []).filter((a) => a.status === "resolved").length > 0 && (
        <Card className="bg-slate-800/30 border-slate-700/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <CheckCircle2 className="h-3.5 w-3.5 text-green-400" />Resolved Zones
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {(assessments ?? []).filter((a) => a.status === "resolved").map((a) => (
              <div key={a.id} className="flex items-center gap-3 p-2 rounded-lg bg-slate-700/20 opacity-60">
                <CheckCircle2 className="h-4 w-4 text-green-400 flex-shrink-0" />
                <span className="text-xs text-slate-300">{a.location}</span>
                <Badge className="bg-slate-600/30 text-slate-400 border-slate-600/30 text-[10px]">{a.severity}</Badge>
                <span className="ml-auto text-[10px] text-slate-500">{timeAgo(a.updatedAt)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
