import { useEffect, useRef, useState } from "react";

interface LidarPointCloudProps {
  severity?: "low" | "moderate" | "severe";
  onScanComplete?: () => void;
}

// ── 3D math helpers ──────────────────────────────────────────────────────────
type V3 = [number, number, number];

function project(
  [px, py, pz]: V3,
  camX: number, camY: number, camZ: number,
  rotY: number, FOV: number, W: number, H: number
): { sx: number; sy: number; sz: number } | null {
  // Translate to camera space (orbit around origin)
  const tx = px - 0, ty = py - 0, tz = pz - 0;
  // Rotate around Y axis (horizontal orbit)
  const rx = tx * Math.cos(-rotY) + tz * Math.sin(-rotY);
  const rz = -tx * Math.sin(-rotY) + tz * Math.cos(-rotY);
  // Camera elevation
  const ey = ty - camY;
  const ez = rz - camZ;
  if (ez <= 0.05) return null;
  const f = FOV / ez;
  return { sx: rx * f + W / 2, sy: -ey * f + H / 2, sz: ez };
}

function line(
  ctx: CanvasRenderingContext2D,
  a: ReturnType<typeof project>,
  b: ReturnType<typeof project>
) {
  if (!a || !b) return;
  ctx.beginPath();
  ctx.moveTo(a.sx, a.sy);
  ctx.lineTo(b.sx, b.sy);
  ctx.stroke();
}

// ── Building definition ──────────────────────────────────────────────────────
type BuildingState = "intact" | "partial" | "collapsed";

interface Building {
  x: number; z: number;          // ground centre
  w: number; d: number;          // width, depth
  floors: number;                 // floor count
  state: BuildingState;
  collapseRatio: number;          // 0 = full height, 1 = flat rubble
}

const FLOOR_H = 0.9;

function makeBuildings(severity: "low" | "moderate" | "severe"): Building[] {
  const layout: [number, number, number, number, number][] = [
    // x, z, w, d, floors
    [-6, -6, 1.8, 1.4, 4],  [-3.5, -6, 1.6, 1.2, 6],  [-1, -6, 2.0, 1.6, 3],
    [2,  -6, 1.8, 1.4, 5],  [5,    -6, 1.5, 1.3, 7],
    [-6, -2, 1.6, 1.8, 5],  [-3,   -2, 2.2, 1.6, 8],  [1,  -2, 1.8, 2.0, 4],
    [4.5,-2, 1.5, 1.4, 6],
    [-5.5,2, 1.8, 1.6, 3],  [-2,    2, 2.0, 1.8, 5],  [1.5, 2, 1.6, 1.4, 7],
    [4.5, 2, 1.8, 1.6, 4],
    [-4,  6, 2.0, 1.8, 6],  [0,     6, 2.2, 1.6, 3],  [3.5, 6, 1.8, 1.4, 5],
    // Large civic buildings
    [-1, -9.5, 3.5, 2.5, 2], [3, -9.5, 2.5, 2.0, 2],
    // Isolated structures
    [7.5,-4, 1.2, 1.0, 3],  [7.5,0, 1.2, 1.0, 4],  [-8.5,-3, 1.4, 1.2, 3],
  ];

  const damageSeed = severity === "severe" ? 0.9 : severity === "moderate" ? 0.5 : 0.15;

  return layout.map(([x, z, w, d, floors], i) => {
    const r = Math.sin(i * 13.7 + 1.1) * 0.5 + 0.5;
    let state: BuildingState = "intact";
    let collapseRatio = 0;
    if (r < damageSeed) {
      state = r < damageSeed * 0.55 ? "collapsed" : "partial";
      collapseRatio = state === "collapsed" ? 0.88 + r * 0.1 : 0.3 + r * 0.35;
    }
    return { x, z, w, d, floors, state, collapseRatio };
  });
}

function makeTerrain(): V3[] {
  const pts: V3[] = [];
  for (let xi = -11; xi <= 11; xi += 0.8) {
    for (let zi = -11; zi <= 11; zi += 0.8) {
      const y = Math.sin(xi * 0.25) * 0.18 + Math.cos(zi * 0.3) * 0.14
        + Math.sin((xi + zi) * 0.15) * 0.08;
      pts.push([xi, y, zi]);
    }
  }
  return pts;
}

// ── Debris cloud around a building ──────────────────────────────────────────
function makeDebris(b: Building): V3[] {
  const pts: V3[] = [];
  const n = b.state === "collapsed" ? 60 : 25;
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = (Math.random() * 0.5 + 0.6) * Math.max(b.w, b.d);
    const px = b.x + Math.cos(a) * r * (1 + Math.random() * 0.8);
    const pz = b.z + Math.sin(a) * r * (1 + Math.random() * 0.8);
    const py = Math.random() * b.collapseRatio * 0.6;
    pts.push([px, py, pz]);
  }
  return pts;
}

// ── Draw a building wireframe ────────────────────────────────────────────────
function drawBuilding(
  ctx: CanvasRenderingContext2D,
  b: Building,
  rotY: number, FOV: number, W: number, H: number,
  revealPct: number,
  camY: number, camZ: number
) {
  const effectiveFloors = Math.max(0.15, b.floors * (1 - b.collapseRatio));
  const h = effectiveFloors * FLOOR_H;
  const hw = b.w / 2, hd = b.d / 2;

  const corners: V3[] = [
    [b.x - hw, 0,  b.z - hd],
    [b.x + hw, 0,  b.z - hd],
    [b.x + hw, 0,  b.z + hd],
    [b.x - hw, 0,  b.z + hd],
    [b.x - hw, h,  b.z - hd],
    [b.x + hw, h,  b.z - hd],
    [b.x + hw, h,  b.z + hd],
    [b.x - hw, h,  b.z + hd],
  ];

  const alpha = Math.min(1, revealPct * 2);
  if (alpha < 0.05) return;

  let edgeColor = "#3b82f6";
  let fillOpacity = 0.06;
  if (b.state === "collapsed") { edgeColor = "#ef4444"; fillOpacity = 0.1; }
  else if (b.state === "partial") { edgeColor = "#f59e0b"; fillOpacity = 0.08; }

  ctx.globalAlpha = alpha;
  ctx.strokeStyle = edgeColor;
  ctx.lineWidth = 0.8;

  const proj = corners.map((c) => project(c, 0, camY, camZ, rotY, FOV, W, H));

  // Floor plates (horizontal slabs)
  if (b.state !== "collapsed") {
    const numFloors = Math.round(effectiveFloors);
    for (let f = 0; f <= numFloors; f++) {
      const fy = f * FLOOR_H;
      if (fy > h + 0.01) break;
      const fc: V3[] = [
        [b.x - hw, fy, b.z - hd],
        [b.x + hw, fy, b.z - hd],
        [b.x + hw, fy, b.z + hd],
        [b.x - hw, fy, b.z + hd],
      ];
      const fp = fc.map((c) => project(c, 0, camY, camZ, rotY, FOV, W, H));
      ctx.strokeStyle = edgeColor + "55";
      ctx.lineWidth = 0.4;
      for (let i = 0; i < 4; i++) line(ctx, fp[i], fp[(i + 1) % 4]);
    }
  }

  // Vertical edges
  ctx.strokeStyle = edgeColor;
  ctx.lineWidth = 1.0;
  for (let i = 0; i < 4; i++) line(ctx, proj[i], proj[i + 4]);

  // Bottom rect
  ctx.lineWidth = 0.8;
  for (let i = 0; i < 4; i++) line(ctx, proj[i], proj[(i + 1) % 4]);

  // Top rect
  for (let i = 4; i < 8; i++) line(ctx, proj[i], proj[(i - 4 + 1) % 4 + 4]);

  // Roof X cross
  ctx.strokeStyle = edgeColor + "88";
  ctx.lineWidth = 0.6;
  line(ctx, proj[4], proj[6]);
  line(ctx, proj[5], proj[7]);

  // Fill faces
  if (proj[0] && proj[1] && proj[5] && proj[4]) {
    ctx.fillStyle = edgeColor;
    ctx.globalAlpha = alpha * fillOpacity;
    ctx.beginPath();
    ctx.moveTo(proj[0].sx, proj[0].sy);
    [1, 5, 4].forEach((i) => proj[i] && ctx.lineTo(proj[i].sx, proj[i].sy));
    ctx.closePath();
    ctx.fill();
    // Side face
    if (proj[1] && proj[2] && proj[6] && proj[5]) {
      ctx.beginPath();
      ctx.moveTo(proj[1].sx, proj[1].sy);
      [2, 6, 5].forEach((i) => proj[i] && ctx.lineTo(proj[i].sx, proj[i].sy));
      ctx.closePath();
      ctx.fill();
    }
  }

  // Floor label badge on first visible floor top
  if (b.state === "intact" && alpha > 0.7 && proj[4]) {
    ctx.globalAlpha = alpha * 0.75;
    ctx.fillStyle = edgeColor;
    ctx.font = "bold 9px 'Courier New', monospace";
    ctx.fillText(`${b.floors}F`, proj[4].sx + 2, proj[4].sy - 2);
  }

  ctx.globalAlpha = 1;
}

// ── Main component ───────────────────────────────────────────────────────────
export default function LidarPointCloud({ severity = "moderate", onScanComplete }: LidarPointCloudProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef({
    buildings: [] as Building[],
    terrainPts: [] as V3[],
    debrisByBuilding: [] as V3[][],
    rotY: -0.6,
    isDragging: false,
    lastX: 0,
    scanAngle: 0,
    revealPct: 0,
    startTime: Date.now(),
    done: false,
  });
  const frameRef = useRef(0);
  const [scanPct, setScanPct] = useState(0);
  const [done, setDone] = useState(false);
  const [stats, setStats] = useState({ intact: 0, partial: 0, collapsed: 0 });

  useEffect(() => {
    const s = stateRef.current;
    s.buildings = makeBuildings(severity);
    s.terrainPts = makeTerrain();
    s.debrisByBuilding = s.buildings.map((b) => b.state !== "intact" ? makeDebris(b) : []);
    s.rotY = -0.6;
    s.scanAngle = 0;
    s.revealPct = 0;
    s.startTime = Date.now();
    s.done = false;
    setDone(false);
    setScanPct(0);

    const intact = s.buildings.filter((b) => b.state === "intact").length;
    const partial = s.buildings.filter((b) => b.state === "partial").length;
    const collapsed = s.buildings.filter((b) => b.state === "collapsed").length;
    setStats({ intact, partial, collapsed });

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const SCAN_DURATION = 5500;
    const FOV = 420;
    const CAM_Y = 4.5;
    const CAM_Z = -22;

    const draw = () => {
      const W = canvas.width, H = canvas.height;
      ctx.fillStyle = "#070d18";
      ctx.fillRect(0, 0, W, H);

      const elapsed = Date.now() - s.startTime;
      const pct = Math.min(elapsed / SCAN_DURATION, 1);
      s.revealPct = pct;
      s.scanAngle += 0.04;
      if (!s.isDragging) s.rotY += 0.005;

      const rY = s.rotY, camY = CAM_Y, camZ = CAM_Z;

      // ── Grid / ground plane ───────────────────────────────────────────────
      ctx.strokeStyle = "rgba(20,50,80,0.55)";
      ctx.lineWidth = 0.5;
      for (let i = -11; i <= 11; i++) {
        const a = project([i, 0, -11], 0, camY, camZ, rY, FOV, W, H);
        const b = project([i, 0, 11], 0, camY, camZ, rY, FOV, W, H);
        const c = project([-11, 0, i], 0, camY, camZ, rY, FOV, W, H);
        const d = project([11, 0, i], 0, camY, camZ, rY, FOV, W, H);
        if (a && b) { ctx.beginPath(); ctx.moveTo(a.sx, a.sy); ctx.lineTo(b.sx, b.sy); ctx.stroke(); }
        if (c && d) { ctx.beginPath(); ctx.moveTo(c.sx, c.sy); ctx.lineTo(d.sx, d.sy); ctx.stroke(); }
      }

      // ── Roads between buildings ───────────────────────────────────────────
      ctx.strokeStyle = "rgba(40,65,100,0.7)";
      ctx.lineWidth = 2.5;
      const roadH: [V3, V3][] = [
        [[-11, 0.02, -4.5], [11, 0.02, -4.5]],
        [[-11, 0.02, 4.0],  [11, 0.02, 4.0]],
      ];
      const roadV: [V3, V3][] = [
        [[-2, 0.02, -11], [-2, 0.02, 11]],
        [[2.5, 0.02, -11], [2.5, 0.02, 11]],
      ];
      [...roadH, ...roadV].forEach(([a, b]) => {
        const pa = project(a, 0, camY, camZ, rY, FOV, W, H);
        const pb = project(b, 0, camY, camZ, rY, FOV, W, H);
        if (pa && pb) { ctx.beginPath(); ctx.moveTo(pa.sx, pa.sy); ctx.lineTo(pb.sx, pb.sy); ctx.stroke(); }
      });

      // ── Terrain elevation points ──────────────────────────────────────────
      if (pct > 0.05) {
        const terrainReveal = Math.min(1, pct * 3);
        const nShow = Math.floor(s.terrainPts.length * terrainReveal);
        for (let i = 0; i < nShow; i++) {
          const pt = s.terrainPts[i];
          const p = project(pt, 0, camY, camZ, rY, FOV, W, H);
          if (!p) continue;
          const sz = Math.max(0.8, 120 / p.sz);
          ctx.beginPath();
          ctx.arc(p.sx, p.sy, sz, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(34,100,50,${0.4 + Math.random() * 0.2})`;
          ctx.fill();
        }
      }

      // ── Buildings ─────────────────────────────────────────────────────────
      s.buildings.forEach((b, idx) => {
        const dist = Math.sqrt(b.x * b.x + b.z * b.z);
        const revealDelay = dist / 18;
        const buildPct = Math.max(0, (pct - revealDelay) / (1 - revealDelay + 0.001));
        drawBuilding(ctx, b, rY, FOV, W, H, buildPct, camY, camZ);

        // Debris points
        if (b.state !== "intact" && buildPct > 0.3) {
          const debrisPts = s.debrisByBuilding[idx];
          const nShow = Math.floor(debrisPts.length * Math.min(1, (buildPct - 0.3) / 0.7));
          for (let i = 0; i < nShow; i++) {
            const pt = debrisPts[i];
            const p = project(pt, 0, camY, camZ, rY, FOV, W, H);
            if (!p) continue;
            const sz = Math.max(1, 140 / p.sz);
            ctx.beginPath();
            ctx.arc(p.sx, p.sy, sz, 0, Math.PI * 2);
            ctx.fillStyle = b.state === "collapsed"
              ? `rgba(239,68,68,${0.6 + Math.random() * 0.3})`
              : `rgba(245,158,11,${0.5 + Math.random() * 0.3})`;
            ctx.fill();
          }
        }
      });

      // ── UAV sensor origin + rotating scan beam ────────────────────────────
      const origin = project([0, 10, 0], 0, camY, camZ, rY, FOV, W, H);
      if (origin) {
        ctx.beginPath();
        ctx.arc(origin.sx, origin.sy, 5, 0, Math.PI * 2);
        ctx.fillStyle = "#00d4ff";
        ctx.fill();
        ctx.beginPath();
        ctx.arc(origin.sx, origin.sy, 10, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(0,212,255,0.3)";
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.fillStyle = "#00d4ff";
        ctx.font = "9px 'Courier New', monospace";
        ctx.fillText("UAV", origin.sx + 7, origin.sy - 5);

        // Scan beams from UAV
        for (let bi = 0; bi < 4; bi++) {
          const ba = s.scanAngle + bi * (Math.PI / 2);
          const bex = Math.cos(ba) * 10, bez = Math.sin(ba) * 10;
          const beamEnd = project([bex, 0, bez], 0, camY, camZ, rY, FOV, W, H);
          if (beamEnd) {
            const grad = ctx.createLinearGradient(origin.sx, origin.sy, beamEnd.sx, beamEnd.sy);
            grad.addColorStop(0, "rgba(0,212,255,0.5)");
            grad.addColorStop(1, "rgba(0,212,255,0)");
            ctx.beginPath();
            ctx.moveTo(origin.sx, origin.sy);
            ctx.lineTo(beamEnd.sx, beamEnd.sy);
            ctx.strokeStyle = grad;
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        }
      }

      // ── Compass rose ──────────────────────────────────────────────────────
      const compassPts: [V3, string][] = [
        [[0, 0.1, -12], "N"], [[0, 0.1, 12], "S"],
        [[-12, 0.1, 0], "W"], [[12, 0.1, 0], "E"],
      ];
      ctx.font = "bold 9px 'Courier New', monospace";
      ctx.fillStyle = "rgba(100,150,200,0.7)";
      compassPts.forEach(([pt, label]) => {
        const p = project(pt, 0, camY, camZ, rY, FOV, W, H);
        if (p) ctx.fillText(label, p.sx - 3, p.sy + 3);
      });

      // Progress
      setScanPct(Math.round(pct * 100));
      if (pct >= 1 && !s.done) {
        s.done = true;
        setDone(true);
        onScanComplete?.();
      }

      frameRef.current = requestAnimationFrame(draw);
    };

    frameRef.current = requestAnimationFrame(draw);

    // Resize
    const resize = () => {
      if (!canvas.parentElement) return;
      canvas.width = canvas.parentElement.clientWidth;
      canvas.height = canvas.parentElement.clientHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    // Mouse drag
    const onDown = (e: MouseEvent) => { s.isDragging = true; s.lastX = e.clientX; };
    const onUp = () => { s.isDragging = false; };
    const onMove = (e: MouseEvent) => {
      if (!s.isDragging) return;
      s.rotY += (e.clientX - s.lastX) * 0.01;
      s.lastX = e.clientX;
    };
    const onTouch = (e: TouchEvent) => {
      if (e.touches.length) {
        s.rotY += (e.touches[0].clientX - s.lastX) * 0.01;
        s.lastX = e.touches[0].clientX;
      }
    };
    canvas.addEventListener("mousedown", onDown);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("mousemove", onMove);
    canvas.addEventListener("touchmove", onTouch);

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
    <div className="relative w-full h-full bg-[#070d18]">
      <canvas
        ref={canvasRef}
        className="w-full h-full cursor-grab active:cursor-grabbing"
        style={{ display: "block" }}
      />

      {/* Legend overlay */}
      <div className="absolute top-2 left-2 space-y-1 pointer-events-none">
        {[
          { color: "#3b82f6", label: "Intact structure" },
          { color: "#f59e0b", label: "Partially damaged" },
          { color: "#ef4444", label: "Collapsed" },
          { color: "#ef4444", label: "Debris field", opacity: "0.6" },
          { color: "#22c55e", label: "Ground / terrain", opacity: "0.7" },
          { color: "#00d4ff", label: "UAV sensor origin" },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-sm flex-shrink-0" style={{ backgroundColor: color }} />
            <span className="text-[9px] text-slate-400 font-mono">{label}</span>
          </div>
        ))}
      </div>

      {/* Structure count */}
      <div className="absolute top-2 right-2 space-y-1 pointer-events-none text-right">
        <div className="text-[9px] text-slate-500 font-mono uppercase tracking-wider mb-1">STRUCTURES</div>
        <div className="text-[10px] font-mono text-blue-400">✦ {stats.intact} intact</div>
        <div className="text-[10px] font-mono text-amber-400">◈ {stats.partial} partial</div>
        <div className="text-[10px] font-mono text-red-400">✕ {stats.collapsed} collapsed</div>
      </div>

      {/* Scan progress */}
      {!done && (
        <div className="absolute bottom-3 left-3 right-3 pointer-events-none">
          <div className="flex items-center justify-between text-[10px] text-cyan-400 mb-1 font-mono">
            <span>◉ LiDAR 3D SCAN IN PROGRESS</span>
            <span className="font-bold">{scanPct}%</span>
          </div>
          <div className="h-1 bg-slate-700/80 rounded-full overflow-hidden">
            <div className="h-full bg-cyan-400 rounded-full" style={{ width: `${scanPct}%`, transition: "width 0.1s linear" }} />
          </div>
        </div>
      )}
      {done && (
        <div className="absolute bottom-3 left-3 pointer-events-none flex items-center gap-2 text-[10px] text-green-400 font-mono font-bold">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse inline-block" />
          3D STRUCTURAL SCAN COMPLETE · CNN DAMAGE CLASSIFICATION APPLIED
        </div>
      )}

      <div className="absolute bottom-3 right-3 text-[9px] text-slate-600 font-mono pointer-events-none">drag to rotate</div>
    </div>
  );
}
