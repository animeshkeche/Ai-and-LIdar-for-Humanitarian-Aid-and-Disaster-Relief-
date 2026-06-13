import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import LidarPointCloud from "@/components/lidar-point-cloud";
import LidarInitPanel from "@/components/lidar-init-panel";
import { Radio, Layers, ScanSearch, ChevronDown, Info } from "lucide-react";
import { cn } from "@/lib/utils";

const severityOptions = [
  { value: "low", label: "Low Damage", color: "bg-green-500/20 text-green-300 border-green-500/30", dot: "bg-green-500" },
  { value: "moderate", label: "Moderate Damage", color: "bg-amber-500/20 text-amber-300 border-amber-500/30", dot: "bg-amber-500" },
  { value: "severe", label: "Severe Damage", color: "bg-red-500/20 text-red-300 border-red-500/30", dot: "bg-red-500" },
] as const;

const pipelineStages = [
  { label: "LiDAR Acquisition", detail: "Raw 3D point cloud (.las/.ply)", icon: "📡", active: true },
  { label: "Preprocessing", detail: "Noise removal · Voxel downsampling · Normalization", icon: "⚙️", active: true },
  { label: "CNN Classification", detail: "PointNet++ deep learning model", icon: "🧠", active: true },
  { label: "Severity Mapping", detail: "Low / Moderate / Severe segmentation", icon: "🗺️", active: true },
  { label: "Decision Support", detail: "Priority zones · Rescue routing output", icon: "🚨", active: true },
];

const legendItems = [
  { color: "bg-blue-400", label: "Intact Structure", desc: "Undamaged building points" },
  { color: "bg-red-500", label: "Collapsed Zone", desc: "Severe structural failure" },
  { color: "bg-amber-400", label: "Debris Field", desc: "Scattered material / rubble" },
  { color: "bg-green-500", label: "Ground / Terrain", desc: "Road surface & open ground" },
];

export default function LidarPage() {
  const [severity, setSeverity] = useState<"low" | "moderate" | "severe">("moderate");
  const [initDone, setInitDone] = useState(false);
  const [scanDone, setScanDone] = useState(false);
  const [cloudKey, setCloudKey] = useState(0);
  const [showInfo, setShowInfo] = useState(false);

  const handleSeverityChange = (v: "low" | "moderate" | "severe") => {
    setSeverity(v);
    setScanDone(false);
    setCloudKey((k) => k + 1);
  };

  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Radio className="h-6 w-6 text-cyan-400" />
            LiDAR System Integration
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Sensor initialization · 3D point cloud acquisition · AI damage classification
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium",
            initDone
              ? "bg-green-500/10 border-green-500/20 text-green-400"
              : "bg-slate-700 border-slate-600 text-slate-400"
          )}>
            <div className={cn("w-2 h-2 rounded-full", initDone ? "bg-green-400 animate-pulse" : "bg-slate-500")} />
            {initDone ? "Sensor Online" : "Sensor Offline"}
          </div>
          <button
            onClick={() => setShowInfo(!showInfo)}
            className="p-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 transition-colors"
          >
            <Info className="h-4 w-4 text-slate-400" />
          </button>
        </div>
      </div>

      {/* Info banner */}
      {showInfo && (
        <Card className="bg-blue-900/20 border-blue-500/30">
          <CardContent className="p-4 text-xs text-blue-200/80 leading-relaxed">
            <strong className="text-blue-300">How it works:</strong> The Velodyne VLP-32C emits 32 laser beams in a 360° sweep, generating 600K+ 3D points/second.
            Raw point clouds are preprocessed (denoised, downsampled) then fed into a PointNet++ CNN trained on the paper's 10,000-sample dataset.
            The model classifies each point as low / moderate / severe damage — coloured red (collapsed), orange (debris), or blue (intact).
            Drag the 3D view to inspect from any angle.
          </CardContent>
        </Card>
      )}

      {/* Pipeline stages */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1">
        {pipelineStages.map((stage, i) => (
          <div key={stage.label} className="flex items-center gap-1 flex-shrink-0">
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800/70 border border-slate-700 text-xs">
              <span>{stage.icon}</span>
              <span className="text-slate-300 font-medium hidden sm:block">{stage.label}</span>
            </div>
            {i < pipelineStages.length - 1 && (
              <ChevronDown className="h-3 w-3 text-slate-600 rotate-[-90deg] flex-shrink-0" />
            )}
          </div>
        ))}
      </div>

      {/* Main 2-column layout */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">

        {/* Sensor Init Panel */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <Radio className="h-4 w-4 text-cyan-400" />
              Sensor Initialization
              {initDone && (
                <Badge className="bg-green-500/20 text-green-300 border-green-500/30 text-[10px] ml-auto">
                  ● READY
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="h-[480px] overflow-hidden">
            <LidarInitPanel onComplete={() => setInitDone(true)} />
          </CardContent>
        </Card>

        {/* 3D Point Cloud Viewer */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                <Layers className="h-4 w-4 text-purple-400" />
                3D Point Cloud Viewer
                {scanDone && (
                  <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30 text-[10px]">
                    CNN CLASSIFIED
                  </Badge>
                )}
              </CardTitle>
              {/* Severity selector */}
              <div className="flex gap-1.5">
                {severityOptions.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => handleSeverityChange(opt.value)}
                    className={cn(
                      "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors",
                      severity === opt.value ? opt.color : "bg-slate-700 border-slate-600 text-slate-400 hover:bg-slate-600"
                    )}
                  >
                    <div className={cn("w-1.5 h-1.5 rounded-full", opt.dot)} />
                    <span className="hidden sm:block">{opt.label}</span>
                    <span className="sm:hidden capitalize">{opt.value}</span>
                  </button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="h-[480px] rounded-b-lg overflow-hidden">
              <LidarPointCloud
                key={cloudKey}
                severity={severity}
                onScanComplete={() => setScanDone(true)}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom row: legend + stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Point cloud legend */}
        {legendItems.map(({ color, label, desc }) => (
          <div key={label} className="flex items-center gap-3 p-3 rounded-lg bg-slate-800/50 border border-slate-700">
            <div className={`w-3 h-3 rounded-full flex-shrink-0 ${color}`} />
            <div>
              <div className="text-xs font-semibold text-slate-200">{label}</div>
              <div className="text-[10px] text-slate-400">{desc}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Algorithm note */}
      <Card className="bg-slate-800/30 border-slate-700/50">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <ScanSearch className="h-5 w-5 text-slate-400 flex-shrink-0 mt-0.5" />
            <div className="space-y-2 text-xs text-slate-400 leading-relaxed">
              <p>
                <span className="text-slate-300 font-semibold">Preprocessing pipeline</span> — Raw LiDAR output is denoised using statistical outlier removal (Open3D), 
                voxel-downsampled to 0.05m resolution, and Z-normalised before CNN inference.
              </p>
              <p>
                <span className="text-slate-300 font-semibold">Deep learning model</span> — PointNet++ processes 3D point clouds directly, learning local geometric features 
                (cracks, displaced beams, rubble profiles) without converting to 2D images. Trained 50 epochs, Adam optimizer, lr=0.001, 
                70/30 stratified split across 10,000 samples.
              </p>
              <p>
                <span className="text-slate-300 font-semibold">Paper results</span> — 89% accuracy, 88% precision, 90% recall, 89 F1-score — outperforming satellite (71%) 
                and UAV camera (78%) baselines. Response time reduced to ~28ms vs 95ms UAV and 180ms satellite.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
