import type { ReactNode } from "react";

import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type FieldControlProps = {
  id: string;
  "aria-describedby"?: string;
  "aria-invalid"?: true;
};

type ProductFormFieldProps = {
  label: string;
  fieldId: string;
  description?: string;
  error?: string;
  required?: boolean;
  children: (control: FieldControlProps) => ReactNode;
};

export function ProductFormField({
  label,
  fieldId,
  description,
  error,
  required,
  children,
}: ProductFormFieldProps) {
  const descriptionId = description ? `${fieldId}-description` : undefined;
  const errorId = error ? `${fieldId}-error` : undefined;
  const describedBy =
    [descriptionId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className="space-y-1.5">
      <Label htmlFor={fieldId}>
        {label}
        {required ? (
          <span aria-hidden className="text-muted-foreground">
            *
          </span>
        ) : null}
      </Label>

      {description ? (
        <p id={descriptionId} className="text-xs text-muted-foreground">
          {description}
        </p>
      ) : null}

      {children({
        id: fieldId,
        "aria-describedby": describedBy,
        "aria-invalid": error ? true : undefined,
      })}

      {error ? (
        <p id={errorId} className={cn("text-xs text-destructive")}>
          {error}
        </p>
      ) : null}
    </div>
  );
}
