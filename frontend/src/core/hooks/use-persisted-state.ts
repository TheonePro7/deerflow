"use client";

import { useEffect, useState } from "react";

/**
 * useState but persists the value to localStorage.
 *
 * @param key  Storage key (should be unique per component instance).
 * @param initial  Default value when nothing is stored yet.
 */
export function usePersistedState<T>(
  key: string,
  initial: T,
): [T, (v: T) => void] {
  const [value, setValue] = useState<T>(() => {
    if (typeof window === "undefined") return initial;
    try {
      const stored = localStorage.getItem(key);
      return stored !== null ? (JSON.parse(stored) as T) : initial;
    } catch {
      return initial;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Ignore write errors (quota exceeded, private browsing, etc.)
    }
  }, [key, value]);

  return [value, setValue];
}
