"use client";

import { createContext, useCallback, useContext, useMemo } from "react";
import { toast } from "sonner";
import { ApiError } from "@/lib/api-client";
import type { AdminUser } from "@/lib/types";

// ---------------------------------------------------------------------------
// Admin-wide context: current user + centralised API error handling.
// Any authenticated call that comes back 401 drops the whole panel back to
// the login screen (authLost), everything else surfaces a toast.
// ---------------------------------------------------------------------------

type AdminCtx = {
  user: AdminUser | null;
  authLost: () => void;
  /** Re-fetch the sidebar "new leads" badge (call after status changes). */
  refreshBadge: () => void;
  /** Toast + handle any thrown API error. Returns true when it was a 401. */
  onApiError: (err: unknown) => boolean;
};

const AdminContext = createContext<AdminCtx>({
  user: null,
  authLost: () => undefined,
  refreshBadge: () => undefined,
  onApiError: () => false,
});

export function AdminProvider({
  user,
  authLost,
  refreshBadge,
  children,
}: {
  user: AdminUser | null;
  authLost: () => void;
  refreshBadge: () => void;
  children: React.ReactNode;
}) {
  const onApiError = useCallback(
    (err: unknown): boolean => {
      if (err instanceof ApiError && err.status === 401) {
        authLost();
        return true;
      }
      toast.error(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
      return false;
    },
    [authLost],
  );

  const value = useMemo(
    () => ({ user, authLost, refreshBadge, onApiError }),
    [user, authLost, refreshBadge, onApiError],
  );
  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
}

export function useAdmin(): AdminCtx {
  return useContext(AdminContext);
}
