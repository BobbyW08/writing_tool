"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Pencil, Eye } from "lucide-react";

export function ViewEditToggle({ view, edit }: { view: React.ReactNode; edit: React.ReactNode }) {
  const [editing, setEditing] = useState(false);

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Button type="button" variant="outline" size="sm" onClick={() => setEditing((e) => !e)}>
          {editing ? (
            <>
              <Eye className="size-4" /> View
            </>
          ) : (
            <>
              <Pencil className="size-4" /> Edit
            </>
          )}
        </Button>
      </div>
      {editing ? edit : view}
    </div>
  );
}
