import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
  LineChart, Line, PieChart, Pie, Cell, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from "recharts";
import { TrendingUp, Award, Zap, Target, BookOpen } from "lucide-react";
import type { DamageAssessment } from "@shared/schema";

const COLORS = {
  lidar: "#3b82f6",
  satellite: "#6b7280",
  uav: "#8b5cf6",
  low: "#22c55e",
  moderate: "#f59e0b",
  severe: "#ef4444",
};

const methodComparison = [
  { metric: "Accuracy", satellite: 71, uav: 78, lidar: 89 },
  { metric: "Precision", satellite: 69, uav: 76, lidar: 88 },
  { metric: "Recall", satellite: 68, uav: 75, lidar: 90 },
  { metric: "F1-Score", satellite: 68.5, uav: 75.5, lidar: 89 },
];

const responseTime = [
  { method: "Manual Survey", time: 480, fill: "#64748b" },
  { method: "Satellite", time: 180, fill: "#6b7280" },
  { method: "UAV Camera", time: 95, fill: "#8b5cf6" },
  { method: "AI + LiDAR", time: 28, fill: "#3b82f6" },
];

const radarData = [
  { metric: "Accuracy", satellite: 71, uav: 78, lidar: 89 },
  { metric: "Speed", satellite: 40, uav: 65, lidar: 95 },
  { metric: "Coverage", satellite: 85, uav: 60, lidar: 88 },
  { metric: "Automation", satellite: 50, uav: 70, lidar: 92 },
  { metric: "Resolution", satellite: 55, uav: 75, lidar: 95 },
  { metric: "3D Depth", satellite: 20, uav: 35, lidar: 98 },
];

const confusionData = [
  { predicted: "Low", actual_low: 145, actual_moderate: 12, actual_severe: 3 },
  { predicted: "Moderate", actual_low: 15, actual_moderate: 138, actual_severe: 17 },
  { predicted: "Severe", actual_low: 2, actual_moderate: 14, actual_severe: 154 },
];

const weeklyTrend = [
  { day: "Mon", assessments: 4, accuracy: 87.2 },
  { day: "Tue", assessments: 6, accuracy: 88.9 },
  { day: "Wed", assessments: 3, accuracy: 91.1 },
  { day: "Thu", assessments: 8, accuracy: 89.5 },
  { day: "Fri", assessments: 5, accuracy: 90.2 },
  { day: "Sat", assessments: 7, accuracy: 88.7 },
  { day: "Sun", assessments: 6, accuracy: 89.4 },
];

const tooltipStyle = {
  contentStyle: { backgroundColor: "#1e293b", border: "1px solid #334155", borderRadius: "8px" },
  labelStyle: { color: "#e2e8f0" },
  itemStyle: { color: "#94a3b8" },
};

export default function Analytics() {
  const { data: assessments } = useQuery<DamageAssessment[]>({
    queryKey: ["/api/assessments"],
  });

  const severityDist = assessments
    ? [
        { name: "Low", value: assessments.filter((a) => a.severity === "low").length, fill: COLORS.low },
        { name: "Moderate", value: assessments.filter((a) => a.severity === "moderate").length, fill: COLORS.moderate },
        { name: "Severe", value: assessments.filter((a) => a.severity === "severe").length, fill: COLORS.severe },
      ]
    : [];

  const avgConf = assessments?.length
    ? (assessments.reduce((s, a) => s + a.confidence, 0) / assessments.length).toFixed(1)
    : "—";

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Analytics & Performance</h1>
        <p className="text-slate-400 text-sm mt-1">Based on the AI+LiDAR research paper results — experimental evaluation</p>
      </div>

      {/* Summary KPIs (from paper) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Model Accuracy", value: "89%", sub: "vs 78% UAV", icon: Target, color: "text-blue-400", bg: "bg-blue-500/10" },
          { label: "F1-Score", value: "89.0", sub: "Balanced precision/recall", icon: Award, color: "text-purple-400", bg: "bg-purple-500/10" },
          { label: "Avg Response", value: "28ms", sub: "vs 95ms UAV camera", icon: Zap, color: "text-green-400", bg: "bg-green-500/10" },
          { label: "Live Confidence", value: `${avgConf}%`, sub: "Current assessments", icon: TrendingUp, color: "text-amber-400", bg: "bg-amber-500/10" },
        ].map(({ label, value, sub, icon: Icon, color, bg }) => (
          <Card key={label} className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</span>
                <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center`}>
                  <Icon className={`h-4 w-4 ${color}`} />
                </div>
              </div>
              <div className={`text-2xl font-bold tabular-nums ${color}`}>{value}</div>
              <div className="text-xs text-slate-500 mt-1">{sub}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Method comparison bar */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-sm font-semibold text-slate-200 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-blue-400" />
            Performance Metrics — Method Comparison (Paper Table 3)
          </CardTitle>
          <p className="text-xs text-slate-400">Satellite vs UAV Camera vs AI+LiDAR (proposed)</p>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={methodComparison} barCategoryGap="20%">
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="metric" tick={{ fontSize: 12, fill: "#94a3b8" }} />
              <YAxis domain={[60, 95]} tick={{ fontSize: 11, fill: "#94a3b8" }} unit="%" />
              <Tooltip {...tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 12, color: "#94a3b8" }} />
              <Bar dataKey="satellite" fill={COLORS.satellite} radius={[4, 4, 0, 0]} name="Satellite" />
              <Bar dataKey="uav" fill={COLORS.uav} radius={[4, 4, 0, 0]} name="UAV Camera" />
              <Bar dataKey="lidar" fill={COLORS.lidar} radius={[4, 4, 0, 0]} name="AI + LiDAR" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Response Time */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <Zap className="h-4 w-4 text-green-400" />
              Response Time Comparison (seconds)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={responseTime} layout="vertical" barCategoryGap="25%">
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: "#94a3b8" }} unit="s" />
                <YAxis type="category" dataKey="method" tick={{ fontSize: 11, fill: "#94a3b8" }} width={90} />
                <Tooltip {...tooltipStyle} />
                <Bar dataKey="time" radius={[0, 4, 4, 0]} name="Response Time (s)">
                  {responseTime.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Radar comparison */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <Target className="h-4 w-4 text-purple-400" />
              Multi-Dimensional Capability Radar
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
                <PolarGrid stroke="#334155" />
                <PolarAngleAxis dataKey="metric" tick={{ fontSize: 10, fill: "#94a3b8" }} />
                <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 9, fill: "#475569" }} />
                <Radar name="Satellite" dataKey="satellite" stroke={COLORS.satellite} fill={COLORS.satellite} fillOpacity={0.1} />
                <Radar name="UAV Camera" dataKey="uav" stroke={COLORS.uav} fill={COLORS.uav} fillOpacity={0.1} />
                <Radar name="AI+LiDAR" dataKey="lidar" stroke={COLORS.lidar} fill={COLORS.lidar} fillOpacity={0.2} />
                <Legend wrapperStyle={{ fontSize: 11, color: "#94a3b8" }} />
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Severity distribution */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-slate-200">Live Severity Distribution</CardTitle>
            <p className="text-xs text-slate-400">Current assessments in system</p>
          </CardHeader>
          <CardContent className="flex items-center gap-4">
            <ResponsiveContainer width="55%" height={180}>
              <PieChart>
                <Pie
                  data={severityDist}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  dataKey="value"
                  paddingAngle={3}
                >
                  {severityDist.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip {...tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2">
              {severityDist.map(({ name, value, fill }) => (
                <div key={name} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: fill }} />
                  <span className="text-sm text-slate-300">{name}</span>
                  <span className="text-sm font-semibold text-white tabular-nums ml-auto">{value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Weekly trend */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-slate-200">Weekly Assessment Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={weeklyTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#94a3b8" }} />
                <YAxis yAxisId="left" tick={{ fontSize: 11, fill: "#94a3b8" }} />
                <YAxis yAxisId="right" orientation="right" domain={[85, 95]} tick={{ fontSize: 11, fill: "#94a3b8" }} unit="%" />
                <Tooltip {...tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 11, color: "#94a3b8" }} />
                <Bar yAxisId="left" dataKey="assessments" fill="#3b82f6" radius={[3, 3, 0, 0]} name="Assessments" opacity={0.7} />
                <Line yAxisId="right" type="monotone" dataKey="accuracy" stroke="#22c55e" strokeWidth={2} dot={false} name="Accuracy %" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Paper reference */}
      <Card className="bg-blue-900/20 border-blue-500/30">
        <CardContent className="p-4 flex items-start gap-3">
          <BookOpen className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
          <div>
            <div className="text-sm font-semibold text-blue-200">Research Paper Reference</div>
            <div className="text-xs text-blue-300/80 mt-1 leading-relaxed">
              Wagh, S.S., Keche, A.M., Pohanerkar, O.K., Chaudhari, V.A., Bhusare, A.S. — <em>"AI And LiDAR for Humanitarian Aid and Disaster Relief"</em> (JSPM's Jayawantrao Sawant College of Engineering, Pune).
              Results: 89% accuracy, 88% precision, 90% recall, 89 F1-score — outperforming Satellite (71%) and UAV Camera (78%) methods.
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
