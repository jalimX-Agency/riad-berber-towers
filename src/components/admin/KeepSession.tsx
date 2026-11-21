"use client";

import { useEffect } from "react";

/**
 * Renews the admin sign-in while the admin is in use. Pages are rendered on the server, which can read the
 * session cookie but not extend it; asking /api/auth/session does (NextAuth sends back a cookie with a new expiry).
 * Runs when the admin opens, when the tab comes back to the front, and every few hours if it stays open.
 */
export function KeepSession() {
  useEffect(() => {
    const renew = () => {
      if (document.visibilityState === "visible") fetch("/api/auth/session", { cache: "no-store", credentials: "same-origin" }).catch(() => {});
    };
    renew();
    const timer = window.setInterval(renew, 3 * 60 * 60 * 1000);
    document.addEventListener("visibilitychange", renew);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", renew);
    };
  }, []);
  return null;
}
