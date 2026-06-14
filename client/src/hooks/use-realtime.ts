import { useEffect, useRef, useState, useCallback } from "react";

export type WSEvent =
  | { type: "connected"; payload: { clientId: string; timestamp: string } }
  | { type: "stats:update"; payload: Record<string, number> }
  | { type: "scan:start"; payload: { scanId: string; location: string; disasterType: string; droneAlt: number; scanMode: string } }
  | { type: "scan:progress"; payload: { scanId: string; pointsCollected: number; totalPoints: number; pct: number; beamAngle: number } }
  | { type: "scan:stage"; payload: { scanId: string; stage: string; detail: string; durationMs: number } }
  | { type: "scan:complete"; payload: { scanId: string; severity: string; confidence: number; affectedArea: number; structuresAffected: number; processingTime: number } }
  | { type: "cnn:layer"; payload: { layer: string; inputDim: string; outputDim: string; activations: number; timeMs: number } }
  | { type: "alert:new"; payload: { id: string; title: string; severity: string; location: string; disasterType: string } }
  | { type: "metrics:live"; payload: { uptime: number; totalScans: number; totalPoints: number; avgResponseMs: number; modelAccuracy: number } }
  | { type: "environment:update"; payload: { visibility: number; smoke: number; dust: number; humidity: number; windSpeed: number; impact: string } };

export type ConnectionStatus = "connecting" | "connected" | "disconnected" | "error";

export function useRealtime() {
  const wsRef = useRef<WebSocket | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>("disconnected");
  const [clientId, setClientId] = useState<string>("");
  const [events, setEvents] = useState<(WSEvent & { ts: number })[]>([]);
  const [latestByType, setLatestByType] = useState<Partial<Record<WSEvent["type"], WSEvent["payload"]>>>({});
  const listenersRef = useRef<Map<string, ((payload: unknown) => void)[]>>(new Map());
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;
    setStatus("connecting");

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const url = `${protocol}//${window.location.host}/ws`;
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => setStatus("connected");

    ws.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data) as WSEvent;
        const stamped = { ...event, ts: Date.now() };

        setEvents((prev) => [stamped, ...prev].slice(0, 200));
        setLatestByType((prev) => ({ ...prev, [event.type]: event.payload }));

        if (event.type === "connected") {
          setClientId((event as Extract<WSEvent, { type: "connected" }>).payload.clientId);
        }

        // Fire registered listeners
        const handlers = listenersRef.current.get(event.type) ?? [];
        handlers.forEach((h) => h(event.payload));
      } catch {/* ignore parse errors */}
    };

    ws.onclose = () => {
      setStatus("disconnected");
      reconnectTimer.current = setTimeout(connect, 3000);
    };

    ws.onerror = () => setStatus("error");
  }, []);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
    };
  }, [connect]);

  const on = useCallback(<T extends WSEvent["type"]>(
    type: T,
    handler: (payload: Extract<WSEvent, { type: T }>["payload"]) => void
  ) => {
    const listeners = listenersRef.current;
    const existing = listeners.get(type) ?? [];
    listeners.set(type, [...existing, handler as (p: unknown) => void]);
    return () => {
      listeners.set(type, (listeners.get(type) ?? []).filter((h) => h !== handler));
    };
  }, []);

  const getLatest = useCallback(<T extends WSEvent["type"]>(
    type: T
  ): Extract<WSEvent, { type: T }>["payload"] | undefined => {
    return latestByType[type] as Extract<WSEvent, { type: T }>["payload"] | undefined;
  }, [latestByType]);

  return { status, clientId, events, on, getLatest, latestByType };
}
