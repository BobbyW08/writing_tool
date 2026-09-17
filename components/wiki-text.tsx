import Link from "next/link";
import { resolveWikiLink, type WikiResolveMaps } from "@/lib/wiki-resolve";

// Matches [[Type#Name]] or [[Type#Name|Label]] — the exact syntax ingestion writes into
// stored fields/draft_text. Per hard rule 8, this raw syntax is never shown to the user —
// it's rendered as a real hyperlink (or, if the target no longer resolves, just its label).
const WIKI_LINK_RE = /\[\[([^\]#|]+)#([^\]|]+)(?:\|([^\]]+))?\]\]/g;

export function WikiText({ text, maps, className }: { text: string; maps: WikiResolveMaps; className?: string }) {
  const segments: React.ReactNode[] = [];
  let lastIndex = 0;
  let key = 0;
  WIKI_LINK_RE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = WIKI_LINK_RE.exec(text))) {
    if (match.index > lastIndex) segments.push(text.slice(lastIndex, match.index));
    const [, targetType, targetName, alias] = match;
    const label = (alias ?? targetName).trim();
    const resolved = resolveWikiLink(maps, targetType.trim(), targetName.trim());
    segments.push(
      resolved ? (
        <Link key={key++} href={resolved.href} className="underline decoration-muted-foreground/50 underline-offset-2 hover:decoration-foreground">
          {label}
        </Link>
      ) : (
        <span key={key++}>{label}</span>
      ),
    );
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) segments.push(text.slice(lastIndex));

  return (
    <span className={className} style={{ whiteSpace: "pre-wrap" }}>
      {segments}
    </span>
  );
}
