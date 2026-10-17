// Shows a passage with one range marked, so the exact words in question stand out.
export function HighlightedText({
  text,
  start,
  end,
  cutBefore = false,
  cutAfter = false,
}: {
  text: string;
  start: number;
  end: number;
  cutBefore?: boolean;
  cutAfter?: boolean;
}) {
  return (
    <p className="whitespace-pre-wrap text-sm leading-relaxed">
      {cutBefore && <span className="text-muted-foreground">... </span>}
      {text.slice(0, start)}
      <mark className="rounded bg-amber-200 px-0.5 text-foreground dark:bg-amber-500/40">{text.slice(start, end)}</mark>
      {text.slice(end)}
      {cutAfter && <span className="text-muted-foreground"> ...</span>}
    </p>
  );
}
