/** Finite descriptor admission before native menus or controls receive extension data. */
import {boundedViewState} from "../../core/plex/views/state";
import {validCanvasViewText, validPlexViewStateAction} from "../../core/plex/views/presentation";
import {validViewConfigurationAddress} from "../../core/plex/views/configurationPaths";
import type {CanvasViewCommand, CanvasViewMenuItem, CanvasViewChoice, CanvasViewLayoutControl, CanvasViewHelp} from "./contributionContracts";
import {validMarkdownHelp} from "../../core/contracts/markdownHelp";

/** Check runtime arrays without widening already typed descriptor elements to any. */
export function contributionArray(value: unknown): boolean {return Array.isArray(value);}

/** Shared identifiers are stable keys, never executable callbacks from persisted JSON. */
export function contributionId(value: unknown): value is string {return typeof value === "string" && /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,79}$/.test(value);}
/** Copy and validate the finite host command allowlist. */
export function copyCanvasViewCommand(command: CanvasViewCommand): CanvasViewCommand {
  const value = boundedViewState(command);
  if (!value || typeof value !== "object") throw new Error("Invalid canvas view command");
  const kind: unknown = Reflect.get(value, "kind");
  if (kind === "settings") {
    const target: unknown = Reflect.get(value, "target");
    if (target === undefined) return {kind};
    if (contributionId(target)) return {kind, target};
    throw new Error("Invalid canvas settings target");
  }
  if (kind === "help") {
    const target: unknown = Reflect.get(value, "target");
    if (contributionId(target)) return {kind, target};throw new Error("Invalid canvas help target");
  }
  if (kind === "state") {
    const action: unknown = Reflect.get(value, "action");
    if (validPlexViewStateAction(action)) return {kind, action};
  }
  if (kind === "configuration") {
    const address: unknown = Reflect.get(value, "address"), edit: unknown = Reflect.get(value, "edit");
    if (validViewConfigurationAddress(address) && edit && typeof edit === "object") {
      if (Reflect.get(edit, "kind") === "remove") return {kind, address, edit: {kind: "remove"}};
      if (Reflect.get(edit, "kind") === "set" && Object.prototype.hasOwnProperty.call(edit, "value")) return {kind, address, edit: {kind: "set", value: Reflect.get(edit, "value")}};
    }
  }
  throw new Error("Invalid canvas view command");
}
/** Menus are bounded by64 total entries and three submenu levels; invalid groups are rejected. */
export function validateCanvasViewMenus(items: readonly CanvasViewMenuItem[]): void {
  let count = 0;
  const visit = (rows: readonly CanvasViewMenuItem[], depth: number): void => {
    if (!contributionArray(rows) || rows.length > 32 || depth > 3) throw new Error("Canvas view menu exceeds its bound");
    const ids = new Set<string>();
    for (const row of rows) {
      if (++count > 64 || !contributionId(row.id) || ids.has(row.id)) throw new Error("Invalid canvas view menu identity");
      ids.add(row.id);
      if (row.kind === "separator") continue;
      if (!validCanvasViewText(row.label) || row.unavailableReason && !validCanvasViewText(row.unavailableReason)
        || row.visible !== undefined && typeof row.visible !== "boolean" || row.enabled !== undefined && typeof row.enabled !== "boolean"
        || row.icon !== undefined && !/^[a-z][a-z0-9-]{0,79}$/.test(row.icon)) throw new Error("Invalid canvas view menu presentation");
      if (row.kind === "submenu") visit(row.items, depth + 1);
      else if (row.kind === "action") {copyCanvasViewCommand(row.command); if (row.checked !== undefined && typeof row.checked !== "boolean") throw new Error("Invalid checked state");}
      else throw new Error("Unknown canvas view menu kind");
    }
  };
  visit(items, 0);
}
/** Choice groups share the command allowlist and never create another view selector. */
export function validateCanvasViewChoices(choices: readonly CanvasViewChoice[]): void {
  if (!contributionArray(choices) || choices.length > 8) throw new Error("Canvas view choices exceed their bound");
  const ids = new Set<string>();
  for (const choice of choices) {
    if (!contributionId(choice.id) || ids.has(choice.id) || !validCanvasViewText(choice.label)
      || typeof choice.selected !== "string" || choice.selected.length > 80 || !contributionArray(choice.options) || choice.options.length > 32) throw new Error("Invalid canvas view choice");
    ids.add(choice.id);
    if (choice.settings && copyCanvasViewCommand(choice.settings).kind !== "settings") throw new Error("Invalid choice settings navigation");
    if (choice.help && copyCanvasViewCommand(choice.help).kind !== "help") throw new Error("Invalid choice help navigation");
    const options: CanvasViewChoice["options"] = choice.options;
    validateCanvasViewMenus(options.map(option => ({...option, kind: "action"})));
  }
}

/** Native rendering admits long inert source separately from short presentation labels. */
export function validCanvasViewHelp(value: CanvasViewHelp): boolean {
  if (!value || !validCanvasViewText(value.name) || !value.markdown || typeof value.markdown !== "object") return false;
  return "literal" in value.markdown ? validMarkdownHelp(value.markdown.literal) : validCanvasViewText(value.markdown);
}
/** Layout controls can address only registered fields, with finite slider bounds and readable labels. */
export function validateCanvasViewLayoutControl(control: CanvasViewLayoutControl, fields: Readonly<Record<string, unknown>>): void {
  if (!Object.prototype.hasOwnProperty.call(fields, control.field) || !validViewConfigurationAddress({field: control.field, path: control.path})
    || !control.labelKey && !control.label || control.label && !validCanvasViewText(control.label)
    || control.caption && !validCanvasViewText(control.caption) || control.hint && !validCanvasViewText(control.hint)
    || control.kind !== undefined && control.kind !== "checkbox" && control.kind !== "slider") throw new Error("Invalid canvas view layout control");
  if (control.kind !== "checkbox" && (![control.min, control.max, control.step].every(Number.isFinite)
    || control.max <= control.min || control.step <= 0 || !/^[a-z][a-z0-9-]{0,79}$/.test(control.icon))) throw new Error("Invalid view slider");
  if (control.kind === "checkbox" && control.state !== undefined && (!control.state || typeof control.state.value !== "boolean"
    || !validPlexViewStateAction({id: control.state.actionId, args: control.state.value}))) throw new Error("Invalid canvas state checkbox");
}
