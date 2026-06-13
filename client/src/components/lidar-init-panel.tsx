import { useState, useEffect, useRef } from "react";
import { CheckCircle2, Circle, Loader2, Wifi, WifiOff, Zap, Radio } from "lucide-react";
import { cn } from "@/lib/utils";

interface InitStep {
  id: string;
  label: string;
  detail: string;
  durationMs: number;
  status: "pending" | "running" | "done" | "error";
}

const INIT_STEPS: Omit<InitStep, "status">[] = [
  { id: "power", label: "Sensor Power-On", detail: "Velodyne VLP-32C · 12V DC · 10W", durationMs: 600 },
  { id: "motor", label: "Motor Spin-Up", detail: "Rotating mirror assembly · 10–20 Hz target", durationMs: 900 },
  { id: "laser", label: "Laser Array Init", detail: "32 laser emitters · 903 nm wavelength", durationMs: 500 },
  { id: "calibration", label: "Factory Calibration Load", detail: "Loading beam angle offsets & intensity corrections", durationMs: 700 },
  { id: "network", label: "UDP Network Bind", detail: "192.168.1.201:2368 · PCAP stream ready", durationMs: 400 },
  { id: "lidar_sync", label: "GPS Time Sync", detail: "PPS signal · NMEA timestamp alignment", durationMs: 800 },
  { id: "selftest", label: "Self-Test & Diagnostics", detail: "Internal temperature 28°C · Voltage nominal", durationMs: 600 },
  { id: "pointcloud", label: "Point Cloud Pipeline", detail: "Open3D preprocessing · voxel downsampling 0.05m", durationMs: 900 },
  { id: "cnn", label: "CNN Model Load", detail: "PointNet++ weights · 89% accuracy checkpoint", durationMs: 1100 },
  { id: "ready", label: "System Ready", detail: "AI-LiDAR framework operational · 360° scan active", durationMs: 300 },
];

interface Props {
  onComplete?: () => void;
  autoStart?: boolean;
}

const sensorParams = [
  { label: "Model", value: "Velodyne VLP-32C" },
  { label: "Channels", value: "32 beam" },
  { label: "Range", value: "200 m max" },
  { label: "Accuracy", value: "±3 cm" },
  { label: "Scan Rate", value: "10–20 Hz" },
  { label: "Points/sec", value: "600,000+" },
  { label: "FOV (H)", value: "360°" },
  { label: "FOV (V)", value: "−25° to +15°" },
  { label: "Wavelength", value: "903 nm" },
  { label: "IP Rating", value: "IP67" },
];

export default function LidarInitPanel({ onComplete, autoStart = false }: Props) {
  const [steps, setSteps] = useState<InitStep[]>(
    INIT_STEPS.map((s) => ({ ...s, status: "pending" }))
  );
  const [started, setStarted] = useState(autoStart);
  const [done, setDone] = useState(false);
  const [scanRate, setScanRate] = useState(0);
  const [pointsPerSec, setPointsPerSec] = useState(0);
  const [temp, setTemp] = useState(0);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!started) return;

    let stepIdx = 0;

    const runNext = () => {
      if (stepIdx >= INIT_STEPS.length) {
        setDone(true);
        onComplete?.();
        return;
      }

      const currentIdx = stepIdx;
      setSteps((prev) =>
        prev.map((s, i) => (i === currentIdx ? { ...s, status: "running" } : s))
      );

      setTimeout(() => {
        setSteps((prev) =>
          prev.map((s, i) => (i === currentIdx ? { ...s, status: "done" } : s))
        );
        stepIdx++;
        setTimeout(runNext, 80);
      }, INIT_STEPS[currentIdx].durationMs);
    };

    runNext();
  }, [started]);

  // Animate live sensor readings once done
  useEffect(() => {
    if (!done) return;
    setScanRate(10);
    setPointsPerSec(0);
    setTemp(28);

    let t = 0;
    tickRef.current = setInterval(() => {
      t += 1;
      setScanRate(10 + Math.sin(t * 0.3) * 2);
      setPointsPerSec(580000 + Math.floor(Math.sin(t * 0.2) * 20000));
      setTemp(28 + Math.sin(t * 0.1) * 1.5);
    }, 200);

    return () => { if (tickRef.current) clearInterval(tickRef.current); };
  }, [done]);

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Sensor spec header */}
      <div className="flex items-center gap-3 p-3 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
        <div className="relative flex-shrink-0">
          <Radio className={cn("h-7 w-7", done ? "text-cyan-400" : started ? "text-cyan-300 animate-pulse" : "text-slate-500")} />
          {done && (
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-slate-900" />
          )}
        </div>
        <div>
          <div className="text-sm font-bold text-slate-100">Velodyne VLP-32C LiDAR</div>
          <div className="text-xs text-slate-400 font-mono">SN: VLP32-20241108-07432</div>
        </div>
        <div className="ml-auto">
          {!started && (
            <button
              onClick={() => setStarted(true)}
              className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold transition-colors"
            >
              <Zap className="h-3.5 w-3.5" />
              Initialize
            </button>
          )}
          {started && !done && (
            <span className="flex items-center gap-1.5 text-xs text-cyan-400 font-mono">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Initializing...
            </span>
          )}
          {done && (
            <span className="flex items-center gap-1.5 text-xs text-green-400 font-mono font-bold">
              <CheckCircle2 className="h-3.5 w-3.5" />
              ONLINE
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1 min-h-0">
        {/* Init sequence log */}
        <div className="flex flex-col gap-1.5 overflow-y-auto pr-1">
          <div className="text-[10px] text-slate-500 font-mono uppercase tracking-wider mb-1">Init Sequence Log</div>
          {steps.map((step) => (
            <div
              key={step.id}
              className={cn(
                "flex items-start gap-2.5 p-2 rounded-lg transition-all duration-300",
                step.status === "done" && "bg-slate-800/40",
                step.status === "running" && "bg-cyan-500/10 border border-cyan-500/20",
                step.status === "pending" && "opacity-40"
              )}
            >
              <div className="flex-shrink-0 mt-0.5">
                {step.status === "done" && <CheckCircle2 className="h-3.5 w-3.5 text-green-400" />}
                {step.status === "running" && <Loader2 className="h-3.5 w-3.5 text-cyan-400 animate-spin" />}
                {step.status === "pending" && <Circle className="h-3.5 w-3.5 text-slate-600" />}
              </div>
              <div>
                <div className={cn(
                  "text-xs font-medium",
                  step.status === "done" ? "text-slate-300" :
                  step.status === "running" ? "text-cyan-300" : "text-slate-500"
                )}>{step.label}</div>
                <div className="text-[10px] text-slate-500 font-mono mt-0.5">{step.detail}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Right column: specs + live readings */}
        <div className="flex flex-col gap-3">
          {/* Sensor specs */}
          <div>
            <div className="text-[10px] text-slate-500 font-mono uppercase tracking-wider mb-2">Sensor Specifications</div>
            <div className="grid grid-cols-2 gap-1">
              {sensorParams.map(({ label, value }) => (
                <div key={label} className="flex flex-col p-1.5 rounded bg-slate-800/50">
                  <span className="text-[9px] text-slate-500 uppercase tracking-wider">{label}</span>
                  <span className="text-xs font-mono font-semibold text-slate-200">{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Live telemetry */}
          {done && (
            <div>
              <div className="text-[10px] text-slate-500 font-mono uppercase tracking-wider mb-2">Live Telemetry</div>
              <div className="space-y-2">
                <TelemetryBar label="Scan Rate" value={scanRate.toFixed(1)} unit="Hz" pct={(scanRate / 20) * 100} color="bg-cyan-500" />
                <TelemetryBar label="Points/sec" value={(pointsPerSec / 1000).toFixed(0) + "K"} unit="" pct={(pointsPerSec / 600000) * 100} color="bg-blue-500" />
                <TelemetryBar label="Temp" value={temp.toFixed(1)} unit="°C" pct={(temp / 70) * 100} color={temp > 50 ? "bg-red-500" : "bg-green-500"} />
                <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-800/50">
                  <Wifi className="h-3.5 w-3.5 text-green-400" />
                  <span className="text-xs text-slate-300 font-mono">UDP · 192.168.1.201:2368</span>
                  <span className="ml-auto text-[10px] text-green-400 font-mono font-bold">LIVE</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TelemetryBar({ label, value, unit, pct, color }: {
  label: string; value: string; unit: string; pct: number; color: string;
}) {
  return (
    <div className="p-2 rounded-lg bg-slate-800/50">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] text-slate-400 uppercase tracking-wider">{label}</span>
        <span className="text-xs font-mono font-bold text-slate-200">{value} {unit}</span>
      </div>
      <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ${color}`}
          style={{ width: `${Math.min(100, pct)}%` }}
        />
      </div>
    </div>
  );
}
