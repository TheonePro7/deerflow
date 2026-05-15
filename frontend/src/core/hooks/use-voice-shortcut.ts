"use client";

import { useCallback, useSyncExternalStore } from "react";

const STORAGE_KEY = "deerflow.voiceShortcut";
const DEFAULT_SHORTCUT = "Space";

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}

function getSnapshot(): string {
  if (typeof window === "undefined") return DEFAULT_SHORTCUT;
  return localStorage.getItem(STORAGE_KEY) ?? DEFAULT_SHORTCUT;
}

export function useVoiceShortcut(): [string, (v: string) => void] {
  const shortcut = useSyncExternalStore(subscribe, getSnapshot, () => DEFAULT_SHORTCUT);

  const setShortcut = useCallback((value: string) => {
    localStorage.setItem(STORAGE_KEY, value);
    // Dispatch custom event so other hooks in the same tab react
    window.dispatchEvent(new Event("storage"));
  }, []);

  return [shortcut, setShortcut];
}
