"use client";

import { useCallback, useSyncExternalStore } from "react";
import { createInitialDb, DB_VERSION } from "@/lib/mock/initial-db";
import type { ActionContext, ActionResult, MockAction } from "@/lib/mock/actions";
import type { DemoDb } from "@/lib/types";
import { useSession } from "@/lib/auth/session";
import { createPersistentStore } from "./persistent-store";

export const DB_STORAGE_KEY = "mithren-admin-demo-db";

export const demoDbStore = createPersistentStore<DemoDb>(DB_STORAGE_KEY, createInitialDb, (raw) =>
  raw && typeof raw === "object" && (raw as DemoDb).version === DB_VERSION && Array.isArray((raw as DemoDb).orders) ? (raw as DemoDb) : null,
);

const serverSnapshot = () => null;

/** The demo database, or null during server rendering / before hydration. */
export function useDemoDb(): DemoDb | null {
  return useSyncExternalStore(demoDbStore.subscribe, demoDbStore.get, serverSnapshot);
}

/** Like useDemoDb, for components that only render inside the signed-in shell (which waits for the db). */
export function useDb(): DemoDb {
  const db = useDemoDb();
  if (!db) throw new Error("useDb() used before the demo database was ready");
  return db;
}

function newId(prefix: string) {
  const random = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID().slice(0, 8) : Math.random().toString(36).slice(2, 10);
  return prefix ? `${prefix}-${random}` : random;
}

/** Runs a mock action as the given actor against the stored demo db and persists a successful result. */
export function runAs<P>(actor: ActionContext["actor"], action: MockAction<P>, payload: P): ActionResult {
  const ctx: ActionContext = { actor, now: new Date().toISOString(), newId };
  let result: ActionResult;
  try {
    result = action(demoDbStore.get(), payload, ctx);
  } catch (error) {
    console.error("Mock action failed", error);
    return { ok: false, error: "The action could not be completed. Nothing was changed." };
  }
  if (result.ok) demoDbStore.set(result.db);
  return result;
}

/** Runs a mock action as the signed-in demo admin and persists the result. */
export function useRunAction() {
  const session = useSession();
  return useCallback(
    <P,>(action: MockAction<P>, payload: P): ActionResult => {
      if (session.status !== "signed_in") return { ok: false, error: "Your demo session has ended. Sign in again." };
      return runAs({ id: session.session.staffId, name: session.session.name }, action, payload);
    },
    [session],
  );
}

export function resetDemoData() {
  demoDbStore.reset();
}
