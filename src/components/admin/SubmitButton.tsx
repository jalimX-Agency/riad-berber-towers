"use client";

import { useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";

/** Submit button with a pending state and an optional "are you sure?" step (the admin's own dialog). */
export function SubmitButton({
  children,
  confirm,
  confirmLabel,
  className,
  variant = "primary",
}: {
  children: React.ReactNode;
  /** question asked before submitting */
  confirm?: string;
  /** text of the confirm button in the dialog (default: "Confirmer") */
  confirmLabel?: string;
  className?: string;
  variant?: "primary" | "outline" | "danger";
}) {
  const { pending } = useFormStatus();
  const button = useRef<HTMLButtonElement>(null);
  const [asking, setAsking] = useState(false);
  const styles = {
    primary: "bg-ink text-snow hover:bg-earth",
    outline: "border border-ink text-ink hover:border-earth hover:text-earth",
    danger: "border border-rose-300 text-rose-800 hover:bg-rose-50",
  }[variant];
  return (
    <>
      <button
        ref={button}
        type="submit"
        disabled={pending}
        onClick={(e) => {
          if (!confirm) return;
          e.preventDefault();
          setAsking(true);
        }}
        className={cn("inline-flex items-center justify-center gap-2 rounded-full px-5 py-2 text-sm font-medium transition-colors disabled:opacity-60", styles, className)}
      >
        {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
        {children}
      </button>
      {confirm && (
        <ConfirmDialog
          open={asking}
          title={confirm}
          confirmLabel={confirmLabel ?? "Confirmer"}
          tone={variant === "danger" ? "danger" : "primary"}
          onCancel={() => setAsking(false)}
          onConfirm={() => {
            setAsking(false);
            // submit with this button as the submitter (requestSubmit does not fire the click handler again)
            button.current?.form?.requestSubmit(button.current);
          }}
        />
      )}
    </>
  );
}
