"use client"

import * as React from "react"
import { Check, ChevronsUpDown, X } from "lucide-react"

import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

export interface MultiSelectOption {
  value: string
  label: string
  group?: string
}

interface MultiSelectProps {
  options: MultiSelectOption[]
  selected: string[]
  onChange: (values: string[]) => void
  placeholder?: string
  className?: string
  maxBadges?: number
}

// A copy-paste shadcn-style component (Command + Popover + Badge, all already in this project),
// not a package — see CLAUDE.md's stack table ("shadcn-multi-select-component (copy-paste
// shadcn)"). Searchable, options grouped by collection, any combination selectable at once.
export function MultiSelect({
  options,
  selected,
  onChange,
  placeholder = "Select...",
  className,
  maxBadges = 3,
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false)

  const groups = React.useMemo(() => {
    const map = new Map<string, MultiSelectOption[]>()
    for (const opt of options) {
      const key = opt.group ?? ""
      const list = map.get(key) ?? []
      list.push(opt)
      map.set(key, list)
    }
    return [...map.entries()]
  }, [options])

  const labelOf = React.useMemo(() => {
    const map = new Map<string, string>()
    for (const opt of options) map.set(opt.value, opt.label)
    return map
  }, [options])

  function toggle(value: string) {
    onChange(selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value])
  }

  function remove(value: string) {
    onChange(selected.filter((v) => v !== value))
  }

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="h-auto min-h-9 w-full justify-between font-normal"
          >
            <span className="truncate text-muted-foreground">
              {selected.length === 0 ? placeholder : `${selected.length} selected`}
            </span>
            <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0" align="start">
          <Command>
            <CommandInput placeholder="Search..." />
            <CommandList>
              <CommandEmpty>No matches.</CommandEmpty>
              {groups.map(([group, groupOptions]) => (
                <CommandGroup key={group || "_"} heading={group || undefined}>
                  {groupOptions.map((opt) => (
                    <CommandItem key={opt.value} value={`${opt.label} ${opt.value}`} onSelect={() => toggle(opt.value)}>
                      <Check className={cn("mr-2 size-4", selected.includes(opt.value) ? "opacity-100" : "opacity-0")} />
                      {opt.label}
                      <span className="ml-auto font-mono text-[10px] text-muted-foreground">{opt.value}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              ))}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selected.slice(0, maxBadges).map((value) => (
            <Badge key={value} variant="secondary" className="gap-1">
              {labelOf.get(value) ?? value}
              <button type="button" onClick={() => remove(value)} className="rounded-full hover:bg-muted-foreground/20">
                <X className="size-3" />
              </button>
            </Badge>
          ))}
          {selected.length > maxBadges && (
            <Badge variant="secondary">+{selected.length - maxBadges} more</Badge>
          )}
        </div>
      )}
    </div>
  )
}
