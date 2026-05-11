"use client";

import { useState } from "react";
import { CheckCircle, XCircle } from "lucide-react";
import type { Alert } from "@/types";
import { Badge } from "@/components/ui/badge";
import { severityColor, alertStatusColor, formatRelativeTime } from "@/lib/utils";
import { acknowledgeAlert, resolveAlert } from "@/lib/api";

interface Props {
  alert: Alert;
  onUpdate: () => void;
}

export function AlertRow({ alert, onUpdate }: Props) {
  const [loading, setLoading] = useState(false);

  async function ack() {
    setLoading(true);
    await acknowledgeAlert(alert.id).catch(() => {});
    setLoading(false);
    onUpdate();
  }

  async function resolve() {
    setLoading(true);
    await resolveAlert(alert.id).catch(() => {});
    setLoading(false);
    onUpdate();
  }

  return (
    <tr className="border-b last:border-0 hover:bg-gray-50 text-sm">
      <td className="py-3 px-4">
        <Badge className={severityColor[alert.severity]}>{alert.severity}</Badge>
      </td>
      <td className="py-3 px-4">
        <div className="font-medium">{alert.title}</div>
        <div className="text-xs text-gray-500 mt-0.5 max-w-sm truncate">{alert.message}</div>
      </td>
      <td className="py-3 px-4">
        <Badge className={alertStatusColor[alert.status]}>{alert.status}</Badge>
      </td>
      <td className="py-3 px-4 text-gray-500 whitespace-nowrap">
        {formatRelativeTime(alert.created_at)}
      </td>
      <td className="py-3 px-4">
        {alert.status === "open" && (
          <div className="flex items-center gap-2">
            <button
              onClick={ack}
              disabled={loading}
              title="Acknowledge"
              className="text-blue-600 hover:text-blue-800 disabled:opacity-50"
            >
              <CheckCircle className="w-4 h-4" />
            </button>
            <button
              onClick={resolve}
              disabled={loading}
              title="Resolve"
              className="text-green-600 hover:text-green-800 disabled:opacity-50"
            >
              <XCircle className="w-4 h-4" />
            </button>
          </div>
        )}
      </td>
    </tr>
  );
}
