"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { generateAgeCompilationsAction } from "@/lib/world/actions";

export function GenerateAgeCompilationsButton() {
  const [status, setStatus] = useState<"idle" | "working" | "error">("idle");
  const [message, setMessage] = useState("");
  const router = useRouter();

  async function handleClick() {
    setStatus("working");
    const result = await generateAgeCompilationsAction();
    if (result.error) {
      setStatus("error");
      setMessage(result.error);
      return;
    }
    setStatus("idle");
    setMessage(
      result.created === 0 && result.skipped === 0
        ? "No ages found yet (step W2) to generate from."
        : `Created ${result.created}, skipped ${result.skipped} (already had a compilation).`
    );
    if (result.created > 0) router.refresh();
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={status === "working"}
        className="rounded border px-3 py-1.5 text-xs text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-50"
      >
        {status === "working" ? "Generating..." : "Generate one per age"}
      </button>
      {message && <span className={`text-xs ${status === "error" ? "text-destructive" : "text-muted-foreground"}`}>{message}</span>}
    </div>
  );
}
