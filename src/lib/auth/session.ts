"use client";

// MOCK AUTHENTICATION. The credential check runs in the browser against demo values bundled with the
// app (src/config/demo-auth.ts). The "session" is a localStorage entry that anyone can create or edit,
// so the route check built on it is a demo interaction, not a security boundary. Real sign-in needs a
// server-verified session; that is outside this frontend-only phase.
import { useSyncExternalStore } from "react";
import { demoAdminAccount } from "@/config/demo-auth";
import { createPersistentStore } from "@/lib/store/persistent-store";

export interface DemoSession {
  staffId: string;
  name: string;
  email: string;
  role: "super_admin";
  signedInAt: string;
}

export const SESSION_STORAGE_KEY = "mithren-admin-demo-session";

export const sessionStore = createPersistentStore<DemoSession | null>(
  SESSION_STORAGE_KEY,
  () => null,
  (raw) => (raw && typeof raw === "object" && typeof (raw as DemoSession).staffId === "string" ? (raw as DemoSession) : null),
);

export type SessionState = { status: "loading" } | { status: "signed_out" } | { status: "signed_in"; session: DemoSession };

const LOADING = { status: "loading" } as const;
const SIGNED_OUT = { status: "signed_out" } as const;
let lastSession: DemoSession | null = null;
let lastState: SessionState = SIGNED_OUT;

function snapshot(): SessionState {
  const session = sessionStore.get();
  if (session !== lastSession) {
    lastSession = session;
    lastState = session ? { status: "signed_in", session } : SIGNED_OUT;
  }
  return lastState;
}

export function useSession(): SessionState {
  return useSyncExternalStore(sessionStore.subscribe, snapshot, () => LOADING);
}

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface LoginErrors {
  email?: string;
  password?: string;
}

export function validateLogin(email: string, password: string): LoginErrors {
  const errors: LoginErrors = {};
  if (!email.trim()) errors.email = "Enter your email address.";
  else if (!EMAIL_PATTERN.test(email.trim())) errors.email = "Enter a valid email address, like name@example.com.";
  if (!password) errors.password = "Enter your password.";
  return errors;
}

/** Compares against the demo credentials. Returns the new session, or null when they do not match. */
export function mockSignIn(email: string, password: string): DemoSession | null {
  if (email.trim().toLowerCase() !== demoAdminAccount.email || password !== demoAdminAccount.password) return null;
  const session: DemoSession = {
    staffId: demoAdminAccount.staffId,
    name: demoAdminAccount.name,
    email: demoAdminAccount.email,
    role: "super_admin",
    signedInAt: new Date().toISOString(),
  };
  sessionStore.set(session);
  return session;
}

let signedOutByUser = false;

export function mockSignOut() {
  signedOutByUser = true;
  sessionStore.set(null);
}

/**
 * True once after an explicit logout, so the route guard sends the user to a clean login page
 * instead of treating the current page as a destination to return to.
 */
export function consumeExplicitSignOut(): boolean {
  const value = signedOutByUser;
  signedOutByUser = false;
  return value;
}

/** Only same-app admin paths are accepted as a post-login destination (prevents open redirects). */
export function safeNextPath(next: string | null | undefined): string {
  if (!next || !next.startsWith("/admin") || next.startsWith("//") || next.startsWith("/admin/login")) return "/admin";
  return next;
}
