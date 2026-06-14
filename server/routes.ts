import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertDamageAssessmentSchema, insertAlertSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  app.get("/api/stats", async (_req, res) => {
    const stats = await storage.getStats();
    res.json(stats);
  });

  app.get("/api/assessments", async (_req, res) => {
    const assessments = await storage.getDamageAssessments();
    res.json(assessments);
  });

  app.get("/api/assessments/:id", async (req, res) => {
    const assessment = await storage.getDamageAssessment(req.params.id);
    if (!assessment) return res.status(404).json({ message: "Not found" });
    res.json(assessment);
  });

  app.post("/api/assessments", async (req, res) => {
    const parsed = insertDamageAssessmentSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const assessment = await storage.createDamageAssessment(parsed.data);
    res.status(201).json(assessment);
  });

  app.patch("/api/assessments/:id/status", async (req, res) => {
    const { status } = req.body;
    if (!["active", "resolved", "pending"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }
    const updated = await storage.updateDamageAssessmentStatus(req.params.id, status);
    if (!updated) return res.status(404).json({ message: "Not found" });
    res.json(updated);
  });

  app.get("/api/alerts", async (_req, res) => {
    const alerts = await storage.getAlerts();
    res.json(alerts);
  });

  app.post("/api/alerts", async (req, res) => {
    const parsed = insertAlertSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const alert = await storage.createAlert(parsed.data);
    res.status(201).json(alert);
  });

  app.patch("/api/alerts/:id/acknowledge", async (req, res) => {
    const updated = await storage.acknowledgeAlert(req.params.id);
    if (!updated) return res.status(404).json({ message: "Not found" });
    res.json(updated);
  });

  app.post("/api/analyze", async (req, res) => {
    const { disasterType, location, pointCloudDensity } = req.body;
    await new Promise((r) => setTimeout(r, 1500));
    const severities = ["low", "moderate", "severe"] as const;
    const severity = severities[Math.floor(Math.random() * severities.length)];
    const confidence = 82 + Math.random() * 15;
    const affectedArea = Math.random() * 4 + 0.2;
    const structuresAffected = Math.floor(Math.random() * 200 + 5);
    res.json({
      severity,
      confidence: Math.round(confidence * 10) / 10,
      affectedArea: Math.round(affectedArea * 10) / 10,
      structuresAffected,
      processingTime: Math.round(800 + Math.random() * 400),
      pointsProcessed: pointCloudDensity || Math.floor(Math.random() * 30000 + 20000),
      classificationBreakdown: {
        low: Math.floor(Math.random() * 30 + 10),
        moderate: Math.floor(Math.random() * 30 + 20),
        severe: Math.floor(Math.random() * 30 + 10),
      },
      location,
      disasterType,
    });
  });

  const httpServer = createServer(app);
  return httpServer;
}
