import { clsx } from "clsx";
import type { TextareaHTMLAttributes } from "react";

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;

export function Textarea({
  className,
  ...props
}: TextareaProps) {
  return (
    <textarea
      className={clsx(
        "glass-input min-h-[96px] w-full resize-y py-2.5 text-sm",
        className,
      )}
      {...props}
    />
  );
}

