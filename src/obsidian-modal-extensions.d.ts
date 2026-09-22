import "obsidian";

declare module "obsidian" {
  interface Modal {
    /**
     * Undocumented runtime hook present in Obsidian's Modal implementation.
     *
     * This is the Obsidian implementation of onEscape:
     *
     *     e.prototype.onEscapeKey = function(e) {
     *         e.defaultPrevented || (e.preventDefault(),
     *         this.close())
     *     }
     */
    onEscapeKey(event: KeyboardEvent): void;
  }
}
