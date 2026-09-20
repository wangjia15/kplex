/**
 * Performance instrumentation was used during K-Plex optimization and is intentionally disabled.
 * Keep these no-op exports temporarily so older local patches that still import them continue to build.
 */
export type PerfDetails = Record<string, unknown>;

export function perfLog(_event: string, _details: PerfDetails = {}): void {
  // Intentionally disabled.
}

export function perfMemoryDetails(): PerfDetails {
  return {};
}
