/** Captured UI continuation fences for native dialogs; durable native writes remain outside this policy. */
import type { SurfaceSnapshot } from "../application/ActionManager";

/** Permit late view effects only in the original connected document without intervening navigation; dialogs may opt out of expected focus-return interaction. */
export function captureSurfaceContinuation(readRoot: () => HTMLElement | null, readSnapshot: () => SurfaceSnapshot | null, options: Readonly<{checkInteraction?: boolean}> = {}): () => boolean {
  const root = readRoot(), document = root?.ownerDocument, captured = readSnapshot();
  return /** A remounted/migrated root or another deliberate graph interaction retires the captured intent. */ () => {
    const current = readSnapshot();
    return Boolean(root?.isConnected && readRoot() === root && root.ownerDocument === document && captured && current?.mounted
      && current.viewRevision === captured.viewRevision && (options.checkInteraction === false || current.interactionRevision === captured.interactionRevision) && current.center?.identity === captured.center?.identity
      && current.center?.fileIdentity === captured.center?.fileIdentity);
  };
}
