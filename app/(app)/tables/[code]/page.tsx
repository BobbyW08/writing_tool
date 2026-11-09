import Link from "next/link";
import { notFound } from "next/navigation";
import { getTableByCode } from "@/lib/world/queries";
import { EditableField } from "@/components/editable-field";
import { DeleteRecordButton } from "@/components/delete-record-button";
import { WhatLinksHere } from "@/components/what-links-here";
import { TableGrid } from "@/components/table-grid";

export default async function TablePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const table = await getTableByCode(code);
  if (!table) notFound();

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link href="/tables" className="hover:underline">Tables</Link>
        </div>
        <h1 className="mt-1 text-2xl font-semibold">
          <EditableField collection="tables" docId={table.id} fieldName="name" value={table.name} kind="text" className="text-2xl font-semibold" />
        </h1>
        <p className="font-mono text-xs text-muted-foreground">{table.code}</p>
        <div className="mt-2">
          <EditableField collection="tables" docId={table.id} fieldName="summary" value={table.summary} kind="textarea" placeholder="Click to add summary" className="text-sm" />
        </div>
      </div>

      <TableGrid tableId={table.id} initialColumns={table.columns} initialRows={table.rows} />

      <WhatLinksHere code={table.code} />

      <div className="border-t pt-4">
        <DeleteRecordButton collection="tables" id={table.id} code={table.code} name={table.name} />
      </div>
    </div>
  );
}
