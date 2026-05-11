"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { subHours, formatISO } from "date-fns";
import { getSensor, getSensorReadings } from "@/lib/api";
import { SensorChart } from "@/components/charts/SensorChart";
import { Badge } from "@/components/ui/badge";
import { statusColor } from "@/lib/utils";
import type { Sensor, SensorReading } from "@/types";

export default function SensorDetailPage() {
  const { id } = useParams<{ id: string }>();

  const { data: sensor } = useQuery<Sensor>({
    queryKey: ["sensor", id],
    queryFn: () => getSensor(id),
  });

  const { data: rawReadings } = useQuery<SensorReading[]>({
    queryKey: ["readings", id],
    queryFn: () =>
      getSensorReadings(
        id,
        formatISO(subHours(new Date(), 1)),
        formatISO(new Date())
      ),
    refetchInterval: 5_000,
  });
  const readings = rawReadings ?? [];

  if (!sensor) return <div className="p-6 text-gray-400">Loading...</div>;

  const latest = readings.length > 0 ? readings[readings.length - 1] : null;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{sensor.name}</h1>
          <p className="text-sm text-gray-500">{sensor.location} · {sensor.type}</p>
        </div>
        <Badge className={statusColor[sensor.status]}>{sensor.status}</Badge>
      </div>

      {/* Current value */}
      <div className="grid grid-cols-4 gap-4">
        <InfoCard label="Current Value"  value={latest ? `${latest.value.toFixed(3)} ${sensor.unit}` : "—"} />
        <InfoCard label="Normal Range"   value={`${sensor.min_normal} – ${sensor.max_normal} ${sensor.unit}`} />
        <InfoCard label="Sample Rate"    value={`${sensor.sample_rate_hz} Hz`} />
        <InfoCard label="Data Quality"   value={latest ? `${(latest.quality * 100).toFixed(0)}%` : "—"} />
      </div>

      {/* Chart */}
      <SensorChart sensor={sensor} readings={readings} />

      {/* Recent readings table */}
      <div>
        <h2 className="font-semibold mb-3">Recent Readings</h2>
        <div className="bg-white rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 border-b bg-gray-50">
                <th className="text-left py-2 px-4">Timestamp</th>
                <th className="text-left py-2 px-4">Value</th>
                <th className="text-left py-2 px-4">Quality</th>
              </tr>
            </thead>
            <tbody>
              {[...readings].reverse().slice(0, 20).map((r, i) => (
                <tr key={i} className="border-b last:border-0">
                  <td className="py-2 px-4 font-mono text-xs">{new Date(r.timestamp).toISOString()}</td>
                  <td className="py-2 px-4">{r.value.toFixed(4)} {sensor.unit}</td>
                  <td className="py-2 px-4">{(r.quality * 100).toFixed(0)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white rounded-xl border p-4">
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      <div className="font-semibold">{value}</div>
    </div>
  );
}
