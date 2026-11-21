import { Landmark } from "lucide-react";

/** Small marks so the guest recognises each payment method at a glance (payment page, step 1). */
const tile = "grid h-10 w-10 shrink-0 place-items-center rounded-[10px]";

export function PaypalMark() {
  return (
    <span className={tile} style={{ backgroundColor: "#EEF4FB" }} aria-hidden="true">
      <svg viewBox="0 0 24 24" className="h-6 w-6">
        {/* two offset "P" shapes, PayPal blues */}
        <path fill="#003087" d="M8.3 3h6.1c3 0 5 1.7 4.6 4.6-.5 3.4-2.9 5-6 5H10.6l-1 6.2H6.1L8.3 3z" />
        <path fill="#0079C1" d="M10 7.3h4c1.4 0 2.2.8 2 2.1-.3 1.7-1.5 2.6-3.1 2.6h-1.8l-.9 5.6H7.7L10 7.3z" opacity=".9" />
      </svg>
    </span>
  );
}

export function WiseMark() {
  return (
    <span className={tile} style={{ backgroundColor: "#9FE870" }} aria-hidden="true">
      <svg viewBox="0 0 24 24" className="h-6 w-6">
        {/* the flag-arrow shape, Wise forest green */}
        <path fill="#163300" d="M6.2 7.4 4 11.3h5.2l-2.9 5.3h3.2L14.9 7.4H6.2zM16.4 7.4l-4.6 9.2h3.6l4.6-9.2h-3.6z" />
      </svg>
    </span>
  );
}

export function BankMark() {
  return (
    <span className={`${tile} bg-paper text-earth`} aria-hidden="true">
      <Landmark className="h-5 w-5" />
    </span>
  );
}
