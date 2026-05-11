export type SensorType = "temperature" | "humidity" | "pressure" | "voltage";
export type SensorStatus = "active" | "inactive" | "failing" | "disconnected";
export type AlertStatus = "open" | "acknowledged" | "resolved" | "suppressed";
export type Severity = "low" | "medium" | "high" | "critical";
export type DetectionMethod = "threshold" | "moving_average" | "zscore" | "iqr";
export type AnomalyType = "spike" | "drift" | "stuck" | "out_of_range" | "missing_data" | "noisy";
export type AisleType = "hot" | "cold";

export interface Rack {
  id: string;         // e.g. "A1", "B3"
  label: string;      // display name
  row: string;        // row identifier, e.g. "A", "B", "C"
  position: number;   // 0-based index within the row
  aisle_front: AisleType;
}

export interface Sensor {
  id: string;
  name: string;
  type: SensorType;
  location: string;
  rack_id?: string;   // datacenter rack assignment, e.g. "A1"
  rack_unit?: number; // U position within the rack (1–42 from bottom)
  unit: string;
  min_normal: number;
  max_normal: number;
  sample_rate_hz: number;
  status: SensorStatus;
  last_seen_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SensorReading {
  sensor_id: string;
  timestamp: string;
  value: number;
  quality: number;
}

export interface Anomaly {
  id: string;
  sensor_id: string;
  timestamp: string;
  value: number;
  anomaly_type: AnomalyType;
  severity: Severity;
  methods: DetectionMethod[];
  score: number;
  explanation: string;
  is_resolved: boolean;
  resolved_at: string | null;
  created_at: string;
}

export interface Alert {
  id: string;
  anomaly_id: string;
  sensor_id: string;
  severity: Severity;
  status: AlertStatus;
  title: string;
  message: string;
  assigned_to: string | null;
  acked_at: string | null;
  resolved_at: string | null;
  escalated_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: "admin" | "operator" | "viewer";
}

export interface ResponsiblePerson {
  id: string;
  name: string;
  email: string;
  phone: string;
  is_on_call: boolean;
  on_call_until?: string | null;
  created_at: string;
}
