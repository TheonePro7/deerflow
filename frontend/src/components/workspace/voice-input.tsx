"use client";

import { MicIcon, SettingsIcon, SquareIcon } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useVoiceShortcut } from "@/core/hooks/use-voice-shortcut";

const SHORTCUT_OPTIONS = ["Space", "Ctrl+Space", "Alt+V", "Off"];

interface VoiceInputProps {
  /** Called when speech is recognized and transcribed */
  onTranscript: (text: string) => void;
  /** Whether speech recognition is supported by the browser */
  supported: boolean;
}

/**
 * Voice input button — uses Web Speech API (browser native).
 * Hold or click to record, release/click again to stop and transcribe.
 */
export function VoiceInput({ onTranscript, supported }: VoiceInputProps) {
  const [shortcut, setShortcut] = useVoiceShortcut();
  const [recording, setRecording] = useState(false);
  const [interim, setInterim] = useState("");
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
    if (shortcut === "Off" || typeof window === "undefined") return;

    const handler = (e: KeyboardEvent) => {
      const isMatch =
        (shortcut === "Space" && e.code === "Space" && !e.ctrlKey && !e.altKey) ||
        (shortcut === "Ctrl+Space" && e.code === "Space" && (e.ctrlKey || e.metaKey)) ||
        (shortcut === "Alt+V" && e.code === "KeyV" && e.altKey);

      if (!isMatch) return;

      // Don't trigger Space shortcut when typing in an input/textarea
      const tag = (e.target as HTMLElement)?.tagName;
      if (shortcut === "Space" && (tag === "INPUT" || tag === "TEXTAREA")) return;

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
        <DropdownMenuContent side="top" align="start" className="w-44">
          <DropdownMenuLabel>语音快捷键</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuRadioGroup
            value={shortcut}
            onValueChange={(v) => setShortcut(v)}
          >
            {SHORTCUT_OPTIONS.map((opt) => (
              <DropdownMenuRadioItem key={opt} value={opt}>
                {opt === "Off" ? "关闭" : opt}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
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
