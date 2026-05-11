"use client";

import Link from "next/link";
import { Thermometer, Droplets, Gauge, Zap, Activity } from "lucide-react";
import type { Sensor } from "@/types";
import { Badge } from "@/components/ui/badge";
import { statusColor, formatRelativeTime } from "@/lib/utils";

const typeIcon: Record<string, React.ReactNode> = {
  temperature: <Thermometer className="w-5 h-5" />,
  humidity:    <Droplets className="w-5 h-5" />,
  pressure:    <Gauge className="w-5 h-5" />,
  voltage:     <Zap className="w-5 h-5" />,
};

interface Props {
  sensor: Sensor;
  latestValue?: number;
}

export function SensorCard({ sensor, latestValue }: Props) {
  return (
    <Link href={`/sensors/${sensor.id}`}>
      <div className="bg-white rounded-xl border p-4 hover:shadow-md transition cursor-pointer">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2 text-blue-600">
            {typeIcon[sensor.type] ?? <Activity className="w-5 h-5" />}
            <span className="font-medium text-sm text-gray-900">{sensor.name}</span>
          </div>
          <Badge className={statusColor[sensor.status]}>{sensor.status}</Badge>
        </div>

        <div className="mb-3">
          <span className="text-2xl font-bold">
            {latestValue !== undefined ? latestValue.toFixed(2) : "--"}
          </span>
          <span className="text-sm text-gray-500 ml-1">{sensor.unit}</span>
        </div>

        <div className="text-xs text-gray-500 space-y-1">
          <div>{sensor.location}</div>
          <div className="flex justify-between">
            <span>Normal: {sensor.min_normal}–{sensor.max_normal} {sensor.unit}</span>
            {sensor.last_seen_at && (
              <span>{formatRelativeTime(sensor.last_seen_at)}</span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
