"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { ArrowRightLeft } from "lucide-react";

export function ConvertToEventButton({ action, itemLabel }: { action: (formData: FormData) => void | Promise<void>; itemLabel: string }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          <ArrowRightLeft className="size-4" /> Convert to event
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Convert &quot;{itemLabel}&quot; to an event?</AlertDialogTitle>
          <AlertDialogDescription>
            Creates a new event with this entity&apos;s fields folded into its notes, then deletes this entity. Relationships and event
            links pointing at it are removed — they can&apos;t carry over. This can&apos;t be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <form action={action}>
            <AlertDialogAction type="submit">Convert</AlertDialogAction>
          </form>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
