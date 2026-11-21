"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { AiProposalCard } from "@/components/ai-proposal-card";
import { PromptsMenu } from "@/components/prompts-menu";
import { generateProposalsAction, listProposalsForCodeAction } from "@/lib/ai/actions";
import type { ProposedValue } from "@/lib/ai/types";
import type { PendingProposal } from "@/lib/ai/proposals";

// "Ask AI anywhere" (step S6): one button, scoped to this record, plus the prompts menu button.
// The same bar is used on every world-entry page and the event page.
export function AiAssistBar({
  collection,
  code,
  docId,
  currentDetails,
}: {
  collection: string;
  code: string;
  docId: number;
  currentDetails: { label: string; value: string }[];
}) {
  const [pending, startTransition] = useTransition();
  const [proposals, setProposals] = useState<PendingProposal[] | null>(null);
  const [promptsOpen, setPromptsOpen] = useState(false);

  // A plain database read, not a model call, so loading it on mount is fine under the "keep AI
  // calls few" limit: it only shows what was already generated, never triggers a new call.
  useEffect(() => {
    if (!code) return;
    listProposalsForCodeAction(code).then((result) => {
      if (result.ok && result.proposals) setProposals(result.proposals);
    });
  }, [code]);

  const askAi = () =>
    startTransition(async () => {
      const result = await generateProposalsAction(code);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      const refreshed = await listProposalsForCodeAction(code);
      if (refreshed.ok && refreshed.proposals) setProposals(refreshed.proposals);
      toast.success(result.created ? `${result.created} suggestion(s) added.` : "No suggestions this time.");
    });

  function removeProposal(id: number) {
    setProposals((prev) => (prev ? prev.filter((p) => p.id !== id) : prev));
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Button type="button" size="sm" variant="outline" disabled={pending} onClick={askAi}>
          Ask AI
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={() => setPromptsOpen(true)}>
          Prompts
        </Button>
      </div>

      {proposals && proposals.length > 0 && (
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
              onResolved={() => removeProposal(p.id)}
            />
          ))}
        </ul>
      )}

      <PromptsMenu
        open={promptsOpen}
        onOpenChange={setPromptsOpen}
        collection={collection}
        code={code}
        docId={docId}
        currentDetails={currentDetails}
      />
    </div>
  );
}
