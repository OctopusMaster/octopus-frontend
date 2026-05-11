"use client";

import { useEffect, useRef, useState } from "react";
import { Thermometer, Droplets, Gauge, Zap } from "lucide-react";
import type { Sensor, SensorType, SensorStatus } from "@/types";

// ─── Datacenter floor layout ──────────────────────────────────────────────────
// Three rack rows separated by alternating hot/cold aisles.
// Sensors are grouped by their rack_id field (e.g. "A1", "B3").

const RACK_ROWS: { id: string; label: string; rackIds: string[] }[] = [
  { id: "row-a", label: "Row A", rackIds: ["A1", "A2", "A3", "A4", "A5", "A6"] },
  { id: "row-b", label: "Row B", rackIds: ["B1", "B2", "B3", "B4", "B5", "B6"] },
  { id: "row-c", label: "Row C", rackIds: ["C1", "C2", "C3", "C4", "C5", "C6"] },
];

// The layout renders: COLD → Row A → HOT → Row B → COLD → Row C → HOT

// ─── Icons + units ───────────────────────────────────────────────────────────

const SENSOR_ICON: Record<SensorType, React.ElementType> = {
  temperature: Thermometer,
  humidity: Droplets,
  pressure: Gauge,
  voltage: Zap,
};

const SENSOR_UNIT: Record<SensorType, string> = {
  temperature: "°C",
  humidity: "%",
  pressure: "bar",
  voltage: "V",
};

// ─── Colour helpers ───────────────────────────────────────────────────────────

function dotColor(status: SensorStatus, anomalous: boolean): string {
  if (anomalous) return "bg-red-500";
  switch (status) {
    case "active":       return "bg-emerald-500";
    case "failing":      return "bg-amber-400";
    case "disconnected": return "bg-gray-500";
    case "inactive":     return "bg-gray-700";
  }
}

function textColor(status: SensorStatus, anomalous: boolean): string {
  if (anomalous) return "text-red-400";
  switch (status) {
    case "active":       return "text-emerald-400";
    case "failing":      return "text-amber-400";
    case "disconnected": return "text-gray-500";
    case "inactive":     return "text-gray-600";
  }
}

// ─── SensorNode ───────────────────────────────────────────────────────────────

interface SensorNodeProps {
  sensor: Sensor;
  value?: number;
  isPulsing: boolean;
  isAnomalous: boolean;
}

function SensorNode({ sensor, value, isPulsing, isAnomalous }: SensorNodeProps) {
  const Icon = SENSOR_ICON[sensor.type];
  const unit = SENSOR_UNIT[sensor.type];
  const dot  = dotColor(sensor.status, isAnomalous);
  const txt  = textColor(sensor.status, isAnomalous);

  return (
    <div
      className={`relative flex items-center gap-1.5 px-1.5 py-[3px] rounded transition-colors ${
        isAnomalous ? "bg-red-950/50" : "hover:bg-white/5"
      }`}
      title={`${sensor.name}${value !== undefined ? ` — ${value.toFixed(1)}${unit}` : ""}`}
    >
      {/* Expanding ring on new reading */}
      {isPulsing && (
        <span
          className="absolute inset-0 rounded border border-current opacity-0 pointer-events-none"
          style={{
            color: isAnomalous ? "#ef4444" : "#10b981",
            animation: "sensorPulse 0.65s ease-out forwards",
          }}
        />
      )}

      {/* Status dot with pulse ring */}
      <span className="relative flex-shrink-0 w-2 h-2">
        <span className={`block w-2 h-2 rounded-full ${dot}`} />
        {isPulsing && (
          <span
            className={`absolute inset-0 rounded-full ${dot} opacity-0`}
            style={{ animation: "sensorPulseRing 0.65s ease-out forwards" }}
          />
        )}
      </span>

      <Icon className={`w-3 h-3 flex-shrink-0 ${txt}`} />

      <span className={`text-[11px] font-mono tabular-nums leading-none ${txt}`}>
        {value !== undefined ? `${value.toFixed(1)}${unit}` : "—"}
      </span>
    </div>
  );
}

// ─── RackUnit ─────────────────────────────────────────────────────────────────

interface RackUnitProps {
  rackId: string;
  sensors: Sensor[];
  liveValues: Record<string, number>;
  pulses: Record<string, number>;
  anomalousSensors: Set<string>;
}

function RackUnit({ rackId, sensors, liveValues, pulses, anomalousSensors }: RackUnitProps) {
  const hasAnomaly = sensors.some((s) => anomalousSensors.has(s.id));
  const hasActive  = sensors.some((s) => s.status === "active");

  return (
    <div
      className={`flex flex-col bg-gray-900 border rounded min-w-[116px] ${
        hasAnomaly
          ? "border-red-600/70 shadow-[0_0_10px_rgba(239,68,68,0.25)]"
          : hasActive
          ? "border-gray-700"
          : "border-gray-800"
      }`}
    >
      {/* Rack header */}
      <div
        className={`flex items-center justify-between px-2 py-1 border-b rounded-t ${
          hasAnomaly
            ? "border-red-800/40 bg-red-950/30"
            : "border-gray-800 bg-gray-800/60"
        }`}
      >
        <span className="text-[11px] font-mono font-semibold text-gray-300 tracking-wider">
          {rackId}
        </span>
        {hasAnomaly && (
          <span className="text-[9px] font-black text-red-400 uppercase">ALERT</span>
        )}
      </div>

      {/* Sensor list */}
      <div className="flex flex-col gap-0.5 p-1.5 flex-1">
        {sensors.length === 0 ? (
          <span className="text-[10px] text-gray-700 italic px-1 py-1">empty</span>
        ) : (
          sensors.map((s) => (
            <SensorNode
              key={s.id}
              sensor={s}
              value={liveValues[s.id]}
              isPulsing={!!pulses[s.id]}
              isAnomalous={anomalousSensors.has(s.id)}
            />
          ))
        )}
      </div>

      {/* Bottom status bar */}
      <div
        className={`h-0.5 rounded-b ${
          hasAnomaly ? "bg-red-500" : hasActive ? "bg-emerald-600" : "bg-gray-700"
        }`}
      />
    </div>
  );
}

// ─── AisleLine ────────────────────────────────────────────────────────────────

function AisleLine({ type }: { type: "hot" | "cold" }) {
  const isCold = type === "cold";
  return (
    <div
      className={`flex items-center gap-3 px-4 py-2 rounded ${
        isCold
          ? "bg-blue-950/40 border border-blue-900/30"
          : "bg-red-950/40 border border-red-900/30"
      }`}
    >
      <span
        className={`text-[10px] font-bold uppercase tracking-widest ${
          isCold ? "text-blue-400" : "text-red-400"
        }`}
      >
        {isCold ? "Cold Aisle" : "Hot Aisle"}
      </span>
      <div
        className={`flex-1 h-px ${isCold ? "bg-blue-900/50" : "bg-red-900/50"}`}
      />
      <span className={`text-[10px] font-mono ${isCold ? "text-blue-500" : "text-red-500"}`}>
        {isCold ? "↓ supply air  ~17 °C" : "↑ return air  ~27 °C"}
      </span>
    </div>
  );
}

// ─── DatacenterFloorPlan (main export) ───────────────────────────────────────

export interface DatacenterFloorPlanProps {
  sensors: Sensor[];
  liveValues: Record<string, number>;
  anomalousSensors?: Set<string>;
}

export function DatacenterFloorPlan({
  sensors,
  liveValues,
  anomalousSensors = new Set(),
}: DatacenterFloorPlanProps) {
  // Track which sensors fired a new reading so we can animate the pulse.
  const [pulses, setPulses] = useState<Record<string, number>>({});
  const prevValues = useRef<Record<string, number>>({});

  useEffect(() => {
    const changed: string[] = [];
    for (const [id, val] of Object.entries(liveValues)) {
      if (prevValues.current[id] !== val) changed.push(id);
    }
    prevValues.current = { ...liveValues };
    if (changed.length === 0) return;

    const now = Date.now();
    setPulses((prev) => {
      const next = { ...prev };
      for (const id of changed) next[id] = now;
      return next;
    });

    const timer = setTimeout(() => {
      setPulses((prev) => {
        const next = { ...prev };
        for (const id of changed) {
          if (next[id] === now) delete next[id];
        }
        return next;
      });
    }, 700);

    return () => clearTimeout(timer);
  }, [liveValues]);

  // Group sensors by rack_id; unassigned sensors shown separately.
  const byRack: Record<string, Sensor[]> = {};
  const unassigned: Sensor[] = [];
  for (const s of sensors) {
    if (s.rack_id) {
      if (!byRack[s.rack_id]) byRack[s.rack_id] = [];
      byRack[s.rack_id].push(s);
    } else {
      unassigned.push(s);
    }
  }

  const anomalyCount = sensors.filter((s) => anomalousSensors.has(s.id)).length;

  return (
    <div className="bg-gray-950 rounded-xl p-5 space-y-3 overflow-auto">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-200">Datacenter Floor Plan</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            {sensors.length} sensors · live readings
            {anomalyCount > 0 && (
              <span className="ml-2 text-red-400 font-medium">
                {anomalyCount} anomal{anomalyCount === 1 ? "y" : "ies"} active
              </span>
            )}
          </p>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 text-[11px] text-gray-400">
          {[
            { color: "bg-emerald-500", label: "Normal" },
            { color: "bg-amber-400",   label: "Warning" },
            { color: "bg-red-500",     label: "Anomaly" },
            { color: "bg-gray-600",    label: "Offline" },
          ].map(({ color, label }) => (
            <span key={label} className="flex items-center gap-1">
              <span className={`w-2 h-2 rounded-full ${color} flex-shrink-0`} />
              {label}
            </span>
          ))}
        </div>
      </div>

      {/* North wall */}
      <div className="text-center text-[9px] text-gray-700 uppercase tracking-widest border-t border-gray-800 pt-2">
        ▲ North Wall
      </div>

      {/* Aisle + Row A */}
      <AisleLine type="cold" />
      <RackRow
        rowLabel="Row A"
        rackIds={RACK_ROWS[0].rackIds}
        byRack={byRack}
        liveValues={liveValues}
        pulses={pulses}
        anomalousSensors={anomalousSensors}
      />

      {/* Aisle + Row B */}
      <AisleLine type="hot" />
      <RackRow
        rowLabel="Row B"
        rackIds={RACK_ROWS[1].rackIds}
        byRack={byRack}
        liveValues={liveValues}
        pulses={pulses}
        anomalousSensors={anomalousSensors}
      />

      {/* Aisle + Row C */}
      <AisleLine type="cold" />
      <RackRow
        rowLabel="Row C"
        rackIds={RACK_ROWS[2].rackIds}
        byRack={byRack}
        liveValues={liveValues}
        pulses={pulses}
        anomalousSensors={anomalousSensors}
      />

      <AisleLine type="hot" />

      {/* South wall */}
      <div className="text-center text-[9px] text-gray-700 uppercase tracking-widest border-b border-gray-800 pb-2">
        ▼ South Wall — Main Entrance
      </div>

      {/* Unassigned sensors */}
      {unassigned.length > 0 && (
        <div className="border border-dashed border-gray-800 rounded p-3 mt-2">
          <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">
            Unassigned ({unassigned.length})
          </p>
          <div className="flex flex-wrap gap-2">
            {unassigned.map((s) => (
              <SensorNode
                key={s.id}
                sensor={s}
                value={liveValues[s.id]}
                isPulsing={!!pulses[s.id]}
                isAnomalous={anomalousSensors.has(s.id)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── RackRow (helper) ─────────────────────────────────────────────────────────

function RackRow({
  rowLabel,
  rackIds,
  byRack,
  liveValues,
  pulses,
  anomalousSensors,
}: {
  rowLabel: string;
  rackIds: string[];
  byRack: Record<string, Sensor[]>;
  liveValues: Record<string, number>;
  pulses: Record<string, number>;
  anomalousSensors: Set<string>;
}) {
  return (
    <div className="space-y-1.5">
      <span className="text-[9px] text-gray-600 uppercase tracking-widest">{rowLabel}</span>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {rackIds.map((rid) => (
          <RackUnit
            key={rid}
            rackId={rid}
            sensors={byRack[rid] ?? []}
            liveValues={liveValues}
            pulses={pulses}
            anomalousSensors={anomalousSensors}
          />
        ))}
      </div>
    </div>
  );
}
