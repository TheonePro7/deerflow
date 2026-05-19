import { getBackendBaseURL } from "../config";
import type { AgentThread } from "../threads";

/** Virtual path prefix used by the sandbox */
const VIRTUAL_PREFIX = "/mnt/user-data/";

/**
 * Ensure the filepath has the full virtual prefix so the API can resolve it.
 * Short paths like "outputs/file.md" get prefixed to "/mnt/user-data/outputs/file.md".
 */
function normalizeArtifactPath(filepath: string): string {
  if (filepath.startsWith("/")) return filepath;
  return `${VIRTUAL_PREFIX}${filepath}`;
}

export function urlOfArtifact({
  filepath,
  threadId,
  download = false,
  isMock = false,
}: {
  filepath: string;
  threadId: string;
  download?: boolean;
  isMock?: boolean;
}) {
  // 知识库文件（kb: 前缀）→ 使用 KB API
  if (filepath.startsWith("kb:")) {
    const kbPath = filepath.slice(3);
    return `/api/knowledge-base/files/content?path=${encodeURIComponent(kbPath)}`;
  }

  const normalized = normalizeArtifactPath(filepath);
  if (isMock) {
    return `${getBackendBaseURL()}/mock/api/threads/${threadId}/artifacts${normalized}${download ? "?download=true" : ""}`;
  }
  return `${getBackendBaseURL()}/api/threads/${threadId}/artifacts${normalized}${download ? "?download=true" : ""}`;
}

export function extractArtifactsFromThread(thread: AgentThread) {
  return thread.values.artifacts ?? [];
}

export function resolveArtifactURL(absolutePath: string, threadId: string) {
  return `${getBackendBaseURL()}/api/threads/${threadId}/artifacts${absolutePath}`;
}
