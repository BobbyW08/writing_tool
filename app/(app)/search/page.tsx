import Link from "next/link";
import { redirect } from "next/navigation";
import { searchAcrossAll } from "@/lib/world/queries";
import { CODE_PREFIX_CHARS } from "@/lib/codes";

const CODE_ONLY_RE = new RegExp(`^[${CODE_PREFIX_CHARS}]\\d{1,6}$`, "i");

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const query = (q ?? "").trim();

  if (!query) {
    return (
      <div className="max-w-2xl">
        <h1 className="text-2xl font-semibold">Search</h1>
        <p className="mt-2 text-sm text-muted-foreground">Type a name, alias, or code in the sidebar search box.</p>
      </div>
    );
  }

  const results = await searchAcrossAll(query);

  // An exact code with exactly one match jumps straight to the record, same as the old
  // sidebar-only lookup behavior for a code hit.
  if (CODE_ONLY_RE.test(query) && results.length === 1 && results[0].code === query.toUpperCase()) {
    redirect(`/${results[0].collection}/${results[0].code}`);
  }

  return (
    <div className="max-w-2xl space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Search</h1>
        <p className="text-sm text-muted-foreground">
          {results.length} result{results.length === 1 ? "" : "s"} for &ldquo;{query}&rdquo;
        </p>
      </div>

      {results.length === 0 ? (
        <p className="text-sm text-muted-foreground">No matches by name, alias, or code.</p>
      ) : (
        <ul className="divide-y rounded-md border">
          {results.map((r) => (
            <li key={`${r.collection}-${r.code}`}>
              <Link href={`/${r.collection}/${r.code}`} className="flex items-center gap-2 p-2.5 hover:bg-accent">
                <span className="font-mono text-xs text-muted-foreground">{r.code}</span>
                <span className="text-sm">{r.name}</span>
                {r.status !== "locked" && (
                  <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] text-amber-800">{r.status.replace("_", " ")}</span>
                )}
                <span className="ml-auto text-xs capitalize text-muted-foreground">{r.collection.replace("-", " ")}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
