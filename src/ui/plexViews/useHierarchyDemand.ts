/** React lifetime adapter for explicit hierarchy frontiers. Existing native sessions own leases; projection and layout retain no source capabilities. */
import {useLayoutEffect, useRef, useState} from "react";
import {PlexHierarchyDemand} from "../../application/PlexHierarchyDemand";
import type {PlexViewSession} from "../../application/PlexViewSession";
import type {NodeId} from "../../core/graph/model";
import type {PlexProjection, PlexViewDefinition} from "../../core/plex/views/contracts";

/** Lease reconciliation runs after an admitted scene commits, never while pure policy is executing. Unavailable projection retains the last admitted bounded leases; scope/view/unmount retirement is synchronous. */
export function useHierarchyDemand(session: PlexViewSession | undefined, definition: PlexViewDefinition, root: NodeId,
  acquire: (id: NodeId) => (() => void)): Readonly<{held: readonly NodeId[]; revision: number; synchronize: (projection: PlexProjection | null) => void}> {
  const holder = useRef<{owner: PlexHierarchyDemand; key: string; current: () => boolean} | null>(null);
  const [revision, setRevision] = useState(0);
  const lifetime = session?.getLifetime() ?? 0, key = JSON.stringify([definition.id, lifetime, root]);
  useLayoutEffect(/** Register with the selected native-session lifetime before admitting this commit's frontier requests. */ () => {
    if (!session || !definition.hierarchy) return;
    const selected = session.capture();
    const value = {owner: new PlexHierarchyDemand(acquire, definition.hierarchy.maximumScopes), key,
      current: /** An explicit root replacement retires callback authority even before React commits its cleanup. */ () =>
        selected() && session.definition === definition && session.layoutRoot(root) === root};
    holder.current = value;
    return session.own(/** No late selected-view callback can reuse a retired resource incarnation. */ () => {
      if (holder.current === value) holder.current = null;
      value.owner.dispose();
    });
  }, [session, definition, lifetime, key, acquire]);
  const held = holder.current?.key === key ? holder.current.owner.snapshot().held : [];
  /** Only admitted output can retire branch requests. A failed read is not an empty expansion; warm lease changes still trigger one reservation update. */
  const synchronize = (projection: PlexProjection | null): void => {
    const value = holder.current;
    if (!value || value.key !== key || !value.current() || !projection || projection.layoutRoot !== root) return;
    const before = JSON.stringify(value.owner.snapshot());
    value.owner.synchronize(definition.id, root, projection.preparation?.parents ?? []);
    if (holder.current === value && value.current() && before !== JSON.stringify(value.owner.snapshot())) setRevision(previous => previous + 1);
  };
  return {held, revision, synchronize};
}
