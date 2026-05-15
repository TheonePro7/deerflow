"use client";

import { MicIcon, SettingsIcon, SquareIcon } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useVoiceShortcut } from "@/core/hooks/use-voice-shortcut";

interface VoiceInputProps {
  /** Called when speech is recognized and transcribed */
  onTranscript: (text: string) => void;
  /** Whether speech recognition is supported by the browser */
  supported: boolean;
}

/** Format a key-combo string into human-readable form */
function formatShortcut(code: string): string {
  if (code === "Off" || !code) return "关闭";
  const parts = code.split("+");
  return parts
    .map((p) => {
      if (p === "ctrlKey") return "Ctrl";
      if (p === "altKey") return "Alt";
      if (p === "metaKey") return "Cmd";
      if (p === "shiftKey") return "Shift";
      return p.replace(/^Key|^Digit/, "");
    })
    .join("+");
}

/**
 * Voice input button — uses Web Speech API (browser native).
 * Hold or click to record, release/click again to stop and transcribe.
 */
export function VoiceInput({ onTranscript, supported }: VoiceInputProps) {
  const [shortcut, setShortcut] = useVoiceShortcut();
  const [recording, setRecording] = useState(false);
  const [interim, setInterim] = useState("");
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const callbackRef = useRef(onTranscript);
  callbackRef.current = onTranscript; // always fresh, no re-init needed

  // Initialize speech recognition once (on mount)
  useEffect(() => {
    if (!supported) return;

    const SpeechRecognitionAPI =
      (window as unknown as Record<string, unknown>).SpeechRecognition as typeof SpeechRecognition | undefined
      || (window as unknown as Record<string, unknown>).webkitSpeechRecognition as typeof SpeechRecognition | undefined;

    if (!SpeechRecognitionAPI) return;

    const recognition = new SpeechRecognitionAPI();
    recognition.lang = "zh-CN";
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalText = "";
      let interimText = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (!result) continue;
        const alt = result[0];
        if (!alt) continue;
        if (result.isFinal) {
          finalText += alt.transcript;
        } else {
          interimText += alt.transcript;
        }
      }
      if (finalText) {
        callbackRef.current(finalText);
      }
      setInterim(interimText);
    };

    recognition.onerror = () => {
      setRecording(false);
      setInterim("");
    };

    recognition.onend = () => {
      setRecording(false);
      setInterim("");
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.abort();
    };
  }, [supported]); // only re-init when supported changes

  const toggleRecording = useCallback(() => {
    const recognition = recognitionRef.current;
    if (!recognition) return;

    if (recording) {
      recognition.stop();
      setRecording(false);
    } else {
      setInterim("");
      recognition.start();
      setRecording(true);
    }
  }, [recording]);

  // Global keyboard shortcut (AFTER toggleRecording so the ref is stable)
  useEffect(() => {
    if (shortcut === "Off" || !shortcut || typeof window === "undefined") return;

    const parts = new Set(shortcut.split("+"));
    const targetKey = [...parts].find(
      (p) => !["ctrlKey", "altKey", "metaKey", "shiftKey"].includes(p),
    );
    if (!targetKey) return;

    const handler = (e: KeyboardEvent) => {
      const match =
        e.code === targetKey &&
        parts.has("ctrlKey") === (e.ctrlKey || e.metaKey) &&
        parts.has("altKey") === e.altKey &&
        parts.has("shiftKey") === e.shiftKey;

      if (!match) return;

      // Don't trigger unmodified Space shortcut when typing in inputs
      if (!parts.has("ctrlKey") && !parts.has("altKey") && !parts.has("metaKey") && shortcut.startsWith("Space")) {
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA") return;
      }

      e.preventDefault();
      toggleRecording();
    };

    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [shortcut, toggleRecording]);

  if (!supported) return null;

  return (
    <div className="relative flex items-center">
      <button
        type="button"
        onClick={toggleRecording}
        className={`flex items-center justify-center rounded-full p-1.5 transition-all ${
          recording
            ? "bg-red-500 text-white shadow-lg shadow-red-500/30 animate-pulse"
            : "text-muted-foreground hover:text-foreground hover:bg-background/80"
        }`}
        title={recording ? "点击停止录音" : "点击开始语音输入"}
      >
        {recording ? (
          <SquareIcon size={16} className="animate-pulse" />
        ) : (
          <MicIcon size={16} />
        )}
      </button>

      {/* Shortcut settings dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground ml-0.5 rounded-full p-0.5 opacity-40 hover:opacity-100"
            title="快捷键设置"
          >
            <SettingsIcon size={12} />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="top" align="start" className="w-52">
          <DropdownMenuLabel>语音快捷键</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <div className="px-2 py-1.5 text-xs text-muted-foreground">
            <div className="mb-2">当前快捷键</div>
            <div className="flex items-center justify-between rounded-md border px-3 py-2 font-mono text-sm">
              {shortcut === "Off" ? (
                <span className="text-muted-foreground">已关闭</span>
              ) : (
                <span>{formatShortcut(shortcut)}</span>
              )}
              <button
                type="button"
                className="text-primary hover:text-primary/80 ml-2 text-xs font-medium"
                onClick={() => {
                  setListening(true);
                }}
              >
                修改
              </button>
            </div>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-muted-foreground text-xs"
            onSelect={() => setShortcut("Off")}
          >
            关闭快捷键
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Key recording overlay when the user is pressing a new shortcut */}
      <ListeningOverlay
        listening={listening}
        onCapture={(combo) => {
          setShortcut(combo);
          setListening(false);
        }}
        onCancel={() => setListening(false)}
      />
      {/* Interim text tooltip */}
      {recording && interim && (
        <div className="absolute bottom-full left-1/2 z-50 mb-2 -translate-x-1/2 whitespace-nowrap rounded-md bg-black/80 px-3 py-1.5 text-xs text-white shadow-lg">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 animate-pulse rounded-full bg-red-400" />
            {interim || "正在聆听..."}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Check if the browser supports the Web Speech API.
 */
export function isSpeechSupported(): boolean {
  if (typeof window === "undefined") return false;
  return !!(
    (window as unknown as Record<string, unknown>).SpeechRecognition ||
    (window as unknown as Record<string, unknown>).webkitSpeechRecognition
  );
}

// ---------------------------------------------------------------------------
// ListeningOverlay — captures the user's key combination
// ---------------------------------------------------------------------------

function ListeningOverlay({
  listening,
  onCapture,
  onCancel,
}: {
  listening: boolean;
  onCapture: (combo: string) => void;
  onCancel: () => void;
}) {
  useEffect(() => {
    if (!listening) return;

    const handler = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();

      // Ignore modifier-only presses
      if (["Control", "Alt", "Meta", "Shift"].includes(e.key)) return;

      const parts: string[] = [];
      if (e.ctrlKey || e.metaKey) parts.push(e.metaKey ? "metaKey" : "ctrlKey");
      if (e.altKey) parts.push("altKey");
      if (e.shiftKey) parts.push("shiftKey");
      parts.push(e.code);

      onCapture(parts.join("+"));
    };

    document.addEventListener("keydown", handler, true);
    return () => document.removeEventListener("keydown", handler, true);
  }, [listening, onCapture]);

  // ESC to cancel
  useEffect(() => {
    if (!listening) return;
    const escHandler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", escHandler);
    return () => document.removeEventListener("keydown", escHandler);
  }, [listening, onCancel]);

  if (!listening) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-background rounded-xl border p-6 text-center shadow-2xl">
        <div className="mb-3 text-lg font-semibold">设置语音快捷键</div>
        <div className="text-muted-foreground mb-4 text-sm">
          请在键盘上按下你想要使用的组合键
        </div>
        <div className="border-border bg-muted mx-auto mb-4 flex h-20 w-64 items-center justify-center rounded-lg border-2 border-dashed font-mono text-lg">
          ⌨️
        </div>
        <div className="text-muted-foreground text-xs">
          按 <kbd className="bg-muted rounded border px-1.5 py-0.5 font-mono text-[11px]">Esc</kbd> 取消
        </div>
      </div>
    </div>
  );
}
