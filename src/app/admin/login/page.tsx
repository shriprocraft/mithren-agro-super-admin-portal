import { Suspense } from "react";
import type { Metadata } from "next";
import { LoadingState } from "@/components/admin/primitives";
import { LoginView } from "@/components/auth/login-view";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <Suspense fallback={<LoadingState fullHeight />}>
      <LoginView />
    </Suspense>
  );
}
