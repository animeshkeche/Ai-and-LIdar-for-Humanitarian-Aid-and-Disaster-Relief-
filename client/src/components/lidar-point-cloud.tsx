import { useEffect, useRef, useState } from "react";

interface LidarPointCloudProps {
  severity?: "low" | "moderate" | "severe";
  onScanComplete?: () => void;
}

type Point3D = { x: number; y: number; z: number; r: number; g: number; b: number; revealed: boolean };

function buildCloud(severity: "low" | "moderate" | "severe"): Point3D[] {
  const points: Point3D[] = [];
  const damageFactor = severity === "severe" ? 0.88 : severity === "moderate" ? 0.5 : 0.15;
  const count = 3200;

  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const radius = Math.pow(Math.random(), 0.5) * 9;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    const dist = Math.sqrt(x * x + z * z);

    let y = 0;
    let r = 0.3, g = 0.6, b = 0.3;

    if (dist < 2.5) {
      const collapsed = Math.random() < damageFactor;
      if (collapsed) {
        y = Math.random() * 0.8;
        r = 0.95; g = 0.18 + Math.random() * 0.15; b = 0.08;
      } else {
        y = 1.8 + Math.random() * 3.5;
        r = 0.15; g = 0.55 + Math.random() * 0.2; b = 0.95;
      }
    } else if (dist < 5.5) {
      const debris = Math.random() < damageFactor * 0.7;
      if (debris) {
        y = Math.random() * damageFactor * 1.6;
        r = 0.92; g = 0.48 + Math.random() * 0.25; b = 0.06;
      } else {
        y = Math.random() * 0.25;
        r = 0.22; g = 0.52 + Math.random() * 0.18; b = 0.22;
      }
    } else {
      y = (Math.random() - 0.5) * 0.35;
    }

    y += (Math.random() - 0.5) * 0.06;

    points.push({
      x: x + (Math.random() - 0.5) * 0.25,
      y,
      z: z + (Math.random() - 0.5) * 0.25,
      r, g, b,
      revealed: false,
    });
  }
  return points;
}

function project(
  px: number, py: number, pz: number,
  camX: number, camY: number, camZ: number,
  targetX: number, targetY: number, targetZ: number,
  fov: number, w: number, h: number
): { sx: number; sy: number; sz: number } | null {
  // Translate
  const dx = px - camX, dy = py - camY, dz = pz - camZ;
  // Look-at basis
  const fwdX = targetX - camX, fwdY = targetY - camY, fwdZ = targetZ - camZ;
  const fwdLen = Math.sqrt(fwdX * fwdX + fwdY * fwdY + fwdZ * fwdZ);
  const fx = fwdX / fwdLen, fy = fwdY / fwdLen, fz = fwdZ / fwdLen;
  const upX = 0, upY = 1, upZ = 0;
  // Right = fwd x up
  const rx = fy * upZ - fz * upY, ry = fz * upX - fx * upZ, rz = fx * upY - fy * upX;
  const rLen = Math.sqrt(rx * rx + ry * ry + rz * rz);
  const rrx = rx / rLen, rry = ry / rLen, rrz = rz / rLen;
  // Up = right x fwd
  const uux = rry * fz - rrz * fy, uuy = rrz * fx - rrx * fz, uuz = rrx * fy - rry * fx;

  const cx = dx * rrx + dy * rry + dz * rrz;
  const cy = dx * uux + dy * uuy + dz * uuz;
  const cz = dx * fx + dy * fy + dz * fz;

  if (cz <= 0.1) return null;
  const f = fov / cz;
  return { sx: cx * f + w / 2, sy: -cy * f + h / 2, sz: cz };
}

export default function LidarPointCloud({ severity = "moderate", onScanComplete }: LidarPointCloudProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef({
    points: [] as Point3D[],
    scanAngle: 0,
    rotY: 0,
    isDragging: false,
    lastX: 0,
    revealedCount: 0,
    startTime: Date.now(),
    done: false,
  });
  const frameRef = useRef(0);
  const [scanPct, setScanPct] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    stateRef.current.points = buildCloud(severity);
    stateRef.current.startTime = Date.now();
    stateRef.current.scanAngle = 0;
    stateRef.current.rotY = 0;
    stateRef.current.revealedCount = 0;
    stateRef.current.done = false;
    setDone(false);
    setScanPct(0);

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const SCAN_DURATION = 4200;
    const CAM_DIST = 17;
    const CAM_ELEV = 0.45;
    const FOV = 480;

    const draw = () => {
      const s = stateRef.current;
      const w = canvas.width;
      const h = canvas.height;

      ctx.fillStyle = "#080e19";
      ctx.fillRect(0, 0, w, h);

      const elapsed = Date.now() - s.startTime;
      const pct = Math.min(elapsed / SCAN_DURATION, 1);

      // Auto-rotate + drag
      if (!s.isDragging) s.rotY += 0.008;
      s.scanAngle += 0.055;

      // Camera position
      const camX = Math.cos(s.rotY) * Math.cos(CAM_ELEV) * CAM_DIST;
      const camY = Math.sin(CAM_ELEV) * CAM_DIST * 0.55 + 1;
      const camZ = Math.sin(s.rotY) * Math.cos(CAM_ELEV) * CAM_DIST;

      // Draw grid
      ctx.strokeStyle = "rgba(20,50,80,0.7)";
      ctx.lineWidth = 0.5;
      for (let i = -9; i <= 9; i++) {
        const a = project(i, 0, -9, camX, camY, camZ, 0, 1, 0, FOV, w, h);
        const b = project(i, 0, 9, camX, camY, camZ, 0, 1, 0, FOV, w, h);
        const c = project(-9, 0, i, camX, camY, camZ, 0, 1, 0, FOV, w, h);
        const d = project(9, 0, i, camX, camY, camZ, 0, 1, 0, FOV, w, h);
        if (a && b) { ctx.beginPath(); ctx.moveTo(a.sx, a.sy); ctx.lineTo(b.sx, b.sy); ctx.stroke(); }
        if (c && d) { ctx.beginPath(); ctx.moveTo(c.sx, c.sy); ctx.lineTo(d.sx, d.sy); ctx.stroke(); }
      }

      // Draw sensor origin (drone/UAV above)
      const origin = project(0, 6.5, 0, camX, camY, camZ, 0, 1, 0, FOV, w, h);
      if (origin) {
        ctx.beginPath();
        ctx.arc(origin.sx, origin.sy, 5, 0, Math.PI * 2);
        ctx.fillStyle = "#00d4ff";
        ctx.fill();
        ctx.beginPath();
        ctx.arc(origin.sx, origin.sy, 9, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(0,212,255,0.3)";
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      // Draw rotating scan beam from sensor to ground
      const beamEndX = Math.cos(s.scanAngle) * 9;
      const beamEndZ = Math.sin(s.scanAngle) * 9;
      const beamEnd = project(beamEndX, 0, beamEndZ, camX, camY, camZ, 0, 1, 0, FOV, w, h);
      if (origin && beamEnd) {
        const grad = ctx.createLinearGradient(origin.sx, origin.sy, beamEnd.sx, beamEnd.sy);
        grad.addColorStop(0, "rgba(0,212,255,0.6)");
        grad.addColorStop(1, "rgba(0,212,255,0)");
        ctx.beginPath();
        ctx.moveTo(origin.sx, origin.sy);
        ctx.lineTo(beamEnd.sx, beamEnd.sy);
        ctx.strokeStyle = grad;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Sweep fan
        const fanAngle = 0.18;
        for (let fi = 0; fi < 6; fi++) {
          const fa = s.scanAngle - fi * fanAngle * 0.5;
          const fex = Math.cos(fa) * (9 - fi * 0.3);
          const fez = Math.sin(fa) * (9 - fi * 0.3);
          const fend = project(fex, 0, fez, camX, camY, camZ, 0, 1, 0, FOV, w, h);
          if (fend && origin) {
            ctx.beginPath();
            ctx.moveTo(origin.sx, origin.sy);
            ctx.lineTo(fend.sx, fend.sy);
            ctx.strokeStyle = `rgba(0,212,255,${0.06 - fi * 0.01})`;
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        }
      }

      // Reveal points based on scan angle and progress
      const totalPoints = s.points.length;
      const targetRevealed = Math.floor(pct * totalPoints);
      for (let i = s.revealedCount; i < targetRevealed; i++) {
        const pt = s.points[i];
        const ptAngle = Math.atan2(pt.z, pt.x);
        const scanA = ((s.scanAngle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
        const ptA = ((ptAngle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
        const diff = Math.abs(scanA - ptA);
        if (diff < 0.9 || diff > Math.PI * 2 - 0.9 || pct > 0.8) {
          pt.revealed = true;
        }
      }
      s.revealedCount = targetRevealed;

      // Collect & sort revealed points by depth
      const visible: { sx: number; sy: number; sz: number; r: number; g: number; b: number }[] = [];
      for (const pt of s.points) {
        if (!pt.revealed) continue;
        const proj = project(pt.x, pt.y, pt.z, camX, camY, camZ, 0, 1, 0, FOV, w, h);
        if (!proj) continue;
        visible.push({ ...proj, r: pt.r, g: pt.g, b: pt.b });
      }
      visible.sort((a, b) => b.sz - a.sz);

      // Draw points
      for (const v of visible) {
        const size = Math.max(1, Math.min(3.5, 200 / v.sz));
        const ri = Math.floor(v.r * 255);
        const gi = Math.floor(v.g * 255);
        const bi = Math.floor(v.b * 255);
        ctx.beginPath();
        ctx.arc(v.sx, v.sy, size, 0, Math.PI * 2);
        ctx.fillStyle = `rgb(${ri},${gi},${bi})`;
        ctx.globalAlpha = Math.min(1, 0.85 + size * 0.04);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // Update pct
      setScanPct(Math.round(pct * 100));
      if (pct >= 1 && !s.done) {
        s.done = true;
        // Reveal all
        for (const pt of s.points) pt.revealed = true;
        setDone(true);
        onScanComplete?.();
      }

      frameRef.current = requestAnimationFrame(draw);
    };

    frameRef.current = requestAnimationFrame(draw);

    // Mouse drag
    const onDown = (e: MouseEvent) => { stateRef.current.isDragging = true; stateRef.current.lastX = e.clientX; };
    const onUp = () => { stateRef.current.isDragging = false; };
    const onMove = (e: MouseEvent) => {
      if (!stateRef.current.isDragging) return;
      stateRef.current.rotY += (e.clientX - stateRef.current.lastX) * 0.012;
      stateRef.current.lastX = e.clientX;
    };
    const onTouch = (e: TouchEvent) => { stateRef.current.rotY += (e.touches[0].clientX - stateRef.current.lastX) * 0.012; stateRef.current.lastX = e.touches[0].clientX; };

    canvas.addEventListener("mousedown", onDown);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("mousemove", onMove);
    canvas.addEventListener("touchmove", onTouch);

    // Resize
    const resize = () => {
      if (!canvas.parentElement) return;
      canvas.width = canvas.parentElement.clientWidth;
      canvas.height = canvas.parentElement.clientHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    return () => {
      cancelAnimationFrame(frameRef.current);
      canvas.removeEventListener("mousedown", onDown);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("mousemove", onMove);
      canvas.removeEventListener("touchmove", onTouch);
      window.removeEventListener("resize", resize);
    };
  }, [severity]);

  return (
    <div className="relative w-full h-full bg-[#080e19]">
      <canvas
        ref={canvasRef}
        className="w-full h-full cursor-grab active:cursor-grabbing"
        style={{ display: "block" }}
      />

      {/* Scan progress */}
      {!done && (
        <div className="absolute bottom-3 left-3 right-12">
          <div className="flex items-center justify-between text-[10px] text-cyan-400 mb-1 font-mono">
            <span>◉ LiDAR SCAN IN PROGRESS</span>
            <span className="font-bold">{scanPct}%</span>
          </div>
          <div className="h-1 bg-slate-700/80 rounded-full overflow-hidden">
            <div
              className="h-full bg-cyan-400 rounded-full"
              style={{ width: `${scanPct}%`, transition: "width 0.1s linear" }}
            />
          </div>
        </div>
      )}
      {done && (
        <div className="absolute bottom-3 left-3 flex items-center gap-2 text-[10px] text-green-400 font-mono font-bold">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse inline-block" />
          SCAN COMPLETE · CNN CLASSIFICATION APPLIED
        </div>
      )}

      {/* Color legend overlay */}
      <div className="absolute top-3 left-3 space-y-1">
        {[
          { color: "#3d99f5", label: "Intact" },
          { color: "#ef4444", label: "Collapsed" },
          { color: "#f59e0b", label: "Debris" },
          { color: "#22c55e", label: "Ground" },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
            <span className="text-[9px] text-slate-400 font-mono">{label}</span>
          </div>
        ))}
      </div>

      <div className="absolute top-3 right-3 text-[9px] text-slate-600 font-mono">drag to rotate</div>
    </div>
  );
}
