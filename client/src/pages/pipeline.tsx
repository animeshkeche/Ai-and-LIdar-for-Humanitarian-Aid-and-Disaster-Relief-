import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useRealtime } from "@/hooks/use-realtime";
import {
  Brain, Layers, Cpu, ChevronRight, CheckCircle2, BarChart2, Target, TrendingUp
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Cell, ScatterChart, Scatter, ZAxis
} from "recharts";

// Paper Table 3 exact values
const PAPER_RESULTS = [
  { method: "Satellite", accuracy: 71, precision: 69, recall: 68, f1: 68.5, responseMs: 180, color: "#6b7280" },
  { method: "UAV Camera", accuracy: 78, precision: 76, recall: 75, f1: 75.5, responseMs: 95, color: "#8b5cf6" },
  { method: "AI+LiDAR", accuracy: 89, precision: 88, recall: 90, f1: 89, responseMs: 28, color: "#3b82f6" },
];

// Simulated confusion matrix from paper Fig. 3
const CONFUSION = {
  labels: ["Low", "Moderate", "Severe"],
  matrix: [
    [145, 12, 3],   // predicted Low
    [15, 138, 17],  // predicted Moderate
    [2, 14, 154],   // predicted Severe
  ],
};

const PIPELINE_STAGES = [
  {
    id: "acquisition", icon: "📡", title: "LiDAR Acquisition",
    badge: "Hardware", color: "border-cyan-500/30 bg-cyan-500/5",
    steps: [
      "Velodyne VLP-32C emits 32 laser beams at 903nm",
      "360° horizontal FOV, −25° to +15° vertical",
      "600,000+ points/second at 10–20 Hz spin rate",
      "Raw XYZ+Intensity data streamed via UDP:2368",
      "GPS-timestamped PCAP packets captured",
    ],
    metric: "600K pts/s", metricLabel: "Throughput",
  },
  {
    id: "preprocessing", icon: "⚙️", title: "Preprocessing (Open3D + NumPy)",
    badge: "Python", color: "border-amber-500/30 bg-amber-500/5",
    steps: [
      "Statistical Outlier Removal (k=20, std=2.0)",
      "Voxel Downsampling — 0.05m uniform grid",
      "RANSAC Ground Plane Removal (threshold 0.3m)",
      "Point Normal Estimation (radius 0.1m)",
      "Local Neighbourhood Grouping for PointNet++",
    ],
    metric: "~40ms", metricLabel: "Pipeline Time",
  },
  {
    id: "cnn", icon: "🧠", title: "PointNet++ CNN Classification",
    badge: "PyTorch", color: "border-purple-500/30 bg-purple-500/5",
    steps: [
      "Set Abstraction Layer 1: N→512 pts, 32-dim features",
      "Set Abstraction Layer 2: 512→128 pts, 64-dim features",
      "Set Abstraction Layer 3: 128→64 pts, 128-dim features",
      "Feature Propagation (3 upsample layers)",
      "Conv1D+ReLU+Dropout → Softmax(3 classes)",
    ],
    metric: "50 epochs", metricLabel: "Training (Adam lr=0.001)",
  },
  {
    id: "severity", icon: "🗺️", title: "Damage Severity Mapping",
    badge: "Output", color: "border-green-500/30 bg-green-500/5",
    steps: [
      "Per-point classification: Low / Moderate / Severe",
      "Cluster contiguous damage zones (DBSCAN)",
      "Compute affected area (km²) per severity class",
      "Structure count via building footprint overlay",
      "Confidence score from softmax output probability",
    ],
    metric: "3 classes", metricLabel: "Low / Moderate / Severe",
  },
  {
    id: "decision", icon: "🚨", title: "Decision Support Output",
    badge: "Humanitarian", color: "border-red-500/30 bg-red-500/5",
    steps: [
      "Priority zone ranking (severity × affected structures)",
      "Safe approach path generation",
      "Rescue team deployment recommendations",
      "Resource estimation (personnel, vehicles, supplies)",
      "Real-time alert broadcast to emergency teams",
    ],
    metric: "<1s", metricLabel: "Decision Latency",
  },
];

const tooltipStyle = {
  contentStyle: { backgroundColor: "#1e293b", border: "1px solid #334155", borderRadius: "8px" },
  labelStyle: { color: "#e2e8f0" },
  itemStyle: { color: "#94a3b8" },
};

function ConfusionCell({ value, max, label }: { value: number; max: number; label: string }) {
  const intensity = value / max;
  const bg = `rgba(59,130,246,${0.1 + intensity * 0.7})`;
  const text = intensity > 0.4 ? "text-white" : "text-slate-300";
  return (
    <div
      className={`flex flex-col items-center justify-center h-14 rounded text-center ${text} text-xs font-mono font-bold transition-colors`}
      style={{ backgroundColor: bg, border: `1px solid rgba(59,130,246,${0.1 + intensity * 0.5})` }}
      title={label}
    >
      {value}
    </div>
  );
}

export default function PipelinePage() {
  const [selectedStage, setSelectedStage] = useState<string | null>(null);
  const { getLatest } = useRealtime();
  const cnnLayer = getLatest("cnn:layer");

  const maxCell = Math.max(...CONFUSION.matrix.flat());

  const total = CONFUSION.matrix.flat().reduce((a, b) => a + b, 0);
  const correct = CONFUSION.matrix.reduce((s, row, i) => s + row[i], 0);
  const overallAcc = ((correct / total) * 100).toFixed(1);

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Brain className="h-6 w-6 text-purple-400" />
          AI-LiDAR Processing Pipeline
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Full 5-stage pipeline from the research paper — acquisition → preprocessing → CNN → severity mapping → decision support
        </p>
      </div>

      {/* Pipeline flow */}
      <div className="space-y-3">
        {PIPELINE_STAGES.map((stage, idx) => (
          <div key={stage.id}>
            <button
              className={`w-full text-left p-4 rounded-xl border transition-all ${stage.color} ${selectedStage === stage.id ? "ring-1 ring-white/20" : "hover:brightness-110"}`}
              onClick={() => setSelectedStage(selectedStage === stage.id ? null : stage.id)}
            >
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-800/60 text-lg flex-shrink-0">
                  {stage.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-slate-100">{stage.title}</span>
                    <Badge className="text-[9px] px-1.5 py-0 bg-slate-700/60 text-slate-400 border-slate-600/40">{stage.badge}</Badge>
                  </div>
                  {selectedStage !== stage.id && (
                    <p className="text-[10px] text-slate-400 mt-0.5">{stage.steps[0]}</p>
                  )}
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-sm font-bold text-slate-100 tabular-nums">{stage.metric}</div>
                  <div className="text-[10px] text-slate-400">{stage.metricLabel}</div>
                </div>
                <ChevronRight className={`h-4 w-4 text-slate-500 transition-transform ${selectedStage === stage.id ? "rotate-90" : ""}`} />
              </div>

              {selectedStage === stage.id && (
                <div className="mt-3 pt-3 border-t border-white/10 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {stage.steps.map((step, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-green-400 flex-shrink-0 mt-0.5" />
                      <span className="text-xs text-slate-300">{step}</span>
                    </div>
                  ))}
                </div>
              )}
            </button>

            {idx < PIPELINE_STAGES.length - 1 && (
              <div className="flex justify-center my-1">
                <div className="w-px h-4 bg-slate-600" />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Live CNN layer (if streaming) */}
      {cnnLayer && (
        <Card className="bg-purple-900/20 border-purple-500/30">
          <CardContent className="p-3 flex items-center gap-3">
            <Cpu className="h-4 w-4 text-purple-400 animate-pulse flex-shrink-0" />
            <div className="flex-1">
              <div className="text-xs font-mono text-purple-300">{cnnLayer.layer}</div>
              <div className="text-[10px] text-purple-400/70">{cnnLayer.inputDim} → {cnnLayer.outputDim} · {cnnLayer.activations.toLocaleString()} activations</div>
            </div>
            <span className="text-xs font-mono text-purple-300 font-bold">{cnnLayer.timeMs}ms</span>
          </CardContent>
        </Card>
      )}

      {/* Results section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Method comparison */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-blue-400" />
              Paper Results — Table 3
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {PAPER_RESULTS.map((r) => (
              <div key={r.method} className={`p-3 rounded-lg border ${r.method === "AI+LiDAR" ? "border-blue-500/30 bg-blue-500/5" : "border-slate-600/30 bg-slate-700/20"}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-200">{r.method}</span>
                  <Badge className={r.method === "AI+LiDAR" ? "bg-blue-500/20 text-blue-300 border-blue-500/30 text-[10px]" : "bg-slate-600/30 text-slate-400 border-slate-600/30 text-[10px]"}>
                    {r.method === "AI+LiDAR" ? "PROPOSED" : "BASELINE"}
                  </Badge>
                </div>
                <div className="grid grid-cols-4 gap-2 text-center">
                  {[
                    { label: "Acc", value: r.accuracy },
                    { label: "Prec", value: r.precision },
                    { label: "Recall", value: r.recall },
                    { label: "F1", value: r.f1 },
                  ].map(({ label, value }) => (
                    <div key={label}>
                      <div className="text-[9px] text-slate-500 uppercase">{label}</div>
                      <div style={{ color: r.color }} className="text-sm font-bold tabular-nums">{value}%</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Confusion matrix */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <Target className="h-4 w-4 text-green-400" />
              Confusion Matrix — Fig. 3
              <span className="ml-auto text-[10px] text-green-400 font-mono font-bold">{overallAcc}% acc</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="grid grid-cols-4 gap-1.5 text-[10px] text-slate-400 font-mono">
                <div />
                {CONFUSION.labels.map((l) => (
                  <div key={l} className="text-center font-semibold">{l}</div>
                ))}
              </div>
              {CONFUSION.matrix.map((row, ri) => (
                <div key={ri} className="grid grid-cols-4 gap-1.5 items-center">
                  <div className="text-[10px] text-slate-400 font-mono text-right pr-1">{CONFUSION.labels[ri]}</div>
                  {row.map((val, ci) => (
                    <ConfusionCell
                      key={ci}
                      value={val}
                      max={maxCell}
                      label={`Actual: ${CONFUSION.labels[ci]}, Predicted: ${CONFUSION.labels[ri]}`}
                    />
                  ))}
                </div>
              ))}
              <div className="grid grid-cols-4 gap-1.5">
                <div />
                <div className="col-span-3 text-[9px] text-slate-500 text-center font-mono pt-1">← Actual Class →</div>
              </div>
              <div className="flex items-center gap-2 pt-1 flex-wrap">
                <div className="w-3 h-3 rounded" style={{ backgroundColor: "rgba(59,130,246,0.1)" }} />
                <span className="text-[10px] text-slate-500">Low</span>
                <div className="w-3 h-3 rounded" style={{ backgroundColor: "rgba(59,130,246,0.5)" }} />
                <span className="text-[10px] text-slate-500">Medium</span>
                <div className="w-3 h-3 rounded" style={{ backgroundColor: "rgba(59,130,246,0.8)" }} />
                <span className="text-[10px] text-slate-500">High (diagonal = correct)</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bar comparison */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-slate-200 flex items-center gap-2">
            <BarChart2 className="h-4 w-4 text-cyan-400" />
            All Metrics Comparison — Satellite vs UAV Camera vs AI+LiDAR
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={PAPER_RESULTS}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="method" tick={{ fontSize: 11, fill: "#94a3b8" }} />
              <YAxis domain={[60, 95]} tick={{ fontSize: 10, fill: "#94a3b8" }} unit="%" />
              <Tooltip {...tooltipStyle} />
              {["accuracy", "precision", "recall", "f1"].map((key, i) => (
                <Bar key={key} dataKey={key} fill={["#3b82f6", "#8b5cf6", "#06b6d4", "#22c55e"][i]} radius={[3, 3, 0, 0]} name={key.charAt(0).toUpperCase() + key.slice(1)} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
