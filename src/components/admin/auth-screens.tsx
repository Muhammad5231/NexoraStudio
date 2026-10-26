"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { Link } from "@/lib/router";
import { api } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import type { AdminUser } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock } from "lucide-react";

// ---------------------------------------------------------------------------
// Login screen. Admin accounts are provisioned by the studio (never created
// through the UI) — this is the only door into the panel. Dark, branded,
// focused. No public chrome.
// ---------------------------------------------------------------------------

function AuthShell({
  brandName,
  kicker,
  title,
  children,
}: {
  brandName: string;
  kicker: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-ink bg-grid-dark px-4 py-10 text-ivory">
      <div className="w-full max-w-md">
        <Link href="/" className="group mb-8 flex items-center gap-2.5" aria-label="Back to site">
          <span className="flex size-9 items-center justify-center rounded-lg bg-volt font-display text-lg font-bold text-ink transition-transform group-hover:scale-105">
            {(brandName.trim()[0] ?? "N").toUpperCase()}
          </span>
          <span className="font-display text-lg font-bold tracking-tight text-ivory">
            {brandName.split(/\s+/)[0]}
            <span className="text-volt">.</span>
          </span>
        </Link>
        <div className="rounded-2xl border border-white/10 bg-coal p-6 shadow-2xl sm:p-8">
          <p className="kicker text-volt">{kicker}</p>
          <h1 className="mt-2 font-display text-2xl font-bold tracking-tight text-ivory">{title}</h1>
          <div className="mt-6">{children}</div>
        </div>
        <p className="mt-6 text-center text-xs text-smoke">
          <Link href="/" className="underline-offset-4 hover:text-ivory hover:underline">
            ← Back to the public site
          </Link>
        </p>
      </div>
    </div>
  );
}

function FieldRow({
  id,
  label,
  ...input
}: {
  id: string;
  label: string;
} & React.ComponentProps<typeof Input>) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-[13px] font-semibold text-ivory">
        {label}
      </Label>
      <Input id={id} className="h-10 border-white/15 bg-ink-2 text-ivory placeholder:text-smoke/60" {...input} />
    </div>
  );
}

function InlineError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-red-300">
      {message}
    </p>
  );
}

function SubmitButton({ busy, children }: { busy: boolean; children: ReactNode }) {
  return (
    <Button
      type="submit"
      disabled={busy}
      className="h-11 w-full bg-volt font-display text-sm font-bold text-ink hover:bg-volt-2"
    >
      {busy ? (
        <span className="size-4 animate-spin rounded-full border-2 border-ink/30 border-t-ink" aria-hidden="true" />
      ) : null}
      {children}
    </Button>
  );
}

/* -------------------------------------------------------------------- Login */
export function LoginScreen({ brandName, onAuthed }: { brandName: string; onAuthed: (user: AdminUser) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email.trim() || !password) return setError("Enter your email and password.");
    setBusy(true);
    try {
      const res = await api<{ user: AdminUser }>("api/auth", {
        body: { action: "login", email: email.trim(), password },
      });
      onAuthed(res.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell brandName={brandName} kicker="Admin panel" title="Sign in to continue">
      <form onSubmit={(e) => void submit(e)} className="space-y-4" noValidate>
        <div className="flex items-start gap-2.5 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2.5 text-xs leading-relaxed text-smoke">
          <Lock className="mt-0.5 size-3.5 shrink-0 text-volt" aria-hidden="true" />
          <span>Admin access is restricted to the studio account. There is no sign-up — credentials are issued by the studio owner.</span>
        </div>
        <FieldRow id="login-email" label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nexora@studio.com" autoComplete="email" required />
        <FieldRow id="login-password" label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" autoComplete="current-password" required />
        <InlineError message={error} />
        <SubmitButton busy={busy}>Sign in</SubmitButton>
      </form>
    </AuthShell>
  );
}

/* --------------------------------------------------------- Branded skeleton */
export function AuthLoading({ brandName }: { brandName: string }) {
  const first = brandName.trim()[0] ?? "N";
  return (
    <div className="flex min-h-screen items-center justify-center bg-ink" role="status" aria-label="Loading admin">
      <div className="flex flex-col items-center gap-4">
        <span
          className={cn(
            "flex size-14 items-center justify-center rounded-2xl bg-volt font-display text-2xl font-bold text-ink",
            "animate-pulse",
          )}
        >
          {first.toUpperCase()}
        </span>
        <p className="text-xs tracking-widest text-smoke uppercase">Loading studio panel…</p>
      </div>
    </div>
  );
}
