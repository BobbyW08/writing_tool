"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { undoNewDetailAction } from "@/lib/actions/continuity";

export function UndoDetailButton({ flagId }: { flagId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <Button
      type="button"
      size="sm"
      variant="ghost"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const result = await undoNewDetailAction(flagId);
          if (result.ok) {
            toast.success("Detail removed from the entry.");
            router.refresh();
          } else {
            toast.error(result.error);
          }
        })
      }
    >
      Undo
    </Button>
  );
}
