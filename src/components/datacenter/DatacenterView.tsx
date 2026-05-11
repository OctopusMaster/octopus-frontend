"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Sensor, SensorType } from "@/types";
import type { LayoutRow } from "@/lib/rooms";

// ── Layout constants ──────────────────────────────────────────────────────────
const RW = 88;
const RH = 148;
const DX = 28;
const DY = -16;
const GAP = 14;
const AISLE_H = 60;
const PAD_X = 70;
const PAD_Y = 70;

// Default layout: Server Room A, 3 rows × 6 racks
const DEFAULT_LAYOUT: LayoutRow[] = [
  { label: "A", rackIds: ["A1", "A2", "A3", "A4", "A5", "A6"] },
  { label: "B", rackIds: ["B1", "B2", "B3", "B4", "B5", "B6"] },
  { label: "C", rackIds: ["C1", "C2", "C3", "C4", "C5", "C6"] },
];

function aisleY(idx: number) { return PAD_Y + idx * (AISLE_H + RH); }
function rackY(row: number)  { return aisleY(row) + AISLE_H; }
function rackX(col: number)  { return PAD_X + col * (RW + GAP); }

function svgDimensions(layout: LayoutRow[]) {
  const numRows = layout.length;
  const numCols = Math.max(...layout.map((r) => r.rackIds.length));
  const w = PAD_X + numCols * (RW + GAP) - GAP + DX + PAD_X;
  const h = PAD_Y + (numRows + 1) * AISLE_H + numRows * RH + PAD_Y;
  return { w, h, numRows, numCols };
}

// ── Palette (Apple system-inspired) ──────────────────────────────────────────

const UNIT: Record<SensorType, string> = {
  temperature: "°C",
  humidity: "%",
  pressure: "bar",
  voltage: "V",
};

function ledFill(status: Sensor["status"], anomalous: boolean): string {
  if (anomalous)                 return "#ff3b30";
  if (status === "active")       return "#34c759";
  if (status === "failing")      return "#ff9500";
  if (status === "disconnected") return "#aeaeb2";
  return "#d1d1d6";
}

// ── AisleBand ─────────────────────────────────────────────────────────────────

interface AisleBandProps {
  idx: number;
  numCols: number;
}

function AisleBand({ idx, numCols }: AisleBandProps) {
  // Alternating supply → return → supply → …
  const isSupply = idx % 2 === 0;
  const label = isSupply ? "Supply Air  ·  17 °C" : "Return Air  ·  27 °C";
  const y     = aisleY(idx);
  const bandW = numCols * (RW + GAP) - GAP + DX;

  return (
    <g>
      <rect x={PAD_X} y={y} width={bandW} height={AISLE_H}
        fill={isSupply ? "#f0f6ff" : "#fff5f5"} rx={8} />
      <rect x={PAD_X} y={y} width={bandW} height={AISLE_H}
        fill="none" stroke={isSupply ? "#bfdbfe" : "#fecaca"} strokeWidth={1} rx={8} />

      {Array.from({ length: 5 }).map((_, i) => {
        const ax = PAD_X + 40 + i * (bandW / 5);
        const ay = y + AISLE_H / 2;
        return (
          <text key={i} x={ax} y={ay + 4}
            fill={isSupply ? "#93c5fd" : "#fca5a5"}
            fontSize={10} fontFamily="system-ui,sans-serif" textAnchor="middle" opacity={0.6}>
            {isSupply ? "↓" : "↑"}
          </text>
        );
      })}

      <text x={PAD_X + 14} y={y + AISLE_H / 2 + 4}
        fill={isSupply ? "#3b82f6" : "#ef4444"}
        fontSize={9} fontFamily="system-ui,sans-serif" fontWeight="600" letterSpacing={0.3}>
        {label}
      </text>
    </g>
  );
}

// ── IsoRack ───────────────────────────────────────────────────────────────────

interface IsoRackProps {
  rackId: string;
  col: number;
  row: number;
  sensors: Sensor[];
  liveValues: Record<string, number>;
  pulses: Record<string, number>;
  anomalousSensors: Set<string>;
  selected: boolean;
}

function IsoRack({
  rackId, col, row, sensors,
  liveValues, pulses, anomalousSensors,
  selected,
}: IsoRackProps) {
  const x = rackX(col);
  const y = rackY(row);

  const hasAnomaly = sensors.some((s) => anomalousSensors.has(s.id));
  const hasActive  = sensors.some((s) => s.status === "active");

  const frontFill = hasAnomaly ? "#fff5f5" : selected ? "#f0f6ff" : "#ffffff";
  const topFill   = hasAnomaly ? "#fee2e2" : selected ? "#dbeafe" : "#f3f4f6";
  const sideFill  = hasAnomaly ? "#fecaca" : selected ? "#bfdbfe" : "#e5e7eb";
  const borderCol = hasAnomaly ? "#ff3b30" : selected ? "#007aff" : "#d1d5db";
  const borderW   = (hasAnomaly || selected) ? 1.5 : 1;

  const front = `${x},${y} ${x + RW},${y} ${x + RW},${y + RH} ${x},${y + RH}`;
  const top   = `${x},${y} ${x + DX},${y + DY} ${x + RW + DX},${y + DY} ${x + RW},${y}`;
  const side  = `${x + RW},${y} ${x + RW + DX},${y + DY} ${x + RW + DX},${y + DY + RH} ${x + RW},${y + RH}`;

  const barFill = hasAnomaly ? "#ff3b30" : hasActive ? "#34c759" : "#d1d5db";

  return (
    // data-rack-id is read by the container's onClick for hit-testing (setPointerCapture
    // redirects click events to the container div, so per-rack onClick doesn't fire)
    <g data-rack-id={rackId} style={{ cursor: "pointer" }}>
      <rect x={x + 2} y={y + 3} width={RW} height={RH} rx={2}
        fill="black" opacity={0.04} />

      <polygon points={side} fill={sideFill} stroke={borderCol} strokeWidth={0.5} />
      <polygon points={top}  fill={topFill}  stroke={borderCol} strokeWidth={0.5} />
      <polygon points={front} fill={frontFill} stroke={borderCol} strokeWidth={borderW} />

      <rect x={x + 4} y={y + RH - 6} width={RW - 8} height={3}
        fill={barFill} rx={1.5} opacity={0.8} />

      <text x={x + RW / 2} y={y + 15} textAnchor="middle"
        fill={hasAnomaly ? "#ff3b30" : selected ? "#007aff" : "#6b7280"}
        fontSize={9} fontFamily="system-ui,sans-serif" fontWeight="600">
        {rackId}
      </text>

      <line x1={x + 8} y1={y + 20} x2={x + RW - 8} y2={y + 20}
        stroke={borderCol} strokeWidth={0.5} opacity={0.6} />

      {sensors.slice(0, 6).map((s, i) => {
        const ledX     = x + 13;
        const ledY     = y + 31 + i * 18;
        const isAno    = anomalousSensors.has(s.id);
        const color    = ledFill(s.status, isAno);
        const val      = liveValues[s.id];
        const pulseKey = pulses[s.id] ?? 0;

        return (
          <g key={s.id}>
            {!!pulses[s.id] && (
              <circle key={`ring-${pulseKey}`} cx={ledX} cy={ledY} r={3} fill={color} opacity={0.5}>
                <animate attributeName="r"       values="3;12"  dur="0.5s" begin="0s" fill="freeze" />
                <animate attributeName="opacity" values="0.5;0" dur="0.5s" begin="0s" fill="freeze" />
              </circle>
            )}
            <circle cx={ledX} cy={ledY} r={2.5} fill={color} />
            <text x={ledX + 7} y={ledY + 4}
              fill={isAno ? "#ff3b30" : "#9ca3af"}
              fontSize={7.5} fontFamily="ui-monospace,monospace">
              {UNIT[s.type]} {val !== undefined ? val.toFixed(1) : "—"}
            </text>
          </g>
        );
      })}

      {sensors.length === 0 && (
        <text x={x + RW / 2} y={y + RH / 2 + 4} textAnchor="middle"
          fill="#d1d5db" fontSize={9} fontFamily="system-ui,sans-serif">
          empty
        </text>
      )}

      {hasAnomaly && (
        <polygon points={front} fill="none" stroke="#ff3b30"
          strokeWidth={1.5} opacity={0.4} filter="url(#anomalyGlow)" />
      )}
      {selected && !hasAnomaly && (
        <polygon points={front} fill="none" stroke="#007aff"
          strokeWidth={1.5} opacity={0.5} filter="url(#selectGlow)" />
      )}
    </g>
  );
}

// ── DatacenterView ────────────────────────────────────────────────────────────

export interface DatacenterViewProps {
  sensors: Sensor[];
  liveValues: Record<string, number>;
  anomalousSensors?: Set<string>;
  selectedRack?: string | null;
  onRackSelect?: (id: string | null) => void;
  /** Room layout to render. Defaults to Server Room A (3 × 6). */
  layout?: LayoutRow[];
  /** Label shown in the header bar */
  roomName?: string;
}

export function DatacenterView({
  sensors,
  liveValues,
  anomalousSensors = new Set(),
  selectedRack = null,
  onRackSelect,
  layout = DEFAULT_LAYOUT,
  roomName = "Server Room",
}: DatacenterViewProps) {
  const { w: SVG_W, h: SVG_H, numRows, numCols } = svgDimensions(layout);

  const [tfm, setTfm] = useState({ scale: 1, x: 0, y: 0 });
  const containerRef  = useRef<HTMLDivElement>(null);
  const isDragging    = useRef(false);
  const hadDraggedRef = useRef(false);
  const dragOrigin    = useRef({ cx: 0, cy: 0, px: 0, py: 0 });

  const [pulses, setPulses] = useState<Record<string, number>>({});
  const prevValues = useRef<Record<string, number>>({});

  // Reset zoom when room changes
  useEffect(() => {
    setTfm({ scale: 1, x: 0, y: 0 });
  }, [layout]);

  useEffect(() => {
    const changed: string[] = [];
    for (const [id, val] of Object.entries(liveValues)) {
      if (prevValues.current[id] !== val) changed.push(id);
    }
    prevValues.current = { ...liveValues };
    if (!changed.length) return;

    const now = Date.now();
    setPulses((p) => { const n = { ...p }; changed.forEach((id) => (n[id] = now)); return n; });
    const t = setTimeout(() => {
      setPulses((p) => {
        const n = { ...p };
        changed.forEach((id) => { if (n[id] === now) delete n[id]; });
        return n;
      });
    }, 700);
    return () => clearTimeout(t);
  }, [liveValues]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const rect  = containerRef.current!.getBoundingClientRect();
    const mx    = e.clientX - rect.left;
    const my    = e.clientY - rect.top;
    const delta = e.deltaY < 0 ? 1.12 : 1 / 1.12;
    setTfm((t) => {
      const ns = Math.min(Math.max(t.scale * delta, 0.2), 8);
      const r  = ns / t.scale;
      return { scale: ns, x: mx - r * (mx - t.x), y: my - r * (my - t.y) };
    });
  }, []);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    isDragging.current = true;
    hadDraggedRef.current = false;
    dragOrigin.current = { cx: e.clientX, cy: e.clientY, px: tfm.x, py: tfm.y };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }, [tfm.x, tfm.y]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging.current) return;
    const dx = e.clientX - dragOrigin.current.cx;
    const dy = e.clientY - dragOrigin.current.cy;
    if (Math.abs(dx) + Math.abs(dy) > 4) hadDraggedRef.current = true;
    setTfm((t) => ({ ...t, x: dragOrigin.current.px + dx, y: dragOrigin.current.py + dy }));
  }, []);

  const handlePointerUp = useCallback(() => { isDragging.current = false; }, []);

  const handleRackSelect = useCallback((id: string | null) => {
    onRackSelect?.(id);
  }, [onRackSelect]);

  const byRack: Record<string, Sensor[]> = {};
  for (const s of sensors) {
    if (s.rack_id) {
      if (!byRack[s.rack_id]) byRack[s.rack_id] = [];
      byRack[s.rack_id].push(s);
    }
  }

  return (
    <div className="relative w-full h-full bg-gray-50 overflow-hidden select-none">

      {/* Header bar */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-4 py-2.5 bg-white/80 backdrop-blur-sm border-b border-gray-100">
        <span className="text-xs font-semibold text-gray-700 tracking-tight">{roomName}</span>
        <div className="flex items-center gap-3 text-[10px] text-gray-400">
          {[
            { c: "#34c759", l: "Normal"  },
            { c: "#ff9500", l: "Warning" },
            { c: "#ff3b30", l: "Anomaly" },
            { c: "#aeaeb2", l: "Offline" },
          ].map(({ c, l }) => (
            <span key={l} className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: c }} />
              {l}
            </span>
          ))}
        </div>
      </div>

      {/* Zoom controls */}
      <div className="absolute bottom-4 right-4 z-10 flex flex-col gap-1">
        {[
          { label: "+", fn: () => setTfm((t) => ({ ...t, scale: Math.min(t.scale * 1.25, 8) })) },
          { label: "−", fn: () => setTfm((t) => ({ ...t, scale: Math.max(t.scale / 1.25, 0.2) })) },
          { label: "⊡", fn: () => setTfm({ scale: 1, x: 0, y: 0 }) },
        ].map(({ label, fn }) => (
          <button key={label} onClick={fn}
            className="w-7 h-7 rounded-lg bg-white border border-gray-200 text-gray-500 flex items-center justify-center hover:bg-gray-50 text-xs font-medium transition-colors shadow-sm">
            {label}
          </button>
        ))}
      </div>

      {/* Scale */}
      <div className="absolute bottom-4 left-3 z-10 text-[10px] text-gray-400 font-mono pointer-events-none">
        {Math.round(tfm.scale * 100)}%
      </div>

      {/* Canvas */}
      <div ref={containerRef} className="absolute inset-0 top-[38px]"
        style={{ cursor: isDragging.current ? "grabbing" : "grab" }}
        onWheel={handleWheel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onClick={(e) => {
          // setPointerCapture redirects click to this div, so we hit-test manually.
          if (hadDraggedRef.current) { hadDraggedRef.current = false; return; }
          const el = document.elementFromPoint(e.clientX, e.clientY);
          let node: Element | null = el;
          while (node && node !== e.currentTarget) {
            const rid = node.getAttribute("data-rack-id");
            if (rid) { handleRackSelect(rid === selectedRack ? null : rid); return; }
            node = node.parentElement;
          }
          handleRackSelect(null);
        }}>
        <svg width={SVG_W} height={SVG_H}
          style={{ transform: `translate(${tfm.x}px,${tfm.y}px) scale(${tfm.scale})`, transformOrigin: "0 0" }}>
          <defs>
            <filter id="anomalyGlow" x="-60%" y="-60%" width="220%" height="220%">
              <feGaussianBlur stdDeviation="4" result="b" />
              <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <filter id="selectGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="b" />
              <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>

          {/* Canvas background */}
          <rect x={0} y={0} width={SVG_W} height={SVG_H} fill="#f9fafb" />

          {/* Grid dots */}
          {Array.from({ length: Math.ceil(SVG_W / 30) }).map((_, xi) =>
            Array.from({ length: Math.ceil(SVG_H / 30) }).map((_, yi) => (
              <circle key={`${xi}-${yi}`}
                cx={xi * 30 + 15} cy={yi * 30 + 15} r={0.8}
                fill="#e5e7eb" />
            )),
          )}

          {/* Aisle bands — one before each row + one after the last */}
          {Array.from({ length: numRows + 1 }).map((_, i) => (
            <AisleBand key={i} idx={i} numCols={numCols} />
          ))}

          {/* Row labels */}
          {layout.map((row, rowIdx) => (
            <text key={rowIdx}
              x={PAD_X - 10} y={rackY(rowIdx) + RH / 2 + 4}
              textAnchor="end"
              fill="#9ca3af" fontSize={8} fontFamily="system-ui,sans-serif" fontWeight="600">
              {row.label}
            </text>
          ))}

          {/* Racks — back-to-front rows, right-to-left within each row */}
          {[...layout]
            .map((row, rowIdx) => ({ row, rowIdx }))
            .reverse()
            .map(({ row, rowIdx }) =>
              [...row.rackIds]
                .map((rackId, col) => ({ rackId, col }))
                .sort((a, b) => b.col - a.col)
                .map(({ rackId, col }) => (
                  <IsoRack
                    key={rackId}
                    rackId={rackId} col={col} row={rowIdx}
                    sensors={byRack[rackId] ?? []}
                    liveValues={liveValues}
                    pulses={pulses}
                    anomalousSensors={anomalousSensors}
                    selected={selectedRack === rackId}
                  />
                )),
            )}
        </svg>
      </div>
    </div>
  );
}
