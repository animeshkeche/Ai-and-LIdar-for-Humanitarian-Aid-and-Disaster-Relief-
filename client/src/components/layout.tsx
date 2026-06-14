import { useState } from "react";
import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  ScanSearch,
  Bell,
  BarChart3,
  Map,
  Menu,
  X,
  Satellite,
  AlertTriangle,
  Activity,
  Radio,
  Brain,
  Navigation,
  Wifi,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { useRealtime } from "@/hooks/use-realtime";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard, group: "Overview" },
  { href: "/realtime", label: "Real-Time Monitor", icon: Activity, group: "Overview" },
  { href: "/lidar", label: "LiDAR System", icon: Radio, group: "AI Processing" },
  { href: "/pipeline", label: "CNN Pipeline", icon: Brain, group: "AI Processing" },
  { href: "/assessment", label: "Damage Assessment", icon: ScanSearch, group: "Operations" },
  { href: "/decision", label: "Decision Support", icon: Navigation, group: "Operations" },
  { href: "/alerts", label: "Alerts", icon: Bell, group: "Operations" },
  { href: "/analytics", label: "Analytics", icon: BarChart3, group: "Data" },
  { href: "/map", label: "Map View", icon: Map, group: "Data" },
];

const groups = ["Overview", "AI Processing", "Operations", "Data"];

export default function Layout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [location] = useLocation();
  const { status: wsStatus } = useRealtime();

  const { data: stats } = useQuery<{ activeAlerts: number }>({
    queryKey: ["/api/stats"],
    refetchInterval: 5000,
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top App Bar */}
      <header className="fixed top-0 left-0 right-0 z-50 h-16 bg-slate-900 border-b border-slate-700 flex items-center px-4 gap-4 shadow-lg">
        <button
          className="lg:hidden p-2 rounded-md hover:bg-slate-700 transition-colors"
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>

        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-blue-600">
            <Satellite className="h-5 w-5 text-white" />
          </div>
          <div className="hidden sm:block">
            <div className="font-bold text-white text-sm leading-tight">AI-LiDAR</div>
            <div className="text-xs text-slate-400 leading-tight">Disaster Assessment</div>
          </div>
        </div>

        <div className="flex-1" />

        <div className="flex items-center gap-3">
          {/* WebSocket status */}
          <div className={cn(
            "hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-mono font-semibold",
            wsStatus === "connected"
              ? "bg-green-500/10 border-green-500/20 text-green-400"
              : wsStatus === "connecting"
              ? "bg-yellow-500/10 border-yellow-500/20 text-yellow-400 animate-pulse"
              : "bg-slate-700/50 border-slate-600 text-slate-500"
          )}>
            <Wifi className="h-3 w-3" />
            {wsStatus === "connected" ? "WS LIVE" : wsStatus === "connecting" ? "CONNECTING" : "OFFLINE"}
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/10 border border-green-500/20">
            <Activity className="h-3.5 w-3.5 text-green-400" />
            <span className="text-xs font-medium text-green-400">System Online</span>
          </div>

          {stats?.activeAlerts !== undefined && stats.activeAlerts > 0 && (
            <Link href="/alerts">
              <div className="relative p-2 rounded-md hover:bg-slate-700 cursor-pointer transition-colors">
                <Bell className="h-5 w-5 text-slate-300" />
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center bg-red-500 rounded-full text-[10px] font-bold text-white px-1">
                  {stats.activeAlerts}
                </span>
              </div>
            </Link>
          )}

          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold text-white">
              OP
            </div>
            <span className="hidden md:block text-sm text-slate-300">Operator</span>
          </div>
        </div>
      </header>

      <div className="flex flex-1 pt-16">
        {/* Sidebar overlay (mobile) */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-30 bg-black/60 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside
          className={cn(
            "fixed top-16 left-0 bottom-0 z-40 w-64 bg-slate-900 border-r border-slate-700 flex flex-col transition-transform duration-200 lg:translate-x-0 overflow-y-auto",
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          )}
        >
          <nav className="flex-1 p-3">
            {groups.map((group) => {
              const items = navItems.filter((n) => n.group === group);
              return (
                <div key={group} className="mb-3">
                  <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                    {group}
                  </div>
                  <div className="space-y-0.5">
                    {items.map(({ href, label, icon: Icon }) => {
                      const active = location === href;
                      return (
                        <Link key={href} href={href}>
                          <div
                            className={cn(
                              "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer",
                              active
                                ? "bg-blue-600 text-white"
                                : "text-slate-400 hover:text-slate-100 hover:bg-slate-800"
                            )}
                            onClick={() => setSidebarOpen(false)}
                          >
                            <Icon className="h-4 w-4 flex-shrink-0" />
                            {label}
                            {label === "Alerts" && stats?.activeAlerts !== undefined && stats.activeAlerts > 0 && (
                              <span className="ml-auto min-w-[20px] h-5 flex items-center justify-center bg-red-500 rounded-full text-[10px] font-bold text-white px-1">
                                {stats.activeAlerts}
                              </span>
                            )}
                            {label === "Real-Time Monitor" && wsStatus === "connected" && (
                              <span className="ml-auto w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                            )}
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </nav>

          <div className="p-3 border-t border-slate-700">
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <AlertTriangle className="h-4 w-4 text-amber-400 flex-shrink-0" />
              <div>
                <div className="text-xs font-semibold text-amber-300">Research Mode</div>
                <div className="text-[10px] text-amber-400/70">Simulated LiDAR data</div>
              </div>
            </div>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 lg:ml-64 min-h-screen">
          {children}
        </main>
      </div>
    </div>
  );
}
