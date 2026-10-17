import { countOpenDecisions } from "@/lib/data/continuity";

// Count of conflicts waiting on a decision.
export async function ContinuityBadge() {
  const count = await countOpenDecisions();
  if (count === 0) return null;
  return (
    <span className="ml-2 inline-flex min-w-5 items-center justify-center rounded-full bg-red-600 px-1.5 text-xs font-semibold text-white" aria-label={`${count} waiting for a decision`}>
      {count}
    </span>
  );
}
