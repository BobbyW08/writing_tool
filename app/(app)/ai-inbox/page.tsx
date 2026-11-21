import { listPendingProposals } from "@/lib/ai/proposals";
import { AiProposalCard } from "@/components/ai-proposal-card";
import type { ProposedValue } from "@/lib/ai/types";

export default async function AiInboxPage() {
  const proposals = await listPendingProposals();

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">AI suggestions</h1>
        <p className="text-sm text-muted-foreground">
          AI proposes, you decide. Nothing here reaches a record until you accept it, and an
          accepted suggestion is tagged UNK and AI suggested until you confirm it. Use the Ask AI
          button on a record&apos;s own page to generate suggestions for it; anything still pending
          shows up here too.
        </p>
      </div>

      {proposals.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nothing is waiting for a decision.</p>
      ) : (
        <ul className="space-y-2">
          {proposals.map((p) => (
            <AiProposalCard
              key={p.id}
              id={p.id}
              targetCollection={p.targetCollection}
              targetCode={p.targetCode}
              model={p.model}
              proposedValue={p.proposedValue as ProposedValue}
              contextCodes={p.contextCodes}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
