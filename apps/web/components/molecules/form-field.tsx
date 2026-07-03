import type { ReactNode } from "react";
import { Label } from "../atoms/label";

export interface FormFieldProps {
  readonly children: ReactNode;
  readonly htmlFor: string;
  readonly label: string;
}

export function FormField({ children, htmlFor, label }: FormFieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  );
}
