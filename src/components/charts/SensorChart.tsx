"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";
import { format } from "date-fns";
import type { SensorReading, Sensor } from "@/types";

interface Props {
  sensor: Sensor;
  readings: SensorReading[];
}

export function SensorChart({ sensor, readings }: Props) {
  const data = [...readings]
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    .map((r) => ({
      time: format(new Date(r.timestamp), "HH:mm:ss"),
      value: r.value,
    }));

  return (
    <div className="bg-white rounded-xl border p-4">
      <h3 className="font-medium text-sm mb-4">{sensor.name} — Live Readings</h3>
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
          <XAxis
            dataKey="time"
            tick={{ fontSize: 11 }}
            interval="preserveStartEnd"
          />
          <YAxis tick={{ fontSize: 11 }} width={50} />
          <Tooltip
            formatter={(v: number) => [`${v.toFixed(3)} ${sensor.unit}`, "Value"]}
          />
          {/* Normal range reference lines */}
          <ReferenceLine
            y={sensor.max_normal}
            stroke="#ef4444"
            strokeDasharray="4 2"
            label={{ value: "Max", fontSize: 10, fill: "#ef4444" }}
          />
          <ReferenceLine
            y={sensor.min_normal}
            stroke="#f97316"
            strokeDasharray="4 2"
            label={{ value: "Min", fontSize: 10, fill: "#f97316" }}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
