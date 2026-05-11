"use client";

import { useQuery } from "@tanstack/react-query";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, Legend, ResponsiveContainer,
} from "recharts";
import { getAlerts, getSensors } from "@/lib/api";
import type { Alert, Sensor } from "@/types";

const SEVERITY_COLORS: Record<string, string> = {
  critical: "#ef4444",
  high:     "#f97316",
  medium:   "#eab308",
  low:      "#22c55e",
};

export default function AnalyticsPage() {
  const { data: alerts = [] } = useQuery<Alert[]>({
    queryKey: ["alerts", "all"],
    queryFn: () => getAlerts({}),
    refetchInterval: 60_000,
  });

  const { data: sensors = [] } = useQuery<Sensor[]>({
    queryKey: ["sensors"],
    queryFn: getSensors,
  });

  // Severity distribution
  const severityDist = ["critical", "high", "medium", "low"].map((s) => ({
    name: s,
    count: alerts.filter((a) => a.severity === s).length,
  }));

  // Status distribution
  const statusDist = ["open", "acknowledged", "resolved"].map((s) => ({
    name: s,
    count: alerts.filter((a) => a.status === s).length,
  }));

  // Sensor type distribution
  const typeDist = ["temperature", "humidity", "pressure", "voltage"].map((t) => ({
    name: t,
    count: sensors.filter((s) => s.type === t).length,
  }));

  // Method comparison placeholder (research data)
  const methodData = [
    { method: "Threshold",    precision: 0.91, recall: 0.78, f1: 0.84 },
    { method: "Moving Avg",   precision: 0.87, recall: 0.82, f1: 0.84 },
    { method: "Z-Score",      precision: 0.93, recall: 0.85, f1: 0.89 },
    { method: "IQR",          precision: 0.89, recall: 0.80, f1: 0.84 },
  ];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Analytics</h1>
        <p className="text-sm text-gray-500">Detection method comparison & system statistics</p>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Alert severity */}
        <div className="bg-white rounded-xl border p-4">
          <h3 className="font-medium text-sm mb-4">Alert Severity Distribution</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={severityDist} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={80}>
                {severityDist.map((entry) => (
                  <Cell key={entry.name} fill={SEVERITY_COLORS[entry.name]} />
                ))}
              </Pie>
              <Tooltip formatter={(v) => [v, "Alerts"]} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Alert status */}
        <div className="bg-white rounded-xl border p-4">
          <h3 className="font-medium text-sm mb-4">Alert Status Distribution</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={statusDist}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Detection method comparison */}
        <div className="bg-white rounded-xl border p-4 col-span-2">
          <h3 className="font-medium text-sm mb-1">Detection Method Comparison (Research)</h3>
          <p className="text-xs text-gray-500 mb-4">Precision, Recall, F1-Score per method</p>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={methodData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="method" tick={{ fontSize: 12 }} />
              <YAxis domain={[0, 1]} tick={{ fontSize: 12 }} tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} />
              <Tooltip formatter={(v: number) => `${(v * 100).toFixed(1)}%`} />
              <Legend />
              <Bar dataKey="precision" fill="#3b82f6" radius={[2, 2, 0, 0]} name="Precision" />
              <Bar dataKey="recall"    fill="#22c55e" radius={[2, 2, 0, 0]} name="Recall" />
              <Bar dataKey="f1"        fill="#8b5cf6" radius={[2, 2, 0, 0]} name="F1-Score" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
