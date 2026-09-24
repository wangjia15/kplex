import { Modal, Notice, type WorkspaceLeaf } from "obsidian";
import { createElement, useMemo, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import type ExcaliBrainPlugin from "../main";
import type { GateRole, GraphPage } from "../types";
import { FuzzySearchInput, fuzzyFilterStrings } from "./FuzzySearchInput";
import { ObsidianIcon } from "./ObsidianIcon";

const ROLE_LABEL: Record<GateRole, string> = {
  parent: "Parent",
  child: "Child",
  left: "Friend",
  right: "Challenger",
};

function isNoteTarget(page: GraphPage, originPath: string): boolean {
  if (page.path === originPath || page.isFolder || page.isTag || page.url) return false;
  return page.file?.extension === "md";
}

function RelatedNoteComposer({
  plugin,
  origin,
  initialRole,
  allowRoleSelection,
  onCommitted,
  onClose,
  hostLeaf,
}: {
  plugin: ExcaliBrainPlugin;
  origin: GraphPage;
  initialRole: GateRole;
  allowRoleSelection: boolean;
  onCommitted?: () => void;
  onClose: () => void;
  hostLeaf?: WorkspaceLeaf;
}) {
  const [role, setRole] = useState<GateRole>(initialRole);
  const [query, setQuery] = useState("");
  const [alias, setAlias] = useState("");
  const [aliasFocused, setAliasFocused] = useState(false);
  const [noteTyped, setNoteTyped] = useState(false);
  const [selectedTarget, setSelectedTarget] = useState<GraphPage | null>(null);
  const [ontology, setOntology] = useState(() => plugin.defaultOntologyField(initialRole));
  const [ontologyTyped, setOntologyTyped] = useState(false);
  const [busy, setBusy] = useState(false);
  const [editAfterCreate, setEditAfterCreate] = useState(() => plugin.settings.editNewNodeAfterCreate);
  const excalidrawAvailable = plugin.isExcalidrawAvailable();
  const [defaultCreateType, setDefaultCreateType] = useState<"markdown" | "excalidraw">(() =>
    plugin.settings.newNodeDefaultType === "excalidraw" && excalidrawAvailable ? "excalidraw" : "markdown",
  );

  const noteResults = useMemo(() => {
    const trimmed = query.trim();
    if (!noteTyped || !trimmed) return [];
    return plugin.index.search(trimmed, 48).filter((page) => isNoteTarget(page, origin.path)).slice(0, 18);
  }, [plugin, origin.path, query, noteTyped]);

  const ontologyResults = useMemo(
    () => ontologyTyped && ontology.trim()
      ? fuzzyFilterStrings(plugin.ontologyFieldsForRole(role), ontology, 18)
      : [],
    [plugin, role, ontology, ontologyTyped],
  );

  const webUrl = useMemo(() => {
    const value = query.trim();
    if (!/^https?:\/\//i.test(value)) return null;
    try {
      const parsed = new URL(value);
      return parsed.protocol === "http:" || parsed.protocol === "https:" ? value : null;
    } catch {
      return null;
    }
  }, [query]);
  const nameValidation = useMemo(() => plugin.validateRelatedNoteName(query), [plugin, query]);

  const chooseRole = (nextRole: GateRole) => {
    setRole(nextRole);
    setOntology(plugin.defaultOntologyField(nextRole));
    setOntologyTyped(false);
  };

  const prepareField = async (): Promise<string | null> => {
    const field = ontology.trim();
    if (!field) {
      new Notice("Enter an ontology field.", 1800);
      return null;
    }
    return plugin.rememberRelationshipOntology(role, field);
  };

  const linkExisting = async () => {
    const target = selectedTarget;
    if (busy || !target) return;
    setBusy(true);
    try {
      const field = await prepareField();
      if (!field) return;
      await plugin.createRelationToPage(origin, role, target, field);
      plugin.requestRelationshipFlair(target.path);
      onCommitted?.();
      onClose();
    } catch (error) {
      new Notice(`Could not add relationship: ${error instanceof Error ? error.message : String(error)}`, 5000);
    } finally {
      setBusy(false);
    }
  };

  const createNew = async (kind: "markdown" | "excalidraw") => {
    if (busy || selectedTarget || webUrl || !nameValidation.valid || nameValidation.existing) return;
    setBusy(true);
    try {
      const field = await prepareField();
      if (!field) return;
      const file = await plugin.createNewRelatedFileForOrigin(origin, nameValidation.stem, kind, alias);
      if (!file) return;
      setDefaultCreateType(kind);
      void plugin.rememberNewNodeDefaultType(kind);
      const page = await plugin.linkNewRelatedFile(origin, role, file, field, alias);
      plugin.requestRelationshipFlair(file.path);
      onCommitted?.();
      onClose();
      if (editAfterCreate) await plugin.finishNewRelatedNode(page, hostLeaf, true);
    } catch (error) {
      new Notice(`Could not create related note: ${error instanceof Error ? error.message : String(error)}`, 5000);
    } finally {
      setBusy(false);
    }
  };

  const createPlaceholder = async () => {
    if (busy || selectedTarget || webUrl || !nameValidation.valid || nameValidation.existing) return;
    if (alias.trim()) {
      new Notice("Placeholder nodes cannot persist aliases. The alias will not be saved.", 4_000);
    }
    setBusy(true);
    try {
      const field = await prepareField();
      if (!field) return;
      const page = await plugin.createPlaceholderRelatedPage(origin, role, nameValidation.stem, field);
      if (!page) return;
      plugin.requestRelationshipFlair(page.path);
      onCommitted?.();
      onClose();
    } catch (error) {
      new Notice(`Could not create placeholder: ${error instanceof Error ? error.message : String(error)}`, 5000);
    } finally {
      setBusy(false);
    }
  };

  const createWebLink = async () => {
    if (busy || selectedTarget || !webUrl || origin.file?.extension !== "md") return;
    setBusy(true);
    try {
      const field = await prepareField();
      if (!field) return;
      const page = await plugin.createWebLinkRelatedPage(origin, role, webUrl, alias, field);
      if (!page) return;
      plugin.requestRelationshipFlair(page.path);
      onCommitted?.();
      onClose();
    } catch (error) {
      new Notice(`Could not add web link: ${error instanceof Error ? error.message : String(error)}`, 5000);
    } finally {
      setBusy(false);
    }
  };

  const chooseExisting = (page: GraphPage) => {
    setSelectedTarget(page);
    setQuery(plugin.index.titleFor(page));
  };

  const onNoteChange = (value: string) => {
    setNoteTyped(true);
    setSelectedTarget(null);
    setQuery(value);
  };

  const onOntologyChange = (value: string) => {
    setOntologyTyped(true);
    setOntology(value);
  };

  const createAvailable = !selectedTarget && !webUrl && nameValidation.valid && !nameValidation.existing;
  const placeholderAvailable = createAvailable && origin.file?.extension === "md";
  const webLinkAvailable = !selectedTarget && Boolean(webUrl) && origin.file?.extension === "md";
  const roleRow = allowRoleSelection
    ? createElement(
        "div",
        { className: "kplex-add-related-role-row", "aria-label": "Relationship role" },
        ...(["parent", "child", "left", "right"] as GateRole[]).map((candidate) => createElement(
          "button",
          {
            key: candidate,
            type: "button",
            className: candidate === role ? "is-active" : "",
            disabled: busy,
            onClick: () => chooseRole(candidate),
          },
          ROLE_LABEL[candidate],
        )),
      )
    : null;

  const noteSearch = createElement(FuzzySearchInput<GraphPage>, {
    value: query,
    onChange: onNoteChange,
    results: noteResults,
    onChoose: chooseExisting,
    getKey: (page: GraphPage) => page.path,
    getLabel: (page: GraphPage) => plugin.index.titleFor(page),
    getDetail: (page: GraphPage) => page.path,
    placeholder: "Find a note, type a new name, or paste a web link…",
    ariaLabel: "Related note name or web link",
    autoFocus: true,
    disabled: busy,
    className: `kplex-add-related-note-search${selectedTarget ? " has-selection" : ""}`,
    openResultsOnFocus: false,
    floating: true,
    floatingMode: "viewport",
    maxFloatingHeight: 320,
    onCtrlEnter: () => {
      if (selectedTarget) void linkExisting();
      else if (webLinkAvailable) void createWebLink();
      else if (createAvailable) void createNew(defaultCreateType);
    },
  });

  const aliasInput = !selectedTarget ? createElement("input", {
    type: "text",
    className: "kplex-create-alias-input",
    value: alias,
    placeholder: "Alias",
    "aria-label": "Alias (optional)",
    disabled: busy,
    onFocus: () => setAliasFocused(true),
    onBlur: () => setAliasFocused(false),
    onChange: (event: { currentTarget: HTMLInputElement }) => setAlias(event.currentTarget.value),
  }) : null;

  const nameEditor = createElement(
    "div",
    { className: `kplex-create-name-pair${aliasFocused ? " is-alias-focused" : ""}${selectedTarget ? " has-selection" : ""}` },
    noteSearch,
    aliasInput,
  );

  const ontologySearch = createElement(FuzzySearchInput<string>, {
    value: ontology,
    onChange: onOntologyChange,
    results: ontologyResults,
    onChoose: (field: string) => { setOntology(field); setOntologyTyped(false); },
    getKey: (field: string) => field.toLocaleLowerCase(),
    getLabel: (field: string) => field,
    placeholder: `Ontology · ${plugin.defaultOntologyField(role)}`,
    ariaLabel: "Ontology field",
    icon: "tags",
    disabled: busy,
    className: "kplex-add-related-ontology-search",
    openResultsOnFocus: false,
    floating: true,
    floatingMode: "viewport",
    maxFloatingHeight: 280,
  });

  const markdownButton = createElement(
    "button",
    {
      type: "button",
      className: `kplex-add-related-type-button${defaultCreateType === "markdown" ? " is-default" : ""}`,
      "aria-label": createAvailable ? "Create Markdown note and link it" : "Create Markdown note",
      "aria-keyshortcuts": "Control+Enter Meta+Enter",
      disabled: !createAvailable || busy,
      "data-kplex-primary-action": defaultCreateType === "markdown" ? "true" : undefined,
      onClick: () => { void createNew("markdown"); },
    },
    createElement(ObsidianIcon, { name: "text-initial", size: 20 }),
  );

  const excalidrawButton = excalidrawAvailable
    ? createElement(
        "button",
        {
          type: "button",
          className: `kplex-add-related-type-button${defaultCreateType === "excalidraw" ? " is-default" : ""}`,
          "aria-label": createAvailable ? "Create Excalidraw drawing and link it" : "Create Excalidraw drawing",
          "aria-keyshortcuts": "Control+Enter Meta+Enter",
          disabled: !createAvailable || busy,
          "data-kplex-primary-action": defaultCreateType === "excalidraw" ? "true" : undefined,
          onClick: () => { void createNew("excalidraw"); },
        },
        createElement(ObsidianIcon, { name: "palette", size: 20 }),
      )
    : null;

  const placeholderButton = createElement(
    "button",
    {
      type: "button",
      className: "kplex-add-related-type-button",
      "aria-label": "Create placeholder node",
      disabled: !placeholderAvailable || busy,
      onClick: () => { void createPlaceholder(); },
    },
    createElement(ObsidianIcon, { name: "circle-dashed", size: 20 }),
  );

  const webLinkButton = webUrl
    ? createElement(
        "button",
        {
          type: "button",
          className: "kplex-add-related-link-button",
          "aria-label": origin.file?.extension === "md" ? "Add web link" : "Web links require a Markdown origin node",
          disabled: !webLinkAvailable || busy,
          "data-kplex-primary-action": webLinkAvailable ? "true" : undefined,
          onClick: () => { void createWebLink(); },
        },
        createElement(ObsidianIcon, { name: "globe", size: 19 }),
        createElement("span", null, "Add link"),
      )
    : null;

  const linkButton = selectedTarget
    ? createElement(
        "button",
        {
          type: "button",
          className: "kplex-add-related-link-button",
          "aria-label": `Link to ${plugin.index.titleFor(selectedTarget)}`,
          disabled: busy,
          "data-kplex-primary-action": "true",
          onClick: () => { void linkExisting(); },
        },
        createElement(ObsidianIcon, { name: "link", size: 19 }),
        createElement("span", null, "Link"),
      )
    : null;

  const actionArea = createElement(
    "div",
    { className: "kplex-add-related-action-area" },
    selectedTarget
      ? linkButton
      : webUrl
        ? webLinkButton
        : createElement(
            "div",
            { className: `kplex-add-related-create-actions${excalidrawAvailable ? " has-three-actions" : ""}` },
            markdownButton,
            excalidrawButton,
            placeholderButton,
          ),
  );

  const editToggle = !selectedTarget && !webUrl ? createElement(
    "label",
    { className: "kplex-create-edit-toggle" },
    createElement("span", { className: "kplex-create-edit-copy" }, createElement("strong", null, "Open for editing")),
    createElement(
      "span",
      { className: `checkbox-container${editAfterCreate ? " is-enabled" : ""}` },
      createElement("input", {
        type: "checkbox",
        checked: editAfterCreate,
        disabled: busy,
        "aria-label": "Open the new note for editing",
        onChange: (event: { currentTarget: HTMLInputElement }) => {
          const enabled = event.currentTarget.checked;
          setEditAfterCreate(enabled);
          plugin.settings.editNewNodeAfterCreate = enabled;
          void plugin.saveSettings(false, false);
        },
      }),
    ),
  ) : null;

  const controlRow = createElement("div", { className: "kplex-add-related-control-row" }, ontologySearch, editToggle);
  const composeRow = createElement("div", { className: "kplex-add-related-compose-row" }, nameEditor, actionArea);

  let statusText: string | null = null;
  let statusError = false;
  if (selectedTarget) {
    statusText = `Selected existing note: ${selectedTarget.path}`;
  } else if (webUrl) {
    if (origin.file?.extension !== "md") {
      statusText = "Web links can only be added from a Markdown node because the relationship is stored in document properties.";
      statusError = true;
    } else {
      statusText = alias.trim() ? `Add “${alias.trim()}” as a web link.` : "Add this web link. Add an optional alias for its display text.";
    }
  } else if (noteTyped && query.trim()) {
    if (nameValidation.error) {
      statusText = nameValidation.error;
      statusError = true;
    } else if (nameValidation.existing) {
      statusText = "A note with this name already exists. Select it from the search results to link it.";
    } else {
      statusText = `Create “${nameValidation.stem}” as Markdown${excalidrawAvailable ? ", Excalidraw" : ""}, or a placeholder. Alias is optional.`;
    }
  }

  const status = statusText
    ? createElement("div", { className: `kplex-add-related-create-hint${statusError ? " is-error" : ""}` }, statusText)
    : null;

  return createElement(
    "div",
    { className: "kplex-add-related-form" },
    roleRow,
    controlRow,
    composeRow,
    status,
  );
}


export class NewRelatedNoteModal extends Modal {
  private root: Root | null = null;

  constructor(
    private plugin: ExcaliBrainPlugin,
    private origin: GraphPage,
    private role: GateRole,
    private onCommitted?: () => void,
    private allowRoleSelection = false,
    private hostLeaf?: WorkspaceLeaf,
  ) {
    super(plugin.app);
  }

  private dismissOpenSuggestions(): boolean {
    const expanded = this.contentEl.querySelector<HTMLInputElement>('.kplex-fuzzy-search input[aria-expanded="true"]');
    const shell = expanded?.closest<HTMLElement>(".kplex-fuzzy-search");
    if (!shell) return false;
    const EventCtor = shell.ownerDocument.defaultView?.CustomEvent ?? CustomEvent;
    shell.dispatchEvent(new EventCtor("kplex-dismiss-suggestions"));
    expanded?.focus();
    return true;
  }

  private triggerPrimaryAction(): boolean {
    const button = this.contentEl.querySelector<HTMLButtonElement>('button[data-kplex-primary-action="true"]:not(:disabled)');
    if (!button) return false;
    button.click();
    return true;
  }

  override onEscapeKey(event: KeyboardEvent): void {
    // Obsidian calls this runtime Modal hook before closing on Escape. If a fuzzy list is open,
    // consume this Escape by dismissing only the list; a subsequent Escape closes the modal.
    if (event.defaultPrevented) return;
    if (this.dismissOpenSuggestions()) {
      event.preventDefault();
      return;
    }
    event.preventDefault();
    this.close();
  }

  onOpen(): void {
    this.scope.register(["Mod"], "Enter", (event) => {
      if (!this.triggerPrimaryAction()) return false;
      event.preventDefault();
      return true;
    });
    this.titleEl.setText(this.allowRoleSelection ? "Add relationship" : `Add ${ROLE_LABEL[this.role]}`);
    this.modalEl.addClass("kplex-add-related-modal");
    this.modalEl.setAttr("data-kplex-tooltip-scope", "");
    this.contentEl.empty();
    this.root = createRoot(this.contentEl);
    this.root.render(createElement(RelatedNoteComposer, {
      plugin: this.plugin,
      origin: this.origin,
      initialRole: this.role,
      allowRoleSelection: this.allowRoleSelection,
      onCommitted: this.onCommitted,
      onClose: () => this.close(),
      hostLeaf: this.hostLeaf,
    }));
  }

  onClose(): void {
    this.root?.unmount();
    this.root = null;
    this.contentEl.empty();
  }
}
