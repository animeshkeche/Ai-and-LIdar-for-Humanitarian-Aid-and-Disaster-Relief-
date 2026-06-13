import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { MapPin, Layers, Eye, EyeOff, AlertTriangle, Clock } from "lucide-react";
import type { DamageAssessment, Alert } from "@shared/schema";

const severityColor = {
  low: { bg: "bg-green-500/20 text-green-300 border-green-500/30", dot: "#22c55e", ring: "rgba(34,197,94,0.3)" },
  moderate: { bg: "bg-amber-500/20 text-amber-300 border-amber-500/30", dot: "#f59e0b", ring: "rgba(245,158,11,0.3)" },
  severe: { bg: "bg-red-500/20 text-red-300 border-red-500/30", dot: "#ef4444", ring: "rgba(239,68,68,0.3)" },
  critical: { bg: "bg-red-700/30 text-red-200 border-red-600/40", dot: "#dc2626", ring: "rgba(220,38,38,0.4)" },
};

const disasterIcon: Record<string, string> = {
  earthquake: "🌍", flood: "🌊", cyclone: "🌀", wildfire: "🔥", landslide: "⛰️",
};

function timeAgo(date: string | Date) {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  return `${Math.floor(seconds / 3600)}h ago`;
}

type Zone = {
  id: string;
  label: string;
  x: number;
  y: number;
  severity: string;
  type: "assessment" | "alert";
  details: string;
  time: string | Date;
};

export default function MapView() {
  const [showAssessments, setShowAssessments] = useState(true);
  const [showAlerts, setShowAlerts] = useState(true);
  const [selected, setSelected] = useState<Zone | null>(null);

  const { data: assessments } = useQuery<DamageAssessment[]>({
    queryKey: ["/api/assessments"],
  });

  const { data: alerts } = useQuery<Alert[]>({
    queryKey: ["/api/alerts"],
  });

  const latBounds = { min: 18.44, max: 18.62 };
  const lonBounds = { min: 73.74, max: 73.95 };

  function toXY(lat: number, lon: number) {
    const x = ((lon - lonBounds.min) / (lonBounds.max - lonBounds.min)) * 100;
    const y = ((latBounds.max - lat) / (latBounds.max - latBounds.min)) * 100;
    return { x, y };
  }

  const assessmentZones: Zone[] = (assessments ?? []).map((a) => {
    const { x, y } = toXY(a.latitude, a.longitude);
    return {
      id: `a-${a.id}`,
      label: a.location,
      x,
      y,
      severity: a.severity,
      type: "assessment",
      details: `${a.structuresAffected} structures · ${a.affectedArea} km² · ${a.confidence}% conf.`,
      time: a.createdAt,
    };
  });

  const alertZones: Zone[] = (alerts ?? [])
    .filter((a) => !a.acknowledged)
    .map((a) => {
      const { x, y } = toXY(a.latitude, a.longitude);
      return {
        id: `al-${a.id}`,
        label: a.title,
        x: x + 0.5,
        y: y + 0.5,
        severity: a.severity,
        type: "alert",
        details: a.description,
        time: a.createdAt,
      };
    });

  const zones: Zone[] = [
    ...(showAssessments ? assessmentZones : []),
    ...(showAlerts ? alertZones : []),
  ];

  const sevCfg = (sev: string) => severityColor[sev as keyof typeof severityColor] ?? severityColor.low;

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-white">Disaster Zone Map</h1>
        <p className="text-slate-400 text-sm mt-1">AI-LiDAR damage assessment zones — Pune Metropolitan Area</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Map panel */}
        <div className="lg:col-span-2">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <CardTitle className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                  <Layers className="h-4 w-4 text-blue-400" />
                  Live Damage Map
                </CardTitle>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowAssessments(!showAssessments)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors border ${
                      showAssessments ? "bg-blue-600/20 border-blue-500/30 text-blue-300" : "bg-slate-700 border-slate-600 text-slate-400"
                    }`}
                  >
                    {showAssessments ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                    Assessments
                  </button>
                  <button
                    onClick={() => setShowAlerts(!showAlerts)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors border ${
                      showAlerts ? "bg-red-600/20 border-red-500/30 text-red-300" : "bg-slate-700 border-slate-600 text-slate-400"
                    }`}
                  >
                    {showAlerts ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                    Alerts
                  </button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Synthetic map grid */}
              <div
                className="relative w-full bg-slate-900 rounded-lg border border-slate-700 overflow-hidden"
                style={{ paddingBottom: "65%" }}
              >
                {/* Grid lines */}
                <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
                  <defs>
                    <pattern id="grid" width="10%" height="10%" patternUnits="objectBoundingBox">
                      <path d="M 0 0 L 0 100 100 100 100 0 Z" fill="none" stroke="#1e293b" strokeWidth="0.5" />
                    </pattern>
                  </defs>
                  <rect width="100%" height="100%" fill="url(#grid)" />

                  {/* Roads */}
                  <line x1="0%" y1="50%" x2="100%" y2="50%" stroke="#2d3f55" strokeWidth="2" />
                  <line x1="50%" y1="0%" x2="50%" y2="100%" stroke="#2d3f55" strokeWidth="2" />
                  <line x1="20%" y1="0%" x2="80%" y2="100%" stroke="#2d3f55" strokeWidth="1" strokeDasharray="4,6" />
                  <line x1="80%" y1="0%" x2="20%" y2="100%" stroke="#2d3f55" strokeWidth="1" strokeDasharray="4,6" />

                  {/* Water body */}
                  <ellipse cx="35%" cy="70%" rx="12%" ry="8%" fill="rgba(59,130,246,0.12)" stroke="#3b82f620" strokeWidth="1" />
                  <text x="35%" y="71%" textAnchor="middle" fill="#3b82f650" fontSize="8" fontFamily="sans-serif">Mutha River</text>

                  {/* City label */}
                  <text x="50%" y="48%" textAnchor="middle" fill="#334155" fontSize="11" fontFamily="sans-serif" fontWeight="600">PUNE METROPOLITAN AREA</text>

                  {/* Zones */}
                  {zones.map((z) => {
                    const cfg = sevCfg(z.severity);
                    const radius = z.severity === "severe" || z.severity === "critical" ? "5%" : z.severity === "moderate" ? "4%" : "3%";
                    const isSelected = selected?.id === z.id;
                    return (
                      <g key={z.id} style={{ cursor: "pointer" }} onClick={() => setSelected(isSelected ? null : z)}>
                        <ellipse
                          cx={`${z.x}%`}
                          cy={`${z.y}%`}
                          rx={radius}
                          ry={`calc(${radius} * 0.7)`}
                          fill={cfg.ring}
                          stroke={cfg.dot}
                          strokeWidth={isSelected ? "2" : "1"}
                          opacity="0.8"
                        />
                        <circle
                          cx={`${z.x}%`}
                          cy={`${z.y}%`}
                          r="1%"
                          fill={cfg.dot}
                          opacity="0.9"
                        />
                        {isSelected && (
                          <circle
                            cx={`${z.x}%`}
                            cy={`${z.y}%`}
                            r="2%"
                            fill="none"
                            stroke={cfg.dot}
                            strokeWidth="1.5"
                            strokeDasharray="3,2"
                          />
                        )}
                      </g>
                    );
                  })}
                </svg>

                {/* Compass */}
                <div className="absolute top-3 right-3 w-8 h-8 rounded-full bg-slate-800 border border-slate-600 flex items-center justify-center text-xs font-bold text-slate-300">N</div>

                {/* Legend */}
                <div className="absolute bottom-3 left-3 bg-slate-900/90 backdrop-blur-sm rounded-lg border border-slate-700 p-2 space-y-1">
                  {[
                    { label: "Severe", color: "#ef4444" },
                    { label: "Moderate", color: "#f59e0b" },
                    { label: "Low", color: "#22c55e" },
                  ].map(({ label, color }) => (
                    <div key={label} className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                      <span className="text-[10px] text-slate-400">{label}</span>
                    </div>
                  ))}
                </div>

                {/* Click info */}
                {selected && (
                  <div className="absolute top-3 left-3 max-w-[200px] bg-slate-900/95 backdrop-blur-sm rounded-lg border border-slate-600 p-3 shadow-xl">
                    <div className="flex items-start gap-2">
                      <MapPin className="h-3.5 w-3.5 text-blue-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <div className="text-xs font-semibold text-slate-200 leading-tight">{selected.label}</div>
                        <div className="text-[10px] text-slate-400 mt-1">{selected.details}</div>
                        <Badge className={`mt-1.5 text-[9px] px-1.5 py-0 border ${sevCfg(selected.severity).bg}`}>
                          {selected.severity}
                        </Badge>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <p className="text-[10px] text-slate-500 mt-2 text-center">
                Schematic representation — click zones to view details. Real deployment uses live UAV-mounted LiDAR feeds.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Side panel */}
        <div className="space-y-3">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Zones</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 pt-0">
              {assessmentZones.map((z) => (
                <button
                  key={z.id}
                  onClick={() => setSelected(selected?.id === z.id ? null : z)}
                  className={`w-full text-left flex items-center gap-2.5 p-2.5 rounded-lg transition-colors border ${
                    selected?.id === z.id
                      ? "bg-blue-600/20 border-blue-500/30"
                      : "bg-slate-700/30 border-transparent hover:bg-slate-700/50"
                  }`}
                >
                  <div
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: sevCfg((assessments?.find((a) => `a-${a.id}` === z.id))?.severity ?? "low").dot }}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-medium text-slate-200 truncate">{z.label}</div>
                    <div className="text-[10px] text-slate-400 capitalize">{(assessments?.find((a) => `a-${a.id}` === z.id))?.disasterType}</div>
                  </div>
                  <span className="text-[10px] text-slate-500 flex-shrink-0">{timeAgo(z.time)}</span>
                </button>
              ))}
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Unacknowledged Alerts</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 pt-0">
              {alertZones.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-2">All clear</p>
              ) : alertZones.map((z) => (
                <div key={z.id} className="flex items-center gap-2.5 p-2.5 rounded-lg bg-red-900/20 border border-red-500/20">
                  <AlertTriangle className="h-3.5 w-3.5 text-red-400 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-medium text-slate-200 leading-tight line-clamp-2">{z.label}</div>
                    <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                      <Clock className="h-3 w-3" />{timeAgo(z.time)}
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
