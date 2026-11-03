/** Independent Compass/Wu Xing native session proof. Uses actual per-canvas selectors, native popout/Sidecars and view-state restoration; whole-application extra-tab behavior remains its recorded baseline limitation. */
export async function acceptWuXingPairs(x){
 const {app,p,c,workspace,host,hosts,cases,path,root,center,check,wait,until,localReady,choose,panel,reveal,quiet}=x;
 const companion=workspace.getLeaf('window');hosts.push(companion);await companion.setViewState({type:'k-plex-react-view',active:true});await companion.view.waitUntilReady();await p.setDocumentSyncMode(companion,'off');
 companion.view.centerPresentation.update({embedCentralNode:false});p.notifyNavigation(path('Goal'),companion);
 await until(()=>center(companion)===path('Goal')&&root(companion)?.querySelector('.kplex-filter-trigger')&&companion.view.containerEl.ownerDocument!==document,'Independent native popout absent');
 await choose(companion,'classic');panel(companion).querySelector('.kplex-filter-panel-header button').click();
 for(const [leaf,name]of[[host,'Memory'],[companion,'Goal']]){
  if(c.loadedCompanion){
   // This explicit lane tests the supported attach-existing-document workflow. It never converts the separately recorded fresh-popout empty-leaf failure into a pass.
   await reveal(host);const loaded=workspace.getLeaf('tab');hosts.push(loaded);await loaded.openFile(app.vault.getFileByPath(path(name)),{active:true});
   await until(()=>loaded.view.file?.path===path(name)&&loaded.view.getViewType()==='markdown','Main-window native document did not load');
   await reveal(leaf);const position=leaf.view.documentSession.preferences.sidecarPosition;
   const target=workspace.createLeafBySplit(leaf,position==='left'||position==='right'?'vertical':'horizontal',position==='left'||position==='above');hosts.push(target);
   const parent=target.parent,offset=parent.children.indexOf(target);loaded.parent.removeChild(loaded);parent.insertChild(offset,loaded);target.detach();await workspace.revealLeaf(loaded);
   await until(()=>loaded.view.file?.path===path(name)&&loaded.view.containerEl.ownerDocument===leaf.view.containerEl.ownerDocument,'Loaded document did not reach its owning canvas window');
   await until(()=>p.getAdjacentSidecarCandidate(leaf)===loaded,'Exact adjacent native companion candidate absent');
   const attached=await p.attachAdjacentSidecar(leaf,'to-plex');check(attached?.file?.path===path(name)&&p.sidecarLeaves.get(leaf)===loaded,'Explicit native Sidecar attachment failed');
   cases.push({id:'sidecar-explicit-loaded-native-document-attachment',owner:leaf===host?'main':'popout',freshCreationTested:false});continue;
  }
  await reveal(leaf);await p.openSidecar(leaf,p.index.get(path(name)));
  c.progress={phase:'native-sidecar-open',cases,owner:leaf===host?'main':'popout',sidecarType:p.sidecarLeaves.get(leaf)?.view.getViewType(),expectedDocument:p.sidecarLeaves.get(leaf)?.view.file?.path===path(name)};
  await until(()=>p.sidecarLeaves.get(leaf)?.view.file?.path===path(name),'Owning '+(leaf===host?'main':'popout')+' Sidecar did not open its document');
 }
 await until(()=>[host,companion].every(leaf=>p.sidecarLeaves.get(leaf)?.view.file),'Both native Sidecars did not settle');
 await until(()=>[host,companion].every(leaf=>p.sidecarLeaves.get(leaf)?.view.contentEl.textContent.includes('Disposable Wu Xing native fixture.')),'Native Sidecar bodies did not finish loading before zero-work observation');
 const session=leaf=>leaf.view.documentSession.plexView;
 const snapshot=leaf=>({state:JSON.stringify(session(leaf).getState()),attention:center(leaf),camera:root(leaf).querySelector('.kplex-camera')?.style.transform,
  selected:root(leaf).querySelector('.is-keyboard-selected')?.dataset.kplexKeyboardId??null,editor:root(leaf).querySelector('.kplex-central-editor-content'),sidecar:p.sidecarLeaves.get(leaf),sidecarFile:p.sidecarLeaves.get(leaf)?.view.file});
 const same=(leaf,before)=>{const after=snapshot(leaf);return Object.keys(before).every(key=>before[key]===after[key])};
 // Native window focus can cause Obsidian's own Sidecar cachedRead. Establish that native
 // context first; the strict zero-work interval below covers only the captured view selection.
 await choose(host,'wuxing');await until(localReady,'Independent cached proof/active work did not settle');await p.settingsWriteQueue;await wait(300);
 const chooseCaptured=async id=>{const select=panel(host)?.querySelector('.kplex-view-selector select');check(select,'Captured main selector absent');
  select.value=id;select.dispatchEvent(new select.ownerDocument.defaultView.Event('change',{bubbles:true}));await until(()=>session(host).definition.id===id&&select.value===id,'Captured main view selection failed')};
 const other=snapshot(companion),stop=quiet();
 await chooseCaptured('classic');check(same(companion,other),'Switching main changed the popout session/camera/editor/Sidecar');await chooseCaptured('wuxing');check(same(companion,other),'Returning main changed popout state');
 stop('main-popout-per-canvas-selection-zero-source-work');
 const first=snapshot(host);await choose(companion,'wuxing');check(same(host,first),'Popout selection changed main state');await choose(companion,'classic');check(same(host,first),'Popout return changed main state');
 cases.push({id:'native-compass-wuxing-main-popout-independent-canvas-and-sidecar-state'});
 // The panel captures its opening owner even when another native window becomes active before its change event.
 await choose(host,'wuxing');const select=panel(host).querySelector('.kplex-view-selector select'),openingPanel=panel(host);await reveal(companion);
 select.value='classic';select.dispatchEvent(new select.ownerDocument.defaultView.Event('change',{bubbles:true}));await until(()=>session(host).definition.id==='classic','Opening canvas owner lost after focus change');
 check(session(companion).definition.id==='classic'&&center(companion)===path('Goal'),'Delayed selector touched another canvas');
 check(panel(host)===openingPanel,'Compatible change replaced the open filter panel');cases.push({id:'opening-canvas-selector-owner-survives-window-focus-change'});
 await choose(host,'wuxing');
 // Preset selection stays per canvas; the saved layout is shared by users of that preset.
 const facetChoice=async(leaf,value)=>{await choose(leaf,'wuxing');const choice=panel(leaf).querySelector('[data-kplex-view-choice="preset"] select');choice.value=value;choice.dispatchEvent(new choice.ownerDocument.defaultView.Event('change',{bubbles:true}));await until(()=>session(leaf).state.preset===value,'Native preset selection failed');panel(leaf).querySelector('.kplex-filter-panel-header button').click();await wait(120)};
 for(const leaf of [host,companion])await facetChoice(leaf,'para');
 const own=[host,companion].map(leaf=>({leaf,state:JSON.stringify(session(leaf).getState()),attention:center(leaf)}));
 const layout=async value=>{const preset=p.readPortableSharingState().presets.para;await p.updateCanvasViewConfiguration('wuxing',{field:'presets',path:['para']},{kind:'set',value:{...preset,layout:value}});await wait(250)};
 await reveal(companion);await layout('concentric');
 for(const item of own){check(JSON.stringify(session(item.leaf).getState())===item.state&&center(item.leaf)===item.attention,'Shared layout changed independent session/attention');check(root(item.leaf).querySelectorAll('.kplex-view-region > path').length===4,'Same preset did not share its configured layout');}
 await facetChoice(companion,'publishing');const otherPreset=snapshot(companion);await layout('horizontal');check(same(companion,otherPreset),'Editing PARA changed a canvas using Publishing');
 cases.push({id:'native-shared-preset-layout-and-independent-preset-selection',main:'para',popout:'publishing'});
 await choose(companion,'classic');await choose(host,'wuxing');
 // Recreate only owned native views through Obsidian's serialized state owner; never claim a full application restart.
 for(const leaf of [host,companion])await p.closeSidecar(leaf);
 // Keep the accepted combined-two-editor/two-Sidecar failure separate: establish one actually
 // loaded native editor at a time and prove the other canvas cannot replace its document.
 for(const [owner,other,name]of[[host,companion,'Memory'],[companion,host,'Goal']]){
  owner.view.centerPresentation.update({embedCentralNode:true,centralNodeMarkdownMode:'source'});await reveal(owner);
  await until(()=>root(owner).querySelector('.kplex-central-editor-content .cm-content')&&!root(owner).querySelector('.kplex-central-editor-status'),'Independent native editor did not finish opening');
  const element=root(owner).querySelector('.kplex-central-editor-content');element.querySelector('.cm-content').focus();
  await until(()=>workspace.activeLeaf?.view.file?.path===path(name)&&element.contains(workspace.activeLeaf.view.containerEl),'Independent editor document is not its owner attention');
  const nativeLeaf=workspace.activeLeaf,editor=nativeLeaf.view.editor;await until(()=>editor.getValue().includes('Disposable Wu Xing native fixture.'),'Independent native document did not load');
  const text=editor.getValue(),cursor=JSON.stringify(editor.getCursor()),otherView=session(other).definition.id;
  await choose(other,otherView==='classic'?'wuxing':'classic');await choose(other,otherView);
  check(root(owner).querySelector('.kplex-central-editor-content')===element&&nativeLeaf.view.file?.path===path(name)&&nativeLeaf.view.editor===editor&&editor.getValue()===text&&JSON.stringify(editor.getCursor())===cursor,'Other canvas switch replaced native editor document/content/caret');
  cases.push({id:'other-canvas-switch-preserves-native-editor',owner:owner===host?'main-wuxing':'popout-compass',simultaneousEditors:1});
  owner.view.centerPresentation.update({embedCentralNode:false});await until(()=>!root(owner).querySelector('.kplex-central-editor-content'),'Independent editor did not retire');
 }
 const saved=[host,companion].map(leaf=>({leaf,state:structuredClone(leaf.getViewState()),view:session(leaf).definition.id,attention:center(leaf)}));
 for(const item of saved){await item.leaf.setViewState({type:'empty'});await item.leaf.setViewState(item.state);await item.leaf.view.waitUntilReady();await until(()=>session(item.leaf).definition.id===item.view&&center(item.leaf)===item.attention&&root(item.leaf)?.querySelector('.kplex-filter-trigger'),'Independent native restoration failed');await choose(item.leaf,item.view)}
 check(session(host).definition.id==='wuxing'&&session(companion).definition.id==='classic','Independent restored selections differ');
 check(session(host).getState().states.wuxing?.preset==='para'&&session(companion).getState().states.wuxing?.preset==='publishing','Independent hidden-view preset intent did not restore');
 cases.push({id:'independent-owned-native-workspace-view-restoration',applicationRestart:false});
 await choose(host,'wuxing');await reveal(host);
 const surface=[...p.actionSurfaceHosts].find(([,registration])=>registration.leaf===host)?.[0];check(surface,'Native Wu Xing action surface absent');
 await p.actionManager.dispatch({id:'view.fit',source:'internal',surfaceId:surface});await wait(100);
 const selected=panel(host).querySelector('.kplex-view-selector select'),win=selected.ownerDocument.defaultView.require('@electron/remote').getCurrentWindow();selected.focus();
 const keys=[],changes=[],observe=event=>keys.push({key:event.key,trusted:event.isTrusted,targetSelect:event.target===selected}),changed=event=>changes.push({trusted:event.isTrusted,value:selected.value});selected.ownerDocument.addEventListener('keydown',observe,true);selected.addEventListener('change',changed,true);
 try{
  if(c.osInput){c.progress={phase:'await-os-select-home',cases};await until(()=>session(host).definition.id==='classic','OS native selector Home did not choose Compass',120000)}
  else{for(const type of ['keyDown','keyUp'])win.webContents.sendInputEvent({type,keyCode:'Home'});await until(()=>session(host).definition.id==='classic','Native selector Home did not choose Compass')}
  check(keys.some(event=>event.trusted&&event.targetSelect)&&changes.some(event=>event.trusted&&event.value==='classic'),'Trusted native select key/change absent');
  check(session(companion).definition.id==='classic'&&center(companion)===path('Goal'),'Native key retargeted the other canvas');
  cases.push({id:'windows-native-view-select-keyboard',transport:c.osInput?'OS_CUA':'Electron',keys,changes});
 }finally{selected.ownerDocument.removeEventListener('keydown',observe,true);selected.removeEventListener('change',changed,true)}
 /** Route explicit outline intent to its captured native canvas, independently of window focus. */
 const outline=async leaf=>{const id=[...p.actionSurfaceHosts].find(([,entry])=>entry.leaf===leaf)?.[0];check(id,'Native outline surface absent');
  const result=await p.actionManager.dispatch({id:'sections.toggle',source:'internal',surfaceId:id});check(result.status==='completed','Native outline action failed: '+JSON.stringify(result));};
 const headingCount=leaf=>root(leaf).querySelectorAll('.is-kplex-section').length;
 const otherBefore=snapshot(companion);await choose(host,'mindmap');panel(host).querySelector('.kplex-filter-panel-header button').click();
 await outline(host);await until(()=>headingCount(host)>0,'Main-window root outline absent');
 check(same(companion,otherBefore)&&!headingCount(companion),'Main root outline changed the Compass popout');
 const mainBefore=snapshot(host),mainCount=headingCount(host);
 await choose(companion,'mindmap');panel(companion).querySelector('.kplex-filter-panel-header button').click();
 await outline(companion);await until(()=>headingCount(companion)>0,'Popout root outline absent');
 check(same(host,mainBefore)&&headingCount(host)===mainCount,'Popout root outline changed the main canvas/session/camera/editor/Sidecar');
 await outline(companion);await until(()=>!headingCount(companion),'Popout root outline did not fold');
 check(headingCount(host)===mainCount&&same(host,mainBefore),'Folding one root outline changed the other');
 const closedPopout=snapshot(companion);await choose(host,'wuxing');
 await until(()=>!headingCount(host)&&!root(host).querySelector('.kplex-section-fold-handle'),'Facets did not retire unsupported section controls');
 check(same(companion,closedPopout),'Main view switch changed the popout root/attention/camera/editor/Sidecar');
 cases.push({id:'native-independent-main-popout-root-outlines-and-unsupported-facets',simultaneousRootOutlines:2,otherEditorsOrSidecarsRetargeted:false});
}
