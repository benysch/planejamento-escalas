"use client";

import { CORES_PARES } from "@/lib/cores";
import { cn } from "@/lib/utils";

type Props = { value: string; onChange: (cor: string) => void };

export function ColorPicker({ value, onChange }: Props) {
  return (
    <div className="grid grid-cols-10 gap-1.5">
      {CORES_PARES.map(({ vivid }) => (
        <button
          key={vivid}
          type="button"
          onClick={() => onChange(vivid)}
          className={cn(
            "size-6 rounded-full border-2 transition-transform hover:scale-110",
            value === vivid ? "border-foreground scale-110" : "border-transparent",
          )}
          style={{ backgroundColor: vivid }}
        />
      ))}
      {CORES_PARES.map(({ pastel }) => (
        <button
          key={pastel}
          type="button"
          onClick={() => onChange(pastel)}
          className={cn(
            "size-6 rounded-full border-2 transition-transform hover:scale-110",
            value === pastel ? "border-foreground scale-110" : "border-transparent",
          )}
          style={{ backgroundColor: pastel }}
        />
      ))}
    </div>
  );
}
