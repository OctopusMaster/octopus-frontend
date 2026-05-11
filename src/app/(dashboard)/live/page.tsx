"use client";

import { useCallback, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip,
  ReferenceLine, CartesianGrid, ResponsiveContainer,
} from "recharts";
import { Radio, Pause, Play, EyeOff, Eye, Wifi, WifiOff } from "lucide-react";
import { getSensors, getAlerts } from "@/lib/api";
import { useWebSocket } from "@/hooks/useWebSocket";
import type { Sensor, SensorReading, SensorType, Alert } from "@/types";

// ── Constants ─────────────────────────────────────────────────────────────────

const WINDOW = 80; // rolling window: last N readings per sensor

const TYPE_STYLE: Record<SensorType, { stroke: string; gradId: string }> = {
  temperature: { stroke: "#ef4444", gradId: "g-temp" },
  humidity:    { stroke: "#3b82f6", gradId: "g-hum"  },
  pressure:    { stroke: "#8b5cf6", gradId: "g-pres" },
  voltage:     { stroke: "#f59e0b", gradId: "g-volt" },
};

const TYPE_FILTERS = ["all", "temperature", "humidity", "pressure", "voltage"] as const;
type TypeFilter = (typeof TYPE_FILTERS)[number];

type Point = { time: string; value: number };

// ── LiveChart ─────────────────────────────────────────────────────────────────

function LiveChart({
  sensor, points, anomalous,
}: {
  sensor: Sensor;
  points: Point[];
  anomalous: boolean;
}) {
  if (points.length === 0) {
    return (
      <div className="h-[148px] flex items-center justify-center text-[11px] text-gray-300 select-none">
        Waiting for first reading…
      </div>
    );
  }

  const { stroke, gradId } = TYPE_STYLE[sensor.type];
  const activeStroke = anomalous ? "#ef4444" : stroke;
  const activeGrad   = anomalous ? "g-anom" : gradId;

  const vals = points.map((p) => p.value);
  const lo   = Math.min(...vals, sensor.min_normal) * 0.97;
  const hi   = Math.max(...vals, sensor.max_normal) * 1.03;

  return (
    <ResponsiveContainer width="100%" height={148}>
      <AreaChart data={points} margin={{ top: 4, right: 6, bottom: 0, left: -8 }}>
        <defs>
          {/* per-type gradient */}
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor={stroke}   stopOpacity={0.18} />
            <stop offset="95%" stopColor={stroke}    stopOpacity={0.01} />
          </linearGradient>
          {/* anomaly gradient */}
          <linearGradient id="g-anom" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="#ef4444" stopOpacity={0.22} />
            <stop offset="95%" stopColor="#ef4444" stopOpacity={0.01} />
          </linearGradient>
        </defs>

        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />

        <XAxis
          dataKey="time"
          tick={{ fontSize: 9, fill: "#9ca3af" }}
          interval="preserveStartEnd"
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          domain={[lo, hi]}
          tick={{ fontSize: 9, fill: "#9ca3af" }}
          tickLine={false}
          axisLine={false}
          width={38}
          tickFormatter={(v: number) => v.toFixed(1)}
        />
        <Tooltip
          contentStyle={{ fontSize: 11, padding: "4px 10px", border: "1px solid #e5e7eb", borderRadius: 8 }}
          formatter={(v: number) => [`${v.toFixed(3)} ${sensor.unit}`, "Value"]}
          labelStyle={{ fontSize: 10, color: "#6b7280", marginBottom: 2 }}
        />
        <ReferenceLine y={sensor.max_normal} stroke="#ef4444" strokeDasharray="3 2" strokeWidth={1} />
        <ReferenceLine y={sensor.min_normal} stroke="#f97316" strokeDasharray="3 2" strokeWidth={1} />
        <Area
          type="monotone"
          dataKey="value"
          stroke={activeStroke}
          strokeWidth={1.5}
          fill={`url(#${activeGrad})`}
          dot={false}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// ── LiveSensorCard ────────────────────────────────────────────────────────────

function LiveSensorCard({
  sensor, points, anomalous, onHide,
}: {
  sensor: Sensor;
  points: Point[];
  anomalous: boolean;
  onHide: () => void;
}) {
  const latest = points.length > 0 ? points[points.length - 1].value : null;
  const { stroke } = TYPE_STYLE[sensor.type];

  const dotCls =
    anomalous                         ? "bg-red-500 animate-pulse" :
    sensor.status === "active"        ? "bg-emerald-500" :
    sensor.status === "failing"       ? "bg-amber-400 animate-pulse" :
    sensor.status === "disconnected"  ? "bg-gray-400" : "bg-gray-300";

  return (
    <div className={`bg-white rounded-2xl border overflow-hidden shadow-sm transition-shadow ${
      anomalous ? "border-red-200 shadow-red-50/60" : "border-gray-200"
    }`}>
      {/* Header */}
      <div className="flex items-start gap-2 px-4 pt-3.5 pb-2">
        <span className={`mt-[3px] w-2 h-2 rounded-full shrink-0 ${dotCls}`} />

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate leading-tight">{sensor.name}</p>
          <p className="text-[10px] text-gray-400 truncate mt-0.5">
            {sensor.rack_id ? `Rack ${sensor.rack_id}` : sensor.location}
            <span className="mx-1 text-gray-200">·</span>
            {sensor.type}
          </p>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {latest !== null ? (
            <span
              className="text-[17px] font-bold tabular-nums leading-none"
              style={{ color: anomalous ? "#ef4444" : stroke }}
            >
              {latest.toFixed(1)}
              <span className="text-xs font-normal text-gray-400 ml-0.5">{sensor.unit}</span>
            </span>
          ) : (
            <span className="text-sm text-gray-300 font-mono">—</span>
          )}

          {anomalous && (
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-red-100 text-red-600 uppercase tracking-wide">
              Alert
            </span>
          )}

          <button
            onClick={onHide}
            title="Hide"
            className="w-6 h-6 flex items-center justify-center rounded-lg text-gray-300 hover:text-gray-500 hover:bg-gray-50 transition-colors"
          >
            <EyeOff className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Range legend */}
      <div className="flex items-center gap-3 px-4 pb-1 text-[9px] text-gray-400">
        <span className="flex items-center gap-1">
          <span className="inline-block w-4 border-t border-dashed border-red-400" />
          max {sensor.max_normal} {sensor.unit}
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-4 border-t border-dashed border-orange-400" />
          min {sensor.min_normal} {sensor.unit}
        </span>
        <span className="ml-auto text-gray-300">{points.length}/{WINDOW} pts</span>
      </div>

      {/* Chart */}
      <div className="px-1 pb-3">
        <LiveChart sensor={sensor} points={points} anomalous={anomalous} />
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function LivePage() {
  // Use refs for values read inside the WS callback to avoid stale closures
  // and prevent the socket from reconnecting every time these change.
  const pausedRef = useRef(false);
  const [paused,   setPausedState]   = useState(false);
  const [connected, setConnected]    = useState(false);
  const [filter,    setFilter]       = useState<TypeFilter>("all");
  const [hiddenIds, setHiddenIds]    = useState<Set<string>>(new Set());
  const [buffers,   setBuffers]      = useState<Record<string, Point[]>>({});

  const { data: sensors = [] } = useQuery<Sensor[]>({
    queryKey: ["sensors"],
    queryFn: getSensors,
    refetchInterval: 30_000,
  });

  const { data: alerts = [] } = useQuery<Alert[]>({
    queryKey: ["alerts", "open"],
    queryFn: () => getAlerts({ status: "open" }),
    refetchInterval: 15_000,
  });

  const anomalousSensors = new Set(alerts.map((a) => a.sensor_id));

  // Stable WS handler — never changes, so the socket never reconnects on state change.
  const handleWS = useCallback((msg: { topic: string; data: unknown }) => {
    if (msg.topic === "sensor:reading") {
      setConnected(true);
      if (pausedRef.current) return;
      const r = msg.data as SensorReading;
      setBuffers((prev) => {
        const cur   = prev[r.sensor_id] ?? [];
        const point: Point = {
          time:  format(new Date(r.timestamp), "HH:mm:ss"),
          value: r.value,
        };
        return { ...prev, [r.sensor_id]: [...cur, point].slice(-WINDOW) };
      });
    }
  }, []);

  useWebSocket(handleWS);

  function togglePause() {
    const next = !pausedRef.current;
    pausedRef.current = next;
    setPausedState(next);
  }

  function hideAll() {
    setHiddenIds(new Set(sensors.map((s) => s.id)));
  }

  function showAll() {
    setHiddenIds(new Set());
  }

  // Filtered + visible sensors
  const visible = sensors.filter(
    (s) => !hiddenIds.has(s.id) && (filter === "all" || s.type === filter),
  );
  const hidden  = sensors.filter((s) => hiddenIds.has(s.id));

  const activeCount = sensors.filter((s) => s.status === "active").length;

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[#f5f5f7]">

      {/* ── Top bar ─────────────────────────────────────────────────────────── */}
      <div className="shrink-0 flex items-center gap-3 px-5 py-3 bg-white border-b border-gray-100">
        {/* Title + WS status */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Radio className="w-4 h-4 text-gray-700" />
            {connected && !paused && (
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 border border-white" />
            )}
          </div>
          <h1 className="text-sm font-semibold text-gray-900">Live Readings</h1>
        </div>

        {/* WS badge */}
        <span className={`flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full ${
          connected && !paused
            ? "bg-emerald-50 text-emerald-700"
            : paused
            ? "bg-amber-50 text-amber-700"
            : "bg-gray-100 text-gray-500"
        }`}>
          {connected && !paused
            ? <><Wifi className="w-2.5 h-2.5" /> Live</>
            : paused
            ? <><Pause className="w-2.5 h-2.5" /> Paused</>
            : <><WifiOff className="w-2.5 h-2.5" /> Connecting…</>}
        </span>

        <span className="text-xs text-gray-400 tabular-nums">
          {activeCount} active · {visible.length} shown
        </span>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Type filter */}
        <div className="flex gap-0.5 bg-gray-100 rounded-lg p-0.5">
          {TYPE_FILTERS.map((t) => (
            <button
              key={t}
              onClick={() => setFilter(t)}
              className={`px-2.5 py-1 text-[11px] font-medium rounded-md capitalize transition-colors ${
                filter === t
                  ? "bg-white text-gray-800 shadow-sm"
                  : "text-gray-400 hover:text-gray-600"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Controls */}
        <button
          onClick={togglePause}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            paused
              ? "bg-emerald-600 hover:bg-emerald-700 text-white"
              : "bg-gray-100 hover:bg-gray-200 text-gray-600"
          }`}
        >
          {paused ? <><Play className="w-3 h-3" /> Resume</> : <><Pause className="w-3 h-3" /> Pause</>}
        </button>
      </div>

      {/* ── Chart grid ──────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-auto px-4 py-4">
        {visible.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-400 gap-3">
            <Eye className="w-8 h-8 text-gray-200" />
            <p className="text-sm">No sensors visible</p>
            {hidden.length > 0 && (
              <button
                onClick={showAll}
                className="text-xs text-blue-600 hover:underline"
              >
                Show all {sensors.length} sensors
              </button>
            )}
          </div>
        ) : (
          <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
            {visible.map((sensor) => (
              <LiveSensorCard
                key={sensor.id}
                sensor={sensor}
                points={buffers[sensor.id] ?? []}
                anomalous={anomalousSensors.has(sensor.id)}
                onHide={() => setHiddenIds((prev) => new Set(Array.from(prev).concat(sensor.id)))}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Hidden sensors tray ─────────────────────────────────────────────── */}
      {hidden.length > 0 && (
        <div className="shrink-0 px-4 py-2 bg-white border-t border-gray-100 flex items-center gap-2 flex-wrap">
          <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider shrink-0">
            Hidden
          </span>
          {hidden.map((s) => (
            <button
              key={s.id}
              onClick={() => setHiddenIds((prev) => { const n = new Set(prev); n.delete(s.id); return n; })}
              className="flex items-center gap-1 px-2 py-0.5 bg-gray-100 hover:bg-gray-200 rounded-md text-[11px] text-gray-500 transition-colors"
            >
              <Eye className="w-3 h-3" />
              {s.name}
            </button>
          ))}
          <button onClick={showAll} className="ml-auto text-[11px] text-blue-600 hover:underline shrink-0">
            Show all
          </button>
        </div>
      )}
    </div>
  );
}
