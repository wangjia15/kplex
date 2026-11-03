/** Native JSON transfer helpers shared by preset drafts and the reviewed package modal.
 * ClipboardSession owns asynchronous copy state; callers retire it with their existing editor.
 * Download owns only one temporary URL in the invoking document, with immediate cleanup. */
import {ClipboardSession} from "../../application/ClipboardSession";

/** Start a gesture-owned copy without claiming success before the native promise fulfills. */
export function copyPortableText(text: string, element: HTMLElement, changed: Parameters<ClipboardSession["listen"]>[0]): ClipboardSession {
  const owner = element.ownerDocument.defaultView;
  const session = new ClipboardSession(text, owner?.navigator.clipboard?.writeText ? value => owner.navigator.clipboard.writeText(value) : null);
  session.listen(changed);session.copy();return session;
}

/** Save exact visible JSON through the owning window; no Vault API or settings writer is used. */
export function downloadPortableJson(text: string, element: HTMLElement): void {
  const owner = element.ownerDocument.defaultView;if (!owner) return;
  const url = owner.URL.createObjectURL(new owner.Blob([text], {type: "application/json"}));
  const link = element.createEl("a", {attr: {href: url, download: "kplex-preset.json"}});
  try {link.click();} finally {link.remove();owner.URL.revokeObjectURL(url);}
}
