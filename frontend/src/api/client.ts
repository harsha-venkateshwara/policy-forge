// API client. Every backend call lives here so views never touch fetch directly.
import type { Bootstrap, Determination, Health, PolicyDiffResult, Resolution, Rule } from "../types";

const BASE = ""; // relative, the Vite dev proxy forwards /api to the backend

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    let detail = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (body?.detail) detail = body.detail;
    } catch {
      /* non-JSON error body */
    }
    throw new Error(detail);
  }
  return res.json() as Promise<T>;
}

export const api = {
  health: () => request<Health>("/api/health"),
  bootstrap: () => request<Bootstrap>("/api/bootstrap"),
  rules: () => request<Record<string, Rule>>("/api/rules"),
  adjudications: () => request<Record<string, Determination>>("/api/adjudications"),
  compile: (policy_text: string, policy_id?: string) =>
    request<Rule>("/api/compile", {
      method: "POST",
      body: JSON.stringify({ policy_text, policy_id }),
    }),
  diff: (old_text: string, new_text: string, policy_id?: string, apply = false) =>
    request<PolicyDiffResult>("/api/diff", {
      method: "POST",
      body: JSON.stringify({ old_text, new_text, policy_id, apply }),
    }),
  resolve: (claim_id: string, outcome: string, by = "HV") =>
    request<Resolution>("/api/review/resolve", {
      method: "POST",
      body: JSON.stringify({ claim_id, outcome, by }),
    }),
};
