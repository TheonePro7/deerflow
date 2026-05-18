"use client";

export default function KbError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  console.error("Knowledge base error:", error);
  return (
    <div className="flex h-screen flex-col items-center justify-center gap-4 p-8">
      <p className="text-lg font-bold">页面崩溃</p>
      <pre className="max-w-xl overflow-auto rounded-md bg-red-950/50 p-4 text-sm text-red-400">
        {error.message}
      </pre>
      <button
        onClick={reset}
        className="rounded-md bg-zinc-800 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-700"
      >
        重试
      </button>
    </div>
  );
}
