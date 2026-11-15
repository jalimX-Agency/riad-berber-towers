import { splitPayment } from "./policy";

type Money = { toString(): string } | number;

/** Deposit and cash balance of a saved booking. Older bookings (before the deposit rule) have depositAmount 0. */
export function bookingPayment(b: { total: Money; depositAmount: Money }) {
  const total = Number(b.total);
  const stored = Number(b.depositAmount);
  const deposit = stored > 0 ? stored : splitPayment(total).deposit;
  return { total, deposit, balance: Math.max(0, total - deposit) };
}
