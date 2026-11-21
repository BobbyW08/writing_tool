"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { revertStaleClaimAction } from "@/lib/continuity/actions";

export function RevertStaleClaimButton({ flagCode }: { flagCode: string }) {
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
          const result = await revertStaleClaimAction(flagCode);
          if (result.ok) {
            toast.success("Field reverted to its earlier wording.");
            router.refresh();
          } else {
            toast.error(result.error);
          }
        })
      }
    >
      Revert
    </Button>
  );
}
