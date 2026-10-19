import Link from "next/link";
import { notFound } from "next/navigation";
import { entityTypeByUrlSlug } from "@/lib/data/entity-types";
import { listEntitiesByType } from "@/lib/data/entities";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default async function EntityTypeIndexPage({ params }: { params: Promise<{ entityType: string }> }) {
  const { entityType } = await params;
  const typeConfig = entityTypeByUrlSlug(entityType);
  if (!typeConfig) notFound();

  const rows = await listEntitiesByType(typeConfig.dbType);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{typeConfig.pluralLabel}</h1>
        <Button asChild size="sm">
          <Link href={`/${typeConfig.urlSlug}/new`}>
            <Plus className="size-4" /> Add {typeConfig.label.toLowerCase()}
          </Link>
        </Button>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No {typeConfig.pluralLabel.toLowerCase()} yet.</p>
      ) : (
        <div className="divide-y rounded-md border">
          {rows.map((e) => (
            <Link key={e.id} href={`/${typeConfig.urlSlug}/${e.slug}`} className="flex items-center justify-between gap-4 p-3 hover:bg-accent">
              <span className="font-medium">{e.name}</span>
              <StatusBadge status={e.status} />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
