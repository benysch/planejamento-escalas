"use client";

import { useState } from "react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";

import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

type Props = {
  value: string; // ISO YYYY-MM-DD
  onChange: (date: string) => void;
  min?: string;
  className?: string;
};

export function DatePickerInput({ value, onChange, min, className }: Props) {
  const [open, setOpen] = useState(false);

  const selected = value ? parseISO(value) : undefined;
  const minDate = min ? parseISO(min) : undefined;

  const label = selected
    ? format(selected, "dd/MM/yyyy", { locale: ptBR })
    : "Selecionar";

  return (
    <Popover open={open} onOpenChange={(o) => setOpen(o)}>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            className={cn(
              "w-full justify-start text-left font-normal",
              !value && "text-muted-foreground",
              className,
            )}
          />
        }
      >
        <CalendarIcon className="mr-2 size-4 shrink-0" />
        {label}
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selected}
          onSelect={(date) => {
            if (date) {
              onChange(format(date, "yyyy-MM-dd"));
              setOpen(false);
            }
          }}
          disabled={minDate ? [{ before: minDate }] : undefined}
          defaultMonth={selected ?? minDate}
        />
      </PopoverContent>
    </Popover>
  );
}
