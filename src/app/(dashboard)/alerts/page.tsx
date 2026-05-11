"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getAlerts } from "@/lib/api";
import { AlertRow } from "@/components/alerts/AlertRow";
import type { Alert } from "@/types";

const STATUS_FILTERS = ["all", "open", "acknowledged", "resolved"] as const;
const SEVERITY_FILTERS = ["all", "critical", "high", "medium", "low"] as const;

export default function AlertsPage() {
  const [status, setStatus] = useState<string>("open");
  const [severity, setSeverity] = useState<string>("all");

  const { data: alerts = [], refetch, isLoading } = useQuery<Alert[]>({
    queryKey: ["alerts", status, severity],
    queryFn: () => getAlerts({
      status:   status   !== "all" ? status   : undefined,
      severity: severity !== "all" ? severity : undefined,
    }),
    refetchInterval: 15_000,
  });

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Alerts</h1>
        <p className="text-sm text-gray-500">{alerts.length} alerts</p>
      </div>

      {/* Filters */}
      <div className="flex gap-6">
        <div className="flex gap-1">
          {STATUS_FILTERS.map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize transition ${
                status === s ? "bg-blue-600 text-white" : "bg-white border hover:bg-gray-50 text-gray-600"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
        <div className="flex gap-1">
          {SEVERITY_FILTERS.map((s) => (
            <button
              key={s}
              onClick={() => setSeverity(s)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize transition ${
                severity === s ? "bg-gray-800 text-white" : "bg-white border hover:bg-gray-50 text-gray-600"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="text-gray-400 text-sm">Loading alerts...</div>
      ) : alerts.length === 0 ? (
        <div className="bg-white rounded-xl border p-12 text-center">
          <div className="text-gray-400 text-sm">No alerts found</div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="text-xs text-gray-500 border-b bg-gray-50">
                <th className="text-left py-2 px-4">Severity</th>
                <th className="text-left py-2 px-4">Alert</th>
                <th className="text-left py-2 px-4">Status</th>
                <th className="text-left py-2 px-4">Time</th>
                <th className="text-left py-2 px-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {alerts.map((a) => (
                <AlertRow key={a.id} alert={a} onUpdate={() => refetch()} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
