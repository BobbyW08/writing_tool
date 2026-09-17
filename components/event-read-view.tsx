import { WikiText } from "@/components/wiki-text";
import type { WikiResolveMaps } from "@/lib/wiki-resolve";

function Field({ label, value, maps }: { label: string; value: string | null; maps: WikiResolveMaps }) {
  if (!value) return null;
  return (
    <div>
      <div className="text-sm font-medium text-muted-foreground">{label}</div>
      <div className="text-sm">
        <WikiText text={value} maps={maps} />
      </div>
    </div>
  );
}

export function EventReadView({
  whatHappened,
  whyItHappened,
  whatItCaused,
  whatWasLearned,
  draftText,
  maps,
}: {
  whatHappened: string | null;
  whyItHappened: string | null;
  whatItCaused: string | null;
  whatWasLearned: string | null;
  draftText: string | null;
  maps: WikiResolveMaps;
}) {
  const hasAny = whatHappened || whyItHappened || whatItCaused || whatWasLearned || draftText;
  return (
    <div className="space-y-4">
      {!hasAny && <p className="text-sm text-muted-foreground">No details yet.</p>}
      <Field label="What happened" value={whatHappened} maps={maps} />
      <Field label="Why it happened" value={whyItHappened} maps={maps} />
      <Field label="What it caused" value={whatItCaused} maps={maps} />
      <Field label="What was learned" value={whatWasLearned} maps={maps} />
      <Field label="Draft / notes" value={draftText} maps={maps} />
    </div>
  );
}
