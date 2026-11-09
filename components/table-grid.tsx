"use client";

import { useMemo, useState, useRef } from "react";
import {
  useReactTable, getCoreRowModel, flexRender, createColumnHelper,
} from "@tanstack/react-table";
import Papa from "papaparse";
import { updateFieldAction } from "@/lib/world/actions";
import { slugify } from "@/lib/codes";
import type { TableColumn, TableColumnType, TableRow } from "@/lib/world/queries";

const TYPE_OPTIONS: { value: TableColumnType; label: string }[] = [
  { value: "text", label: "Text" },
  { value: "number", label: "Number" },
  { value: "date", label: "Date" },
  { value: "link", label: "Link (code)" },
  { value: "tag", label: "Tag" },
];

function uniqueKey(label: string, existing: string[]): string {
  const base = slugify(label) || "column";
  let key = base;
  let i = 2;
  while (existing.includes(key)) { key = `${base}-${i}`; i++; }
  return key;
}

// Module scope, not component scope: a fresh columnHelper identity on every render would bust the
// colDefs useMemo below on every keystroke (not just on column changes), remounting the cell
// inputs mid-type and dropping all but the first typed character.
const columnHelper = createColumnHelper<TableRow>();

export function TableGrid({ tableId, initialColumns, initialRows }: {
  tableId: number; initialColumns: TableColumn[]; initialRows: TableRow[];
}) {
  const [columns, setColumns] = useState<TableColumn[]>(initialColumns);
  const [rows, setRows] = useState<TableRow[]>(initialRows);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newColLabel, setNewColLabel] = useState("");
  const [newColType, setNewColType] = useState<TableColumnType>("text");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const colDefs = useMemo(() => columns.map(col => columnHelper.accessor(row => row[col.key] ?? "", {
    id: col.key,
    header: col.label,
    cell: ({ row }) => {
      const value = row.original[col.key] ?? "";
      const type = col.type === "number" ? "number" : col.type === "date" ? "date" : "text";
      return (
        <input
          type={type}
          value={value}
          placeholder={col.type === "link" ? "Code, e.g. C1" : ""}
          onChange={(e) => {
            const v = e.target.value;
            setRows(prev => prev.map((r, i) => (i === row.index ? { ...r, [col.key]: v } : r)));
            setDirty(true);
          }}
          className="w-full rounded border bg-background px-1.5 py-1 text-sm"
        />
      );
    },
  })), [columns, columnHelper]);

  const table = useReactTable({ data: rows, columns: colDefs, getCoreRowModel: getCoreRowModel() });

  function addColumn() {
    if (!newColLabel.trim()) return;
    const key = uniqueKey(newColLabel.trim(), columns.map(c => c.key));
    setColumns(prev => [...prev, { key, label: newColLabel.trim(), type: newColType, width: null }]);
    setNewColLabel("");
    setDirty(true);
  }

  function removeColumn(key: string) {
    setColumns(prev => prev.filter(c => c.key !== key));
    setRows(prev => prev.map(r => { const next = { ...r }; delete next[key]; return next; }));
    setDirty(true);
  }

  function renameColumn(key: string, label: string) {
    setColumns(prev => prev.map(c => (c.key === key ? { ...c, label } : c)));
    setDirty(true);
  }

  function changeColumnType(key: string, type: TableColumnType) {
    setColumns(prev => prev.map(c => (c.key === key ? { ...c, type } : c)));
    setDirty(true);
  }

  function addRow() {
    setRows(prev => [...prev, Object.fromEntries(columns.map(c => [c.key, ""]))]);
    setDirty(true);
  }

  function removeRow(index: number) {
    setRows(prev => prev.filter((_, i) => i !== index));
    setDirty(true);
  }

  async function handleSave() {
    setSaving(true);
    await Promise.all([
      updateFieldAction("tables", tableId, "columns", columns),
      updateFieldAction("tables", tableId, "rows", rows),
    ]);
    setSaving(false);
    setDirty(false);
  }

  function exportCsv() {
    const csv = Papa.unparse({
      fields: columns.map(c => c.label),
      data: rows.map(r => columns.map(c => r[c.key] ?? "")),
    });
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "table.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleImportClick() {
    fileInputRef.current?.click();
  }

  function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? "");
      const parsed = Papa.parse<Record<string, string>>(text, { header: true, skipEmptyLines: true });
      const headers = parsed.meta.fields ?? [];
      let cols = columns;
      if (cols.length === 0) {
        cols = headers.map(h => ({ key: uniqueKey(h, []), label: h, type: "text" as TableColumnType, width: null }));
        setColumns(cols);
      }
      const headerToKey = new Map(cols.map(c => [c.label.toLowerCase(), c.key]));
      const importedRows: TableRow[] = parsed.data.map(record => {
        const row: TableRow = {};
        for (const [header, value] of Object.entries(record)) {
          const key = headerToKey.get(header.toLowerCase());
          if (key) row[key] = value ?? "";
        }
        return row;
      });
      setRows(importedRows);
      setDirty(true);
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-2 rounded-md border p-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground">New column</label>
          <div className="flex gap-1">
            <input
              value={newColLabel}
              onChange={(e) => setNewColLabel(e.target.value)}
              placeholder="Label"
              className="w-40 rounded border bg-background px-2 py-1 text-sm"
              onKeyDown={(e) => { if (e.key === "Enter") addColumn(); }}
            />
            <select value={newColType} onChange={(e) => setNewColType(e.target.value as TableColumnType)} className="rounded border bg-background px-2 py-1 text-sm">
              {TYPE_OPTIONS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            <button type="button" onClick={addColumn} disabled={!newColLabel.trim()} className="rounded border px-2 py-1 text-xs hover:bg-accent disabled:opacity-50">
              Add column
            </button>
          </div>
        </div>
        <div className="ml-auto flex gap-2">
          <button type="button" onClick={handleImportClick} className="h-8 rounded-md border px-3 text-xs hover:bg-accent">Import CSV</button>
          <input ref={fileInputRef} type="file" accept=".csv" onChange={handleImportFile} className="hidden" />
          <button type="button" onClick={exportCsv} disabled={columns.length === 0} className="h-8 rounded-md border px-3 text-xs hover:bg-accent disabled:opacity-50">Export CSV</button>
          <button type="button" onClick={handleSave} disabled={!dirty || saving} className="h-8 rounded-md bg-primary px-3 text-xs text-primary-foreground disabled:opacity-50">
            {saving ? "Saving…" : "Save table"}
          </button>
        </div>
      </div>

      {columns.length === 0 ? (
        <p className="text-sm text-muted-foreground">No columns yet. Add one above, or import a CSV.</p>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                {table.getHeaderGroups()[0].headers.map(header => {
                  const col = columns.find(c => c.key === header.id)!;
                  return (
                    <th key={header.id} className="p-1.5 text-left align-top">
                      <input
                        value={col.label}
                        onChange={(e) => renameColumn(col.key, e.target.value)}
                        className="mb-1 w-full rounded border bg-background px-1.5 py-0.5 text-xs font-semibold"
                      />
                      <div className="flex items-center gap-1">
                        <select value={col.type} onChange={(e) => changeColumnType(col.key, e.target.value as TableColumnType)} className="rounded border bg-background px-1 py-0.5 text-xs">
                          {TYPE_OPTIONS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                        </select>
                        <button type="button" onClick={() => removeColumn(col.key)} className="text-xs text-muted-foreground hover:text-destructive">×</button>
                      </div>
                    </th>
                  );
                })}
                <th className="w-8"></th>
              </tr>
            </thead>
            <tbody>
              {table.getRowModel().rows.map(row => (
                <tr key={row.id} className="border-b last:border-0">
                  {row.getVisibleCells().map(cell => (
                    <td key={cell.id} className="p-1">{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
                  ))}
                  <td className="p-1 text-center">
                    <button type="button" onClick={() => removeRow(row.index)} className="text-xs text-muted-foreground hover:text-destructive">×</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <button type="button" onClick={addRow} className="w-full border-t p-1.5 text-xs text-muted-foreground hover:bg-accent">+ Add row</button>
        </div>
      )}
    </div>
  );
}
