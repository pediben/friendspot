/**
 * Returns a short relative time string, e.g. "2m", "3h", "Mon", "Jan 5"
 */
export function timeAgo(iso: string): string {
  const now  = Date.now();
  const then = new Date(iso).getTime();
  const diff = now - then;

  const s = Math.floor(diff / 1000);
  if (s < 60)  return "now";
  const m = Math.floor(s / 60);
  if (m < 60)  return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24)  return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7)   return `${d}d`;

  const date = new Date(iso);
  const sameYear = date.getFullYear() === new Date().getFullYear();
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    ...(sameYear ? {} : { year: "numeric" }),
  });
}
