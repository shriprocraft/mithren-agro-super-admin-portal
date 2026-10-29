"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/input";
import type { ActionResult } from "@/lib/mock/actions";
import { Field } from "./field";
import { InlineAlert } from "./primitives";

export interface ConfirmOptions {
  title: string;
  description: React.ReactNode;
  confirmLabel: string;
  tone?: "default" | "danger";
  /** When set, a reason must be entered and is passed to onConfirm. */
  reason?: { label: string; placeholder?: string; hint?: string };
  /** Extra content shown above the reason (e.g. the impact of the change). */
  details?: React.ReactNode;
  /** May return a promise (simulated processing); the confirm button shows a spinner meanwhile. */
  onConfirm: (reason: string) => ActionResult | Promise<ActionResult>;
}

/**
 * Confirmation step for consequential mock actions. The dialog stays open and shows the error if the
 * action is refused, so a failure is never presented as success.
 */
export function ConfirmDialog({ options, onClose, onDone }: { options: ConfirmOptions | null; onClose: () => void; onDone: (message: string) => void }) {
  return (
    <Dialog open={options !== null} onOpenChange={(open) => !open && onClose()}>
      {options && <ConfirmBody key={options.title} options={options} onClose={onClose} onDone={onDone} />}
    </Dialog>
  );
}

function ConfirmBody({ options, onClose, onDone }: { options: ConfirmOptions; onClose: () => void; onDone: (message: string) => void }) {
  const [reason, setReason] = React.useState("");
  const [fieldError, setFieldError] = React.useState<string | null>(null);
  const [actionError, setActionError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);
  const running = React.useRef(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    // Guards against a double click submitting the same action twice.
    if (running.current) return;
    if (options.reason && !reason.trim()) {
      setFieldError(`${options.reason.label} is required.`);
      return;
    }
    running.current = true;
    setPending(true);
    let result: ActionResult;
    try {
      result = await options.onConfirm(reason.trim());
    } catch {
      result = { ok: false, error: "The action could not be completed. Nothing was changed." };
    }
    running.current = false;
    setPending(false);
    if (!result.ok) {
      setActionError(result.error);
      return;
    }
    onDone(result.message);
    onClose();
  };

  return (
    <DialogContent>
      <form onSubmit={submit} className="grid gap-4" noValidate>
        <DialogHeader>
          <DialogTitle>{options.title}</DialogTitle>
          <DialogDescription>{options.description}</DialogDescription>
        </DialogHeader>
        {options.details}
        {options.reason && (
          <Field label={options.reason.label} required error={fieldError} hint={options.reason.hint}>
            <Textarea
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                if (fieldError) setFieldError(null);
              }}
              placeholder={options.reason.placeholder}
              maxLength={500}
            />
          </Field>
        )}
        {actionError && (
          <InlineAlert tone="danger" title="Not applied">
            {actionError}
          </InlineAlert>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button type="submit" loading={pending} variant={options.tone === "danger" ? "destructive-solid" : "default"}>
            {options.confirmLabel}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

/** Convenience hook: state for one ConfirmDialog per page plus toast feedback on success. */
export function useConfirm(onSuccess: (message: string) => void) {
  const [options, setOptions] = React.useState<ConfirmOptions | null>(null);
  const dialog = <ConfirmDialog options={options} onClose={() => setOptions(null)} onDone={onSuccess} />;
  return { confirm: setOptions, dialog };
}
