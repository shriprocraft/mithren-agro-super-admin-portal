import { describe, expect, it } from "vitest";
import { createInitialDb, DB_VERSION } from "@/lib/mock/initial-db";
import { createPersistentStore } from "@/lib/store/persistent-store";
import type { DemoDb } from "@/lib/types";

const KEY = "test-demo-db";
const make = () => createPersistentStore<DemoDb>(KEY, createInitialDb, (raw) => (raw && (raw as DemoDb).version === DB_VERSION ? (raw as DemoDb) : null));

describe("demo persistence", () => {
  it("persists changes to localStorage and reads them in a new store instance", () => {
    const store = make();
    const db = store.get();
    store.set({ ...db, customers: db.customers.map((c) => (c.id === "cus-001" ? { ...c, city: "Madurai" } : c)) });
    expect(make().get().customers.find((c) => c.id === "cus-001")?.city).toBe("Madurai");
  });

  it("discards stale or corrupt stored data", () => {
    window.localStorage.setItem(KEY, JSON.stringify({ version: DB_VERSION - 1 }));
    expect(make().get().orders.length).toBe(42);
    window.localStorage.setItem(KEY, "{not json");
    expect(make().get().orders.length).toBe(42);
  });

  it("reset restores the original demo data and notifies subscribers", () => {
    const store = make();
    store.set({ ...store.get(), customers: [] });
    let notified = 0;
    store.subscribe(() => notified++);
    store.reset();
    expect(store.get().customers.length).toBe(14);
    expect(window.localStorage.getItem(KEY)).toBeNull();
    expect(notified).toBe(1);
  });
});
