"use client";

import { useQuery } from "@tanstack/react-query";
import { getSensors } from "@/lib/api";
import { SensorCard } from "@/components/sensors/SensorCard";
import type { Sensor } from "@/types";

const SENSOR_TYPES = ["all", "temperature", "humidity", "pressure", "voltage"] as const;

export default function SensorsPage() {
  const [filter, setFilter] = useState<string>("all");
  const { data: sensors = [], isLoading } = useQuery<Sensor[]>({
    queryKey: ["sensors"],
    queryFn: getSensors,
    refetchInterval: 30_000,
  });

  const filtered = filter === "all" ? sensors : sensors.filter((s) => s.type === filter);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Sensors</h1>
        <p className="text-sm text-gray-500">{sensors.length} sensors registered</p>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2">
        {SENSOR_TYPES.map((t) => (
          <button
            key={t}
            onClick={() => setFilter(t)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize transition ${
              filter === t ? "bg-blue-600 text-white" : "bg-white border hover:bg-gray-50 text-gray-600"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="text-gray-400 text-sm">Loading sensors...</div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {filtered.map((s) => (
            <SensorCard key={s.id} sensor={s} />
          ))}
        </div>
      )}
    </div>
  );
}

// Need useState import
import { useState } from "react";
