// Phone masking
export function maskPhone(
  phone: string | null,
  visibility: "full" | "masked" | "hidden"
): string {
  if (!phone) return "—";
  if (visibility === "full") return phone;
  if (visibility === "masked") return `********${phone.slice(-2)}`;
  return "Contact hidden";
}

// Format departure datetime
export function formatDeparture(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

// Time until departure
export function timeUntil(iso: string): string {
  const diff = new Date(iso).getTime() - Date.now();
  if (diff < 0) return "Departed";
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}

// Is pool departing within N hours?
export function isDepartingSoon(iso: string, hours = 5): boolean {
  const diff = new Date(iso).getTime() - Date.now();
  return diff > 0 && diff <= hours * 3600000;
}

export function cn(...classes: (string | undefined | false | null)[]): string {
  return classes.filter(Boolean).join(" ");
}
