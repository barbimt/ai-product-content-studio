"use client";

import type { Ref } from "react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toneValues, type Tone } from "@/lib/validation/product-description";

type ToneSelectProps = {
  id: string;
  name: string;
  value: Tone | null;
  onValueChange: (value: Tone | null) => void;
  onBlur?: () => void;
  inputRef?: Ref<HTMLInputElement>;
  "aria-describedby"?: string;
  "aria-invalid"?: true;
};

export function ToneSelect({
  id,
  name,
  value,
  onValueChange,
  onBlur,
  inputRef,
  "aria-describedby": describedBy,
  "aria-invalid": invalid,
}: ToneSelectProps) {
  return (
    <Select
      name={name}
      value={value}
      onValueChange={onValueChange}
      inputRef={inputRef}
    >
      <SelectTrigger
        id={id}
        onBlur={onBlur}
        aria-describedby={describedBy}
        aria-invalid={invalid}
        className="w-full"
      >
        <SelectValue placeholder="Select a tone" />
      </SelectTrigger>
      <SelectContent>
        {toneValues.map((tone) => (
          <SelectItem key={tone} value={tone}>
            {tone}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
