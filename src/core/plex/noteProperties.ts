/** Cache-only property availability shared by presentation consumers. Missing values are distinct from an unavailable source; no body acquisition is permitted. */
export type NotePropertyAvailability = "available" | "unavailable" | "unsupported";
export type NotePropertyRead = Readonly<{status: "available"; value: unknown;
  /** Optional exact native file/stat/cache proof, retained only by the current read frame. */
  isCurrent?: () => boolean}>
  | Readonly<{status: "unavailable" | "unsupported"}>;
