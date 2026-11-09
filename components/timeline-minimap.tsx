"use client";

// A plain overview strip, not a react-calendar-timeline feature. Shows the full navigable
// range as a bar with tick marks for event density, and the current viewport as a highlighted
// rectangle. Click anywhere to re-center the current view there.
export function TimelineMinimap({
  totalStart,
  totalEnd,
  visibleStart,
  visibleEnd,
  tickPositions,
  onNavigate,
}: {
  totalStart: number;
  totalEnd: number;
  visibleStart: number;
  visibleEnd: number;
  tickPositions: number[]; // ms, compressed space — one per event, for a density strip
  onNavigate: (start: number, end: number) => void;
}) {
  const span = totalEnd - totalStart;
  if (span <= 0) return null;

  const pct = (ms: number) => Math.max(0, Math.min(100, ((ms - totalStart) / span) * 100));
  const viewLeft = pct(visibleStart);
  const viewWidth = Math.max(0.5, pct(visibleEnd) - viewLeft);

  function handleClick(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const frac = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const clickedMs = totalStart + frac * span;
    const viewSpan = visibleEnd - visibleStart;
    onNavigate(clickedMs - viewSpan / 2, clickedMs + viewSpan / 2);
  }

  return (
    <div
      className="relative h-6 cursor-pointer rounded border bg-muted/30"
      onClick={handleClick}
      title="Click to jump there"
    >
      {tickPositions.map((ms, i) => (
        <div
          key={i}
          className="absolute top-1/2 h-1.5 w-px -translate-y-1/2 bg-foreground/30"
          style={{ left: `${pct(ms)}%` }}
        />
      ))}
      <div
        className="absolute top-0 h-full rounded-sm border border-primary bg-primary/20"
        style={{ left: `${viewLeft}%`, width: `${viewWidth}%` }}
      />
    </div>
  );
}
