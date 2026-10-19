import Link from "next/link";
import { notFound } from "next/navigation";
import { entityTypeByUrlSlug } from "@/lib/data/entity-types";
import { createEntityAction } from "@/lib/actions/entities";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { StatusSelect } from "@/components/status-select";
import { EntityFieldsEditor } from "@/components/entity-fields-editor";

export default async function NewEntityPage({ params }: { params: Promise<{ entityType: string }> }) {
  const { entityType } = await params;
  const typeConfig = entityTypeByUrlSlug(entityType);
  if (!typeConfig) notFound();

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <Link href={`/${typeConfig.urlSlug}`} className="text-sm text-muted-foreground hover:underline">
          ← {typeConfig.pluralLabel}
        </Link>
        <h1 className="mt-1 text-2xl font-semibold">New {typeConfig.label.toLowerCase()}</h1>
      </div>

      <form action={createEntityAction.bind(null, typeConfig.urlSlug)} className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input id="name" name="name" required autoFocus />
        </div>

        <div className="space-y-2">
          <Label>Status</Label>
          <StatusSelect name="status" defaultValue="in_development" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="gapPrompt">Gap prompt</Label>
          <Textarea id="gapPrompt" name="gapPrompt" rows={2} placeholder="What needs deciding about this entity?" />
        </div>

        <div className="space-y-2">
          <Label>Fields</Label>
          <EntityFieldsEditor initialFields={{}} />
        </div>

        <Button type="submit">Create {typeConfig.label.toLowerCase()}</Button>
      </form>
    </div>
  );
}
