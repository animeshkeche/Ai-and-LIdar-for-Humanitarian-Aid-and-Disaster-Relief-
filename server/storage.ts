import { type User, type InsertUser, type DamageAssessment, type InsertDamageAssessment, type Alert, type InsertAlert } from "@shared/schema";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getDamageAssessments(): Promise<DamageAssessment[]>;
  getDamageAssessment(id: string): Promise<DamageAssessment | undefined>;
  createDamageAssessment(data: InsertDamageAssessment): Promise<DamageAssessment>;
  updateDamageAssessmentStatus(id: string, status: string): Promise<DamageAssessment | undefined>;
  getAlerts(): Promise<Alert[]>;
  createAlert(data: InsertAlert): Promise<Alert>;
  acknowledgeAlert(id: string): Promise<Alert | undefined>;
  getStats(): Promise<{
    totalAssessments: number;
    activeAlerts: number;
    severeAreas: number;
    avgConfidence: number;
    totalAffectedArea: number;
    totalStructures: number;
  }>;
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private damageAssessments: Map<string, DamageAssessment>;
  private alerts: Map<string, Alert>;

  constructor() {
    this.users = new Map();
    this.damageAssessments = new Map();
    this.alerts = new Map();
    this.seedData();
  }

  private seedData() {
    const now = new Date();
    const assessments: DamageAssessment[] = [
      {
        id: "da1",
        location: "Parvati Valley, Pune",
        latitude: 18.4655,
        longitude: 73.8498,
        severity: "severe",
        confidence: 91.2,
        disasterType: "earthquake",
        pointCloudDensity: 45000,
        affectedArea: 2.8,
        structuresAffected: 142,
        status: "active",
        createdAt: new Date(now.getTime() - 2 * 60 * 60 * 1000),
        updatedAt: new Date(now.getTime() - 2 * 60 * 60 * 1000),
      },
      {
        id: "da2",
        location: "Hadapsar District",
        latitude: 18.5018,
        longitude: 73.9258,
        severity: "moderate",
        confidence: 87.5,
        disasterType: "flood",
        pointCloudDensity: 38000,
        affectedArea: 1.4,
        structuresAffected: 67,
        status: "active",
        createdAt: new Date(now.getTime() - 4 * 60 * 60 * 1000),
        updatedAt: new Date(now.getTime() - 4 * 60 * 60 * 1000),
      },
      {
        id: "da3",
        location: "Baner Road Corridor",
        latitude: 18.5593,
        longitude: 73.7868,
        severity: "low",
        confidence: 93.8,
        disasterType: "landslide",
        pointCloudDensity: 52000,
        affectedArea: 0.6,
        structuresAffected: 18,
        status: "resolved",
        createdAt: new Date(now.getTime() - 8 * 60 * 60 * 1000),
        updatedAt: new Date(now.getTime() - 6 * 60 * 60 * 1000),
      },
      {
        id: "da4",
        location: "Kothrud Zone",
        latitude: 18.5074,
        longitude: 73.8077,
        severity: "severe",
        confidence: 88.9,
        disasterType: "cyclone",
        pointCloudDensity: 41000,
        affectedArea: 3.2,
        structuresAffected: 203,
        status: "active",
        createdAt: new Date(now.getTime() - 1 * 60 * 60 * 1000),
        updatedAt: new Date(now.getTime() - 1 * 60 * 60 * 1000),
      },
      {
        id: "da5",
        location: "Wakad Sector",
        latitude: 18.5984,
        longitude: 73.7627,
        severity: "moderate",
        confidence: 85.3,
        disasterType: "wildfire",
        pointCloudDensity: 29000,
        affectedArea: 1.9,
        structuresAffected: 34,
        status: "pending",
        createdAt: new Date(now.getTime() - 30 * 60 * 1000),
        updatedAt: new Date(now.getTime() - 30 * 60 * 1000),
      },
      {
        id: "da6",
        location: "Shivajinagar Central",
        latitude: 18.5308,
        longitude: 73.8474,
        severity: "low",
        confidence: 94.1,
        disasterType: "earthquake",
        pointCloudDensity: 61000,
        affectedArea: 0.3,
        structuresAffected: 9,
        status: "resolved",
        createdAt: new Date(now.getTime() - 12 * 60 * 60 * 1000),
        updatedAt: new Date(now.getTime() - 10 * 60 * 60 * 1000),
      },
    ];

    assessments.forEach((a) => this.damageAssessments.set(a.id, a));

    const alertsData: Alert[] = [
      {
        id: "al1",
        title: "Critical Structural Collapse Detected",
        description: "LiDAR scans reveal severe structural damage to 3 multi-story buildings in Parvati Valley. Immediate rescue teams required.",
        severity: "critical",
        location: "Parvati Valley, Pune",
        latitude: 18.4655,
        longitude: 73.8498,
        disasterType: "earthquake",
        acknowledged: false,
        createdAt: new Date(now.getTime() - 2 * 60 * 60 * 1000),
      },
      {
        id: "al2",
        title: "Flood Waters Rising — Road Blocked",
        description: "AI analysis of point cloud data shows road submersion at 1.2m depth. Alternative routes recommended via Highway 48.",
        severity: "severe",
        location: "Hadapsar District",
        latitude: 18.5018,
        longitude: 73.9258,
        disasterType: "flood",
        acknowledged: false,
        createdAt: new Date(now.getTime() - 4 * 60 * 60 * 1000),
      },
      {
        id: "al3",
        title: "Cyclone Debris Field Mapped",
        description: "Dense debris field detected across 3.2 km² in Kothrud Zone. 203 structures showing damage signatures in CNN classification.",
        severity: "severe",
        location: "Kothrud Zone",
        latitude: 18.5074,
        longitude: 73.8077,
        disasterType: "cyclone",
        acknowledged: false,
        createdAt: new Date(now.getTime() - 1 * 60 * 60 * 1000),
      },
      {
        id: "al4",
        title: "Wildfire Approach — Evacuation Advisory",
        description: "Thermal imaging combined with LiDAR shows fire front advancing at 2.1 km/h toward residential zone. Evacuation recommended.",
        severity: "moderate",
        location: "Wakad Sector",
        latitude: 18.5984,
        longitude: 73.7627,
        disasterType: "wildfire",
        acknowledged: true,
        createdAt: new Date(now.getTime() - 30 * 60 * 1000),
      },
      {
        id: "al5",
        title: "Landslide Containment Confirmed",
        description: "LiDAR terrain model confirms landslide has stabilized. Area cleared for relief team access.",
        severity: "low",
        location: "Baner Road Corridor",
        latitude: 18.5593,
        longitude: 73.7868,
        disasterType: "landslide",
        acknowledged: true,
        createdAt: new Date(now.getTime() - 8 * 60 * 60 * 1000),
      },
    ];

    alertsData.forEach((a) => this.alerts.set(a.id, a));
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find((u) => u.username === username);
  }

  async createUser(user: InsertUser): Promise<User> {
    const id = generateId();
    const newUser: User = { ...user, id };
    this.users.set(id, newUser);
    return newUser;
  }

  async getDamageAssessments(): Promise<DamageAssessment[]> {
    return Array.from(this.damageAssessments.values()).sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
    );
  }

  async getDamageAssessment(id: string): Promise<DamageAssessment | undefined> {
    return this.damageAssessments.get(id);
  }

  async createDamageAssessment(data: InsertDamageAssessment): Promise<DamageAssessment> {
    const id = generateId();
    const now = new Date();
    const assessment: DamageAssessment = { ...data, id, createdAt: now, updatedAt: now };
    this.damageAssessments.set(id, assessment);
    return assessment;
  }

  async updateDamageAssessmentStatus(id: string, status: string): Promise<DamageAssessment | undefined> {
    const assessment = this.damageAssessments.get(id);
    if (!assessment) return undefined;
    const updated = { ...assessment, status, updatedAt: new Date() };
    this.damageAssessments.set(id, updated);
    return updated;
  }

  async getAlerts(): Promise<Alert[]> {
    return Array.from(this.alerts.values()).sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
    );
  }

  async createAlert(data: InsertAlert): Promise<Alert> {
    const id = generateId();
    const alert: Alert = { ...data, id, createdAt: new Date() };
    this.alerts.set(id, alert);
    return alert;
  }

  async acknowledgeAlert(id: string): Promise<Alert | undefined> {
    const alert = this.alerts.get(id);
    if (!alert) return undefined;
    const updated = { ...alert, acknowledged: true };
    this.alerts.set(id, updated);
    return updated;
  }

  async getStats() {
    const assessments = Array.from(this.damageAssessments.values());
    const alerts = Array.from(this.alerts.values());
    const severe = assessments.filter((a) => a.severity === "severe");
    const avgConf = assessments.reduce((s, a) => s + a.confidence, 0) / (assessments.length || 1);
    const totalArea = assessments.reduce((s, a) => s + a.affectedArea, 0);
    const totalStr = assessments.reduce((s, a) => s + a.structuresAffected, 0);
    return {
      totalAssessments: assessments.length,
      activeAlerts: alerts.filter((a) => !a.acknowledged).length,
      severeAreas: severe.length,
      avgConfidence: Math.round(avgConf * 10) / 10,
      totalAffectedArea: Math.round(totalArea * 10) / 10,
      totalStructures: totalStr,
    };
  }
}

export const storage = new MemStorage();
