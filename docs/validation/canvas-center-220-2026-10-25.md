# Explicit node centering across views

Zsolt's Codex Agent. Maintainer addition to PR220; starting headc3aa629df0e6e8cade0f26c0740624f02405c50f.

The existing placeholder gesture is Mod-click: Ctrl on Windows/Linux, Cmd on macOS. It continues to request the same in-place folder-choice creation with `preserveCenter`. No alternate file-creation or placeholder writer is added.

Alt/Option alone now requests explicit centering through `node.activate` with the bounded invocation argument `{intent: "destination"}`. The existing App navigation owner already accepts explicit destinations and performs native identity admission plus rooted-session/editor checks. Attention-following views activate the note normally; rooted Mind Map reroots and activates it. Ordinary branch clicks keep their existing selection/fold/editor policy and retained root. A live occurrence binding that would be displaced refuses the reroot; the guard is retained. Existing `view.root.selected` remains a separate root-only command.

Both regular ThoughtNodes and expanded rows use the shared activation path. Explicit center/create gestures cannot also open a file through a following double-click. Group unfolding, section-owned behavior, mixed modifiers and post-drag click suppression retain their existing ownership. Centering a placeholder does not create its file.

Node22.22.2, real dependencies: focused shared action, actual node/UI, cross-view center and Wander batch66/66 passes. Actual renderer plus ActionManager delivery covers Compass, Mind Map, Wu Xing and the public example. Tests check exact destination intent, ordinary retained root, live occurrence-binding refusal, Ctrl/Cmd placeholder creation, no creation from Alt, expanded rows and double-click suppression. Real production build and official Obsidian scanner pass.

The browser navigation port delegates to the same session contract as App; native document/editor behavior is not replaced with a separate implementation. The binding-refusal test proves existing intent admission, not a mounted native editor/content test. Exact-final-head Windows keyboard/modifier/editor checks remain pending with expanded Facets acceptance. macOS/physical-device input is not claimed.

Initial added-fixture failures: one test supplied ActionNodeRef instead of the existing editor document target shape; another attempted its independent Alt gesture immediately after a simulated drag while post-drag suppression intentionally remained active. The corrected fixture uses the actual editor contract and performs that independent gesture before the drag. No suppression or editor assertion was weakened.
