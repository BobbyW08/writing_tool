"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createBlankStoryAction } from "@/lib/story-builder/actions";

const START_FROM = [
  { key: "blank", label: "Blank", available: true },
  { key: "idea", label: "An idea I already logged", available: false },
  { key: "ai", label: "AI suggests seed questions", available: false },
] as const;

export function StoryBuilderNewForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);

  const create = () =>
    startTransition(async () => {
      setError(null);
      const result = await createBlankStoryAction(title);
      if (result.error || !result.code) {
        setError(result.error ?? "Could not create the story");
        return;
      }
      router.push(`/story-builder/${result.code}`);
    });

  return (
    <section className="flex flex-1 min-w-[280px] flex-col gap-3.5 rounded-lg border border-dashed p-5">
      <div className="text-lg font-semibold">New story</div>
      <label className="flex flex-col gap-1.5 text-sm text-muted-foreground">
        Title (optional, a stub is fine)
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Untitled story"
          className="rounded-md border bg-background px-3 py-2 text-sm text-foreground"
        />
      </label>
      <div className="space-y-1.5">
        <p className="text-xs text-muted-foreground">Start from</p>
        <div className="flex flex-wrap gap-2">
          {START_FROM.map((o) => (
            <span
              key={o.key}
              title={o.available ? undefined : "Not available yet"}
              className={`rounded-full px-2.5 py-1 text-xs ${
                o.available ? "bg-foreground text-background" : "bg-muted text-muted-foreground opacity-60"
              }`}
            >
              {o.label}
            </span>
          ))}
        </div>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
      <Button type="button" className="mt-auto w-fit" disabled={pending} onClick={create}>
        Create and continue
      </Button>
    </section>
  );
}
