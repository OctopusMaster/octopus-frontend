import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import type { Severity, SensorStatus, AlertStatus } from "@/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const severityColor: Record<Severity, string> = {
  critical: "bg-red-100 text-red-800 border-red-200",
  high:     "bg-orange-100 text-orange-800 border-orange-200",
  medium:   "bg-yellow-100 text-yellow-800 border-yellow-200",
  low:      "bg-green-100 text-green-800 border-green-200",
};

export const severityDot: Record<Severity, string> = {
  critical: "bg-red-500",
  high:     "bg-orange-500",
  medium:   "bg-yellow-500",
  low:      "bg-green-500",
};

export const statusColor: Record<SensorStatus, string> = {
  active:       "bg-green-100 text-green-800",
  inactive:     "bg-gray-100 text-gray-600",
  failing:      "bg-orange-100 text-orange-800",
  disconnected: "bg-red-100 text-red-800",
};

export const alertStatusColor: Record<AlertStatus, string> = {
  open:         "bg-red-100 text-red-800",
  acknowledged: "bg-blue-100 text-blue-800",
  resolved:     "bg-green-100 text-green-800",
  suppressed:   "bg-gray-100 text-gray-600",
};

export function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}
