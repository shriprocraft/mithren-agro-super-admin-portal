"use client";

import type { ActionResult, MockAction } from "@/lib/mock/actions";
import { useDb, useRunAction } from "@/lib/store/demo-store";
import { useConfirm } from "./confirm-dialog";
import { useToast } from "./toast";

/** Everything a management page needs: the demo db, actions with toast feedback, and a confirm dialog. */
export function useAdmin() {
  const db = useDb();
  const run = useRunAction();
  const toast = useToast();
  const { confirm, dialog } = useConfirm(toast.success);

  /** Runs an action immediately (no confirmation) and shows the outcome. */
  function act<P>(action: MockAction<P>, payload: P): ActionResult {
    const result = run(action, payload);
    if (result.ok) toast.success(result.message);
    else toast.error(result.error);
    return result;
  }

  return { db, run, act, toast, confirm, confirmDialog: dialog };
}
