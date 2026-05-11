import type { Alert, Sensor, Severity } from "@/types";

// ── Layout types ──────────────────────────────────────────────────────────────

export interface LayoutRow {
  label: string;
  rackIds: string[];
}

export interface Room {
  id: string;
  name: string;
  description: string;
  rows: LayoutRow[];
  /** If set, only sensors whose location matches this pattern belong here */
  locationPatterns: RegExp[];
}

// ── Room definitions ──────────────────────────────────────────────────────────

export const ROOMS: Room[] = [
  {
    id: "server-room-a",
    name: "Server Room A",
    description: "Primary compute — 3 rows × 6 racks, hot/cold aisle containment",
    rows: [
      { label: "A", rackIds: ["A1", "A2", "A3", "A4", "A5", "A6"] },
      { label: "B", rackIds: ["B1", "B2", "B3", "B4", "B5", "B6"] },
      { label: "C", rackIds: ["C1", "C2", "C3", "C4", "C5", "C6"] },
    ],
    locationPatterns: [/server room/i, /rack/i, /compute/i],
  },
  {
    id: "ups-room",
    name: "UPS Room",
    description: "Power infrastructure — 1 row × 4 UPS cabinets + PDU panels",
    rows: [
      { label: "U", rackIds: ["U1", "U2", "U3", "U4"] },
    ],
    locationPatterns: [/ups/i, /panel/i, /power/i, /pdu/i],
  },
  {
    id: "network-room",
    name: "Network Room",
    description: "Networking & cooling — 2 rows × 4 cabinets, CRAC units",
    rows: [
      { label: "N", rackIds: ["N1", "N2", "N3", "N4"] },
      { label: "M", rackIds: ["M1", "M2", "M3", "M4"] },
    ],
    locationPatterns: [/hvac/i, /crac/i, /cooling/i, /network/i, /pipeline/i],
  },
];

export function getRoomById(id: string): Room {
  return ROOMS.find((r) => r.id === id) ?? ROOMS[0];
}

// ── Demo layout assignment ────────────────────────────────────────────────────
// Maps sensors to racks inside the given room using their location field.
// Sensors matching the room's locationPatterns are distributed round-robin
// across the room's racks. Unmatched sensors go to the first rack.

export function applyDemoLayout(sensors: Sensor[], roomId: string): Sensor[] {
  const room = getRoomById(roomId);
  const allRackIds = room.rows.flatMap((r) => r.rackIds);
  const roomRackSet = new Set(allRackIds);

  // Sensors with a real rack_id that belongs to this room pass through unchanged.
  const real: Sensor[] = [];
  // Sensors without a real rack_id get demo-assigned.
  const needsAssignment: Sensor[] = [];

  for (const s of sensors) {
    if (s.rack_id && roomRackSet.has(s.rack_id)) {
      real.push(s);
    } else if (!s.rack_id) {
      needsAssignment.push(s);
    }
    // sensors with a rack_id that belongs to a different room are silently dropped from this view
  }

  // Split needsAssignment into location-matched vs unmatched for round-robin
  const matched: Sensor[] = [];
  const unmatched: Sensor[] = [];
  for (const s of needsAssignment) {
    const fits = room.locationPatterns.some((p) => p.test(s.location));
    (fits ? matched : unmatched).push(s);
  }

  const assigned = matched.map((s, i) => ({ ...s, rack_id: allRackIds[i % allRackIds.length] }));
  const extras   = unmatched.map((s, i) => ({ ...s, rack_id: allRackIds[i % allRackIds.length] }));

  return [...real, ...assigned, ...extras];
}

// ── Mock duty persons ─────────────────────────────────────────────────────────

export interface MockPerson {
  name: string;
  role: string;
  phone: string;
  email: string;
  initials: string;
  /** Accent color for avatar */
  color: string;
}

const MOCK_PERSONS: Record<Severity, MockPerson> = {
  critical: {
    name: "Stefan Novak",
    role: "Infrastructure Lead",
    phone: "+43 699 1234 5678",
    email: "s.novak@datacenter.io",
    initials: "SN",
    color: "#ff3b30",
  },
  high: {
    name: "Ana Petrović",
    role: "Senior DevOps Engineer",
    phone: "+43 699 8765 4321",
    email: "a.petrovic@datacenter.io",
    initials: "AP",
    color: "#ff9500",
  },
  medium: {
    name: "Liam O'Brien",
    role: "On-call Engineer",
    phone: "+43 699 5555 0001",
    email: "l.obrien@datacenter.io",
    initials: "LO",
    color: "#007aff",
  },
  low: {
    name: "Maya Jensen",
    role: "Security Engineer",
    phone: "+43 699 3333 9900",
    email: "m.jensen@datacenter.io",
    initials: "MJ",
    color: "#34c759",
  },
};

export function getDutyPerson(alert: Alert): MockPerson {
  return MOCK_PERSONS[alert.severity];
}

// ── Contact status ────────────────────────────────────────────────────────────

export type ContactStatus = "Pending" | "Notified" | "Escalated" | "Acknowledged";

export interface ContactStatusInfo {
  status: ContactStatus;
  color: string;
  bg: string;
  description: string;
}

export function getContactStatus(alert: Alert): ContactStatusInfo {
  if (alert.acked_at) {
    return {
      status: "Acknowledged",
      color: "#34c759",
      bg: "#f0fdf4",
      description: `Acknowledged ${_ago(alert.acked_at)}`,
    };
  }
  if (alert.escalated_at) {
    return {
      status: "Escalated",
      color: "#ff3b30",
      bg: "#fff5f5",
      description: `Escalated to management ${_ago(alert.escalated_at)}`,
    };
  }
  const ageMin = (Date.now() - new Date(alert.created_at).getTime()) / 60_000;
  if (ageMin > 2) {
    return {
      status: "Notified",
      color: "#ff9500",
      bg: "#fffbeb",
      description: `Notified via SMS · waiting for response`,
    };
  }
  return {
    status: "Pending",
    color: "#aeaeb2",
    bg: "#f9fafb",
    description: "Notification queued — sending shortly",
  };
}

// ── Escalation timeline steps ─────────────────────────────────────────────────

export interface TimelineStep {
  label: string;
  detail: string;
  done: boolean;
  time?: string;
}

export function getEscalationTimeline(alert: Alert): TimelineStep[] {
  const created = alert.created_at;
  const ackAt   = alert.acked_at;
  const escAt   = alert.escalated_at;
  const ageMin  = (Date.now() - new Date(created).getTime()) / 60_000;

  return [
    {
      label: "Anomaly detected",
      detail: `Consensus anomaly confirmed by ≥2 detection methods`,
      done: true,
      time: _fmt(created),
    },
    {
      label: "Alert created",
      detail: `${alert.severity.toUpperCase()} alert opened · dedup check passed`,
      done: true,
      time: _fmt(created),
    },
    {
      label: "Notification sent",
      detail: ageMin > 2 ? "SMS + email dispatched to duty engineer" : "Queued — will send within 60 s",
      done: ageMin > 2,
      time: ageMin > 2 ? _fmt(new Date(new Date(created).getTime() + 90_000).toISOString()) : undefined,
    },
    {
      label: escAt ? "Escalated" : ackAt ? "Acknowledged" : "Awaiting response",
      detail: escAt
        ? `No response within SLA — escalated to management`
        : ackAt
        ? `Alert acknowledged by duty engineer`
        : `SLA: 15 min for ${alert.severity} severity`,
      done: !!(escAt || ackAt),
      time: escAt ? _fmt(escAt) : ackAt ? _fmt(ackAt) : undefined,
    },
  ];
}

// ── Internal helpers ──────────────────────────────────────────────────────────

function _ago(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ago`;
}

function _fmt(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
