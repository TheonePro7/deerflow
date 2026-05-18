"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * useState but persists the value to localStorage.
 * The effective key is `prefix + pageKeySuffix`, where `pageKeySuffix`
 * is derived from the current URL path (thread ID when applicable)
 * so each thread remembers its own state independently.
 *
 * @param prefix  A static prefix for the localStorage key.
 * @param initial  Default value when nothing is stored yet.
 */
export function usePersistedState<T>(
  prefix: string,
  initial: T,
): [T, (v: T) => void] {
  // Compute a page-scoped key suffix from the URL.
  // This runs synchronously on the client so the key is stable per page.
  const resolvedKey = `${prefix}__${pageKeySuffix()}`;

  const [value, setValue] = useState<T>(() => {
    if (typeof window === "undefined") return initial;
    try {
      const stored = localStorage.getItem(resolvedKey);
      return stored !== null ? (JSON.parse(stored) as T) : initial;
    } catch {
      return initial;
    }
  });

  // Track current key so the effect below can clean up stale keys.
  const keyRef = useRef(resolvedKey);
  keyRef.current = resolvedKey;

  useEffect(() => {
    try {
      localStorage.setItem(keyRef.current, JSON.stringify(value));
    } catch {
      // Ignore write errors (quota exceeded, private browsing, etc.)
    }
  }, [value]);

  return [value, setValue];
}

/**
 * Derive a stable key suffix from the current URL path.
 * Each chat thread gets its own scope; non-thread pages share a fallback.
 */
function pageKeySuffix(): string {
  if (typeof window === "undefined") return "ssr";
  try {
    const m = window.location.pathname.match(/\/chats\/([^/]+)/);
    return m ? `thread/${m[1]}` : `page/${window.location.pathname}`;
  } catch {
    return "fallback";
  }
}
