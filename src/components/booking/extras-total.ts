"use client";

import { useSyncExternalStore } from "react";

/**
 * Price of the activities and transfer chosen in the booking wizard, shared with the stay summary
 * beside it (a separate component), so both totals update the moment the guest picks something.
 */
let value = 0;
const subs = new Set<() => void>();

export function setExtrasTotal(n: number) {
  if (n === value) return;
  value = n;
  subs.forEach((f) => f());
}

export const useExtrasTotal = () =>
  useSyncExternalStore(
    (cb) => {
      subs.add(cb);
      return () => subs.delete(cb);
    },
    () => value,
    () => 0,
  );
