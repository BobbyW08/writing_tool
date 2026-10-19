import Link from "next/link";
import { createSnippetAction } from "@/lib/actions/snippets";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

// The check runs after the save response, so give it room to finish.
export const maxDuration = 300;

export default function NewSnippetPage() {
  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <Link href="/snippets" className="text-sm text-muted-foreground hover:underline">
          ← Snippets
        </Link>
        <h1 className="mt-1 text-2xl font-semibold">New snippet</h1>
      </div>

      <form action={createSnippetAction} className="space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="title">Title</Label>
            <Input id="title" name="title" required autoFocus />
          </div>
          <div className="space-y-2">
            <Label htmlFor="label">Chapter or part</Label>
            <Input id="label" name="label" placeholder="e.g. Chapter 3" />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="sortOrder">Timeline position (optional)</Label>
          <Input id="sortOrder" name="sortOrder" type="number" step="any" placeholder="e.g. 820" className="max-w-40" />
          <p className="text-xs text-muted-foreground">Same scale as the timeline (Sero years). With it, a later scene that differs from canon is treated as possible development instead of a conflict.</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="body">Writing</Label>
          <Textarea id="body" name="body" required rows={20} className="font-serif text-base leading-relaxed" />
        </div>

        <Button type="submit">Save and check against canon</Button>
      </form>
    </div>
  );
}
