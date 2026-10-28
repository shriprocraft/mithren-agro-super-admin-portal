import * as React from "react";
import { cn } from "cn";

export interface FieldControlProps {
  id: string;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
  "aria-required"?: boolean;
}

/**
 * Labelled form field with hint and inline error. The control receives id, aria-invalid and
 * aria-describedby so the label and error are announced with it. Pass the control directly, or a
 * render function when the control is wrapped (e.g. an input with an icon).
 */
export function Field({ label, error, hint, required, className, children }: {
  label: string;
  error?: string | null;
  hint?: React.ReactNode;
  required?: boolean;
  className?: string;
  children: React.ReactElement<FieldControlProps> | ((props: FieldControlProps) => React.ReactNode);
}) {
  const id = React.useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const controlProps: FieldControlProps = {
    id,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": [hintId, errorId].filter(Boolean).join(" ") || undefined,
    "aria-required": required || undefined,
  };
  const control = typeof children === "function" ? children(controlProps) : React.cloneElement(children, controlProps);
  return (
    <div className={cn("flex min-w-0 flex-col gap-1.5", className)}>
      <label htmlFor={id} className="text-sm font-medium text-foreground">
        {label}
        {required && (
          <span className="text-destructive" aria-hidden="true">
            {" "}
            *
          </span>
        )}
      </label>
      {control}
      {hint && (
        <p id={hintId} className="text-xs text-muted-foreground">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="text-xs font-medium text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
