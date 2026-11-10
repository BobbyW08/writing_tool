import Link from "next/link";
import { notFound } from "next/navigation";
import { getCompilationByCode } from "@/lib/world/queries";
import { EditableField } from "@/components/editable-field";
import { RecordActions } from "@/components/record-actions";
import { CompilationItemsEditor } from "@/components/compilation-items-editor";

const KIND_OPTIONS = [
  { label: "Age", value: "age" },
  { label: "Chapter", value: "chapter" },
  { label: "Custom", value: "custom" },
];

export default async function CompilationPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const compilation = await getCompilationByCode(code);
  if (!compilation) notFound();

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link href="/compilations" className="hover:underline">Compilations</Link>
        </div>
        <div className="mt-1 flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-semibold">
              <EditableField collection="compilations" docId={compilation.id} fieldName="name" value={compilation.name} kind="text" className="text-2xl font-semibold" />
            </h1>
            <p className="font-mono text-xs text-muted-foreground">{compilation.code}</p>
          </div>
          <RecordActions collection="compilations" id={compilation.id} code={compilation.code} name={compilation.name} status={compilation.status} />
        </div>
        <div className="mt-2 flex items-center gap-3">
          <EditableField collection="compilations" docId={compilation.id} fieldName="kind" value={compilation.kind} kind="select" options={KIND_OPTIONS} />
        </div>
        <div className="mt-2">
          <EditableField collection="compilations" docId={compilation.id} fieldName="summary" value={compilation.summary} kind="textarea" placeholder="Click to add summary" className="text-sm" />
        </div>
      </div>

      <CompilationItemsEditor compilationId={compilation.id} code={compilation.code} initial={compilation.items} />
    </div>
  );
}
