"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ExternalLink,
  FolderKanban,
  HelpCircle,
  Inbox,
  Layers,
  LayoutDashboard,
  LogOut,
  Menu,
  Quote,
  Settings as SettingsIcon,
} from "lucide-react";
import { Link, navigate, type Route } from "@/lib/router";
import { api } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import type { AdminUser, DashboardStats } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { toast } from "sonner";
import { AdminProvider } from "./admin-context";
import { AuthLoading, LoginScreen, SetupScreen } from "./auth-screens";
import { DashboardView } from "./dashboard";
import { LeadsView } from "./leads";
import { ProjectEditor, ProjectList } from "./projects";
import { ServiceEditor, ServiceList } from "./services";
import { TestimonialsView } from "./testimonials";
import { FaqsView } from "./faqs";
import { SettingsView } from "./settings";

// ---------------------------------------------------------------------------
// AdminApp — full-screen CMS/CRM. Auth gate → shell (dark sidebar + light
// content) → sub-view by hash-route segments under #/admin.
// ---------------------------------------------------------------------------

type AuthPhase = "loading" | "setup" | "login" | "authed";

const NAV = [
  { seg: "", label: "Dashboard", icon: LayoutDashboard },
  { seg: "leads", label: "Leads", icon: Inbox, badge: true },
  { seg: "projects", label: "Projects", icon: FolderKanban },
  { seg: "services", label: "Services", icon: Layers },
  { seg: "testimonials", label: "Testimonials", icon: Quote },
  { seg: "faqs", label: "FAQs", icon: HelpCircle },
  { seg: "settings", label: "Settings", icon: SettingsIcon },
] as const;

/* --------------------------------------------------------------- nav links */
function NavLinks({
  activeSeg,
  newCount,
  onNavigate,
}: {
  activeSeg: string;
  newCount: number;
  onNavigate?: () => void;
}) {
  return (
    <nav aria-label="Admin sections" className="space-y-1">
      {NAV.map((item) => {
        const active = activeSeg === item.seg;
        const Icon = item.icon;
        return (
          <Link
            key={item.seg}
            href={`/admin${item.seg ? `/${item.seg}` : ""}`}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors",
              active ? "bg-volt text-ink" : "text-ivory/70 hover:bg-white/5 hover:text-ivory",
            )}
          >
            <Icon className="size-[18px] shrink-0" aria-hidden="true" />
            <span className="flex-1">{item.label}</span>
            {"badge" in item && item.badge && newCount > 0 ? (
              <span className="flex min-w-6 items-center justify-center rounded-full px-1.5 py-0.5 text-[11px] font-bold tabular-nums">
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.5",
                    active ? "bg-ink text-volt" : "bg-volt text-ink",
                  )}
                >
                  {newCount}
                </span>
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}

function BrandMark({ brandName, onNavigate }: { brandName: string; onNavigate?: () => void }) {
  const firstWord = brandName.trim().split(/\s+/)[0] || "Nexora";
  return (
    <Link href="/" onClick={onNavigate} className="group flex min-h-11 items-center gap-2.5 px-1" aria-label="Back to public site">
      <span className="flex size-8 items-center justify-center rounded-lg bg-volt font-display text-base font-bold text-ink transition-transform group-hover:scale-105">
        {(brandName.trim()[0] ?? "N").toUpperCase()}
      </span>
      <span className="font-display text-lg font-bold tracking-tight text-ivory">
        {firstWord}
        <span className="ml-1 inline-block size-2 rounded-[2px] bg-volt" aria-hidden="true" />
      </span>
    </Link>
  );
}

/* ------------------------------------------------------------------- shell */
function AdminShell({ route, brandName, user, onLogout }: { route: Route; brandName: string; user: AdminUser; onLogout: () => Promise<void> | void }) {
  const sub = useMemo(() => route.segments.slice(1), [route.segments]);
  const activeSeg = sub[0] ?? "";
  const [navOpen, setNavOpen] = useState(false);
  const [newCount, setNewCount] = useState(0);
  const [loggingOut, setLoggingOut] = useState(false);

  // Badge count — refetch on every route change (cheap; also warms dashboard).
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await api<{ stats: DashboardStats }>("api/stats", { admin: true });
        if (alive) setNewCount(res.stats.enquiries.newCount);
      } catch {
        /* badge is best-effort */
      }
    })();
    return () => {
      alive = false;
    };
  }, [route.path]);

  // unknown sub-route → dashboard
  const known =
    sub.length === 0 ||
    (sub[0] === "leads" && sub.length <= 2) ||
    (sub[0] === "projects" && sub.length <= 2) ||
    (sub[0] === "services" && sub.length <= 2) ||
    (sub[0] === "testimonials" && sub.length === 1) ||
    (sub[0] === "faqs" && sub.length === 1) ||
    (sub[0] === "settings" && sub.length === 1);

  useEffect(() => {
    if (!known) navigate("/admin");
  }, [known]);

  let view: React.ReactNode = null;
  if (sub.length === 0) {
    view = <DashboardView />;
  } else if (sub[0] === "leads") {
    view = <LeadsView selectedId={sub[1]} />;
  } else if (sub[0] === "projects") {
    view = sub[1] === "new" ? <ProjectEditor /> : sub[1] ? <ProjectEditor id={sub[1]} /> : <ProjectList />;
  } else if (sub[0] === "services") {
    view = sub[1] === "new" ? <ServiceEditor /> : sub[1] ? <ServiceEditor id={sub[1]} /> : <ServiceList />;
  } else if (sub[0] === "testimonials") {
    view = <TestimonialsView />;
  } else if (sub[0] === "faqs") {
    view = <FaqsView />;
  } else if (sub[0] === "settings") {
    view = <SettingsView />;
  }

  async function logout() {
    setLoggingOut(true);
    try {
      await api("api/auth", { body: { action: "logout" } });
      onLogout();
    } finally {
      setLoggingOut(false);
    }
  }

  const profile = (
    <div className="flex items-center gap-3 rounded-lg border border-white/10 bg-coal p-3">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-volt font-display text-sm font-bold text-ink">
        {(user.name.trim()[0] ?? "A").toUpperCase()}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-ivory">{user.name}</span>
        <span className="block truncate text-xs text-smoke">{user.email}</span>
      </span>
      <Button
        variant="ghost"
        size="icon"
        className="size-10 shrink-0 text-ivory/60 hover:bg-white/10 hover:text-ivory"
        aria-label="Log out"
        disabled={loggingOut}
        onClick={() => void logout()}
      >
        <LogOut className="size-4" />
      </Button>
    </div>
  );

  const sidebarBody = (onNavigate?: () => void) => (
    <div className="flex h-full flex-col gap-6 overflow-y-auto p-4 scroll-slim">
      <BrandMark brandName={brandName} onNavigate={onNavigate} />
      <NavLinks activeSeg={activeSeg} newCount={newCount} onNavigate={onNavigate} />
      <div className="mt-auto space-y-3">
        <Link
          href="/"
          onClick={onNavigate}
          className="flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium text-ivory/70 transition-colors hover:bg-white/5 hover:text-ivory"
        >
          <ExternalLink className="size-[18px]" aria-hidden="true" /> View site
        </Link>
        {profile}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F4F3EF]">
      {/* desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 bg-ink bg-grid-dark lg:block" aria-label="Admin sidebar">
        {sidebarBody()}
      </aside>

      {/* mobile top bar */}
      <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-ink/10 bg-ink px-4 lg:hidden">
        <Button
          variant="ghost"
          size="icon"
          className="size-10 text-ivory hover:bg-white/10"
          aria-label="Open admin menu"
          onClick={() => setNavOpen(true)}
        >
          <Menu className="size-5" />
        </Button>
        <BrandMark brandName={brandName} />
      </header>

      {/* mobile nav sheet */}
      <Sheet open={navOpen} onOpenChange={setNavOpen}>
        <SheetContent side="left" className="w-72 border-white/10 bg-ink p-0 [&>button]:text-ivory">
          <SheetTitle className="sr-only">Admin navigation</SheetTitle>
          {sidebarBody(() => setNavOpen(false))}
        </SheetContent>
      </Sheet>

      {/* content */}
      <div className="lg:pl-60">
        <main className="mx-auto w-full max-w-[1200px] px-4 py-6 sm:px-6 lg:px-10 lg:py-10" role="main">
          {view}
        </main>
      </div>
    </div>
  );
}

/* --------------------------------------------------------------------- root */
export default function AdminApp({ route, brandName }: { route: Route; brandName: string }) {
  const [phase, setPhase] = useState<AuthPhase>("loading");
  const [user, setUser] = useState<AdminUser | null>(null);

  // Initial session check — applied from the fetch callback (never inline).
  useEffect(() => {
    let alive = true;
    api<{ setupRequired: boolean; authenticated: boolean; user: AdminUser | null }>("api/auth").then(
      (status) => {
        if (!alive) return;
        if (status.authenticated && status.user) {
          setUser(status.user);
          setPhase("authed");
        } else {
          setUser(null);
          setPhase(status.setupRequired ? "setup" : "login");
        }
      },
      () => {
        if (alive) setPhase("login");
      },
    );
    return () => {
      alive = false;
    };
  }, []);

  const authLost = useCallback(() => {
    setUser(null);
    setPhase("login");
    toast.error("Your session has expired — please sign in again.");
  }, []);

  function handleAuthed(u: AdminUser) {
    setUser(u);
    setPhase("authed");
    navigate("/admin");
  }

  async function handleLogout() {
    setUser(null);
    setPhase("login");
    navigate("/admin");
  }

  if (phase === "loading") return <AuthLoading brandName={brandName} />;
  if (phase === "setup") return <SetupScreen brandName={brandName} onAuthed={handleAuthed} />;
  if (phase === "login" || !user) return <LoginScreen brandName={brandName} onAuthed={handleAuthed} />;

  return (
    <AdminProvider user={user} authLost={authLost}>
      <AdminShell route={route} brandName={brandName} user={user} onLogout={handleLogout} />
    </AdminProvider>
  );
}
