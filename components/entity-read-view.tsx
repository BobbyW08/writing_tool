import { WikiText } from "@/components/wiki-text";
import type { WikiResolveMaps } from "@/lib/wiki-resolve";

export function EntityReadView({
  fields,
  gapPrompt,
  sourceDocId,
  maps,
}: {
  fields: Record<string, string>;
  gapPrompt: string | null;
  sourceDocId: string | null;
  maps: WikiResolveMaps;
}) {
  const entries = Object.entries(fields);

  return (
    <div className="space-y-4">
      <div>
        <div className="text-sm font-medium text-muted-foreground">Gap prompt</div>
        <div className="text-sm">{gapPrompt || <span className="text-muted-foreground italic">(blank)</span>}</div>
      </div>
      {entries.length === 0 ? (
        <p className="text-sm text-muted-foreground">No fields yet.</p>
      ) : (
        entries.map(([key, value]) => (
          <div key={key}>
            <div className="text-sm font-medium text-muted-foreground">{key}</div>
            <div className="text-sm">
              <WikiText text={value} maps={maps} />
            </div>
          </div>
        ))
      )}
      <div>
        <div className="text-sm font-medium text-muted-foreground">Source doc</div>
        <div className="text-sm text-muted-foreground">{sourceDocId || <span className="italic">(created in-app)</span>}</div>
      </div>
    </div>
  );
}
