"use client";

import * as React from "react";
import { cn } from "cn";
import { CircleCheck, CircleX, FlaskConical, X } from "lucide-react";

type ToastKind = "success" | "error" | "info";
interface Toast {
  id: number;
  kind: ToastKind;
  message: string;
}

const ToastContext = React.createContext<((kind: ToastKind, message: string) => void) | null>(null);

/** Toasts are announced through a polite (success/info) or assertive (error) live region. */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([]);
  const nextId = React.useRef(1);
  const dismiss = React.useCallback((id: number) => setToasts((list) => list.filter((t) => t.id !== id)), []);
  const push = React.useCallback(
    (kind: ToastKind, message: string) => {
      const id = nextId.current++;
      setToasts((list) => [...list.slice(-2), { id, kind, message }]);
      window.setTimeout(() => dismiss(id), kind === "error" ? 7000 : 5000);
    },
    [dismiss],
  );

  return (
    <ToastContext.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed inset-x-4 bottom-4 z-[60] flex flex-col items-end gap-2 sm:inset-x-auto sm:right-6 sm:bottom-6 sm:w-96">
        <div aria-live="polite" className="contents">
          {toasts.filter((t) => t.kind !== "error").map((t) => <ToastItem key={t.id} toast={t} onDismiss={dismiss} />)}
        </div>
        <div aria-live="assertive" className="contents">
          {toasts.filter((t) => t.kind === "error").map((t) => <ToastItem key={t.id} toast={t} onDismiss={dismiss} />)}
        </div>
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: number) => void }) {
  const Icon = toast.kind === "success" ? CircleCheck : toast.kind === "error" ? CircleX : FlaskConical;
  return (
    <div
      role={toast.kind === "error" ? "alert" : "status"}
      className={cn(
        "pointer-events-auto flex w-full items-start gap-3 rounded-2xl border bg-card px-4 py-3 text-sm shadow-overlay animate-in fade-in-0 slide-in-from-bottom-2",
        toast.kind === "error" ? "border-destructive/30" : "border-border",
      )}
    >
      <Icon className={cn("mt-0.5 size-4 shrink-0", toast.kind === "success" ? "text-success" : toast.kind === "error" ? "text-destructive" : "text-info")} aria-hidden="true" />
      <p className="flex-1 leading-relaxed text-foreground">{toast.message}</p>
      <button type="button" onClick={() => onDismiss(toast.id)} className="-m-1 grid size-7 cursor-pointer place-items-center rounded-full text-muted-foreground hover:bg-soft hover:text-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
        <X className="size-3.5" aria-hidden="true" />
        <span className="sr-only">Dismiss notification</span>
      </button>
    </div>
  );
}

export function useToast() {
  const push = React.useContext(ToastContext);
  if (!push) throw new Error("useToast must be used inside ToastProvider");
  return React.useMemo(
    () => ({
      success: (message: string) => push("success", message),
      error: (message: string) => push("error", message),
      info: (message: string) => push("info", message),
    }),
    [push],
  );
}
