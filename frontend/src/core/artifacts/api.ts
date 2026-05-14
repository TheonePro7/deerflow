/**
 * API functions for thread file management.
 */

const API_BASE = "/api";

export interface ThreadFilesResponse {
  files: string[];
}

/**
 * Fetch all files in a thread's user-data directory from the server.
 * Falls back to an empty list on error.
 */
export async function fetchThreadFiles(
  threadId: string,
): Promise<string[]> {
  try {
    const res = await fetch(
      `${API_BASE}/threads/${encodeURIComponent(threadId)}/files/tree`,
      { credentials: "include" },
    );
    if (!res.ok) return [];
    const data: ThreadFilesResponse = await res.json();
    return data.files ?? [];
  } catch {
    return [];
  }
}
