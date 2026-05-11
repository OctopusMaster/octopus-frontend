"use client";

import { useState } from "react";
import { X, Loader2 } from "lucide-react";
import { createSensor, assignSensorPerson } from "@/lib/api";
import type { SensorType } from "@/types";

const TYPE_UNITS: Record<SensorType, string> = {
  temperature: "°C",
  humidity: "%",
  pressure: "bar",
  voltage: "V",
};

const TYPE_DEFAULTS: Record<SensorType, { min: number; max: number; hz: number }> = {
  temperature: { min: 18, max: 25, hz: 1 },
  humidity:    { min: 40, max: 60, hz: 1 },
  pressure:    { min: 2,  max: 8,  hz: 5 },
  voltage:     { min: 220, max: 240, hz: 10 },
};

interface Props {
  rackId: string;
  roomName: string;
  onSuccess: () => void;
  onClose: () => void;
}

export function AddSensorModal({ rackId, roomName, onSuccess, onClose }: Props) {
  const [step, setStep]       = useState<"form" | "submitting" | "error">("form");
  const [errorMsg, setErrorMsg] = useState("");

  const [sensorName, setSensorName] = useState("");
  const [sensorType, setSensorType] = useState<SensorType>("temperature");
  const [rackUnit, setRackUnit]     = useState("");
  const [minNormal, setMinNormal]   = useState(String(TYPE_DEFAULTS.temperature.min));
  const [maxNormal, setMaxNormal]   = useState(String(TYPE_DEFAULTS.temperature.max));
  const [sampleHz, setSampleHz]     = useState(String(TYPE_DEFAULTS.temperature.hz));

  const [personName,  setPersonName]  = useState("");
  const [personEmail, setPersonEmail] = useState("");
  const [personPhone, setPersonPhone] = useState("");

  function handleTypeChange(t: SensorType) {
    setSensorType(t);
    const d = TYPE_DEFAULTS[t];
    setMinNormal(String(d.min));
    setMaxNormal(String(d.max));
    setSampleHz(String(d.hz));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStep("submitting");
    setErrorMsg("");

    try {
      const sensor = await createSensor({
        name: sensorName.trim(),
        type: sensorType,
        location: `${roomName} / Rack ${rackId}`,
        unit: TYPE_UNITS[sensorType],
        min_normal: parseFloat(minNormal),
        max_normal: parseFloat(maxNormal),
        sample_rate_hz: parseFloat(sampleHz),
        rack_id: rackId,
        rack_unit: rackUnit ? parseInt(rackUnit, 10) : undefined,
      });

      if (personName.trim() && personEmail.trim()) {
        await assignSensorPerson(sensor.id, {
          name: personName.trim(),
          email: personEmail.trim(),
          phone: personPhone.trim(),
        });
      }

      onSuccess();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Request failed";
      setErrorMsg(msg);
      setStep("error");
    }
  }

  const isSubmitting = step === "submitting";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Dialog */}
      <div className="relative z-10 w-full max-w-lg mx-4 bg-white rounded-2xl shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Add Sensor to Rack {rackId}</h2>
            <p className="text-xs text-gray-400 mt-0.5">{roomName}</p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-5 py-5 space-y-5">

          {/* ── Sensor section ── */}
          <div className="space-y-3">
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Sensor</p>

            <div className="grid grid-cols-2 gap-3">
              {/* Name */}
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">Name *</label>
                <input
                  required
                  value={sensorName}
                  onChange={(e) => setSensorName(e.target.value)}
                  placeholder="e.g. Rack A1 Temp"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
                />
              </div>

              {/* Type */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Type *</label>
                <select
                  value={sensorType}
                  onChange={(e) => handleTypeChange(e.target.value as SensorType)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 bg-white"
                >
                  <option value="temperature">Temperature</option>
                  <option value="humidity">Humidity</option>
                  <option value="pressure">Pressure</option>
                  <option value="voltage">Voltage</option>
                </select>
              </div>

              {/* Rack unit */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Rack Unit (U)</label>
                <input
                  type="number"
                  min={1}
                  max={42}
                  value={rackUnit}
                  onChange={(e) => setRackUnit(e.target.value)}
                  placeholder="1–42"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
                />
              </div>
            </div>

            {/* Alert thresholds */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Normal range ({TYPE_UNITS[sensorType]}) *
              </label>
              <div className="flex items-center gap-2">
                <input
                  required
                  type="number"
                  step="any"
                  value={minNormal}
                  onChange={(e) => setMinNormal(e.target.value)}
                  placeholder="Min"
                  className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
                />
                <span className="text-xs text-gray-400 shrink-0">to</span>
                <input
                  required
                  type="number"
                  step="any"
                  value={maxNormal}
                  onChange={(e) => setMaxNormal(e.target.value)}
                  placeholder="Max"
                  className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
                />
              </div>
              <p className="text-[10px] text-gray-400 mt-1">Alerts fire when readings fall outside this range</p>
            </div>

            {/* Sample rate */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Sample rate (Hz) *</label>
              <input
                required
                type="number"
                min={0.01}
                step="any"
                value={sampleHz}
                onChange={(e) => setSampleHz(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
              />
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-gray-100" />

          {/* ── Responsible person section ── */}
          <div className="space-y-3">
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
              Responsible Person <span className="normal-case font-normal">(optional)</span>
            </p>

            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">Full name</label>
                <input
                  value={personName}
                  onChange={(e) => setPersonName(e.target.value)}
                  placeholder="e.g. Ana Petrović"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
                <input
                  type="email"
                  value={personEmail}
                  onChange={(e) => setPersonEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Phone</label>
                <input
                  type="tel"
                  value={personPhone}
                  onChange={(e) => setPersonPhone(e.target.value)}
                  placeholder="+43 699 …"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
                />
              </div>
            </div>
          </div>

          {/* Error */}
          {step === "error" && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {errorMsg || "Something went wrong. Please try again."}
            </p>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-60"
            >
              {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Add Sensor
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
