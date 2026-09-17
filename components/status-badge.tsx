import { Badge } from "@/components/ui/badge";
import { statusLabel } from "@/lib/data/entity-types";
import { cn } from "@/lib/utils";

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const isLocked = status === "locked";
  return (
    <Badge variant={isLocked ? "default" : "outline"} className={cn(!isLocked && "border-amber-500 text-amber-700 dark:text-amber-400", className)}>
      {statusLabel(status)}
    </Badge>
  );
}
