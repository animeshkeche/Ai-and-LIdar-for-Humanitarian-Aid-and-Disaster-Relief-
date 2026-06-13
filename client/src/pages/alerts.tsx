import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import {
  Bell, AlertTriangle, CheckCircle2, Clock, MapPin,
  Filter, BellOff
} from "lucide-react";
import type { Alert } from "@shared/schema";

const severityConfig = {
  critical: {
    bg: "bg-red-900/30 border-red-500/40",
    badge: "bg-red-500/20 text-red-200 border-red-500/30",
    icon: "text-red-400",
    dot: "bg-red-500",
  },
  severe: {
    bg: "bg-orange-900/20 border-orange-500/30",
    badge: "bg-orange-500/20 text-orange-300 border-orange-500/30",
    icon: "text-orange-400",
    dot: "bg-orange-500",
  },
  moderate: {
    bg: "bg-amber-900/20 border-amber-500/30",
    badge: "bg-amber-500/20 text-amber-300 border-amber-500/30",
    icon: "text-amber-400",
    dot: "bg-amber-500",
  },
  low: {
    bg: "bg-green-900/10 border-green-500/20",
    badge: "bg-green-500/20 text-green-300 border-green-500/30",
    icon: "text-green-400",
    dot: "bg-green-500",
  },
};

const disasterIcon: Record<string, string> = {
  earthquake: "🌍", flood: "🌊", cyclone: "🌀", wildfire: "🔥", landslide: "⛰️",
};

function timeAgo(date: string | Date) {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export default function AlertsPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [filter, setFilter] = useState<"all" | "active" | "acknowledged">("all");
  const [severityFilter, setSeverityFilter] = useState("all");

  const { data: alerts, isLoading } = useQuery<Alert[]>({
    queryKey: ["/api/alerts"],
  });

  const acknowledge = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("PATCH", `/api/alerts/${id}/acknowledge`, {});
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/alerts"] });
      qc.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({ title: "Alert acknowledged" });
    },
  });

  const filtered = (alerts ?? []).filter((a) => {
    const statusOk =
      filter === "all" ? true :
      filter === "active" ? !a.acknowledged :
      a.acknowledged;
    const sevOk = severityFilter === "all" || a.severity === severityFilter;
    return statusOk && sevOk;
  });

  const activeCount = (alerts ?? []).filter((a) => !a.acknowledged).length;
  const criticalCount = (alerts ?? []).filter((a) => a.severity === "critical" && !a.acknowledged).length;

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Alert Management</h1>
        <p className="text-slate-400 text-sm mt-1">Real-time AI-LiDAR generated disaster alerts</p>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Alerts", value: alerts?.length ?? 0, color: "text-slate-300" },
          { label: "Active", value: activeCount, color: "text-red-400" },
          { label: "Critical", value: criticalCount, color: "text-red-300" },
          { label: "Acknowledged", value: (alerts?.length ?? 0) - activeCount, color: "text-green-400" },
        ].map(({ label, value, color }) => (
          <Card key={label} className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-3 text-center">
              <div className={`text-2xl font-bold tabular-nums ${color}`}>{value}</div>
              <div className="text-xs text-slate-400 mt-0.5">{label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-slate-400" />
              <span className="text-xs text-slate-400 font-medium">Status:</span>
              <div className="flex gap-1">
                {(["all", "active", "acknowledged"] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setFilter(s)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors capitalize ${
                      filter === s ? "bg-blue-600 text-white" : "bg-slate-700 text-slate-400 hover:bg-slate-600"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-medium">Severity:</span>
              <div className="flex gap-1 flex-wrap">
                {["all", "critical", "severe", "moderate", "low"].map((s) => (
                  <button
                    key={s}
                    onClick={() => setSeverityFilter(s)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors capitalize ${
                      severityFilter === s ? "bg-blue-600 text-white" : "bg-slate-700 text-slate-400 hover:bg-slate-600"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Alerts list */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-slate-800/50 rounded-lg border border-slate-700 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="flex flex-col items-center justify-center py-12 text-slate-500">
            <BellOff className="h-10 w-10 mb-3 opacity-30" />
            <p className="text-sm">No alerts match the current filters</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((alert) => {
            const cfg = severityConfig[alert.severity as keyof typeof severityConfig] ?? severityConfig.low;
            return (
              <Card
                key={alert.id}
                className={`border transition-all ${cfg.bg} ${alert.acknowledged ? "opacity-60" : ""}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex flex-col items-center gap-1 pt-0.5">
                      <AlertTriangle className={`h-5 w-5 flex-shrink-0 ${cfg.icon}`} />
                      {!alert.acknowledged && (
                        <div className={`w-2 h-2 rounded-full ${cfg.dot} animate-pulse`} />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-sm font-semibold text-slate-100">{alert.title}</h3>
                            <Badge className={`text-[10px] px-2 py-0 border ${cfg.badge}`}>
                              {alert.severity.toUpperCase()}
                            </Badge>
                            <span className="text-lg leading-none">{disasterIcon[alert.disasterType] ?? "⚠️"}</span>
                          </div>
                          <p className="text-xs text-slate-300 mt-1 leading-relaxed">{alert.description}</p>
                        </div>
                        {!alert.acknowledged && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs border-slate-500 text-slate-300 hover:bg-slate-700 flex-shrink-0"
                            onClick={() => acknowledge.mutate(alert.id)}
                          >
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Acknowledge
                          </Button>
                        )}
                        {alert.acknowledged && (
                          <Badge className="bg-slate-600/30 text-slate-400 border-slate-600/30 text-[10px] flex-shrink-0">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Acknowledged
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-4 mt-2 flex-wrap">
                        <span className="flex items-center gap-1 text-xs text-slate-400">
                          <MapPin className="h-3 w-3" />{alert.location}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-slate-400">
                          <Clock className="h-3 w-3" />{timeAgo(alert.createdAt)}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-slate-400 capitalize">
                          <Bell className="h-3 w-3" />{alert.disasterType}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
