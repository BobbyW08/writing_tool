"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { resolveFlagAction } from "@/lib/actions/continuity";
import type { ResolutionChoice } from "@/lib/continuity/constants";

interface Option {
  value: ResolutionChoice;
  title: string;
  help: string;
}

const KEEP: Option = { value: "keep_canon", title: "Keep canon", help: "The snippet is wrong. Canon stays as it is and this line is marked for revision on the snippet." };
const UPDATE: Option = { value: "update_canon", title: "Update canon", help: "The snippet is right. Edit the field below and it becomes the official text. The old text stays in the entry's history." };
const BOTH: Option = { value: "both_true", title: "Both are true", help: "Each holds in its own circumstances (a disguise, a lie a character tells, an unreliable narrator). Say what makes the snippet's version true." };
const CHANGED: Option = { value: "changed_over_time", title: "It changed over time", help: "Canon was true earlier and this is intentional development. Say when the change happens." };
const LATER: Option = { value: "decide_later", title: "Decide later", help: "Adds this to the entry's gap prompt so it shows up as unresolved." };

export function ContinuityReviewForm({
  flagId,
  kind,
  prefilledFieldText,
  defaultContext,
  fieldLabel,
}: {
  flagId: string;
  kind: string;
  prefilledFieldText: string;
  defaultContext: string;
  fieldLabel: string;
}) {
  const router = useRouter();
  const options = kind === "possible_change" ? [CHANGED, UPDATE, KEEP, BOTH, LATER] : [KEEP, UPDATE, BOTH, LATER];
  const [choice, setChoice] = useState<ResolutionChoice>(options[0].value);
  const [reason, setReason] = useState("");
  const [context, setContext] = useState(defaultContext);
  const [fieldText, setFieldText] = useState(prefilledFieldText);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    setError(null);
    startTransition(async () => {
      const result = await resolveFlagAction(flagId, {
        choice,
        reason,
        context: choice === "both_true" || choice === "changed_over_time" ? context : undefined,
        newFieldText: choice === "update_canon" ? fieldText : undefined,
      });
      if (result.ok) {
        toast.success("Decision recorded and made official.");
        router.push("/continuity");
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <div className="space-y-5">
      <fieldset className="space-y-2">
        <legend className="mb-2 text-sm font-semibold">Your decision</legend>
        {options.map((o) => (
          <label key={o.value} className={`flex cursor-pointer gap-3 rounded-md border p-3 text-sm ${choice === o.value ? "border-foreground" : ""}`}>
            <input type="radio" name="choice" className="mt-1" checked={choice === o.value} onChange={() => setChoice(o.value)} />
            <span>
              <span className="font-medium">{o.title}</span>
              <span className="block text-muted-foreground">{o.help}</span>
            </span>
          </label>
        ))}
      </fieldset>

      {choice === "update_canon" && (
        <div className="space-y-2">
          <Label htmlFor="fieldText">Official text for &ldquo;{fieldLabel}&rdquo;</Label>
          <Textarea id="fieldText" value={fieldText} onChange={(e) => setFieldText(e.target.value)} rows={8} />
          <p className="text-xs text-muted-foreground">Pre-filled by swapping the disputed words for the snippet&apos;s words. Change anything you like before confirming.</p>
        </div>
      )}

      {(choice === "both_true" || choice === "changed_over_time") && (
        <div className="space-y-2">
          <Label htmlFor="context">{choice === "changed_over_time" ? "When does it change?" : "What makes the snippet's version true?"}</Label>
          <Input id="context" value={context} onChange={(e) => setContext(e.target.value)} placeholder={choice === "changed_over_time" ? "e.g. after the invasion" : "e.g. while disguised as a merchant"} maxLength={200} />
          <p className="text-xs text-muted-foreground">Saved on the entry as its own field, &ldquo;{fieldLabel} ({context || "..."})&rdquo;, next to the original.</p>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="reason">Reason (optional)</Label>
        <Input id="reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="One line, for the decision log" maxLength={500} />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <Button type="button" onClick={submit} disabled={pending}>
        {pending ? "Saving..." : "Record decision"}
      </Button>
    </div>
  );
}
