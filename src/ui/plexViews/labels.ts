/** Resolve static internal view labels with the shared typed catalog; test-owned literal area labels remain text. */
import {englishCatalog} from "../../lang/en";
import type {PlainTranslationKey, Translator} from "../../lang";
import type {CanvasViewText} from "../../core/plex/views/contracts";

/** A dynamic internal key is safe to translate only when its source entry has no required parameters. */
function plainKey(key: string): key is PlainTranslationKey {
  if (!Object.prototype.hasOwnProperty.call(englishCatalog, key)) return false;
  const entry: unknown = Reflect.get(englishCatalog, key);
  if (!entry || typeof entry !== "object") return false;
  const parameters: unknown = Reflect.get(entry, "params");
  return Array.isArray(parameters) && parameters.length === 0;
}
/** Definitions do not import the locale catalog or native plugin to label their scene. */
export function viewLabel(key: string, translate: Translator): string { return plainKey(key) ? translate(key) : key; }
/** Explicit literal labels preserve user text even when it happens to equal a catalog key. */
export function canvasViewText(text: CanvasViewText, translate: Translator): string {return "literal" in text ? text.literal : viewLabel(text.key, translate);}
