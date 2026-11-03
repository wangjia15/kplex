/**
 * Exact-build native section grouping, counts, preview anchors and stationary inbound edits in Small.
 * Reuses bounded CLI transport/config guards, owns four notes and one native Plex, and restores
 * its settings/workspace on every exit. Counts presentation operations, never comparative timings.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { runControlledProbe } from "./controlledProbe.mjs";

/** Exercise the installed React fold control and automatic index-to-section publication. */
async function scenario(app, c) {
  const p = app.plugins.plugins["k-plex"];
  if (!p || app.vault.getFiles().length >= 1000 || app.setting.isOpen) throw Error("Clean Small-vault prerequisites required");
  const settings = structuredClone(p.settings), policy = p.savedSettingsPolicy;
  const active = app.workspace.activeLeaf;
  const folder = "Kplex-Sections-162-" + Date.now();
  const path = name => folder + "/" + name + ".md";
  const owned = [], releases = [], restores = [];
  let leaf, createdFolder, restoreWindow, failure;
  const check = (value, message) => { if (!value) throw Error(message); };
  const wait = ms => new Promise(resolve => window.setTimeout(resolve, ms));
  /** Native metadata and React each publish independently; no manual refresh or navigation retry. */
  const until = async (predicate, message) => {
    const end = Date.now() + 60000;
    while (!predicate()) { check(!c.closed && Date.now() < end, message); await wait(50); }
  };
  const nodes = () => [...leaf.view.contentEl.querySelectorAll(".kplex-thought[data-kplex-path]")];
  const direct = name => nodes().some(node => node.dataset.kplexPath === path(name));
  const section = name => nodes().some(node => node.dataset.kplexPath.startsWith("kplex-section-target:") && node.dataset.kplexPath.endsWith(":" + path(name)));
  try {
    await until(() => !p.isStartupInitializing(), "Startup did not settle");
    const remote = require("@electron/remote"), win = remote.getCurrentWindow();
    const bounds = win.getBounds(), maximized = win.isMaximized(), minimized = win.isMinimized();
    restoreWindow = () => { win.setBounds(bounds); if (maximized) win.maximize(); if (minimized) win.minimize(); };
    remote.app.show?.(); remote.app.focus({steal:true}); win.restore(); win.show(); win.focus();
    createdFolder = await app.vault.createFolder(folder);
    for (const name of ["Preamble", "B", "C", "L1", "L2", "R1", "R2", "Center"]) {
      const body = name === "Center" ? `---\n${JSON.stringify(p.settings.hierarchy.leftFriends[0])}:\n  - "[[${folder}/L1]]"\n  - "[[${folder}/L2]]"\n${JSON.stringify(p.settings.hierarchy.rightFriends[0])}:\n  - "[[${folder}/R1]]"\n  - "[[${folder}/R2]]"\n---\n[[${folder}/Preamble]]\n# First\n[[${folder}/B]]\n[[${folder}/B]]\n# Second\n[[${folder}/C]]\n` : name === 'B' ? '---\naliases:\n  - "Typography gyjpq"\n---\nA disposable section fixture.\n' : "A disposable section fixture.\n";
      const file = await app.vault.create(path(name), body); owned.push(file);
    }
    await until(() => owned.every(file => app.metadataCache.getFileCache(file)), "Native fixture metadata absent");
    Object.assign(p.settings, { documentSyncMode: "off", sidecarOpen: false, followActiveFile: false,
      autoOpenCentralDocument: false, embedCentralNode: false, showInferredNodes: true,
      showPageNodes: true, showFolderNodes: false, showTagNodes: false, graphDepth: 1,
      renderSiblings: false, renderAlias: true, nameFields: 'aliases', graphLenses: [], applyPowerFilter: false, animationSpeed: 0, lastActivePath: path("Center") });
    for (const file of owned) { p.index.insertCreatedFile(file); releases.push(p.index.acquireSemanticDemand(file.path)); }
    await until(() => !p.index.hasPendingSemanticPreparation(), "Fixture semantic preparation pending");
    leaf = app.workspace.getLeaf("tab");
    await leaf.setViewState({ type: "k-plex-react-view", active: true });
    await app.workspace.revealLeaf(leaf); await leaf.view.waitUntilReady();
    await until(() => [...p.actionSurfaceHosts.values()].some(registration => registration.leaf === leaf), "Owned action surface absent");
    p.notifyNavigation(path("Center"), leaf);
    await until(() => direct("Center"), "Owned center did not render");
    const root = leaf.view.contentEl;
    const profileKey = 'desktop:leaf', priorProfile = p.settings.layoutProfiles[profileKey];
    const priorHeight = p.settings.friendMaxHeight;
    p.settings.layoutProfiles = {...p.settings.layoutProfiles, [profileKey]:{compactingFactor:2,parentColumns:2,childColumns:4,...priorProfile,lateralArrangement:'left'}};
    p.settings.friendMaxHeight = 120; p.index.notifyPresentation();
    await until(() => root.querySelector('.kplex-zone-left .kplex-role-left') && root.querySelector('.kplex-zone-left .kplex-role-right'), 'Shared list omitted a semantic lateral group');
    check(!root.querySelector('.kplex-zone-right'), 'One-sided mode retained a second lateral panel');
    let panel = root.querySelector('.kplex-zone-left'), scroll = panel.querySelector('.kplex-zone-scroll');
    check(panel.querySelector('.kplex-zone-count').textContent === '4', 'Shared list count omitted challengers');
    check(scroll.scrollHeight > scroll.clientHeight, 'Combined native list did not overflow');
    const wheelChecks = [];
    for (const modifier of [null,'ctrlKey','metaKey']) {
      // Source/presentation publication can replace an area; dispatch only to the current native tree.
      await until(()=>{panel=root.querySelector('.kplex-zone-left');scroll=panel?.querySelector('.kplex-zone-scroll');return scroll?.isConnected&&scroll.clientWidth>0&&scroll.clientHeight>0},'Current bounded scroll area missing');
      const camera=root.querySelector('.kplex-camera'),before=camera.style.transform,bounds=scroll.getBoundingClientRect();
      const event = new WheelEvent('wheel',{bubbles:true,cancelable:true,deltaY:-100,clientX:bounds.x+20,clientY:bounds.y+20,ctrlKey:modifier==='ctrlKey',metaKey:modifier==='metaKey'});
      scroll.dispatchEvent(event); await wait(100);
      const after=root.querySelector('.kplex-camera').style.transform,changed=before!==after;
      wheelChecks.push({modifier,zoomed:changed,prevented:event.defaultPrevented,before,after,scrollConnected:scroll.isConnected,bounds:bounds.toJSON()});
      c.progress={phase:'wheel routing',wheelChecks};
      check(changed === !!modifier && event.defaultPrevented === !!modifier, 'Bounded wheel modifier routing failed: '+modifier);
    }
    panel=root.querySelector('.kplex-zone-left');scroll=panel.querySelector('.kplex-zone-scroll');
    panel.querySelector('.kplex-zone-filter-button').click();
    await until(() => panel.querySelector('.kplex-zone-filter-input'), 'Shared filter did not open');
    const filter = panel.querySelector('.kplex-zone-filter-input');
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(filter,'R2');
    filter.dispatchEvent(new Event('input',{bubbles:true}));
    await until(() => panel.querySelector('.kplex-zone-count').textContent === '1', 'Shared filter did not search challengers');
    check(panel.querySelector('.kplex-role-right') && !panel.querySelector('.kplex-role-left'), 'Filtered shared list changed semantic role');
    panel.querySelector('.kplex-zone-filter-button').click();
    p.settings.layoutProfiles = {...p.settings.layoutProfiles, [profileKey]:priorProfile};
    p.settings.friendMaxHeight = priorHeight; p.index.notifyPresentation();
    const fold = leaf.view.contentEl.querySelector(".kplex-role-center .kplex-section-fold-handle");
    check(fold, "Central outline fold control missing"); fold.click();
    await until(() => section("B") && section("C"), "Ordinary links not grouped under headings");
    check(direct("Preamble") && !direct("B") && !direct("C"), "Preamble/body partition incorrect");
    check(nodes().filter(node => node.dataset.kplexPath.endsWith(":" + path("B"))).length === 1, "Repeated links duplicated the section target");
    const sectionTarget = () => nodes().find(node => node.dataset.kplexPath.endsWith(":" + path("B")));
    await until(() => sectionTarget() && [...sectionTarget().querySelectorAll('.kplex-gate-count')].some(label => /\d/.test(label.textContent))
      && ![...sectionTarget().querySelectorAll('.kplex-gate-count')].some(label => label.textContent === '…'), "Section target retained unavailable counts");
    const counts = [...sectionTarget().querySelectorAll('.kplex-gate-count')].map(label => label.textContent);
    check(sectionTarget().querySelector('[data-kplex-gate="top"]').dataset.tooltipPosition === 'bottom', 'Parent gate does not prefer below');
    check(sectionTarget().querySelector('[data-kplex-gate="bottom"]').dataset.tooltipPosition === 'top', 'Child gate lost above preference');
    const previewEvents = [];
    const previewRef = app.workspace.on('hover-link', event => { if (event.source === 'k-plex-react-view') previewEvents.push(event.linktext); });
    restores.push(() => app.workspace.offref(previewRef));
    let heading = nodes().find(node => node.dataset.kplexPath.startsWith('kplex-section:'));
    check(heading, 'Rendered heading absent');
    heading.dispatchEvent(new PointerEvent('pointerover', {bubbles:true,pointerType:'mouse',ctrlKey:true}));
    await until(() => previewEvents.some(link => link === path('Center')+'#First'), 'Modified heading hover omitted the heading anchor');
    heading.dispatchEvent(new PointerEvent('pointerout',{bubbles:true,pointerType:'mouse'}));
    const stationaryPreviews = [];
    for (const key of ['Control','Meta']) {
      const before = previewEvents.length;
      heading.dispatchEvent(new PointerEvent('pointerover',{bubbles:true,pointerType:'mouse'}));
      window.dispatchEvent(new KeyboardEvent('keydown',{key,ctrlKey:key==='Control',metaKey:key==='Meta'}));
      await until(()=>previewEvents.length===before+1,'Stationary '+key+' hover did not preview');
      check(previewEvents.at(-1)===path('Center')+'#First','Stationary preview lost its section anchor');
      window.dispatchEvent(new KeyboardEvent('keydown',{key,ctrlKey:key==='Control',metaKey:key==='Meta',repeat:true}));
      check(previewEvents.length===before+1,'Held modifier repeated native preview');
      stationaryPreviews.push(key);window.dispatchEvent(new KeyboardEvent('keyup',{key}));
      heading.dispatchEvent(new PointerEvent('pointerout',{bubbles:true,pointerType:'mouse'}));
    }
    // The prior wheel checks intentionally zoomed. Fit explicitly before real pointer input;
    // saved autozoom=false must not make this a test of an offscreen heading.
    const surface=[...p.actionSurfaceHosts].find(([,registration])=>registration.leaf===leaf)?.[0];
    check(surface,'Owned section action surface missing');
    await p.actionManager.dispatch({id:'view.fit',source:'internal',surfaceId:surface});
    await until(()=>{heading=nodes().find(node=>node.dataset.kplexPath.startsWith('kplex-section:'));if(!heading?.isConnected)return false;const r=heading.getBoundingClientRect(),x=Math.round(r.x+r.width/2),y=Math.round(r.y+r.height/2);return r.width>0&&r.height>0&&x>=0&&x<innerWidth&&y>=0&&y<innerHeight&&heading.contains(document.elementFromPoint(x,y))},'Visible native heading pointer target missing');
    // The actual Electron pointer/key path must show a native popover, not only emit hover-link.
    win.webContents.sendInputEvent({type:'mouseMove',x:2,y:2});await wait(150);
    const headingRect=heading.getBoundingClientRect();
    win.webContents.sendInputEvent({type:'mouseMove',x:Math.round(headingRect.x+headingRect.width/2),y:Math.round(headingRect.y+headingRect.height/2),modifiers:[]});
    await until(()=>heading.matches(':hover'),'Native pointer did not reach the section heading');
    try {
      win.webContents.sendInputEvent({type:'keyDown',keyCode:'Control',modifiers:['control']});
      await until(()=>p.hoverParent.hoverPopover?.hoverEl.isConnected&&p.hoverParent.hoverPopover.hoverEl.getClientRects().length,'Stationary native Ctrl did not show the actual preview popover');
      stationaryPreviews.push('native Control popover');
    } finally {
      win.webContents.sendInputEvent({type:'keyUp',keyCode:'Control',modifiers:[]});
      win.webContents.sendInputEvent({type:'mouseMove',x:2,y:2});
    }

    // Large-label layout uses the same actual node and stylesheet, rather than another text model.
    const priorFont = p.settings.typographyProfiles.desktop?.baseFontSize;
    await p.updateTypographyOverride('desktop',{baseFontSize:28});
    await until(() => sectionTarget() && parseFloat(getComputedStyle(sectionTarget()).fontSize) > 20, 'Large label setting did not render');
    await wait(100);
    const text = sectionTarget().querySelector('.kplex-thought-text'), label = text?.parentElement;
    const range = text?.ownerDocument.createRange();range?.selectNodeContents(text);
    const ink = range?.getBoundingClientRect(),clip = text?.getBoundingClientRect();
    const fontMetrics = text && label ? {font:getComputedStyle(text).fontSize,lineHeight:getComputedStyle(text).lineHeight,textHeight:text.clientHeight,textScroll:text.scrollHeight,labelHeight:label.clientHeight,labelScroll:label.scrollHeight,nodeHeight:sectionTarget().clientHeight,nodeBox:getComputedStyle(sectionTarget()).height,nodeLineHeight:getComputedStyle(sectionTarget()).lineHeight,padding:getComputedStyle(sectionTarget()).padding,border:getComputedStyle(sectionTarget()).borderWidth} : null;
    c.progress = {phase:'large label',fontMetrics,wheelChecks,counts,previewEvents};
    check(text && label && text.scrollHeight <= text.clientHeight + 1 && label.scrollHeight <= label.clientHeight + 1, 'Large label line box clipped');
    check(ink && clip && ink.top>=clip.top && ink.bottom<=clip.bottom,'Large glyph crosses its own clipping boundary');
    if(typeof priorFont==='number')await p.updateTypographyOverride('desktop',{baseFontSize:priorFont});else await p.resetTypographyOverride('desktop','baseFontSize');
    const centerMtime = app.vault.getFileByPath(path("Center")).stat.mtime;
    const b = app.vault.getFileByPath(path("B"));
    c.progress = { phase: "inbound-add" };
    const parentKey = p.settings.hierarchy.parents[0]; check(parentKey, "Configured parent field absent");
    await app.vault.modify(b, `---\n${parentKey}: "[[${folder}/Center]]"\n---\nA disposable section fixture.\n`);
    await until(() => direct("B") && section("B"), "Stationary expansion missed inbound ontology addition");
    check(app.vault.getFileByPath(path("Center")).stat.mtime === centerMtime, "Center changed during inbound test");
    c.progress = { phase: "inbound-remove" };
    await app.vault.modify(b, "A disposable section fixture.\n");
    await until(() => !direct("B") && section("B"), "Stationary expansion retained removed inbound ontology");
    await until(() => p.getIndexStatus().upToDate && !p.index.hasPendingSemanticPreparation(), "Presentation guard requires drain");
    const work = { reads: 0, parses: 0, rebuilds: 0 };
    /** Instrument only the bounded presentation interval; delegate exact native promises/results. */
    const observe = (owner, key, counter) => {
      const original = owner[key]; if (typeof original !== "function") return;
      owner[key] = function (...args) { work[counter]++; return original.apply(this, args); };
      restores.push(() => { owner[key] = original; });
    };
    observe(app.vault, "read", "reads"); observe(app.vault, "cachedRead", "reads");
    observe(p.index.metadataParser, "parse", "parses"); observe(p.index, "rebuild", "rebuilds");
    p.settings.showInferredNodes = false; p.index.notifyPresentation();
    await until(() => !section("B") && !section("C"), "Hidden inferred section targets remained visible");
    p.settings.showInferredNodes = true; p.index.notifyPresentation();
    await until(() => section("B") && section("C"), "Presentation update lost ordinary section links");
    await wait(300);
    for (const [key, value] of Object.entries(work)) check(value === 0, "Presentation performed " + key);
    check(direct("Center") && app.vault.getFileByPath(path("Center")).stat.mtime === centerMtime, "Stationary center changed");
    c.progress = { phase: "complete", cases: ["shared lateral list and challenger filter", "modified wheel over overflow", "native fold grouping", "preamble and repeated links", "canonical section target counts", "modified heading preview anchor", "stationary Ctrl/Cmd preview", "large label ink boundary", "parent below and child above tooltip preference", "stationary inbound add", "stationary inbound removal", "visibility round trip"], stationaryPreviews,wheelChecks, counts, previewEvents, fontMetrics, work };
    return c.progress;
  } catch (error) {
    failure = error;
    throw error;
  } finally {
    const errors = [];
    /** One cleanup failure must never skip another fixture, native owner or disk restoration. */
    const clean = async action => { try { await action(); } catch (error) { errors.push(String(error)); } };
    for (const restore of restores.reverse()) await clean(restore);
    for (const release of releases) await clean(release);
    if (leaf) await clean(() => leaf.detach());
    p.settings = settings; p.savedSettingsPolicy = policy;
    if (active) await clean(() => app.workspace.setActiveLeaf(active, { focus: true }));
    for (const file of owned.reverse()) if (app.vault.getFileByPath(file.path) === file) await clean(() => app.vault.delete(file));
    if (createdFolder && app.vault.getFolderByPath(folder) === createdFolder && !createdFolder.children.length) await clean(() => app.vault.delete(createdFolder, true));
    await clean(() => p.settingsWriteQueue);
    await wait(1000);
    await clean(() => app.vault.adapter.write(p.manifest.dir + "/data.json", c.originalData));
    if (restoreWindow) await clean(restoreWindow);
    if (errors.length) throw Error((failure ? "Scenario: " + String(failure) + "; " : "") + "Section fixture cleanup: " + errors.join("; "));
  }
}

if (process.env.KPLEX_TEST_VAULT_NAME !== "kplex-test-small") throw Error("Sections require the explicit Small fixture");
const data = readFileSync(join(process.env.KPLEX_TEST_CONFIG_DIR, "plugins/k-plex/data.json"), "utf8");
await runControlledProbe("sections-162", scenario, "c.originalData=" + JSON.stringify(data) + ";", ["src/index/SectionExpansion.ts"]);
