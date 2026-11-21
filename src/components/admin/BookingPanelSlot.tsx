import { BookingDetail } from "@/components/admin/BookingDetail";
import { BookingPanel } from "@/components/admin/BookingPanel";

type SP = Record<string, string | undefined>;

/** Params that belong to the panel (or to an action message), not to the page underneath. */
const PANEL_KEYS = ["b", "done", "email", "error", "detail"];

/** The page URL without the panel: where "close" goes and where panel actions come back to. */
export function pageHref(basePath: string, sp: SP) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) if (v && !PANEL_KEYS.includes(k)) p.set(k, v);
  const s = p.toString();
  return s ? `${basePath}?${s}` : basePath;
}

/** URL that opens booking `id` in the panel over `pageUrl` (which may already carry filters). */
export function panelHref(pageUrl: string, id: string) {
  return `${pageUrl}${pageUrl.includes("?") ? "&" : "?"}b=${encodeURIComponent(id)}`;
}

/**
 * Renders the booking side panel when the page URL has ?b=<id>.
 * A plain page with a search param (not an intercepted route): actions redirect normally, so the
 * panel always shows fresh data and the action's message.
 */
export function BookingPanelSlot({ basePath, sp }: { basePath: string; sp: SP }) {
  if (!sp.b || sp.b.length > 40) return null;
  const back = pageHref(basePath, sp);
  return (
    // no <Suspense> around the panel: in production a server-action redirect back to this page left the
    // suspended panel unresolved. The click already shows the skeleton (PendingPanel) while the page loads.
    <BookingPanel closeHref={back}>
      <BookingDetail id={sp.b} sp={sp} mode="panel" returnTo={back} />
    </BookingPanel>
  );
}
