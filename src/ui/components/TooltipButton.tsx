/**
 * Host-free button whose accessible name also supplies the shared control tooltip. Referenced
 * label text avoids Obsidian's independent aria-label tooltip path and Chromium title hints.
 * The owning shell leases hover/long-press handling; this component owns no listeners or timers.
 */
import { useId, type ButtonHTMLAttributes, type ReactNode } from "react";

/** Render one non-submitting control with a stable, document-local accessible label reference. */
export function TooltipButton({ label, children, ...props }: Omit<ButtonHTMLAttributes<HTMLButtonElement>, "title" | "aria-label" | "aria-labelledby"> & {
  label: string;
  children: ReactNode;
}) {
  const labelId = useId();
  return <button {...props} type="button" aria-labelledby={labelId} data-kplex-control-tooltip>
    <span id={labelId} className="kplex-accessible-name">{label}</span>
    {children}
  </button>;
}
