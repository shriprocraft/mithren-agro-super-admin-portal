// A tiny external store persisted to localStorage, read through useSyncExternalStore.
// Browser storage is used only to keep the DEMO state across reloads; it is not a database and is
// not secure (any script on the page, and the user, can read and change it).

export interface PersistentStore<T> {
  get: () => T;
  set: (next: T) => void;
  reset: () => void;
  subscribe: (listener: () => void) => () => void;
}

export function createPersistentStore<T>(key: string, init: () => T, parse: (raw: unknown) => T | null): PersistentStore<T> {
  let cache: { value: T } | undefined;
  const listeners = new Set<() => void>();
  const emit = () => listeners.forEach((l) => l());

  function read(): T {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw !== null) {
        const parsed = parse(JSON.parse(raw));
        if (parsed !== null) return parsed;
      }
    } catch {
      // Storage blocked or corrupt: fall back to the initial value.
    }
    return init();
  }

  function write(value: T) {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Storage full or blocked: the change still applies for this page session.
    }
  }

  const onStorage = (event: StorageEvent) => {
    if (event.key === key || event.key === null) {
      cache = undefined;
      emit();
    }
  };

  return {
    get() {
      if (!cache) cache = { value: read() };
      return cache.value;
    },
    set(next) {
      cache = { value: next };
      write(next);
      emit();
    },
    reset() {
      try {
        window.localStorage.removeItem(key);
      } catch {
        // ignore
      }
      cache = { value: init() };
      emit();
    },
    subscribe(listener) {
      listeners.add(listener);
      if (listeners.size === 1) window.addEventListener("storage", onStorage);
      return () => {
        listeners.delete(listener);
        if (listeners.size === 0) window.removeEventListener("storage", onStorage);
      };
    },
  };
}
