import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import {
  ScanSearch, Cpu, Layers, CheckCircle2, Clock, AlertTriangle,
  Zap, RefreshCw, Filter, MapPin
} from "lucide-react";
import type { DamageAssessment } from "@shared/schema";

const severityColor = {
  low: "bg-green-500/20 text-green-300 border-green-500/30",
  moderate: "bg-amber-500/20 text-amber-300 border-amber-500/30",
  severe: "bg-red-500/20 text-red-300 border-red-500/30",
};

const statusColor = {
  active: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  pending: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
  resolved: "bg-slate-500/20 text-slate-300 border-slate-500/30",
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

type AnalysisResult = {
  severity: "low" | "moderate" | "severe";
  confidence: number;
  affectedArea: number;
  structuresAffected: number;
  processingTime: number;
  pointsProcessed: number;
  classificationBreakdown: { low: number; moderate: number; severe: number };
  location: string;
  disasterType: string;
};

export default function Assessment() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [filterSeverity, setFilterSeverity] = useState("all");
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);

  const [form, setForm] = useState({
    location: "",
    disasterType: "earthquake",
    latitude: "",
    longitude: "",
    pointCloudDensity: "45000",
  });

  const { data: assessments, isLoading } = useQuery<DamageAssessment[]>({
    queryKey: ["/api/assessments"],
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      await apiRequest("PATCH", `/api/assessments/${id}/status`, { status });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/assessments"] });
      qc.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({ title: "Status updated successfully" });
    },
  });

  const runAnalysis = async () => {
    if (!form.location) {
      toast({ title: "Please enter a location", variant: "destructive" });
      return;
    }
    setAnalyzing(true);
    setProgress(0);
    setAnalysisResult(null);

    const steps = [
      { label: "Loading point cloud data", pct: 20 },
      { label: "Preprocessing & denoising", pct: 40 },
      { label: "Running CNN classification", pct: 65 },
      { label: "Severity segmentation", pct: 85 },
      { label: "Generating damage report", pct: 100 },
    ];

    for (const step of steps) {
      await new Promise((r) => setTimeout(r, 280));
      setProgress(step.pct);
    }

    try {
      const res = await apiRequest("POST", "/api/analyze", {
        location: form.location,
        disasterType: form.disasterType,
        pointCloudDensity: parseInt(form.pointCloudDensity),
      });
      const data = await res.json();
      setAnalysisResult(data);

      await apiRequest("POST", "/api/assessments", {
        location: form.location,
        latitude: parseFloat(form.latitude) || 18.5 + Math.random() * 0.1,
        longitude: parseFloat(form.longitude) || 73.8 + Math.random() * 0.1,
        severity: data.severity,
        confidence: data.confidence,
        disasterType: form.disasterType,
        pointCloudDensity: data.pointsProcessed,
        affectedArea: data.affectedArea,
        structuresAffected: data.structuresAffected,
        status: "active",
      });
      qc.invalidateQueries({ queryKey: ["/api/assessments"] });
      qc.invalidateQueries({ queryKey: ["/api/stats"] });
    } catch {
      toast({ title: "Analysis failed", variant: "destructive" });
    }
    setAnalyzing(false);
  };

  const filtered = assessments?.filter(
    (a) => filterSeverity === "all" || a.severity === filterSeverity
  ) ?? [];

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Damage Assessment</h1>
        <p className="text-slate-400 text-sm mt-1">AI-powered LiDAR point cloud analysis with CNN classification</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Analysis Form */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <Cpu className="h-4 w-4 text-blue-400" />
              Run AI-LiDAR Analysis
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs text-slate-400">Location Name</Label>
              <Input
                placeholder="e.g. Parvati Valley, Pune"
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs text-slate-400">Disaster Type</Label>
                <Select value={form.disasterType} onValueChange={(v) => setForm({ ...form, disasterType: v })}>
                  <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-600">
                    {["earthquake", "flood", "cyclone", "wildfire", "landslide"].map((t) => (
                      <SelectItem key={t} value={t} className="text-slate-200 capitalize">{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-slate-400">Point Cloud Density</Label>
                <Select value={form.pointCloudDensity} onValueChange={(v) => setForm({ ...form, pointCloudDensity: v })}>
                  <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-600">
                    <SelectItem value="25000" className="text-slate-200">25K pts (low)</SelectItem>
                    <SelectItem value="45000" className="text-slate-200">45K pts (medium)</SelectItem>
                    <SelectItem value="65000" className="text-slate-200">65K pts (high)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs text-slate-400">Latitude (optional)</Label>
                <Input
                  placeholder="18.5308"
                  value={form.latitude}
                  onChange={(e) => setForm({ ...form, latitude: e.target.value })}
                  className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-500"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-slate-400">Longitude (optional)</Label>
                <Input
                  placeholder="73.8474"
                  value={form.longitude}
                  onChange={(e) => setForm({ ...form, longitude: e.target.value })}
                  className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-500"
                />
              </div>
            </div>

            {analyzing && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span className="flex items-center gap-1"><RefreshCw className="h-3 w-3 animate-spin" /> Processing LiDAR data...</span>
                  <span>{progress}%</span>
                </div>
                <Progress value={progress} className="h-2 bg-slate-700" />
              </div>
            )}

            <Button
              onClick={runAnalysis}
              disabled={analyzing}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium"
            >
              {analyzing ? (
                <><RefreshCw className="h-4 w-4 mr-2 animate-spin" />Analyzing...</>
              ) : (
                <><ScanSearch className="h-4 w-4 mr-2" />Run Analysis</>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Analysis Result */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <Layers className="h-4 w-4 text-purple-400" />
              Analysis Result
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!analysisResult && !analyzing && (
              <div className="flex flex-col items-center justify-center h-48 text-slate-500">
                <ScanSearch className="h-10 w-10 mb-3 opacity-30" />
                <p className="text-sm">Run an analysis to see CNN classification results</p>
                <p className="text-xs mt-1 opacity-60">3D point cloud → damage severity mapping</p>
              </div>
            )}
            {analyzing && (
              <div className="flex flex-col items-center justify-center h-48 text-slate-400">
                <div className="relative w-16 h-16 mb-4">
                  <div className="absolute inset-0 rounded-full border-4 border-slate-700" />
                  <div className="absolute inset-0 rounded-full border-4 border-blue-500 border-t-transparent animate-spin" />
                  <Cpu className="absolute inset-0 m-auto h-6 w-6 text-blue-400" />
                </div>
                <p className="text-sm font-medium">CNN processing point cloud...</p>
                <p className="text-xs mt-1 opacity-60">Deep learning classification in progress</p>
              </div>
            )}
            {analysisResult && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs text-slate-400 uppercase tracking-wider">Damage Severity</div>
                    <Badge className={`mt-1 text-sm px-3 py-1 border ${severityColor[analysisResult.severity]}`}>
                      {analysisResult.severity.toUpperCase()}
                    </Badge>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-slate-400">CNN Confidence</div>
                    <div className="text-2xl font-bold text-green-400 tabular-nums">{analysisResult.confidence}%</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: "Affected Area", value: `${analysisResult.affectedArea} km²`, icon: MapPin, color: "text-blue-400" },
                    { label: "Structures", value: analysisResult.structuresAffected, icon: AlertTriangle, color: "text-orange-400" },
                    { label: "Processing Time", value: `${analysisResult.processingTime}ms`, icon: Clock, color: "text-green-400" },
                    { label: "Points Processed", value: analysisResult.pointsProcessed.toLocaleString(), icon: Zap, color: "text-purple-400" },
                  ].map(({ label, value, icon: Icon, color }) => (
                    <div key={label} className="p-3 rounded-lg bg-slate-700/50 flex items-center gap-2">
                      <Icon className={`h-4 w-4 ${color} flex-shrink-0`} />
                      <div>
                        <div className="text-xs text-slate-400">{label}</div>
                        <div className="text-sm font-semibold text-slate-200">{value}</div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="p-3 rounded-lg bg-slate-700/50">
                  <div className="text-xs text-slate-400 mb-2 font-medium uppercase tracking-wider">Classification Breakdown</div>
                  <div className="space-y-2">
                    {[
                      { label: "Low damage", value: analysisResult.classificationBreakdown.low, color: "bg-green-500" },
                      { label: "Moderate damage", value: analysisResult.classificationBreakdown.moderate, color: "bg-amber-500" },
                      { label: "Severe damage", value: analysisResult.classificationBreakdown.severe, color: "bg-red-500" },
                    ].map(({ label, value, color }) => {
                      const total = analysisResult.classificationBreakdown.low + analysisResult.classificationBreakdown.moderate + analysisResult.classificationBreakdown.severe;
                      const pct = Math.round((value / total) * 100);
                      return (
                        <div key={label} className="flex items-center gap-2">
                          <span className="text-xs text-slate-400 w-28">{label}</span>
                          <div className="flex-1 h-2 bg-slate-600 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-xs text-slate-300 w-8 text-right tabular-nums">{pct}%</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Assessment list */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <Filter className="h-4 w-4 text-slate-400" />
              All Assessments
            </CardTitle>
            <div className="flex gap-2">
              {["all", "severe", "moderate", "low"].map((s) => (
                <button
                  key={s}
                  onClick={() => setFilterSeverity(s)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors capitalize ${
                    filterSeverity === s
                      ? "bg-blue-600 text-white"
                      : "bg-slate-700 text-slate-400 hover:bg-slate-600"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-slate-700/50 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((a) => (
                <div key={a.id} className="flex items-center gap-3 p-3 rounded-lg bg-slate-700/30 hover:bg-slate-700/50 transition-colors">
                  <span className="text-2xl leading-none">{disasterIcon[a.disasterType] ?? "⚠️"}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-slate-200">{a.location}</span>
                      <Badge className={`text-[10px] px-1.5 py-0 border ${severityColor[a.severity as keyof typeof severityColor]}`}>
                        {a.severity}
                      </Badge>
                      <Badge className={`text-[10px] px-1.5 py-0 border ${statusColor[a.status as keyof typeof statusColor]}`}>
                        {a.status}
                      </Badge>
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      {a.structuresAffected} structures · {a.affectedArea} km² · {a.confidence}% confidence · {a.pointCloudDensity.toLocaleString()} points
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-xs text-slate-500 hidden sm:block">{timeAgo(a.createdAt)}</span>
                    {a.status !== "resolved" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs border-slate-600 text-slate-300 hover:bg-slate-700"
                        onClick={() => updateStatus.mutate({ id: a.id, status: "resolved" })}
                      >
                        <CheckCircle2 className="h-3 w-3 mr-1" />Resolve
                      </Button>
                    )}
                  </div>
                </div>
              ))}
              {filtered.length === 0 && (
                <div className="text-center py-8 text-slate-500 text-sm">No assessments found</div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
