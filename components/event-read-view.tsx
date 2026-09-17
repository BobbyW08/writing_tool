import { WikiText } from "@/components/wiki-text";
import type { WikiResolveMaps } from "@/lib/wiki-resolve";

function Field({ label, value, maps }: { label: string; value: string | null; maps: WikiResolveMaps }) {
  return (
    <div>
      <div className="text-sm font-medium text-muted-foreground">{label}</div>
      <div className="text-sm">
        {value ? <WikiText text={value} maps={maps} /> : <span className="text-muted-foreground italic">(blank)</span>}
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
  sourceDocId,
  maps,
}: {
  whatHappened: string | null;
  whyItHappened: string | null;
  whatItCaused: string | null;
  whatWasLearned: string | null;
  draftText: string | null;
  sourceDocId: string | null;
  maps: WikiResolveMaps;
}) {
  return (
    <div className="space-y-4">
      <Field label="What happened" value={whatHappened} maps={maps} />
      <Field label="Why it happened" value={whyItHappened} maps={maps} />
      <Field label="What it caused" value={whatItCaused} maps={maps} />
      <Field label="What was learned" value={whatWasLearned} maps={maps} />
      <Field label="Draft / notes" value={draftText} maps={maps} />
      <div>
        <div className="text-sm font-medium text-muted-foreground">Source doc</div>
        <div className="text-sm text-muted-foreground">{sourceDocId || <span className="italic">(created in-app)</span>}</div>
      </div>
    </div>
  );
}
