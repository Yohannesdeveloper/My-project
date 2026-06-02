import { clsx } from "clsx";
import type { LabelHTMLAttributes } from "react";

export type LabelProps = LabelHTMLAttributes<HTMLLabelElement>;

export function Label({ className, ...props }: LabelProps) {
  return (
    <label
      className={clsx(
        "block text-xs font-medium tracking-wide text-zinc-700 dark:text-zinc-300",
        className,
      )}
      {...props}
    />
  );
}

