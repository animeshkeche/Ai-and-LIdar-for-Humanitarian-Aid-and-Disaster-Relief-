import { WebSocketServer, WebSocket } from "ws";
import type { Server } from "http";
import { storage } from "./storage";

type WSEvent =
  | { type: "connected"; payload: { clientId: string; timestamp: string } }
  | { type: "stats:update"; payload: Record<string, unknown> }
  | { type: "scan:start"; payload: { scanId: string; location: string; disasterType: string; droneAlt: number; scanMode: string } }
  | { type: "scan:progress"; payload: { scanId: string; pointsCollected: number; totalPoints: number; pct: number; beamAngle: number } }
  | { type: "scan:stage"; payload: { scanId: string; stage: string; detail: string; durationMs: number } }
  | { type: "scan:complete"; payload: { scanId: string; severity: string; confidence: number; affectedArea: number; structuresAffected: number; processingTime: number } }
  | { type: "cnn:layer"; payload: { layer: string; inputDim: string; outputDim: string; activations: number; timeMs: number } }
  | { type: "alert:new"; payload: { id: string; title: string; severity: string; location: string; disasterType: string } }
  | { type: "metrics:live"; payload: { uptime: number; totalScans: number; totalPoints: number; avgResponseMs: number; modelAccuracy: number } }
  | { type: "environment:update"; payload: { visibility: number; smoke: number; dust: number; humidity: number; windSpeed: number; impact: string } };

const DISASTER_SCENARIOS = [
  { type: "earthquake", location: "Yerawada Bridge", lat: 18.5362, lon: 73.8971 },
  { type: "flood", location: "Mutha River Basin", lat: 18.5060, lon: 73.8567 },
  { type: "cyclone", location: "Camp Area", lat: 18.5196, lon: 73.8553 },
  { type: "landslide", location: "Sinhagad Road", lat: 18.4220, lon: 73.8040 },
  { type: "wildfire", location: "Pashan Hills", lat: 18.5396, lon: 73.7979 },
];

const CNN_LAYERS = [
  { layer: "SA-Layer 1 (Set Abstraction)", inputDim: "N×3", outputDim: "512×32", activations: 16384, timeMs: 45 },
  { layer: "SA-Layer 2 (Set Abstraction)", inputDim: "512×32", outputDim: "128×64", activations: 8192, timeMs: 38 },
  { layer: "SA-Layer 3 (Set Abstraction)", inputDim: "128×64", outputDim: "64×128", activations: 8192, timeMs: 32 },
  { layer: "FP-Layer 1 (Feature Propagation)", inputDim: "64×128", outputDim: "128×64", activations: 8192, timeMs: 28 },
  { layer: "FP-Layer 2 (Feature Propagation)", inputDim: "128×64", outputDim: "512×32", activations: 16384, timeMs: 24 },
  { layer: "FP-Layer 3 (Feature Propagation)", inputDim: "512×32", outputDim: "N×16", activations: 49152, timeMs: 18 },
  { layer: "Conv1D + ReLU + Dropout", inputDim: "N×16", outputDim: "N×128", activations: 131072, timeMs: 12 },
  { layer: "Conv1D Softmax (3 classes)", inputDim: "N×128", outputDim: "N×3", activations: 3, timeMs: 6 },
];

const PREPROCESSING_STAGES = [
  { stage: "Point Cloud Loading", detail: "Reading .las binary stream from UDP socket" },
  { stage: "Statistical Outlier Removal", detail: "k=20 neighbours, std_ratio=2.0 — removing noise" },
  { stage: "Voxel Downsampling", detail: "Voxel size=0.05m — uniform density normalisation" },
  { stage: "Ground Plane Removal", detail: "RANSAC plane fitting, distance_threshold=0.3m" },
  { stage: "Normal Estimation", detail: "KNN radius=0.1m, computing surface normals" },
  { stage: "Feature Extraction", detail: "PointNet++ local neighbourhood grouping" },
];

const broadcast = (clients: Set<WebSocket>, event: WSEvent) => {
  const msg = JSON.stringify(event);
  clients.forEach((ws) => {
    if (ws.readyState === WebSocket.OPEN) ws.send(msg);
  });
};

let totalScans = 0;
let totalPoints = 0;
let startTime = Date.now();
const responseTimes: number[] = [];

export function setupWebSocket(server: Server) {
  const wss = new WebSocketServer({ server, path: "/ws" });

  wss.on("connection", (ws) => {
    const clientId = Math.random().toString(36).substring(2, 8).toUpperCase();

    ws.send(JSON.stringify({
      type: "connected",
      payload: { clientId, timestamp: new Date().toISOString() },
    } as WSEvent));

    // Send current stats immediately
    storage.getStats().then((stats) => {
      ws.send(JSON.stringify({ type: "stats:update", payload: stats } as WSEvent));
    });

    // Ping-pong keepalive
    const pingInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) ws.ping();
    }, 25000);

    ws.on("close", () => clearInterval(pingInterval));
  });

  // ── Live metrics broadcast every 2 seconds ──
  setInterval(() => {
    if (wss.clients.size === 0) return;
    const avgResp = responseTimes.length > 0
      ? responseTimes.slice(-20).reduce((a, b) => a + b, 0) / Math.min(20, responseTimes.length)
      : 28;
    broadcast(wss.clients, {
      type: "metrics:live",
      payload: {
        uptime: Math.floor((Date.now() - startTime) / 1000),
        totalScans,
        totalPoints,
        avgResponseMs: Math.round(avgResp + (Math.random() - 0.5) * 6),
        modelAccuracy: 89 + (Math.random() - 0.5) * 1.5,
      },
    });
  }, 2000);

  // ── Environmental conditions update every 5 seconds ──
  setInterval(() => {
    if (wss.clients.size === 0) return;
    const visibility = 60 + Math.random() * 40;
    const smoke = Math.random() * 35;
    const dust = Math.random() * 25;
    broadcast(wss.clients, {
      type: "environment:update",
      payload: {
        visibility: Math.round(visibility),
        smoke: Math.round(smoke),
        dust: Math.round(dust),
        humidity: Math.round(40 + Math.random() * 50),
        windSpeed: Math.round(5 + Math.random() * 40),
        impact: smoke > 25 ? "Camera-based methods severely impaired. LiDAR unaffected."
          : dust > 15 ? "Optical sensors degraded. LiDAR maintaining full precision."
          : visibility < 70 ? "Low visibility. LiDAR advantage over satellite confirmed."
          : "Nominal conditions. All sensor modalities operational.",
      },
    });
  }, 5000);

  // ── Periodic auto-scan simulation every 18–30 seconds ──
  const scheduleScan = () => {
    const delay = 18000 + Math.random() * 12000;
    setTimeout(async () => {
      if (wss.clients.size === 0) { scheduleScan(); return; }

      const scenario = DISASTER_SCENARIOS[Math.floor(Math.random() * DISASTER_SCENARIOS.length)];
      const scanId = `SCAN-${Date.now().toString(36).toUpperCase()}`;
      const totalPts = 25000 + Math.floor(Math.random() * 40000);
      const scanStart = Date.now();

      // 1. Announce scan start
      broadcast(wss.clients, {
        type: "scan:start",
        payload: {
          scanId,
          location: scenario.location,
          disasterType: scenario.type,
          droneAlt: Math.round(50 + Math.random() * 100),
          scanMode: ["Nadir", "Oblique 15°", "Oblique 30°"][Math.floor(Math.random() * 3)],
        },
      });

      // 2. Stream preprocessing stages
      for (const stage of PREPROCESSING_STAGES) {
        await new Promise((r) => setTimeout(r, 200 + Math.random() * 300));
        broadcast(wss.clients, {
          type: "scan:stage",
          payload: { scanId, stage: stage.stage, detail: stage.detail, durationMs: Math.round(80 + Math.random() * 150) },
        });
      }

      // 3. Stream point cloud progress
      let collected = 0;
      const progressInterval = setInterval(() => {
        collected = Math.min(totalPts, collected + Math.floor(totalPts / 15) + Math.floor(Math.random() * 2000));
        broadcast(wss.clients, {
          type: "scan:progress",
          payload: {
            scanId,
            pointsCollected: collected,
            totalPoints: totalPts,
            pct: Math.round((collected / totalPts) * 100),
            beamAngle: (collected / totalPts) * 360,
          },
        });
        if (collected >= totalPts) clearInterval(progressInterval);
      }, 300);

      await new Promise((r) => setTimeout(r, 5000));

      // 4. CNN layer processing
      for (const layer of CNN_LAYERS) {
        await new Promise((r) => setTimeout(r, layer.timeMs + Math.floor(Math.random() * 20)));
        broadcast(wss.clients, {
          type: "cnn:layer",
          payload: { ...layer, timeMs: layer.timeMs + Math.floor(Math.random() * 10) },
        });
      }

      // 5. Final result
      const severities: ("low" | "moderate" | "severe")[] = ["low", "moderate", "severe"];
      const severity = severities[Math.floor(Math.random() * severities.length)];
      const confidence = 82 + Math.random() * 14;
      const processingTime = Date.now() - scanStart;
      responseTimes.push(processingTime);
      totalScans++;
      totalPoints += totalPts;

      broadcast(wss.clients, {
        type: "scan:complete",
        payload: {
          scanId,
          severity,
          confidence: Math.round(confidence * 10) / 10,
          affectedArea: Math.round((0.3 + Math.random() * 3.5) * 10) / 10,
          structuresAffected: Math.floor(10 + Math.random() * 180),
          processingTime,
        },
      });

      // 6. Auto-generate alert for severe scans
      if (severity === "severe") {
        const alertId = `AL-${Date.now().toString(36).toUpperCase()}`;
        await new Promise((r) => setTimeout(r, 800));
        broadcast(wss.clients, {
          type: "alert:new",
          payload: {
            id: alertId,
            title: `Severe Damage Detected — ${scenario.location}`,
            severity: confidence > 92 ? "critical" : "severe",
            location: scenario.location,
            disasterType: scenario.type,
          },
        });

        // Persist alert
        await storage.createAlert({
          title: `Severe Damage Detected — ${scenario.location}`,
          description: `AI-LiDAR scan ${scanId} identified severe structural damage. CNN confidence: ${confidence.toFixed(1)}%. Immediate assessment required.`,
          severity: confidence > 92 ? "critical" : "severe",
          location: scenario.location,
          latitude: scenario.lat,
          longitude: scenario.lon,
          disasterType: scenario.type,
          acknowledged: false,
        });

        await storage.createDamageAssessment({
          location: scenario.location,
          latitude: scenario.lat,
          longitude: scenario.lon,
          severity,
          confidence: Math.round(confidence * 10) / 10,
          disasterType: scenario.type,
          pointCloudDensity: totalPts,
          affectedArea: Math.round((0.3 + Math.random() * 3.5) * 10) / 10,
          structuresAffected: Math.floor(10 + Math.random() * 180),
          status: "active",
        });
      }

      // Broadcast updated stats
      const updatedStats = await storage.getStats();
      broadcast(wss.clients, { type: "stats:update", payload: updatedStats });

      scheduleScan();
    }, delay);
  };

  scheduleScan();

  return wss;
}
