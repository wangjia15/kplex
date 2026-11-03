/** Narrow exact-build Windows input acceptance. The shared disposable controller owns every
 * fixture, native window, settings write and restoration; this is not the full regression lane. */
export async function acceptViewInteractions222(x){
 const {app,p,c,host,native,workspace,files,hosts,releases,restores,cases,path,root,center,check,wait,until,choose,panel,reveal}=x;
 const doc=root(host).ownerDocument,session=host.view.documentSession.plexView;
 const surface=()=>[...p.actionSurfaceHosts].find(([,entry])=>entry.leaf===host)?.[0];
 const action=(id,args)=>p.actionManager.dispatch({id,source:'internal',surfaceId:surface(),...(args?{args}:{})});
 const selected=()=>p.actionManager.readSnapshot(surface())?.selected;
 const editorReady=()=>root(host).querySelector('.kplex-central-editor-content .cm-content')&&!root(host).querySelector('.kplex-central-editor-status');
 const accessible=button=>button.getAttribute('aria-label')??(button.getAttribute('aria-labelledby')??'').split(/\s+/).map(id=>doc.getElementById(id)?.textContent??'').join(' ');
 const card=name=>[...root(host).querySelectorAll('.kplex-thought:not(.is-kplex-section)')].find(el=>el.dataset.kplexPath===path(name));
 const click=async element=>{check(element?.isConnected,'Native interaction target absent');element.scrollIntoView({block:'nearest'});
  const r=element.getBoundingClientRect(),x=Math.round(r.x+r.width/2),y=Math.round(r.y+r.height/2),hit=doc.elementFromPoint(x,y);
  check(hit&&element.contains(hit),'Native interaction target obscured: '+element.className);
  for(const type of ['mouseDown','mouseUp'])native.webContents.sendInputEvent({type,x,y,button:'left',clickCount:1});await wait(150);};
 const key=async(keyCode,modifiers=[])=>{for(const type of ['keyDown','keyUp'])native.webContents.sendInputEvent({type,keyCode,modifiers});await wait(160);};
 const selectView=async id=>{await choose(host,id);panel(host).querySelector('.kplex-filter-panel-header button').click();await reveal(host);};
 const destination=async name=>{const node={identity:path(name),kind:'file',path:path(name)};
  const result=await p.actionManager.dispatch({id:'node.activate',source:'internal',surfaceId:surface(),target:{kind:'explicit',node},args:{intent:'destination'}});
  check(result.status==='completed','Existing destination admission refused '+name);await until(()=>center(host)===path(name),'Destination did not center');};
 const dispatchOwner=p.actionManager.dispatch;p.actionManager.dispatch=async function(request){const result=await dispatchOwner.call(this,request);if(request.id==='editor.expand')c.progress={...c.progress,lastEditorAction:{status:result.status,reason:result.reasonKey,view:session.definition.id,target:request.target?.node?.path,occurrence:request.target?.occurrenceId}};return result};restores.push(()=>p.actionManager.dispatch=dispatchOwner);
 check(!doc.querySelector('.modal')&&!app.setting.isOpen,'User-owned modal must remain untouched');
 const child=p.settings.hierarchy.children[0],concept=app.vault.getFileByPath(path('Concept'));
 const leaf=await app.vault.create(path('Input Leaf'),'---\nphase: metal\n---\n# Input Leaf\n\nOwned input fixture.\n');files.push(leaf);p.index.insertCreatedFile(leaf);releases.push(p.index.acquireSemanticDemand(leaf.path));
 await app.vault.process(concept,body=>body.replace('---\n','---\n'+JSON.stringify(child)+': '+JSON.stringify(['[['+leaf.path+']]'])+'\n'));
 await until(()=>p.index.neighbours(p.index.get(concept.path),'child').some(row=>row.page.path===leaf.path)&&!p.index.hasActiveSemanticPreparation(),'Owned branch incidence did not settle');
 await p.updateCanvasViewSetting('mindmap','initialGenerations',1);
 await selectView('mindmap');await until(()=>card('Concept')?.querySelector('.is-branch-disclosure'),'Branch disclosure absent');
 const rootBefore=session.layoutRoot(path('Memory'));
 await action('view.fit');await wait(120);await click(card('Concept').querySelector('.is-branch-disclosure'));
 await until(()=>card('Input Leaf'),'Disclosure did not expand child');
 check(center(host)===path('Memory')&&session.layoutRoot(path('Memory'))===rootBefore,'Disclosure changed root/attention');
 await click(card('Concept').querySelector('.is-branch-disclosure'));await until(()=>!card('Input Leaf'),'Disclosure did not fold child');
 cases.push({id:'native-disclosure-only-folds-without-root-or-attention-change'});
 await action('view.fit');await wait(120);await click(card('Concept'));
 await until(()=>center(host)===concept.path&&session.layoutRoot(concept.path)===concept.path,'Plain body click did not center/reroot');
 cases.push({id:'native-plain-body-click-uses-accepted-root-navigation'});
 await destination('Memory');await until(()=>card('Concept'),'Memory children absent');
 for(const modifier of ['alt']){
  await action('selection.center');await action('graph.focus');await key('Right');
  check(selected()?.node.path!==path('Memory')&&selected()?.occurrenceId,'Plain arrow did not leave center');
  // A root selection provides a stable canonical fold target across inherited branch state.
  await action('selection.center');const before=session.state.collapsed.includes('root');await key('Enter',[modifier]);
  await until(()=>session.state.collapsed.includes('root')!==before,'Modified Enter did not toggle root: '+modifier);
  check(center(host)===path('Memory')&&session.layoutRoot(path('Memory'))===path('Memory'),'Modified Enter centered another note');
  await key('Enter',[modifier]);await until(()=>session.state.collapsed.includes('root')===before,'Modified Enter did not restore root fold: '+modifier);
  cases.push({id:'native-modified-enter-folds-without-centering',modifier});
 }
 await action('selection.center');await action('graph.focus');await key('Right');const picked=selected()?.node.path;
 check(picked&&picked!==path('Memory'),'Plain arrow selected no destination');
 const priorTabs=new Set(workspace.getLeavesOfType('markdown'));await key('Enter',['control']);
 let openedTab;await until(()=>{openedTab=workspace.getLeavesOfType('markdown').find(leaf=>!priorTabs.has(leaf)&&leaf.view.file?.path===picked);return openedTab},'Ctrl Enter did not open selected note in a new native tab');
 hosts.push(openedTab);check(center(host)===path('Memory')&&session.layoutRoot(path('Memory'))===path('Memory'),'New-tab shortcut rerooted the graph');openedTab.detach();await reveal(host);await action('graph.focus');
 cases.push({id:'native-control-enter-new-tab-through-shared-destination-owner'});await key('Enter');
 await until(()=>center(host)===picked&&session.layoutRoot(picked)===picked,'Plain Enter did not center selected note');
 await action('selection.center');await action('graph.focus');await key('Enter');check(!doc.querySelector('.modal'),'Enter on center opened Rename');
 cases.push({id:'native-plain-arrows-and-enter-center-no-rename'});
 await destination('Memory');await until(()=>card('Concept')?.querySelector('.is-branch-disclosure'),'Editor branch absent');
 if(!card('Input Leaf')){await action('view.fit');await wait(120);await click(card('Concept').querySelector('.is-branch-disclosure'));await until(()=>card('Input Leaf'),'Editor child absent');}
 await action('view.fit');await wait(120);await click(card('Concept').querySelector('.kplex-thought-corner-action'));
 await until(()=>session.editors.bindings.length===1&&editorReady(),'Actual native editor did not open');
 const content=root(host).querySelector('.kplex-central-editor-content .cm-content');content.focus();
 await until(()=>workspace.activeLeaf?.view.file?.path===concept.path&&content.contains(doc.activeElement),'Native editor document focus absent');
 const editorLeaf=workspace.activeLeaf,editor=editorLeaf.view.editor,binding=session.editors.bindings[0];
 editor.setCursor(editor.lastLine(),editor.getLine(editor.lastLine()).length);await native.webContents.insertText('Kplex-222-input-editor-marker');
 await until(()=>editor.getValue().includes('Kplex-222-input-editor-marker'),'Native typed content absent');
 const value=editor.getValue(),cursor=JSON.stringify(editor.getCursor());await action('view.fit');await wait(120);await click(card('Input Leaf'));
 const facts={sameEditor:editorLeaf.view.editor===editor,sameContent:editor.getValue()===value,sameCursor:JSON.stringify(editor.getCursor())===cursor,
  sameBinding:session.editors.bindings[0]?.id===binding.id,sameRoot:session.layoutRoot(path('Memory'))===path('Memory'),sameAttention:center(host)===path('Memory')};
 c.progress={...c.progress,editorRerootGuard:facts};check(Object.values(facts).every(Boolean),'Click reroot disturbed live native editor: '+JSON.stringify(facts));
 check((await action('editor.collapse',{bindingId:binding.id})).status==='completed','Native editor collapse/save failed');
 await until(()=>!session.editors.bindings.length&&!root(host).querySelector('.kplex-central-editor-content'),'Native editor cleanup incomplete');
 check((await app.vault.read(concept)).includes('Kplex-222-input-editor-marker'),'Native editor save lost content');
 await reveal(host);await action('view.fit');await wait(120);await click(card('Input Leaf'));
 await until(()=>center(host)===leaf.path&&session.layoutRoot(leaf.path)===leaf.path,'Click after editor cleanup did not reroot');
 cases.push({id:'native-click-reroot-editor-identity-content-caret-save-guard-and-cleanup',facts});
 for(const id of ['classic','wuxing']){
  await destination('Memory');await selectView(id);await action('selection.center');await action('graph.focus');await key(id==='classic'?'Down':'Right');
  check(selected()?.node.path&&selected().node.path!==path('Memory'),'Plain arrow did not cross area in '+id);const target=selected().node.path;await key('Enter');
  await until(()=>center(host)===target,'Enter did not center in '+id);check(!doc.querySelector('.modal'),'Plain Enter opened modal in '+id);
  cases.push({id:'native-plain-arrow-and-enter-center-view',view:id});
 }
 await destination('Memory');await selectView('classic');await action('selection.center');await action('graph.focus');await key('Enter',['alt']);
 await until(()=>root(host).querySelector('.is-kplex-section'),'Modified Enter did not delegate supported Compass sections');
 await key('Enter',['alt']);await until(()=>!root(host).querySelector('.is-kplex-section'),'Modified Enter did not fold Compass sections');
 cases.push({id:'native-modified-enter-reuses-central-markdown-section-owner'});
 await action('graph.focus');await key('Enter');check(!doc.querySelector('.modal'),'Center Enter renamed Compass');
 cases.push({id:'native-current-compass-center-enter-no-rename'});
 // Switch through the same native save/close owner; a failed save must retain recovery.
 await destination('Memory');await selectView('mindmap');await action('view.fit');await wait(120);
 await click(card('Concept').querySelector('.kplex-thought-corner-action'));
 await until(()=>session.editors.bindings.length===1&&editorReady(),'Switch source editor absent');
 let liveContent=root(host).querySelector('.kplex-central-editor-content .cm-content');liveContent.focus();
 await until(()=>workspace.activeLeaf?.view.file?.path===concept.path&&liveContent.contains(doc.activeElement),'Switch source document focus absent');
 const originalLeaf=workspace.activeLeaf,originalEditor=originalLeaf.view.editor,originalBinding=session.editors.bindings[0];
 originalEditor.setCursor(originalEditor.lastLine(),originalEditor.getLine(originalEditor.lastLine()).length);await native.webContents.insertText('Kplex-222-switch-save-marker');
 await until(()=>originalEditor.getValue().includes('Kplex-222-switch-save-marker'),'Switch source typed content absent');
 const originalValue=originalEditor.getValue(),originalCursor=JSON.stringify(originalEditor.getCursor()),saveOwner=originalLeaf.view,save=saveOwner.save;
 saveOwner.save=async()=>{throw Error('Owned save-failure acceptance')};const releaseSave=()=>saveOwner.save=save;restores.push(releaseSave);
 await action('view.fit');await wait(120);await click(card('Goal').querySelector('.kplex-thought-corner-action'));
 await until(()=>session.editors.bindings[0]?.closing===false&&!card('Goal').querySelector('.kplex-thought-corner-action').disabled,'Failed save did not return to recoverable editor');
 check(session.editors.bindings[0].id===originalBinding.id&&originalEditor.getValue()===originalValue&&JSON.stringify(originalEditor.getCursor())===originalCursor,'Failed save replaced/lost the native document');
 releaseSave();cases.push({id:'native-editor-switch-save-failure-retains-binding-content-and-caret'});
 await click(card('Goal').querySelector('.kplex-thought-corner-action'));
 await until(()=>session.editors.bindings.length===1&&session.editors.bindings[0].target.nodeId===path('Goal')&&editorReady(),'Editor button did not switch to Goal');
 check(session.editors.bindings[0].id!==originalBinding.id&&!liveContent.isConnected,'Switch retained a second native editor');
 check((await app.vault.read(concept)).includes('Kplex-222-switch-save-marker'),'Switch did not save original content');
 check(center(host)===path('Memory')&&session.layoutRoot(path('Memory'))===path('Memory'),'Occurrence editor switch changed root/attention');
 await action('editor.collapse',{bindingId:session.editors.bindings[0].id});await until(()=>!session.editors.bindings.length,'Switched editor did not close');
 cases.push({id:'native-occurrence-editor-button-switch-saves-closes-and-opens-one-host'});
 const parent=await app.vault.create(path('Input Parent'),'---\n'+JSON.stringify(child)+': '+JSON.stringify(['[['+path('Memory')+']]'])+'\n---\n# Input Parent\n\nOwned parent-area editor fixture.\n');
 files.push(parent);p.index.insertCreatedFile(parent);releases.push(p.index.acquireSemanticDemand(parent.path));
 await until(()=>p.index.neighbours(p.index.get(path('Memory')),'parent').some(row=>row.page.path===parent.path)&&!p.index.hasActiveSemanticPreparation(),'Parent incidence absent');
 session.setAreaHeight('parentHeight',140);await until(()=>card('Input Parent')?.querySelector('.kplex-thought-corner-action'),'Parent note absent');await action('view.fit');await wait(150);
 await click(card('Input Parent').querySelector('.kplex-thought-corner-action'));
 await until(()=>session.editors.bindings[0]?.target.nodeId===parent.path&&editorReady(),'Parent native editor absent');
 const assertToolbar=label=>{const overlay=root(host).querySelector('.kplex-central-editor-overlay'),toolbar=overlay?.querySelector('.kplex-central-editor-toolbar'),r=overlay?.getBoundingClientRect(),t=toolbar?.getBoundingClientRect();
  check(overlay?.classList.contains('is-area-clipped')&&t.top>=r.top&&t.bottom<=r.bottom,'Parent toolbar is outside editor body: '+label);
  for(const button of toolbar.querySelectorAll('button')){const b=button.getBoundingClientRect(),hit=doc.elementFromPoint(b.x+b.width/2,b.y+b.height/2);check(hit&&button.contains(hit),'Parent toolbar button is clipped/unreachable: '+label+'/'+button.getAttribute('aria-label'));}
  return toolbar;};
 assertToolbar('before-fit-after-opening');
 await action('view.fit');await wait(200);assertToolbar('initial140');
 for(const height of [220,140]){session.setAreaHeight('parentHeight',height);await wait(200);assertToolbar('resize'+height);}
 const ownedBounds=root(host).querySelector('.kplex-plex').getBoundingClientRect();require('node:fs').writeFileSync(c.screenshotPrefix+'-parent-editor-controls.png',(await native.webContents.capturePage({x:Math.ceil(ownedBounds.x),y:Math.ceil(ownedBounds.y),width:Math.floor(ownedBounds.width),height:Math.floor(ownedBounds.height)})).toPNG());
 await click([...assertToolbar('before-close').querySelectorAll('button')].find(button=>accessible(button)===p.translator('app.useNormalCentralNode')));
 await until(()=>!session.editors.bindings.length&&!root(host).querySelector('.kplex-central-editor-overlay'),'Visible parent toolbar could not close editor');
 cases.push({id:'native-parent-editor-toolbar-reachable-at140-and220-area-height-and-real-close'});
 for(const id of ['classic','wuxing']){
  await destination('Memory');await selectView(id);await action('view.fit');await wait(150);
  const notes=[...root(host).querySelectorAll('.kplex-thought:not(.is-kplex-section)')].filter(el=>el.dataset.kplexPath?.startsWith(path('Memory').slice(0,-'Memory.md'.length)));
  check(notes.length>=5&&notes.every(el=>el.querySelector('.kplex-thought-corner-action')),'Eligible note editor icons missing in '+id);
  await click(card('Concept').querySelector('.kplex-thought-corner-action'));
  await until(()=>center(host)===(id==='classic'?path('Memory'):concept.path)&&editorReady(),'Noncentral editor button admission failed in '+id);
  if(id==='classic')check(session.editors.bindings[0]?.target.nodeId===concept.path&&card('Concept')?.getBoundingClientRect().y!==card('Memory')?.getBoundingClientRect().y,'Compass editor moved to the center instead of its area');
  const firstContent=root(host).querySelector('.kplex-central-editor-content .cm-content');firstContent.focus();await until(()=>workspace.activeLeaf?.view.file?.path===concept.path&&firstContent.contains(doc.activeElement),'Attention native document identity absent');
  const firstEditor=workspace.activeLeaf.view.editor;firstEditor.setCursor(firstEditor.lastLine(),firstEditor.getLine(firstEditor.lastLine()).length);await native.webContents.insertText('Kplex-222-attention-switch-'+id);
  await until(()=>firstEditor.getValue().includes('Kplex-222-attention-switch-'+id),'Attention editor typed content absent');await action('view.fit');await wait(150);
  const next=id==='classic'?'Goal':'Input Leaf';await click(card(next).querySelector('.kplex-thought-corner-action'));
  await until(()=>center(host)===(id==='classic'?path('Memory'):leaf.path)&&!firstContent.isConnected&&editorReady(),'Editor did not switch document in '+id);
  check(id==='classic'?session.editors.bindings[0]?.target.nodeId===path(next):!session.editors.bindings.length,'Wrong editor hosting policy in '+id);check((await app.vault.read(concept)).includes('Kplex-222-attention-switch-'+id),'Attention switch lost original content');
  const close=[...root(host).querySelectorAll('.kplex-central-editor-toolbar button')].find(button=>accessible(button)===p.translator('app.useNormalCentralNode'));await click(close);
  await until(()=>!root(host).querySelector('.kplex-central-editor-overlay'),'Attention editor cleanup failed in '+id);
  cases.push({id:id==='classic'?'native-compass-editor-opens-and-switches-in-area-without-centering':'native-all-note-editor-icons-and-save-close-switch-via-attention-owner',view:id});
 }
 // Explicit Compass attention changes must save a bound editor; tint still follows the actual center.
 await destination('Memory');await selectView('classic');await action('view.fit');await wait(120);await click(card('Concept').querySelector('.kplex-thought-corner-action'));await until(()=>session.editors.bindings.length&&editorReady(),'Compass navigation source editor absent');
 await p.updateStyleSettings(draft=>{draft.colorPreferences.compass.enabled=true;});await wait(150);
 const graph=root(host).querySelector('.kplex-plex'),svg=graph.querySelector('.kplex-compass-background'),polygons=[...svg.children].map(el=>(el.getAttribute('points')??'').split(' ').filter(Boolean).map(pair=>pair.split(',').map(Number)));
 const apex=polygons[0].find(point=>polygons.every(poly=>poly.some(other=>Math.abs(point[0]-other[0])<1e-5&&Math.abs(point[1]-other[1])<1e-5)));
 const rootBox=card('Memory').getBoundingClientRect(),graphBox=graph.getBoundingClientRect();check(apex&&Math.abs(apex[0]-(rootBox.x+rootBox.width/2-graphBox.x-graph.clientLeft))<1&&Math.abs(apex[1]-(rootBox.y+rootBox.height/2-graphBox.y-graph.clientTop))<1,'Compass tint followed the noncentral editor instead of the actual center');
 let navigationContent=root(host).querySelector('.kplex-central-editor-content .cm-content');navigationContent.focus();await until(()=>workspace.activeLeaf?.view.file?.path===concept.path&&navigationContent.contains(doc.activeElement),'Compass navigation source focus absent');
 const navigationEditor=workspace.activeLeaf.view.editor;navigationEditor.setCursor(navigationEditor.lastLine(),navigationEditor.getLine(navigationEditor.lastLine()).length);await native.webContents.insertText('Kplex-222-compass-navigation-save');await until(()=>navigationEditor.getValue().includes('Kplex-222-compass-navigation-save'),'Compass navigation typed marker absent');
 await action('view.fit');await wait(120);await click(card('Goal'));await until(()=>center(host)===path('Goal')&&!session.editors.bindings.length&&!root(host).querySelector('.kplex-central-editor-overlay'),'Compass explicit navigation did not finish native save/close before centering');
 check(!navigationContent.isConnected&&(await app.vault.read(concept)).includes('Kplex-222-compass-navigation-save'),'Compass explicit navigation lost its native buffer');
 cases.push({id:'native-compass-tint-retains-center-and-explicit-navigation-saves-bound-occurrence'});
 // Actual central attention editor crosses to occurrence-hosted Mind Map only after native save.
 await destination('Memory');await selectView('classic');await action('view.fit');await wait(120);await click(card('Memory').querySelector('.kplex-thought-corner-action'));
 await until(editorReady,'Compass central editor absent');let sourceContent=root(host).querySelector('.kplex-central-editor-content .cm-content');sourceContent.focus();
 await until(()=>workspace.activeLeaf?.view.file?.path===path('Memory')&&sourceContent.contains(doc.activeElement),'Central document focus absent');
 let sourceLeaf=workspace.activeLeaf,sourceEditor=sourceLeaf.view.editor;sourceEditor.setCursor(sourceEditor.lastLine(),sourceEditor.getLine(sourceEditor.lastLine()).length);await native.webContents.insertText('Kplex-222-view-change-marker');
 await until(()=>sourceEditor.getValue().includes('Kplex-222-view-change-marker'),'Central typed marker absent');
 await selectView('mindmap');await until(()=>!root(host).querySelector('.kplex-central-editor-overlay'),'View switch left old editor mounted');
 check(center(host)===path('Memory')&&session.layoutRoot(path('Memory'))===path('Memory')&&!sourceContent.isConnected,'View switch changed attention or retained old document host');
 check((await app.vault.read(app.vault.getFileByPath(path('Memory')))).includes('Kplex-222-view-change-marker'),'View switch lost native content');
 cases.push({id:'native-selector-auto-saves-closes-central-compass-editor-before-mindmap'});
 await selectView('classic');await action('view.fit');await wait(120);await click(card('Memory').querySelector('.kplex-thought-corner-action'));await until(editorReady,'Second central editor absent');
 sourceContent=root(host).querySelector('.kplex-central-editor-content .cm-content');sourceContent.focus();await until(()=>workspace.activeLeaf?.view.file?.path===path('Memory'),'Failure source identity absent');sourceLeaf=workspace.activeLeaf;sourceEditor=sourceLeaf.view.editor;
 const oldSave=sourceLeaf.view.save;sourceLeaf.view.save=async()=>{throw Error('Owned view transition save failure')};const restoreTransitionSave=()=>sourceLeaf.view.save=oldSave;restores.push(restoreTransitionSave);
 await reveal(host);root(host).querySelector('.kplex-filter-trigger').click();await until(()=>panel(host)?.querySelector('.kplex-view-selector select'),'View failure selector absent');
 let selector=panel(host).querySelector('.kplex-view-selector select');selector.value='mindmap';selector.dispatchEvent(new doc.defaultView.Event('change',{bubbles:true}));
 await until(()=>!selector.disabled,'View failure did not settle');check(session.definition.id==='classic'&&selector.value==='classic'&&sourceContent.isConnected,'Failed save changed view or removed the editor');
 restoreTransitionSave();selector.value='mindmap';selector.dispatchEvent(new doc.defaultView.Event('change',{bubbles:true}));await until(()=>session.definition.id==='mindmap'&&!root(host).querySelector('.kplex-central-editor-overlay'),'View transition retry did not complete');panel(host).querySelector('.kplex-filter-panel-header button').click();
 cases.push({id:'native-selector-save-failure-retains-view-editor-and-successful-retry'});
 // Save one Compass occurrence intent, close through its host and restore in an owned fresh leaf.
 await selectView('classic');await action('view.fit');await wait(120);await click(card('Concept').querySelector('.kplex-thought-corner-action'));await until(()=>session.editors.bindings[0]?.target.nodeId===concept.path&&editorReady(),'Compass restored-intent source absent');
 const saved=host.view.getState(),savedSize={...session.editors.bindings[0].dimensions};await action('editor.collapse',{bindingId:session.editors.bindings[0].id});await until(()=>!session.editors.bindings.length,'Original Compass occurrence did not close');
 const restored=workspace.getLeaf('tab');hosts.push(restored);await restored.setViewState({type:'k-plex-react-view',state:saved,active:true});await restored.view.waitUntilReady();await reveal(restored);
 const restoredSession=restored.view.documentSession.plexView;await until(()=>restoredSession.editors.bindings[0]?.target.nodeId===concept.path&&!root(restored).querySelector('.kplex-central-editor-status')&&root(restored).querySelector('.cm-content'),'Compass workspace occurrence intent did not restore');
 check(center(restored)===path('Memory')&&JSON.stringify(restoredSession.editors.bindings[0].dimensions)===JSON.stringify(savedSize),'Restored Compass editor changed center or dimensions');
 const restoredClose=[...root(restored).querySelectorAll('.kplex-central-editor-toolbar button')].find(button=>accessible(button)===p.translator('app.useNormalCentralNode'));await click(restoredClose);await until(()=>!restoredSession.editors.bindings.length,'Restored editor did not clean up');restored.detach();await reveal(host);
 cases.push({id:'native-compass-occurrence-workspace-restoration-exact-note-size-and-center'});
 // A main-window selector still owns its transition after focus moves to an independent popout.
 await action('view.fit');await wait(120);await click(card('Concept').querySelector('.kplex-thought-corner-action'));await until(()=>session.editors.bindings.length&&editorReady(),'Captured selector editor absent');
 await choose(host,'classic');selector=panel(host).querySelector('.kplex-view-selector select');
 const popout=workspace.getLeaf('window');hosts.push(popout);await popout.setViewState({type:'k-plex-react-view',active:true});await popout.view.waitUntilReady();await p.setDocumentSyncMode(popout,'off');p.notifyNavigation(path('Goal'),popout);await choose(popout,'wuxing');panel(popout).querySelector('.kplex-filter-panel-header button').click();await wait(200);
 const other={view:popout.view.documentSession.plexView.definition.id,attention:center(popout),camera:root(popout).querySelector('.kplex-camera').style.transform};
 selector.value='mindmap';selector.dispatchEvent(new doc.defaultView.Event('change',{bubbles:true}));await until(()=>session.definition.id==='mindmap'&&!session.editors.bindings.length,'Captured main selector transition did not finish');
 check(popout.view.documentSession.plexView.definition.id===other.view&&center(popout)===other.attention&&root(popout).querySelector('.kplex-camera').style.transform===other.camera&&!root(popout).querySelector('.kplex-central-editor-content'),'Main transition changed popout state/editor/camera');
 check(popout.view.containerEl.ownerDocument.hasFocus(),'Main transition stole popout focus');panel(host).querySelector('.kplex-filter-panel-header button').click();popout.detach();await reveal(host);
 cases.push({id:'native-main-selector-save-close-transition-keeps-popout-view-attention-camera-focus'});
 restores.push(()=>{check(!session.editors.bindings.length,'Owned editor survived acceptance');});

 // The minimum-height control adds space above sparse parents; measured forests grow without inner scrolling.
 await destination('Memory');await selectView('mindmap');
 const parentDisclosure=()=>card('Input Parent').querySelector('.is-branch-disclosure');
 if(parentDisclosure()?.getAttribute('aria-expanded')==='true'){await action('view.fit');await wait(150);await click(parentDisclosure());}
 session.setAreaHeight('parentHeight',140);await wait(200);
 const parentPanel=()=>root(host).querySelector('.kplex-zone-parent'),parentLocalTop=()=>parseFloat(card('Input Parent').style.top),sparseTop=parentLocalTop(),smallHeight=parseFloat(parentPanel().style.height);
 session.setAreaHeight('parentHeight',800);await wait(200);
 check(parseFloat(parentPanel().style.height)===800&&Math.abs(parentLocalTop()-sparseTop-(800-smallHeight))<1,'Sparse parent cards did not stay bottom-aligned while the minimum height increased');
 check(parentPanel().querySelector('.kplex-zone-fixed')&&!parentPanel().querySelector('.kplex-zone-scroll'),'Mind Map parent area retained a native scroller');
 await action('view.fit');await wait(180);
 let ownedGraphBounds=root(host).querySelector('.kplex-plex').getBoundingClientRect();require('node:fs').writeFileSync(c.screenshotPrefix+'-bottom-aligned-parent.png',(await native.webContents.capturePage({x:Math.ceil(ownedGraphBounds.x),y:Math.ceil(ownedGraphBounds.y),width:Math.floor(ownedGraphBounds.width),height:Math.floor(ownedGraphBounds.height)})).toPNG());
 cases.push({id:'native-parent-minimum-height-adds-space-above-bottom-aligned-cards',minimum:800});
 const overflowFiles=[];
 for(let i=0;i<28;i++){const file=await app.vault.create(path('Overflow '+i),'---\nphase: wood\n---\n# Overflow '+i+'\n');files.push(file);overflowFiles.push(file);p.index.insertCreatedFile(file);releases.push(p.index.acquireSemanticDemand(file.path));}
 await app.vault.process(parent,body=>body.replace(JSON.stringify(['[['+path('Memory')+']]']),JSON.stringify([path('Memory'),...overflowFiles.map(file=>file.path)].map(path=>'[['+path+']]'))));
 await until(()=>p.index.neighbours(p.index.get(parent.path),'child').length>=29&&!p.index.hasActiveSemanticPreparation(),'Owned growing parent incidence did not settle');
 session.setAreaHeight('parentHeight',140);await until(()=>parentDisclosure(),'Growing parent disclosure absent');
 await action('view.fit');await wait(150);if(parentDisclosure().getAttribute('aria-expanded')!=='true')await click(parentDisclosure());
 await until(()=>card('Overflow 27'),'Growing descendants absent');await wait(200);
 const fixed=parentPanel().querySelector('.kplex-zone-fixed');check(fixed&&parseFloat(parentPanel().style.height)>800&&!root(host).querySelector('.kplex-zone-scroll'),'Expanded parent forest did not grow beyond the minimum height ceiling');
 fixed.scrollTop=1000;check(fixed.scrollTop===0&&fixed.scrollHeight<=fixed.clientHeight+1,'Growing parent region acquired inner scrolling');
 const routeCount=root(host).querySelectorAll('.kplex-edge-hit').length;check(routeCount>=28,'Growing forest lost canonical connector routes');
 const oldCamera=root(host).querySelector('.kplex-camera').style.transform,graphBounds=root(host).querySelector('.kplex-plex').getBoundingClientRect(),noteBounds=card('Input Parent').getBoundingClientRect();
 const wheelX=Math.round(noteBounds.x+noteBounds.width/2),wheelY=Math.round(noteBounds.y+noteBounds.height/2);check(wheelY>graphBounds.top&&wheelY<graphBounds.bottom,'Wheel fixture parent outside canvas');
 native.webContents.sendInputEvent({type:'mouseWheel',x:wheelX,y:wheelY,deltaY:-40,deltaX:0,canScroll:true});
 await until(()=>root(host).querySelector('.kplex-camera').style.transform!==oldCamera,'Plain wheel was trapped by the non-scrolling parent region');
 check(fixed.scrollTop===0&&center(host)===path('Memory')&&session.layoutRoot(path('Memory'))===path('Memory'),'Growth or wheel changed scroll/root/attention');
 cases.push({id:'native-parent-forest-grows-without-inner-scroll-and-wheel-reaches-canvas',descendants:28});
}
