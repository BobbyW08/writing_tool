"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { revertHistoryRowAction } from "@/lib/continuity/actions";
import { entityHref } from "@/lib/continuity/links";

export interface WritingHistoryRowView {
  id: number;
  entryCollection: string;
  entryId: number;
  entryName: string;
  entrySlug: string;
  fieldLabel: string;
  action: string;
  oldValue: string | null;
  newValue: string | null;
  createdAt: string | Date;
}

const ACTION_LABEL: Record<string, string> = {
  created: "created this record",
  added: "added to",
  updated: "updated",
  both_true: "noted both are true for",
  changed_over_time: "noted a change over time for",
  undone: "undone on",
  reverted: "reverted on",
};

function Row({ row }: { row: WritingHistoryRowView }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const revert = () =>
    startTransition(async () => {
      const result = await revertHistoryRowAction(row.id);
      if (result.ok) {
        toast.success("Reverted.");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });

  const label = ACTION_LABEL[row.action] ?? row.action;
  const href = row.entrySlug ? entityHref(row.entryCollection, row.entrySlug) : null;

  return (
    <li className="rounded-md border px-3 py-2 text-sm">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span>
          {label} {href ? <Link href={href} className="font-medium hover:underline">{row.entryName}</Link> : row.entryName}
          {row.action !== "created" && <span className="text-muted-foreground"> &mdash; {row.fieldLabel}</span>}
        </span>
        {row.action === "added" && (
          <Button type="button" size="sm" variant="ghost" disabled={pending} onClick={revert}>
            Revert
          </Button>
        )}
      </div>
    </li>
  );
}

// "Leaving Canon" (step S7): every change this piece of writing caused, with a one click revert
// for an appended detail. Shown whenever this piece has caused anything, and labeled as a Canon
// concern specifically when the piece is not (or no longer) Canon.
export function WritingHistoryPanel({
  canonState,
  history,
}: {
  canonState: string;
  history: WritingHistoryRowView[];
}) {
  if (history.length === 0) return null;

  return (
    <div className="space-y-2 rounded-md border p-4 text-sm">
      <div className="font-medium">
        {canonState === "canon" ? "Changes this piece caused" : "Changes this piece caused while it was checked"}
      </div>
      {canonState !== "canon" && (
        <p className="text-xs text-muted-foreground">
          This piece is not Canon. Anything it caused is still sitting in those records; revert
          what you do not want to keep.
        </p>
      )}
      <ul className="space-y-1.5">
        {history.map((row) => <Row key={row.id} row={row} />)}
      </ul>
    </div>
  );
}
