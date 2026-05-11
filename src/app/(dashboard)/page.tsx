"use client";

import { useCallback, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle, Activity, Cpu, Zap,
  Thermometer, Droplets, Gauge, ChevronLeft,
  Phone, Mail, Clock, CheckCircle, ArrowRight,
} from "lucide-react";
import { getSensors, getAlerts } from "@/lib/api";
import { DatacenterView } from "@/components/datacenter/DatacenterView";
import { AddSensorModal } from "@/components/sensors/AddSensorModal";
import { useWebSocket } from "@/hooks/useWebSocket";
import {
  ROOMS, getRoomById, applyDemoLayout,
  getDutyPerson, getContactStatus, getEscalationTimeline,
} from "@/lib/rooms";
import type { Sensor, Alert, SensorReading, SensorType, Severity } from "@/types";

// ── Icon / unit maps ──────────────────────────────────────────────────────────

const TYPE_ICON: Record<SensorType, React.ElementType> = {
  temperature: Thermometer,
  humidity:    Droplets,
  pressure:    Gauge,
  voltage:     Zap,
};

const UNIT: Record<SensorType, string> = {
  temperature: "°C",
  humidity:    "%",
  pressure:    "bar",
  voltage:     "V",
};

// ── Severity helpers ──────────────────────────────────────────────────────────

const SEV_COLOR: Record<Severity, string> = {
  critical: "bg-red-100 text-red-700",
  high:     "bg-orange-100 text-orange-700",
  medium:   "bg-amber-100 text-amber-700",
  low:      "bg-blue-100 text-blue-700",
};

function timeAgo(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60)   return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ago`;
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function OverviewPage() {
  const [liveValues, setLiveValues]       = useState<Record<string, number>>({});
  const [selectedRack, setSelectedRack]   = useState<string | null>(null);
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [selectedRoomId, setSelectedRoomId] = useState("server-room-a");
  const [showAddModal, setShowAddModal]   = useState(false);

  const { data: sensors = [], refetch: refetchSensors } = useQuery<Sensor[]>({
    queryKey: ["sensors"],
    queryFn: getSensors,
    refetchInterval: 30_000,
  });

  const { data: alerts = [], refetch: refetchAlerts } = useQuery<Alert[]>({
    queryKey: ["alerts", "open"],
    queryFn: () => getAlerts({ status: "open" }),
    refetchInterval: 15_000,
  });

  const handleWS = useCallback(
    (msg: { topic: string; data: unknown }) => {
      if (msg.topic === "sensor:reading") {
        const r = msg.data as SensorReading;
        setLiveValues((p) => ({ ...p, [r.sensor_id]: r.value }));
      }
      if (msg.topic === "alert:new") refetchAlerts();
    },
    [refetchAlerts],
  );
  useWebSocket(handleWS);

  const currentRoom    = getRoomById(selectedRoomId);
  const layoutedSensors = applyDemoLayout(sensors, selectedRoomId);

  const anomalousSensors = new Set(alerts.map((a) => a.sensor_id));
  const activeCount      = sensors.filter((s) => s.status === "active").length;
  const failCount        = sensors.filter(
    (s) => s.status === "failing" || s.status === "disconnected",
  ).length;
  const criticalCount    = alerts.filter((a) => a.severity === "critical").length;

  const rackSensors = selectedRack
    ? layoutedSensors.filter((s) => s.rack_id === selectedRack)
    : [];

  return (
    <div className="flex h-screen overflow-hidden bg-[#f5f5f7]">

      {/* ── Left panel — floor plan 40% ──────────────────────────────────── */}
      <div className="w-[40%] shrink-0 p-4 h-full flex flex-col gap-2">

        {/* Room selector tabs */}
        <div className="flex gap-1 bg-white rounded-xl border border-gray-200 shadow-sm p-1">
          {ROOMS.map((room) => (
            <button
              key={room.id}
              onClick={() => { setSelectedRoomId(room.id); setSelectedRack(null); }}
              className={`flex-1 text-[11px] font-medium py-1.5 px-2 rounded-lg transition-colors truncate ${
                selectedRoomId === room.id
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-gray-500 hover:bg-gray-50 hover:text-gray-800"
              }`}
            >
              {room.name}
            </button>
          ))}
        </div>

        {/* Floor plan */}
        <div className="flex-1 rounded-2xl overflow-hidden border border-gray-200 shadow-sm min-h-0">
          <DatacenterView
            sensors={layoutedSensors}
            liveValues={liveValues}
            anomalousSensors={anomalousSensors}
            selectedRack={selectedRack}
            onRackSelect={setSelectedRack}
            layout={currentRoom.rows}
            roomName={currentRoom.name}
          />
        </div>
      </div>

      {/* ── Right panel — dashboard 60% ──────────────────────────────────── */}
      <div className="flex-1 h-full overflow-auto px-4 py-4 space-y-4">

        {/* Stats row */}
        <div className="grid grid-cols-4 gap-3">
          <StatCard label="Total Sensors"   value={sensors.length}  icon={<Cpu className="w-4 h-4" />}           color="text-blue-600"    bg="bg-blue-50" />
          <StatCard label="Active"          value={activeCount}     icon={<Activity className="w-4 h-4" />}       color="text-emerald-600" bg="bg-emerald-50" />
          <StatCard label="Failing"         value={failCount}       icon={<AlertTriangle className="w-4 h-4" />}  color="text-orange-600"  bg="bg-orange-50" />
          <StatCard label="Critical Alerts" value={criticalCount}   icon={<AlertTriangle className="w-4 h-4" />} color="text-red-600"     bg="bg-red-50" />
        </div>

        {/* Conditional right-panel body */}
        {selectedAlert ? (
          <AlertDetailPanel alert={selectedAlert} onBack={() => setSelectedAlert(null)} />
        ) : selectedRack ? (
          <RackDetail
            rackId={selectedRack}
            roomName={currentRoom.name}
            sensors={rackSensors}
            liveValues={liveValues}
            anomalousSensors={anomalousSensors}
            onBack={() => setSelectedRack(null)}
            onAddSensor={() => setShowAddModal(true)}
          />
        ) : (
          <>
            <Section title="Open Alerts" count={alerts.length}>
              {alerts.length === 0 ? (
                <EmptyState text="No open alerts" />
              ) : (
                <div className="divide-y divide-gray-100">
                  {alerts.slice(0, 20).map((a) => (
                    <AlertRow key={a.id} alert={a} onSelect={setSelectedAlert} />
                  ))}
                </div>
              )}
            </Section>

            <Section title="Live Sensor Readings" count={sensors.length}>
              {sensors.length === 0 ? (
                <EmptyState text="No sensors registered" />
              ) : (
                <div className="divide-y divide-gray-100">
                  {sensors.map((s) => (
                    <SensorRow
                      key={s.id}
                      sensor={s}
                      value={liveValues[s.id]}
                      anomalous={anomalousSensors.has(s.id)}
                    />
                  ))}
                </div>
              )}
            </Section>
          </>
        )}
      </div>

      {/* Add Sensor Modal */}
      {showAddModal && selectedRack && (
        <AddSensorModal
          rackId={selectedRack}
          roomName={currentRoom.name}
          onSuccess={() => {
            setShowAddModal(false);
            refetchSensors();
          }}
          onClose={() => setShowAddModal(false)}
        />
      )}
    </div>
  );
}

// ── StatCard ──────────────────────────────────────────────────────────────────

function StatCard({
  label, value, icon, color, bg,
}: { label: string; value: number; icon: React.ReactNode; color: string; bg: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-3 shadow-sm">
      <div className={`w-8 h-8 ${bg} ${color} rounded-lg flex items-center justify-center mb-2`}>
        {icon}
      </div>
      <div className="text-xl font-bold tabular-nums">{value}</div>
      <div className="text-xs text-gray-500 mt-0.5">{label}</div>
    </div>
  );
}

// ── Section wrapper ───────────────────────────────────────────────────────────

function Section({
  title, count, children,
}: { title: string; count?: number; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <h2 className="text-sm font-semibold text-gray-800">{title}</h2>
        {count !== undefined && (
          <span className="text-xs text-gray-400 tabular-nums">{count}</span>
        )}
      </div>
      {children}
    </div>
  );
}

// ── AlertRow ──────────────────────────────────────────────────────────────────

function AlertRow({ alert, onSelect }: { alert: Alert; onSelect: (a: Alert) => void }) {
  return (
    <button
      onClick={() => onSelect(alert)}
      className="w-full flex items-start gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors text-left"
    >
      <span
        className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md mt-0.5 shrink-0 ${SEV_COLOR[alert.severity]}`}>
        {alert.severity.toUpperCase()}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800 truncate">{alert.title}</p>
        <p className="text-xs text-gray-400 truncate">{alert.message}</p>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <span className="text-[11px] text-gray-400 tabular-nums">{timeAgo(alert.created_at)}</span>
        <ArrowRight className="w-3 h-3 text-gray-300" />
      </div>
    </button>
  );
}

// ── SensorRow ─────────────────────────────────────────────────────────────────

function SensorRow({
  sensor, value, anomalous,
}: { sensor: Sensor; value?: number; anomalous: boolean }) {
  const Icon = TYPE_ICON[sensor.type];
  const unit = UNIT[sensor.type];

  const dotColor =
    anomalous                          ? "bg-red-500"     :
    sensor.status === "active"         ? "bg-emerald-500" :
    sensor.status === "failing"        ? "bg-amber-400"   :
    sensor.status === "disconnected"   ? "bg-gray-400"    : "bg-gray-300";

  return (
    <div className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50 transition-colors">
      <span className={`w-2 h-2 rounded-full shrink-0 ${dotColor}`} />
      <Icon className="w-3.5 h-3.5 text-gray-400 shrink-0" />
      <span className="text-sm text-gray-700 flex-1 truncate">{sensor.name}</span>
      {sensor.rack_id && (
        <span className="text-[10px] text-gray-400 font-mono shrink-0">{sensor.rack_id}</span>
      )}
      <span className={`text-sm font-mono tabular-nums shrink-0 ${anomalous ? "text-red-600 font-semibold" : "text-gray-800"}`}>
        {value !== undefined ? `${value.toFixed(1)} ${unit}` : "—"}
      </span>
    </div>
  );
}

// ── RackDetail ────────────────────────────────────────────────────────────────

function RackDetail({
  rackId, roomName, sensors, liveValues, anomalousSensors, onBack, onAddSensor,
}: {
  rackId: string;
  roomName: string;
  sensors: Sensor[];
  liveValues: Record<string, number>;
  anomalousSensors: Set<string>;
  onBack: () => void;
  onAddSensor: () => void;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100">
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          All sensors
        </button>
        <span className="text-gray-300">/</span>
        <h2 className="text-sm font-semibold text-gray-800 flex-1">Rack {rackId}</h2>
        <button
          onClick={onAddSensor}
          className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg transition-colors"
        >
          + Add Sensor
        </button>
      </div>

      {sensors.length === 0 ? (
        <div className="px-4 py-8 text-center text-sm text-gray-400">
          No sensors assigned to rack {rackId}
        </div>
      ) : (
        <div className="divide-y divide-gray-100">
          {sensors.map((s) => {
            const Icon  = TYPE_ICON[s.type];
            const unit  = UNIT[s.type];
            const val   = liveValues[s.id];
            const isAno = anomalousSensors.has(s.id);

            return (
              <div key={s.id} className={`px-4 py-3 ${isAno ? "bg-red-50" : ""}`}>
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                    isAno ? "bg-red-100" : "bg-gray-100"
                  }`}>
                    <Icon className={`w-4 h-4 ${isAno ? "text-red-500" : "text-gray-500"}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800">{s.name}</p>
                    <p className="text-xs text-gray-400 capitalize">{s.type} · {s.sample_rate_hz} Hz</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`text-lg font-bold tabular-nums ${isAno ? "text-red-600" : "text-gray-900"}`}>
                      {val !== undefined ? `${val.toFixed(1)}` : "—"}
                      <span className="text-sm font-normal text-gray-400 ml-0.5">{unit}</span>
                    </p>
                    <p className="text-xs text-gray-400">
                      normal {s.min_normal}–{s.max_normal} {unit}
                    </p>
                  </div>
                  <div className="shrink-0 ml-1">
                    {isAno ? (
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-red-100 text-red-600">ALERT</span>
                    ) : (
                      <span className={`w-2 h-2 rounded-full inline-block ${
                        s.status === "active" ? "bg-emerald-500" :
                        s.status === "failing" ? "bg-amber-400" : "bg-gray-300"
                      }`} />
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── AlertDetailPanel ──────────────────────────────────────────────────────────

function AlertDetailPanel({ alert, onBack }: { alert: Alert; onBack: () => void }) {
  const person  = getDutyPerson(alert);
  const contact = getContactStatus(alert);
  const steps   = getEscalationTimeline(alert);

  return (
    <div className="space-y-3">
      {/* Header card */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100">
          <button
            onClick={onBack}
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            All alerts
          </button>
          <span className="text-gray-300">/</span>
          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md ${SEV_COLOR[alert.severity]}`}>
            {alert.severity.toUpperCase()}
          </span>
          <h2 className="text-sm font-semibold text-gray-800 flex-1 truncate">{alert.title}</h2>
          <span className="text-[11px] text-gray-400 tabular-nums shrink-0">{timeAgo(alert.created_at)}</span>
        </div>

        {/* What happened */}
        <div className="px-4 py-3 border-b border-gray-100">
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">What happened</p>
          <p className="text-sm text-gray-700">{alert.message}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <InfoChip label="Anomaly ID" value={alert.anomaly_id.slice(0, 8) + "…"} />
            <InfoChip label="Sensor" value={alert.sensor_id.slice(0, 8) + "…"} />
            <InfoChip label="Status" value={alert.status} />
          </div>
        </div>
      </div>

      {/* Duty person + contact status */}
      <div className="grid grid-cols-2 gap-3">
        {/* Responsible person */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-3">Responsible Person</p>
          <div className="flex items-center gap-3 mb-3">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
              style={{ backgroundColor: person.color }}
            >
              {person.initials}
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-800">{person.name}</p>
              <p className="text-xs text-gray-500">{person.role}</p>
            </div>
          </div>
          <div className="space-y-1.5">
            <a href={`tel:${person.phone}`}
              className="flex items-center gap-2 text-xs text-gray-600 hover:text-blue-600 transition-colors">
              <Phone className="w-3 h-3 text-gray-400 shrink-0" />
              {person.phone}
            </a>
            <a href={`mailto:${person.email}`}
              className="flex items-center gap-2 text-xs text-gray-600 hover:text-blue-600 transition-colors">
              <Mail className="w-3 h-3 text-gray-400 shrink-0" />
              {person.email}
            </a>
          </div>
        </div>

        {/* Contact status */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-3">Contact Status</p>
          <div
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold mb-2"
            style={{ backgroundColor: contact.bg, color: contact.color }}
          >
            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: contact.color }} />
            {contact.status}
          </div>
          <p className="text-xs text-gray-500 mt-1">{contact.description}</p>

          {/* SLA indicator */}
          <div className="mt-3 pt-3 border-t border-gray-100">
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">SLA</p>
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <Clock className="w-3 h-3 text-gray-400 shrink-0" />
              {alert.severity === "critical" ? "5 min" :
               alert.severity === "high"     ? "15 min" :
               alert.severity === "medium"   ? "30 min" : "2 h"} response target
            </div>
          </div>
        </div>
      </div>

      {/* Escalation timeline */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
        <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-3">Escalation Timeline</p>
        <div className="space-y-0">
          {steps.map((step, i) => (
            <div key={i} className="flex gap-3">
              {/* Connector column */}
              <div className="flex flex-col items-center w-5 shrink-0">
                <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${
                  step.done ? "bg-emerald-500" : "bg-gray-200"
                }`}>
                  {step.done ? (
                    <CheckCircle className="w-2.5 h-2.5 text-white" />
                  ) : (
                    <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                  )}
                </div>
                {i < steps.length - 1 && (
                  <div className={`w-px flex-1 mt-0.5 mb-0.5 ${step.done ? "bg-emerald-200" : "bg-gray-100"}`} />
                )}
              </div>
              {/* Content */}
              <div className={`pb-3 ${i === steps.length - 1 ? "pb-0" : ""}`}>
                <p className={`text-sm font-medium ${step.done ? "text-gray-800" : "text-gray-400"}`}>
                  {step.label}
                  {step.time && (
                    <span className="ml-2 text-[11px] font-normal text-gray-400 tabular-nums">{step.time}</span>
                  )}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">{step.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── InfoChip ──────────────────────────────────────────────────────────────────

function InfoChip({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex items-center gap-1 bg-gray-50 border border-gray-200 rounded-md px-2 py-1 text-[11px]">
      <span className="text-gray-400">{label}:</span>
      <span className="text-gray-700 font-mono">{value}</span>
    </span>
  );
}

// ── EmptyState ────────────────────────────────────────────────────────────────

function EmptyState({ text }: { text: string }) {
  return (
    <div className="px-4 py-6 text-center text-sm text-gray-400">{text}</div>
  );
}
