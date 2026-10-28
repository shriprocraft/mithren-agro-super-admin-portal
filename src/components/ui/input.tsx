import * as React from "react";
import { cn } from "cn";
import { ChevronDown } from "lucide-react";

const fieldBase =
  "w-full min-w-0 border border-input bg-card text-base text-foreground transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20 md:text-sm";

function Input({ className, ...props }: React.ComponentProps<"input">) {
  return <input data-slot="input" className={cn(fieldBase, "h-11 rounded-full px-4", className)} {...props} />;
}

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return <textarea data-slot="textarea" className={cn(fieldBase, "min-h-24 rounded-2xl px-4 py-3 leading-relaxed", className)} {...props} />;
}

/** Native select styled like the inputs; used where a plain list of options is enough (forms, filters). */
function NativeSelect({ className, children, ...props }: React.ComponentProps<"select">) {
  return (
    <span className="relative block min-w-0">
      <select data-slot="native-select" className={cn(fieldBase, "h-11 cursor-pointer appearance-none rounded-full pr-10 pl-4", className)} {...props}>
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute top-1/2 right-3.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
    </span>
  );
}

export { Input, NativeSelect, Textarea };
