/** Shared pointer/keyboard-activation modifier check for React and native recovery controls.
 * Reads only the delivered event; no global key state or listeners outlive the interaction. */
export type ModifierClick = Readonly<{ altKey: boolean; ctrlKey: boolean; metaKey: boolean; shiftKey: boolean }>;

/** Any modifier opts into the control's advertised alternate click action, including combinations. */
export function hasClickModifier(event: ModifierClick): boolean {
  return event.altKey || event.ctrlKey || event.metaKey || event.shiftKey;
}
