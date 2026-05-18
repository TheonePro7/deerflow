/**
 * API functions for thread file management.
 */

const API_BASE = "/api";

export interface SharedFiles {
  name: string;
  files: string[];
}

export interface ThreadFilesResponse {
  files: string[];
  shared?: SharedFiles;
}

/**
 * Fetch all files in a thread's user-data directory from the server.
 * Also returns shared knowledge base files if configured.
 */
export async function fetchThreadFiles(
  threadId: string,
): Promise<{ files: string[]; shared: SharedFiles | null }> {
  try {
    const res = await fetch(
      `${API_BASE}/threads/${encodeURIComponent(threadId)}/files/tree`,
      { credentials: "include" },
    );
    if (!res.ok) return { files: [], shared: null };
    const data: ThreadFilesResponse = await res.json();
    return {
      files: data.files ?? [],
      shared: data.shared ?? null,
    };
  } catch {
    return { files: [], shared: null };
  }
}
