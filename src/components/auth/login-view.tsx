"use client";

import * as React from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, FlaskConical, KeyRound, Lock, Mail } from "lucide-react";
import { Field } from "@/components/admin/field";
import { InlineAlert, LoadingState } from "@/components/admin/primitives";
import { BrandLogo } from "@/components/shell/brand-logo";
import { SiteFooter } from "@/components/shell/site-footer";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { brandAssets } from "@/config/brand";
import { demoAdminAccount } from "@/config/demo-auth";
import { EMAIL_PATTERN, mockSignIn, safeNextPath, useSession, validateLogin, type LoginErrors } from "@/lib/auth/session";
import { recordSignIn } from "@/lib/mock/actions";
import { runAs } from "@/lib/store/demo-store";

/** Simulated network latency so the loading state is visible; no request is actually made. */
const MOCK_LATENCY_MS = 500;

export function LoginView() {
  const router = useRouter();
  const params = useSearchParams();
  const session = useSession();
  const next = safeNextPath(params.get("next"));

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [errors, setErrors] = React.useState<LoginErrors>({});
  const [failure, setFailure] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [forgotOpen, setForgotOpen] = React.useState(false);
  const emailRef = React.useRef<HTMLInputElement>(null);
  const passwordRef = React.useRef<HTMLInputElement>(null);

  // Already signed in (e.g. the login page was opened directly): go straight to the panel.
  React.useEffect(() => {
    if (session.status === "signed_in" && !submitting) router.replace(next);
  }, [session.status, submitting, router, next]);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    setFailure(null);
    const found = validateLogin(email, password);
    setErrors(found);
    if (found.email) return emailRef.current?.focus();
    if (found.password) return passwordRef.current?.focus();

    setSubmitting(true);
    window.setTimeout(() => {
      const signedIn = mockSignIn(email, password);
      if (!signedIn) {
        setSubmitting(false);
        setFailure("The email or password is incorrect for this demo.");
        setPassword("");
        passwordRef.current?.focus();
        return;
      }
      runAs({ id: signedIn.staffId, name: signedIn.name }, recordSignIn, { event: "sign_in" });
      router.replace(next);
    }, MOCK_LATENCY_MS);
  };

  if (session.status === "signed_in" && !submitting) return <LoadingState label="Opening the dashboard…" fullHeight />;

  return (
    <div className="flex min-h-svh flex-col bg-soft">
      <main className="flex flex-1 items-center justify-center px-4 py-10 lg:px-8 lg:py-12">
        <div className="grid w-full max-w-[1180px] items-center gap-12 lg:grid-cols-[minmax(0,1fr)_440px]">
          {/* Branded welcome panel (desktop only): the finalized hero at its native 16:9 ratio, uncropped. */}
          <figure className="hidden lg:block">
            <div className="surface-card overflow-hidden rounded-3xl">
              <Image src={brandAssets.hero.src} alt="Fresh vegetables in a Mithren Agro crate in a farm field" width={brandAssets.hero.width} height={brandAssets.hero.height} sizes="(min-width: 1280px) 700px, 55vw" className="block h-auto w-full" />
            </div>
            <figcaption className="mt-5 max-w-xl">
              <span className="block font-heading text-2xl leading-snug font-semibold text-foreground xl:text-[1.75rem]">Mithren Agro administration</span>
              <span className="mt-1.5 block text-sm leading-relaxed text-muted-foreground">Marketplace operations and the agricultural investment programme, managed in one place.</span>
            </figcaption>
          </figure>
          <div className="mx-auto w-full max-w-[440px]">
            <div className="surface-card rounded-3xl px-6 py-8 sm:px-9 sm:py-10">
              <div className="flex justify-center"><BrandLogo className="w-48 sm:w-56" preload /></div>
              <div className="mt-7 text-center">
                <p className="text-xs font-semibold tracking-[0.14em] text-primary uppercase">Super Admin</p>
                <h1 className="mt-1.5 text-2xl font-semibold text-foreground">Sign in to the admin panel</h1>
                <p className="mt-1.5 text-sm text-muted-foreground">Restricted to marketplace administrators. There is no public registration.</p>
              </div>

              <form onSubmit={submit} noValidate className="mt-7 grid gap-4" aria-describedby={failure ? "login-failure" : undefined}>
                {failure && (
                  <div id="login-failure">
                    <InlineAlert tone="danger" title="Sign-in failed">
                      {failure}
                    </InlineAlert>
                  </div>
                )}
                <Field label="Email address" error={errors.email} required>
                  {(control) => (
                  <div className="relative">
                    <Mail className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                    <Input
                      {...control}
                      ref={emailRef}
                      type="email"
                      name="email"
                      autoComplete="username"
                      inputMode="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (errors.email) setErrors((er) => ({ ...er, email: undefined }));
                      }}
                      className="pl-11"
                      placeholder="name@example.com"
                    />
                  </div>
                  )}
                </Field>
                <Field label="Password" error={errors.password} required>
                  {(control) => (
                  <div className="relative">
                    <Lock className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                    <Input
                      {...control}
                      ref={passwordRef}
                      type={showPassword ? "text" : "password"}
                      name="password"
                      autoComplete="current-password"
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (errors.password) setErrors((er) => ({ ...er, password: undefined }));
                      }}
                      className="pr-12 pl-11"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-pressed={showPassword}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      className="absolute top-1/2 right-1.5 grid size-9 -translate-y-1/2 cursor-pointer place-items-center rounded-full text-muted-foreground hover:bg-soft hover:text-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                    >
                      {showPassword ? <EyeOff className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}
                    </button>
                  </div>
                  )}
                </Field>
                <div className="-mt-1 flex justify-end">
                  <button type="button" onClick={() => setForgotOpen(true)} className="min-h-9 cursor-pointer rounded-md text-sm font-medium text-primary hover:text-primary-hover hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
                    Forgot password?
                  </button>
                </div>
                <Button type="submit" size="lg" loading={submitting} className="w-full">
                  {submitting ? "Signing in…" : "Sign in"}
                </Button>
              </form>
            </div>

            <aside aria-labelledby="demo-access-title" className="mt-4 rounded-2xl border border-info/20 bg-card px-5 py-4 text-[13px] leading-relaxed">
              <h2 id="demo-access-title" className="flex items-center gap-2 font-sans font-semibold text-foreground">
                <FlaskConical className="size-4 text-info" aria-hidden="true" />
                Demo access (mock authentication)
              </h2>
              <p className="mt-1 text-muted-foreground">
                This is a frontend-only demo. Credentials are checked in your browser, are visible to anyone using it, and provide no real security.
              </p>
              <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
                <dt className="text-muted-foreground">Email</dt>
                <dd className="font-medium break-all text-foreground">{demoAdminAccount.email}</dd>
                <dt className="text-muted-foreground">Password</dt>
                <dd className="font-medium text-foreground">{demoAdminAccount.password}</dd>
              </dl>
            </aside>
          </div>
        </div>
        <ForgotPasswordDialog open={forgotOpen} onOpenChange={setForgotOpen} initialEmail={email} />
      </main>
      <SiteFooter />
    </div>
  );
}

function ForgotPasswordDialog({ open, onOpenChange, initialEmail }: { open: boolean; onOpenChange: (open: boolean) => void; initialEmail: string }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open && <ForgotPasswordBody initialEmail={initialEmail} onClose={() => onOpenChange(false)} />}
    </Dialog>
  );
}

function ForgotPasswordBody({ initialEmail, onClose }: { initialEmail: string; onClose: () => void }) {
  const [email, setEmail] = React.useState(initialEmail);
  const [error, setError] = React.useState<string | null>(null);
  const [done, setDone] = React.useState(false);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!email.trim()) return setError("Enter your email address.");
    if (!EMAIL_PATTERN.test(email.trim())) return setError("Enter a valid email address, like name@example.com.");
    setDone(true);
  };

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <KeyRound className="size-5 text-primary" aria-hidden="true" />
          Reset your password
        </DialogTitle>
        <DialogDescription>Password reset is simulated in this demo.</DialogDescription>
      </DialogHeader>
      {done ? (
        <>
          <InlineAlert tone="info" title="Demo outcome: no email was sent">
            In the real application, a reset link would be emailed to <strong className="break-all">{email.trim()}</strong> if it belongs to an administrator. This demo has no email
            provider, so nothing was sent. Use the demo credentials shown on the sign-in page.
          </InlineAlert>
          <DialogFooter>
            <Button onClick={onClose}>Back to sign in</Button>
          </DialogFooter>
        </>
      ) : (
        <form onSubmit={submit} noValidate className="grid gap-4">
          <Field label="Email address" error={error} required>
            <Input
              type="email"
              autoComplete="username"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (error) setError(null);
              }}
            />
          </Field>
          <DialogFooter>
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">Simulate reset request</Button>
          </DialogFooter>
        </form>
      )}
    </DialogContent>
  );
}
