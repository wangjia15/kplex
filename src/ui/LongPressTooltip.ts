const LONG_PRESS_MS = 450;
const TOOLTIP_LIFETIME_MS = 1800;
const MOVE_TOLERANCE_PX = 10;

type DocumentState = {
  users: number;
  cleanup: () => void;
};

const documentStates = new WeakMap<Document, DocumentState>();

function scopedButton(target: EventTarget | null): HTMLButtonElement | null {
  if (!target || typeof target !== "object" || !("closest" in target)) return null;
  const button = (target as Element).closest<HTMLButtonElement>("button");
  if (!button) return null;
  return button.closest("[data-kplex-tooltip-scope]") ? button : null;
}

function tooltipText(button: HTMLButtonElement): string {
  return button.getAttribute("aria-label")?.trim()
    || button.getAttribute("title")?.trim()
    || button.textContent?.trim()
    || "";
}

/**
 * Android has no hover tooltip. This delegated long-press guard shows the accessible label and,
 * critically, consumes the synthesized click that follows a completed long press so holding a
 * toolbar button can never trigger its action. One document-level listener is shared by all K-Plex
 * views in the same Obsidian window; portalled surfaces opt in with data-kplex-tooltip-scope.
 */
export function installKplexLongPressTooltips(doc: Document): () => void {
  const existing = documentStates.get(doc);
  if (existing) {
    existing.users += 1;
    return () => {
      const current = documentStates.get(doc);
      if (!current) return;
      current.users -= 1;
      if (current.users <= 0) {
        current.cleanup();
        documentStates.delete(doc);
      }
    };
  }

  const view = doc.defaultView ?? window;
  let pressTimer = 0;
  let hideTimer = 0;
  let suppressClickTimer = 0;
  let activeButton: HTMLButtonElement | null = null;
  let activePointerId = -1;
  let startX = 0;
  let startY = 0;
  let completedLongPress = false;
  let suppressClickFor: HTMLButtonElement | null = null;
  let tooltip: HTMLDivElement | null = null;

  const clearPressTimer = () => {
    if (!pressTimer) return;
    view.clearTimeout(pressTimer);
    pressTimer = 0;
  };

  const clearSuppressedClick = () => {
    if (suppressClickTimer) {
      view.clearTimeout(suppressClickTimer);
      suppressClickTimer = 0;
    }
    suppressClickFor = null;
  };

  const removeTooltip = () => {
    if (hideTimer) {
      view.clearTimeout(hideTimer);
      hideTimer = 0;
    }
    tooltip?.remove();
    tooltip = null;
  };

  const showTooltip = (button: HTMLButtonElement) => {
    const text = tooltipText(button);
    if (!text) return;
    removeTooltip();
    tooltip = doc.body.createDiv({ cls: "kplex-long-press-tooltip", attr: { role: "tooltip" }, text });
    const buttonRect = button.getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();
    const margin = 8;
    const left = Math.max(margin, Math.min(
      buttonRect.left + (buttonRect.width - tooltipRect.width) / 2,
      view.innerWidth - tooltipRect.width - margin,
    ));
    const above = buttonRect.top - tooltipRect.height - 8;
    const top = above >= margin ? above : Math.min(view.innerHeight - tooltipRect.height - margin, buttonRect.bottom + 8);
    tooltip.setCssStyles({ left: `${left}px`, top: `${Math.max(margin, top)}px` });
    hideTimer = view.setTimeout(removeTooltip, TOOLTIP_LIFETIME_MS);
  };

  const resetActivePress = () => {
    clearPressTimer();
    activeButton = null;
    activePointerId = -1;
    completedLongPress = false;
  };

  const onPointerDown = (event: PointerEvent) => {
    if (!event.isPrimary || event.button !== 0) return;
    const button = scopedButton(event.target);
    if (!button || button.disabled) return;
    clearPressTimer();
    activeButton = button;
    activePointerId = event.pointerId;
    startX = event.clientX;
    startY = event.clientY;
    completedLongPress = false;
    pressTimer = view.setTimeout(() => {
      pressTimer = 0;
      if (!activeButton) return;
      completedLongPress = true;
      suppressClickFor = activeButton;
      if (suppressClickTimer) view.clearTimeout(suppressClickTimer);
      // A browser-generated click normally follows pointerup immediately. Expire the guard so a
      // later, intentional tap on the same button is never swallowed if no click was synthesized.
      suppressClickTimer = view.setTimeout(clearSuppressedClick, 1_000);
      showTooltip(activeButton);
    }, LONG_PRESS_MS);
  };

  const onPointerMove = (event: PointerEvent) => {
    if (!activeButton || event.pointerId !== activePointerId) return;
    if (Math.hypot(event.clientX - startX, event.clientY - startY) <= MOVE_TOLERANCE_PX) return;
    clearPressTimer();
    if (!completedLongPress) activeButton = null;
  };

  const onPointerUp = (event: PointerEvent) => {
    if (!activeButton || event.pointerId !== activePointerId) return;
    clearPressTimer();
    if (completedLongPress) {
      event.preventDefault();
      event.stopPropagation();
    }
    activeButton = null;
    activePointerId = -1;
    completedLongPress = false;
  };

  const onPointerCancel = (event: PointerEvent) => {
    if (event.pointerId !== activePointerId) return;
    resetActivePress();
    removeTooltip();
  };

  const onClick = (event: MouseEvent) => {
    if (!suppressClickFor) return;
    const button = scopedButton(event.target);
    if (button !== suppressClickFor) return;
    clearSuppressedClick();
    event.preventDefault();
    event.stopImmediatePropagation();
  };

  const onContextMenu = (event: MouseEvent) => {
    const button = scopedButton(event.target);
    if (button && (button === activeButton || button === suppressClickFor)) event.preventDefault();
  };

  doc.addEventListener("pointerdown", onPointerDown, true);
  doc.addEventListener("pointermove", onPointerMove, true);
  doc.addEventListener("pointerup", onPointerUp, true);
  doc.addEventListener("pointercancel", onPointerCancel, true);
  doc.addEventListener("click", onClick, true);
  doc.addEventListener("contextmenu", onContextMenu, true);

  const cleanup = () => {
    resetActivePress();
    clearSuppressedClick();
    removeTooltip();
    doc.removeEventListener("pointerdown", onPointerDown, true);
    doc.removeEventListener("pointermove", onPointerMove, true);
    doc.removeEventListener("pointerup", onPointerUp, true);
    doc.removeEventListener("pointercancel", onPointerCancel, true);
    doc.removeEventListener("click", onClick, true);
    doc.removeEventListener("contextmenu", onContextMenu, true);
  };
  documentStates.set(doc, { users: 1, cleanup });

  return () => {
    const current = documentStates.get(doc);
    if (!current) return;
    current.users -= 1;
    if (current.users <= 0) {
      current.cleanup();
      documentStates.delete(doc);
    }
  };
}
