// Beds24 API V2 client. Beds24 is the hub for Booking.com and Airbnb (prices, availability, bookings).
// BEDS24_REFRESH_TOKEN comes from an invite code (Beds24 → Settings → Marketplace → API). It never expires
// while it is used at least once every 30 days; access tokens last 24 h and are cached per server instance.

const BASE = "https://beds24.com/api/v2";

let cached: { token: string; expires: number } | null = null;

export const beds24Configured = () => Boolean(process.env.BEDS24_REFRESH_TOKEN);

async function accessToken(force = false): Promise<string> {
  if (!force && cached && cached.expires > Date.now() + 60_000) return cached.token;
  const refresh = process.env.BEDS24_REFRESH_TOKEN;
  if (!refresh) throw new Error("BEDS24_REFRESH_TOKEN manquant");
  const res = await fetch(`${BASE}/authentication/token`, {
    headers: { refreshToken: refresh, accept: "application/json" },
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });
  const json = (await res.json().catch(() => ({}))) as { token?: string; expiresIn?: number };
  if (!res.ok || !json.token) throw new Error(`Beds24: authentification refusée (HTTP ${res.status})`);
  cached = { token: json.token, expires: Date.now() + (json.expiresIn ?? 86_400) * 1000 };
  return cached.token;
}

export class Beds24Error extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
  }
}

/** One call to the Beds24 API. Retries a network error, an expired token and the 5-minute credit limit once. */
export async function b24<T = unknown>(method: "GET" | "POST" | "DELETE", path: string, body?: unknown): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(`${BASE}${path}`, {
        method,
        headers: { token: await accessToken(attempt === 1), accept: "application/json", "content-type": "application/json" },
        body: body === undefined ? undefined : JSON.stringify(body),
        cache: "no-store",
        signal: AbortSignal.timeout(25_000),
      });
      if (res.status === 401 && attempt === 0) {
        cached = null;
        continue;
      }
      if (res.status === 429) {
        // the credit limit resets every 5 minutes: wait the advertised time, at most 10 s
        const wait = Math.min(10, Number(res.headers.get("x-five-min-limit-resets-in")) || 5);
        await new Promise((r) => setTimeout(r, wait * 1000));
        continue;
      }
      const text = await res.text();
      const json = text ? (JSON.parse(text) as T & { success?: boolean; error?: string }) : ({} as T);
      if (!res.ok) throw new Beds24Error(`Beds24 HTTP ${res.status}: ${text.slice(0, 200)}`, res.status);
      return json;
    } catch (e) {
      lastError = e;
      if (e instanceof Beds24Error) throw e;
      await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Beds24: échec de la requête");
}
