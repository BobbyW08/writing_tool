"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { acceptProposalAction, rejectProposalAction } from "@/lib/ai/actions";
import type { ProposedValue } from "@/lib/ai/types";

function collectionHref(collection: string, code: string) {
  if (collection === "events") return `/events/${code}`;
  if (collection === "stories") return `/stories/${code}`;
  return `/${collection}/${code}`;
}

export function AiProposalCard({
  id,
  targetCollection,
  targetCode,
  model,
  proposedValue,
  contextCodes,
  onResolved,
}: {
  id: number;
  targetCollection: string | null;
  targetCode: string | null;
  model: string;
  proposedValue: ProposedValue;
  contextCodes: string[];
  onResolved?: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const accept = () =>
    startTransition(async () => {
      const result = await acceptProposalAction(id);
      if (result.ok) {
        toast.success("Added, tagged UNK and AI suggested.");
        onResolved?.();
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });

  const reject = () =>
    startTransition(async () => {
      const result = await rejectProposalAction(id);
      if (result.ok) {
        toast.success("Rejected.");
        onResolved?.();
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });

  return (
    <li className="rounded-md border px-4 py-3 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        {targetCollection && targetCode && (
          <Link href={collectionHref(targetCollection, targetCode)} className="font-medium hover:underline">
            {targetCode}
          </Link>
        )}
        <span className="text-xs text-muted-foreground">{model}</span>
      </div>
      {proposedValue.kind === "detail" && (
        <p className="mt-1">
          <span className="font-medium">{proposedValue.label}:</span> {proposedValue.value}
        </p>
      )}
      {proposedValue.kind === "field" && (
        <p className="mt-1">
          <span className="font-medium">{proposedValue.field}:</span> {proposedValue.value}
        </p>
      )}
      {proposedValue.kind === "beat" && (
        <p className="mt-1">
          <span className="font-medium">{proposedValue.name}:</span> {proposedValue.summary}
        </p>
      )}
      {contextCodes.length > 0 && (
        <p className="mt-1 text-xs text-muted-foreground">Context: {contextCodes.join(", ")}</p>
      )}
      <div className="mt-2 flex gap-2">
        <Button type="button" size="sm" disabled={pending} onClick={accept}>
          Accept
        </Button>
        <Button type="button" size="sm" variant="ghost" disabled={pending} onClick={reject}>
          Reject
        </Button>
      </div>
    </li>
  );
}
