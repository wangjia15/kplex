/** Shared read-only node status text for every canvas view. The owning node supplies
 * accessible explanations and measured clearance; this mark owns no actions or graph facts. */

/** Render the same compact, below-card status for hierarchy references and diagnostics. */
export function NodeStatus({label, description}: Readonly<{label: string; description?: string}>) {
  return <span className="kplex-node-status" aria-hidden="true" aria-label={description}>{label}</span>;
}
