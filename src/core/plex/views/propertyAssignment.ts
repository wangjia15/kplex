/** Explicit property-assignment policy shared by canvas views. Recognition describes the
 * memberships this preset owns; it never grants relationship, tag, type or arbitrary YAML edits. */
import type {CanvasViewText} from "./contracts";
import {validCanvasViewText} from "./presentation";
import {configurationRecord} from "./configurationValues";
import {normalizeFieldName} from "../../contracts/fieldName";

export type PlexPropertyAssignment = Readonly<{id: string; label: CanvasViewText; field: string;
  recognized: readonly string[]; matching: readonly string[]; value?: string}>;
export type PropertyFieldValue = Readonly<{present: boolean; value?: unknown}>;
export type PropertyAssignmentPlan = Readonly<{status: "changed" | "unchanged"; before: PropertyFieldValue; after: PropertyFieldValue}>
  | Readonly<{status: "unsupported"; reason: "field" | "ambiguous" | "value" | "budget"}>;
const RESERVED_FIELDS = new Set(["tags", "tag", "aliases", "alias", "cssclasses", "position", "__proto__", "constructor", "prototype"]);

/** Native owners add their configured semantic/name/type/image fields to this exact deny list. */
export function writableAssignmentField(field: unknown, protectedFields: readonly string[] = []): field is string {
  return typeof field === "string" && field.trim().length > 0 && field === field.trim() && field.length <= 128
    && ![...field].some(character => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127)
    && !RESERVED_FIELDS.has(normalizeFieldName(field)) && !protectedFields.some(key => normalizeFieldName(key) === normalizeFieldName(field));
}
/** Admit a finite declarative target before the shared native action sees extension metadata. */
export function validPropertyAssignment(value: unknown): value is PlexPropertyAssignment {
  return configurationRecord(value) && typeof value.id === "string" && value.id.length > 0 && value.id.length <= 128
    && validCanvasViewText(value.label) && writableAssignmentField(value.field) && Array.isArray(value.recognized)
    && value.recognized.length <= 3584 && value.recognized.every(item => typeof item === "string" && item.trim().length > 0 && item.length <= 1024)
    && Array.isArray(value.matching) && value.matching.length <= 512 && value.matching.every(item => typeof item === "string" && item.trim().length > 0 && item.length <= 1024)
    && (value.value === undefined || typeof value.value === "string" && value.value.trim().length > 0 && value.value.length <= 1024);
}
/** Resolve one exact current field without guessing among case/space-equivalent coordinates. */
export function assignmentField(frontmatter: Readonly<Record<string, unknown>>, field: string): Readonly<{key: string; snapshot: PropertyFieldValue}> | null {
  const keys = Object.keys(frontmatter);if (keys.length > 4096) return null;
  const matches = keys.filter(key => normalizeFieldName(key) === normalizeFieldName(field));
  return matches.length > 1 ? null : {key: matches[0] ?? field, snapshot: matches.length ? {present: true, value: frontmatter[matches[0]]} : {present: false}};
}
/** Bounded scalar/list payload, independent of note body size; nested maps/lists are read-only. */
function supported(value: unknown): value is string | number | boolean | null {
  return value === null || typeof value === "boolean" || typeof value === "number" && Number.isFinite(value)
    || typeof value === "string" && value.length <= 4096;
}
/** Snapshot equality authorizes only the applied field, never an entire stale note. */
export function samePropertyField(a: PropertyFieldValue, b: PropertyFieldValue): boolean {
  return a.present === b.present && (!a.present || JSON.stringify(a.value) === JSON.stringify(b.value));
}
/** Preserve list shape/unrecognized values and exact case. A scalar non-string is classified
 * read-only rather than silently coerced. Clear removes only this preset's recognized values. */
export function planPropertyAssignment(before: PropertyFieldValue, assignment: PlexPropertyAssignment): PropertyAssignmentPlan {
  if (!validPropertyAssignment(assignment)) return {status: "unsupported", reason: "field"};
  const raw = before.value;
  if (before.present && (Array.isArray(raw) ? raw.length > 256 || !raw.every(supported) : raw !== null && (typeof raw !== "string" || !supported(raw)))) return {status: "unsupported", reason: "value"};
  if (before.present && JSON.stringify(raw).length > 32768) return {status: "unsupported", reason: "budget"};
  const recognized = new Set(assignment.recognized.map(value => value.trim())), matching = new Set(assignment.matching.map(value => value.trim()));
  const isRecognized = (value: unknown): value is string | number | boolean =>
    supported(value) && value !== null && recognized.has(String(value).trim());
  let after: PropertyFieldValue;
  if (Array.isArray(raw)) {
    const items: readonly unknown[] = raw;
    const known = items.filter(isRecognized), destination = assignment.value;
    // Existing membership, including a recognized alias, is a semantic no-op.
    if (destination !== undefined && known.length > 0 && known.every(value => matching.has(String(value).trim()))) after = before;
    else {
      const retained = items.filter(value => !isRecognized(value));
      after = {present: true, value: destination === undefined ? retained : [...retained, destination]};
    }
  } else if (assignment.value !== undefined) after = before.present && typeof raw === "string" && matching.has(raw.trim()) ? before : {present: true, value: assignment.value};
  else after = before.present && isRecognized(raw) ? {present: false} : before;
  return {status: samePropertyField(before, after) ? "unchanged" : "changed", before, after};
}

/** Apply one already planned field after rechecking its exact current value in FileManager's
 * mutation callback. Unknown metadata, field spelling and every body byte remain native-owned. */
export function applyPropertyField(frontmatter: Record<string, unknown>, field: string, before: PropertyFieldValue, after: PropertyFieldValue): void {
  const selected = assignmentField(frontmatter, field);
  if (!selected || !samePropertyField(selected.snapshot, before)) throw new Error("Property changed before assignment");
  if (!after.present) delete frontmatter[selected.key];
  else {
    const value = after.value;
    // Plans admit only primitives and flat primitive lists. Copy the list without a host
    // cloning API, and fail closed if an unplanned/nested value reaches the native callback.
    if (Array.isArray(value) ? value.length > 256 || !value.every(supported) : !supported(value)) throw new Error("Unsupported property assignment value");
    const items: readonly unknown[] | null = Array.isArray(value) ? value : null;
    Object.defineProperty(frontmatter, selected.key, {value: items ? [...items] : value, writable: true, enumerable: true, configurable: true});
  }
}
