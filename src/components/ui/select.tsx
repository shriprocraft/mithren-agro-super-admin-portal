"use client";

import * as React from "react";
import { cn } from "cn";
import { CheckIcon, ChevronDownIcon } from "lucide-react";
import { Popover as PopoverPrimitive, Select as SelectPrimitive } from "radix-ui";

// Branded single-choice dropdown, ported from the storefront's Select (Radix: keyboard navigation,
// typeahead, Escape/outside-click to close, screen-reader roles). The menu is portalled above every
// container (never clipped), stays inside the viewport via collision padding, and shows a check on
// the selected option. Replaces the OS-drawn native <select> menus for filters and the date range.

const Select = SelectPrimitive.Root;
const SelectValue = SelectPrimitive.Value;

function SelectTrigger({ className, children, ...props }: React.ComponentProps<typeof SelectPrimitive.Trigger>) {
  return (
    <SelectPrimitive.Trigger
      data-slot="select-trigger"
      className={cn(
        "group/select inline-flex h-11 w-full min-w-0 cursor-pointer items-center gap-2 rounded-full border border-input/50 bg-card pr-3.5 pl-4 text-left text-sm text-foreground shadow-[0_1px_2px_rgb(var(--shadow-tint)/0.05)] transition-[border-color,box-shadow,background-color] outline-none select-none",
        "hover:border-primary/50 hover:bg-soft focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/40 data-[state=open]:border-primary data-[state=open]:ring-2 data-[state=open]:ring-ring/25",
        "disabled:cursor-not-allowed disabled:opacity-55 data-[placeholder]:text-muted-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&>span]:min-w-0 [&>span]:truncate",
        className,
      )}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon asChild>
        <ChevronDownIcon className="ml-auto size-4 text-muted-foreground transition-transform duration-200 group-data-[state=open]/select:rotate-180 group-data-[state=open]/select:text-primary" />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  );
}

function SelectContent({ className, children, ...props }: React.ComponentProps<typeof SelectPrimitive.Content>) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        data-slot="select-content"
        position="popper"
        sideOffset={6}
        collisionPadding={12}
        className={cn(
          "relative z-[70] max-h-[min(22rem,var(--radix-select-content-available-height))] min-w-[max(var(--radix-select-trigger-width),12rem)] origin-(--radix-select-content-transform-origin) overflow-hidden rounded-2xl border border-border bg-popover p-1.5 text-popover-foreground shadow-overlay",
          "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-1 data-[side=top]:slide-in-from-bottom-1",
          className,
        )}
        {...props}
      >
        <SelectPrimitive.Viewport className="scrollbar-subtle">{children}</SelectPrimitive.Viewport>
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  );
}

function SelectItem({ className, children, ...props }: React.ComponentProps<typeof SelectPrimitive.Item>) {
  return (
    <SelectPrimitive.Item
      data-slot="select-item"
      className={cn(
        "relative flex min-h-10 w-full cursor-pointer items-center rounded-xl py-2 pr-9 pl-3 text-sm text-foreground outline-none select-none",
        "transition-colors data-[highlighted]:bg-soft data-[highlighted]:text-primary-hover data-[state=checked]:bg-secondary data-[state=checked]:font-medium data-[state=checked]:text-secondary-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        className,
      )}
      {...props}
    >
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
      <span className="absolute right-3 grid size-4 place-items-center">
        <SelectPrimitive.ItemIndicator>
          <CheckIcon className="size-4 text-primary" aria-hidden="true" />
        </SelectPrimitive.ItemIndicator>
      </span>
    </SelectPrimitive.Item>
  );
}

const SelectSeparator = ({ className, ...props }: React.ComponentProps<typeof SelectPrimitive.Separator>) => (
  <SelectPrimitive.Separator className={cn("mx-2 my-1 h-px bg-border", className)} {...props} />
);

// Popover: floating panel anchored to a control (used for the custom date range).
const Popover = PopoverPrimitive.Root;
const PopoverAnchor = PopoverPrimitive.Anchor;
const PopoverTrigger = PopoverPrimitive.Trigger;

function PopoverContent({ className, ...props }: React.ComponentProps<typeof PopoverPrimitive.Content>) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        align="end"
        sideOffset={8}
        collisionPadding={12}
        className={cn(
          "z-[70] w-[min(22rem,calc(100vw-1.5rem))] rounded-2xl border border-border bg-popover p-4 text-popover-foreground shadow-overlay outline-none",
          "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
          className,
        )}
        {...props}
      />
    </PopoverPrimitive.Portal>
  );
}

export { Popover, PopoverAnchor, PopoverContent, PopoverTrigger, Select, SelectContent, SelectItem, SelectSeparator, SelectTrigger, SelectValue };
