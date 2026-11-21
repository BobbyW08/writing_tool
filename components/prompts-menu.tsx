"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  listPromptGroupsAction,
  answerPromptMyselfAction,
  generatePromptOptionsAction,
  acceptProposalAction,
  rejectProposalAction,
} from "@/lib/ai/actions";
import type { PromptGroup, PromptRow } from "@/lib/ai/prompts";

type Option = { id: number; value: string };

function PromptRowView({
  prompt,
  answer,
  collection,
  docId,
  code,
}: {
  prompt: PromptRow;
  answer: string | null;
  collection: string;
  docId: number;
  code: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [options, setOptions] = useState<Option[] | null>(null);

  const answerMyself = () =>
    startTransition(async () => {
      const result = await answerPromptMyselfAction(collection, docId, prompt.detailLabel);
      if (result.ok) {
        toast.success("Added a blank row below. Fill it in there.");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });

  const askAi = () =>
    startTransition(async () => {
      const result = await generatePromptOptionsAction(code, prompt.id);
      if (result.ok && result.options) {
        setOptions(result.options);
      } else {
        toast.error(result.error ?? "No options came back.");
      }
    });

  const useOption = (chosen: Option) =>
    startTransition(async () => {
      const accept = await acceptProposalAction(chosen.id);
      if (!accept.ok) {
        toast.error(accept.error);
        return;
      }
      const others = (options ?? []).filter((o) => o.id !== chosen.id);
      await Promise.all(others.map((o) => rejectProposalAction(o.id)));
      toast.success("Added, tagged UNK and AI suggested.");
      setOptions(null);
      router.refresh();
    });

  if (answer) {
    return (
      <li className="rounded-md border px-3 py-2">
        <p className="text-sm font-medium">{prompt.label}</p>
        <p className="text-xs text-muted-foreground">{prompt.question}</p>
        <p className="mt-1 text-sm">{answer}</p>
      </li>
    );
  }

  return (
    <li className="rounded-md border px-3 py-2">
      <p className="text-sm font-medium">{prompt.label}</p>
      <p className="text-xs text-muted-foreground">{prompt.question}</p>
      {options ? (
        <ul className="mt-2 space-y-1.5">
          {options.map((o) => (
            <li key={o.id} className="flex items-start justify-between gap-2 rounded border bg-muted/40 px-2 py-1.5 text-sm">
              <span>{o.value}</span>
              <Button type="button" size="sm" variant="secondary" disabled={pending} onClick={() => useOption(o)}>
                Use this
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <div className="mt-1.5 flex gap-2">
          <Button type="button" size="sm" variant="outline" disabled={pending} onClick={answerMyself}>
            Answer it myself
          </Button>
          <Button type="button" size="sm" variant="outline" disabled={pending} onClick={askAi}>
            Ask AI
          </Button>
        </div>
      )}
    </li>
  );
}

export function PromptsMenu({
  open,
  onOpenChange,
  collection,
  code,
  docId,
  currentDetails,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  collection: string;
  code: string;
  docId: number;
  currentDetails: { label: string; value: string }[];
}) {
  const [groups, setGroups] = useState<PromptGroup[] | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!open || groups !== null) return;
    listPromptGroupsAction(collection).then((result) => {
      if (result.ok && result.groups) setGroups(result.groups);
      else setGroups([]);
    });
  }, [open, collection, groups]);

  function answerFor(detailLabel: string): string | null {
    const row = currentDetails.find(
      (d) => d.label.trim().toLowerCase() === detailLabel.trim().toLowerCase()
    );
    return row && row.value ? row.value : null;
  }

  const query = search.trim().toLowerCase();
  const filteredGroups = (groups ?? [])
    .map((g) => ({
      group: g.group,
      prompts: query
        ? g.prompts.filter(
            (p) => p.label.toLowerCase().includes(query) || p.question.toLowerCase().includes(query)
          )
        : g.prompts,
    }))
    .filter((g) => g.prompts.length > 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Prompts</DialogTitle>
          <DialogDescription>
            Answer a prompt yourself, or ask AI for three candidate answers. Nothing is saved until
            you accept it.
          </DialogDescription>
        </DialogHeader>

        <Input
          placeholder="Search prompts"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        {groups === null ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : filteredGroups.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {groups.length === 0 ? "No prompts are set up for this type yet." : "No prompts match that search."}
          </p>
        ) : (
          <div className="space-y-4">
            {filteredGroups.map((g) => (
              <section key={g.group}>
                <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {g.group}
                </h3>
                <ul className="space-y-1.5">
                  {g.prompts.map((p) => (
                    <PromptRowView
                      key={p.id}
                      prompt={p}
                      answer={answerFor(p.detailLabel)}
                      collection={collection}
                      docId={docId}
                      code={code}
                    />
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
