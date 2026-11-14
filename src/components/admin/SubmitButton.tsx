"use client";

import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

/** Submit button with a pending state and an optional "are you sure?" step. */
export function SubmitButton({
  children,
  confirm,
  className,
  variant = "primary",
}: {
  children: React.ReactNode;
  confirm?: string;
  className?: string;
  variant?: "primary" | "outline" | "danger";
}) {
  const { pending } = useFormStatus();
  const styles = {
    primary: "bg-ink text-snow hover:bg-earth",
    outline: "border border-ink text-ink hover:border-earth hover:text-earth",
    danger: "border border-rose-300 text-rose-800 hover:bg-rose-50",
  }[variant];
  return (
    <button
      type="submit"
      disabled={pending}
      onClick={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
      }}
      className={cn("inline-flex items-center justify-center gap-2 rounded-full px-5 py-2 text-sm font-medium transition-colors disabled:opacity-60", styles, className)}
    >
      {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
      {children}
    </button>
  );
}
