import { WikiText } from "@/components/wiki-text";
import type { WikiResolveMaps } from "@/lib/wiki-resolve";

export function EntityReadView({
  fields,
  gapPrompt,
  maps,
}: {
  fields: Record<string, string>;
  gapPrompt: string | null;
  maps: WikiResolveMaps;
}) {
  const entries = Object.entries(fields);

  return (
    <div className="space-y-4">
      {gapPrompt && (
        <div className="rounded-md border border-amber-500/50 bg-amber-500/10 p-3 text-sm text-amber-800 dark:text-amber-300">
          <span className="font-medium">Gap: </span>
          {gapPrompt}
        </div>
      )}
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
    </div>
  );
}
