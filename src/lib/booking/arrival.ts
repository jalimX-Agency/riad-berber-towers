// Shared by the guest form (client) and the booking service (server); keep it free of server imports.
export const ARRIVAL_TIMES = ["unknown", "12-14", "14-16", "16-18", "18-20", "20-22", "22+"] as const;
export type ArrivalTime = (typeof ARRIVAL_TIMES)[number];
