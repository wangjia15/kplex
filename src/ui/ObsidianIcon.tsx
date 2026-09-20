import { getIcon } from "obsidian";
import { useLayoutEffect, useRef } from "react";

export function ObsidianIcon({ name, size = 16, className = "" }: {
  name: string;
  size?: number;
  className?: string;
}) {
  const hostRef = useRef<HTMLSpanElement | null>(null);

  useLayoutEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    host.replaceChildren();
    const icon = getIcon(name);
    if (!icon) return;
    icon.setAttribute("width", String(size));
    icon.setAttribute("height", String(size));
    icon.classList.add("kplex-lucide");
    host.appendChild(icon);
  }, [name, size]);

  return <span ref={hostRef} className={`kplex-icon ${className}`.trim()} aria-hidden="true" />;
}
