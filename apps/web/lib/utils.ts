import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Shorten EVM-style addresses for display. */
export function truncateAddress(addr: string, startLen = 6, endLen = 4): string {
  const a = addr?.trim() ?? "";
  if (a.length <= startLen + endLen + 1) return a;
  return `${a.slice(0, startLen)}…${a.slice(-endLen)}`;
}

/** Locale-aware date label for invoice / dispute UIs. */
export function formatDate(value: Date | string | number): string {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/** Display helper for FHE / micro-unit style bigint balances (6 decimal places). */
export function formatFHE(value: bigint): string {
  const neg = value < 0n;
  const v = neg ? -value : value;
  const intPart = v / 1_000_000n;
  const frac = (v % 1_000_000n).toString().padStart(6, "0").replace(/0+$/, "");
  const core = frac.length > 0 ? `${intPart.toString()}.${frac}` : intPart.toString();
  return neg ? `-${core}` : core;
}
