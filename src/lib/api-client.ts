"use client";

// ---------------------------------------------------------------------------
// Tiny fetch wrapper for the REST API. Admin mutations must carry the
// x-nexora-admin header (a cheap CSRF layer on top of sameSite cookies).
// ---------------------------------------------------------------------------

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

type Options = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  formData?: FormData;
  admin?: boolean; // adds CSRF header
};

export async function api<T>(path: string, opts: Options = {}): Promise<T> {
  const headers: Record<string, string> = {};
  if (opts.admin) headers["x-nexora-admin"] = "1";
  if (opts.body !== undefined) headers["Content-Type"] = "application/json";

  let res: Response;
  try {
    res = await fetch(path, {
      method: opts.method ?? (opts.body !== undefined || opts.formData ? "POST" : "GET"),
      headers,
      body: opts.formData ?? (opts.body !== undefined ? JSON.stringify(opts.body) : undefined),
      credentials: "same-origin",
    });
  } catch {
    throw new ApiError(0, "Network error — check your connection and retry.");
  }

  let data: unknown = null;
  const text = await res.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }
  }

  if (!res.ok) {
    const message =
      (data && typeof data === "object" && "error" in data && typeof (data as { error: unknown }).error === "string"
        ? (data as { error: string }).error
        : undefined) || `Request failed (${res.status})`;
    throw new ApiError(res.status, message);
  }

  return data as T;
}
