"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export interface CheckSummary {
  decisions: number;
  newRecords: number;
  newDetails: number;
  confirmed: number;
}

// Shows where the check is. While it runs the page refreshes itself, and when it finishes
// Bobby gets a notification that links straight to anything waiting on a decision.
export function SnippetCheckStatus({
  status,
  summary,
  error,
  notes,
  recheckAction,
}: {
  status: string;
  summary: CheckSummary;
  error: string | null;
  notes: string | null;
  recheckAction: () => Promise<void>;
}) {
  const router = useRouter();
  const previous = useRef(status);

  useEffect(() => {
    if (status !== "checking") return;
    const timer = setInterval(() => router.refresh(), 3000);
    return () => clearInterval(timer);
  }, [status, router]);

  useEffect(() => {
    if (previous.current === "checking" && status === "checked") {
      if (summary.decisions > 0) {
        toast(`${summary.decisions} ${summary.decisions === 1 ? "item needs" : "items need"} your decision`, {
          action: { label: "Review", onClick: () => router.push("/continuity") },
          duration: 15000,
        });
      } else {
        toast.success("Checked against canon. Nothing needs your decision.");
      }
    } else if (previous.current === "checking" && status === "failed") {
      toast.error("The continuity check could not finish.");
    }
    previous.current = status;
  }, [status, summary.decisions, router]);

  if (status === "checking") {
    return (
      <div className="rounded-md border border-amber-500/50 bg-amber-50 p-4 text-sm dark:bg-amber-500/10">
        <div className="font-medium">Checking against canon...</div>
        <p className="mt-1 text-muted-foreground">You can leave this page. Anything that needs a decision will show up under Continuity in the sidebar.</p>
      </div>
    );
  }

  if (status === "failed") {
    return (
      <div className="space-y-2 rounded-md border border-red-500/60 bg-red-50 p-4 text-sm dark:bg-red-500/10">
        <div className="font-medium">The check could not finish</div>
        <p className="break-words text-muted-foreground">{error ?? "Unknown error."}</p>
        <form action={recheckAction}>
          <Button type="submit" size="sm" variant="outline">
            Try again
          </Button>
        </form>
      </div>
    );
  }

  if (status === "unchecked") {
    return (
      <div className="flex items-center justify-between gap-4 rounded-md border p-4 text-sm">
        <span className="text-muted-foreground">This snippet has not been checked against canon yet.</span>
        <form action={recheckAction}>
          <Button type="submit" size="sm">
            Check against canon
          </Button>
        </form>
      </div>
    );
  }

  const parts = [
    summary.decisions > 0 ? `${summary.decisions} waiting for your decision` : "nothing waiting for a decision",
    `${summary.newRecords} new ${summary.newRecords === 1 ? "record" : "records"}`,
    `${summary.newDetails} new ${summary.newDetails === 1 ? "detail" : "details"}`,
    `${summary.confirmed} confirmed`,
  ];
  return (
    <div className="space-y-2 rounded-md border p-4 text-sm">
      <div className="flex items-center justify-between gap-4">
        <div className="font-medium">Checked: {parts.join(", ")}</div>
        <form action={recheckAction}>
          <Button type="submit" size="sm" variant="outline">
            Check again
          </Button>
        </form>
      </div>
      {notes && <p className="text-muted-foreground">{notes}</p>}
    </div>
  );
}
