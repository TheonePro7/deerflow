/**
 * Plan/Task management API — fetches plans from the backend memory store.
 */

const API_BASE = "/api";

export interface Plan {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  priority: "low" | "medium" | "high";
  status: "pending" | "completed";
  createdAt: string;
  updatedAt: string;
}

export async function fetchPlans(): Promise<Plan[]> {
  try {
    const res = await fetch(`${API_BASE}/plans`, { credentials: "include" });
    if (!res.ok) return [];
    const data = await res.json();
    return data.plans ?? [];
  } catch {
    return [];
  }
}
