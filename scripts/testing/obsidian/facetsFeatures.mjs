/** Native Facets acceptance. Uses the shipped selector, scoped writer, preset manager, shared
 * actions and native dialogs. All notes/configuration and captured images are test-owned. */
export async function acceptFacetsFeatures(x){
 const {app,p,c,host,native,cases,path,root,center,check,wait,until,localReady,choose,panel,reveal,quiet}=x;
 const session=host.view.documentSession.plexView,doc=host.view.containerEl.ownerDocument;
 const surface=/** Reacquire this exact native leaf's current shared action surface. */ ()=>[...p.actionSurfaceHosts].find(([,registration])=>registration.leaf===host)?.[0];
 const action=/** All native commands use the shipped catalog and captured owner. */ async(id,args)=>{const result=await p.actionManager.dispatch({id,source:'internal',surfaceId:surface(),...(args?{args}:{})});check(result.status==='completed',id+': '+JSON.stringify(result));return result};
 const preset=/** Select through the actual opening canvas's contributed dropdown. */ async id=>{await choose(host,'wuxing');const select=panel(host).querySelector('[data-kplex-view-choice="preset"] select');check(select,'Captured preset choice absent');select.value=id;select.dispatchEvent(new doc.defaultView.Event('change',{bubbles:true}));await until(()=>session.state?.preset===id,'Preset did not reach owning session');panel(host).querySelector('.kplex-filter-panel-header button').click();await wait(100)};
 const region=/** Exact opaque region identity avoids label and CSS-escaping assumptions. */ (id,category)=>[...root(host).querySelectorAll('[data-kplex-decoration]')].find(element=>element.dataset.kplexDecoration===JSON.stringify(['facets',id,'category',category]));
 const focus=/** Establish the explicit fixture destination through shared actions; an attention notification alone intentionally retains a rooted map. */ async name=>{p.notifyNavigation(path(name),host);await until(()=>center(host)===path(name)&&p.actionManager.readSnapshot(surface())?.center?.identity===path(name),'Focused note absent');if(session.definition.navigation==='rooted'){const node=p.actionManager.readSnapshot(surface()).center,result=await p.actionManager.dispatch({id:'node.activate',source:'internal',surfaceId:surface(),target:{kind:'explicit',node}});check(result.status==='completed','Explicit fixture root action unavailable');await until(()=>session.layoutRoot(path(name))===path(name),'Explicit fixture root did not settle');}await until(()=>[...root(host).querySelectorAll('[data-kplex-path]')].some(element=>element.dataset.kplexPath===path(name)),'Focused note did not render');await until(localReady,'Focused cached metadata did not settle');await wait(100)};
 const capture=/** Capture only the actual disposable canvas; no synthetic rendering or private notes. */ async name=>{await reveal(host);await action('view.fit');await wait(200);const bounds=root(host).querySelector('.kplex-plex').getBoundingClientRect(),image=await native.webContents.capturePage({x:Math.max(0,Math.ceil(bounds.x)),y:Math.max(0,Math.ceil(bounds.y)),width:Math.floor(bounds.width),height:Math.floor(bounds.height)});require('node:fs').writeFileSync(c.screenshotPrefix+'-'+name+'.png',image.toPNG())};
 const configure=/** Fixture configuration returns to the existing queued settings writer. */ (path,value)=>p.updateCanvasViewConfiguration('wuxing',{field:'presets',path},{kind:'set',value});
 await action('view.fit');await action('view.areas.toggle');await until(()=>root(host).querySelector('.is-area-settings-mode'),'Area settings mode absent');await wait(200);
 const areaStop=quiet();
 for(const [kind,name]of [['category','water'],['status','unassigned'],['status','conflicting'],['status','unresolved']]){
  const id=JSON.stringify(['facets','wuxing',kind,name]);
  for(const axis of ['height','width'])for(const delta of [12,-8]){
   const frame=root(host).querySelector('.'+doc.defaultView.CSS.escape('kplex-area-'+id)),handle=frame?.querySelector(axis==='width'?'.is-width-handle':'.is-height-handle');check(handle,'Native resizable area absent: '+name+' / '+axis);
   const box=handle.getBoundingClientRect(),x=Math.round(box.x+box.width/2),y=Math.round(box.y+box.height/2),before=Number(handle.getAttribute('aria-valuenow'));
   const to={x:x+(axis==='width'?delta:0),y:y+(axis==='height'?delta:0)};
   native.webContents.sendInputEvent({type:'mouseMove',x,y});native.webContents.sendInputEvent({type:'mouseDown',x,y,button:'left',clickCount:1});native.webContents.sendInputEvent({type:'mouseMove',...to,button:'left'});await wait(100);native.webContents.sendInputEvent({type:'mouseUp',...to,button:'left',clickCount:1});await wait(100);
   const after=(axis==='width'?session.getAreaWidths():session.getAreaHeights())[id];check(delta>0?after>before:after<before,'Native physical edge resize has wrong direction/no effect: '+name+' / '+axis);cases.push({id:'native-area-'+(axis==='width'?'width-':'')+'resize-'+name,delta,before,after});
  }
 }
 areaStop('native-area-resize-zero-source-work');await action('view.areas.toggle');
 if(c.lane==='areas')return;
 await configure(['state'],{...c.stateExample,diagnostics:{...c.stateExample.diagnostics,combined:false}});await until(localReady,'Custom preset configuration did not settle');
 const settingsBefore=JSON.stringify(p.settings.canvasViewSettings);
 for(const id of ['classic','mindmap','wuxing']){
  await choose(host,id);await wait(100);const settingsStop=quiet(),before=center(host),controls=panel(host).querySelector('.kplex-view-controls');
  const cog=controls.querySelector('.kplex-view-selector button');check(cog&&!cog.hasAttribute('title'),'Native view settings cog absent');cog.click();
  await until(()=>app.setting.isOpen&&app.setting.pageStack.at(-1)?.page.title===p.translator(session.definition.labelKey),'View cog did not open its exact native Settings page');
  check(center(host)===before&&session.definition.id===id,'View settings navigation changed canvas attention/view');app.setting.close();
  settingsStop('native-view-settings-cog-zero-source-work-'+id);cases.push({id:'native-view-settings-cog-'+id});
 }
 for(const id of ['para','state','para']){
  await preset(id);await choose(host,'wuxing');const controls=panel(host).querySelector('.kplex-view-controls'),viewSelect=controls.querySelector('.kplex-view-selector select'),choice=controls.querySelector('[data-kplex-view-choice="preset"]'),select=choice.querySelector('select');
  check(Math.abs(viewSelect.getBoundingClientRect().top-select.getBoundingClientRect().top)<2,'Native view/preset selectors are not adjacent');
  const settingsStop=quiet(),name=select.selectedOptions[0].textContent.trim(),before=center(host);choice.querySelector('button').click();
  await until(()=>app.setting.isOpen&&p.settingsTab.containerEl.ownerDocument.querySelector('.modal-title')?.isConnected,'Preset cog did not open native Settings');
  const settingsDoc=p.settingsTab.containerEl.ownerDocument,editor=()=>[...settingsDoc.querySelectorAll('.modal')].find(element=>element.querySelector('.modal-title')?.textContent===p.translator('facets.edit'));
  await until(editor,'Preset cog did not open its existing native editor');
  const row=[...editor().querySelectorAll('.setting-item')].find(element=>element.querySelector('.setting-item-name')?.textContent===p.translator('facets.name'));
  check(row?.querySelector('input')?.value===name&&center(host)===before&&session.state.preset===id,'Preset cog retargeted the selected preset/canvas');
  [...editor().querySelectorAll('button')].find(button=>button.textContent===p.translator('common.cancel')).click();
  await until(()=>!editor(),'Preset draft did not cancel');
  const manager=[...settingsDoc.querySelectorAll('.modal')].find(element=>element.querySelector('.kplex-style-manager-row'));check(manager,'Owning preset manager disappeared');const settingsContents=settingsDoc.defaultView.require('@electron/remote').getCurrentWindow().webContents;for(const type of ['keyDown','keyUp'])settingsContents.sendInputEvent({type,keyCode:'Escape'});await until(()=>!manager.isConnected,'Owning preset manager did not close');app.setting.close();
  settingsStop('native-preset-settings-cog-zero-source-work-'+id);cases.push({id:'native-preset-settings-cog-'+id});
 }
 check(JSON.stringify(p.settings.canvasViewSettings)===settingsBefore,'Opening/cancelling settings cogs wrote configuration');
 const stop=quiet();
 for(const [id,count]of[['arc',3],['para',4],['wuxing',5],['gtd',6],['eaccess',7],['sensemaking',4],['publishing',5],['map-roles',4],['state',4]]){
  await preset(id);check(root(host).querySelectorAll('.kplex-view-region').length===count+2+(id==='wuxing'?1:0),'Preset category/status region count differs: '+id);
  check(root(host).querySelector('.kplex-node-badge')?.textContent.trim(),'Centered category badge absent: '+id);
  cases.push({id:'native-preset-'+id,categories:count});
 }
 stop('all-preset-switches-zero-source-work');
 await action('view.fullscreen.toggle');for(const id of ['arc','para','wuxing','gtd','eaccess','sensemaking','publishing','map-roles','state']){await preset(id);await capture(id)}await action('view.fullscreen.toggle');
 await preset('wuxing');
 const cycle=['wood','fire','earth','metal','water'],roles=['facets.relativeSame','facets.relativeGenerate','facets.relativeRegulate','facets.relativeRegulated','facets.relativeGenerated'];
 const originalBody=await app.vault.read(app.vault.getFileByPath(path('Memory')));
 const originalRelations=JSON.stringify(p.index.neighbours(p.index.get(path('Memory')),'child').map(row=>row.page.path).sort());
 for(const name of ['Concept','Method']){
  await focus(name);const phase=name==='Concept'?'wood':'metal';
  for(const candidate of cycle)check(region('wuxing',candidate)?.querySelector('.kplex-view-region-description')?.textContent===p.translator(roles[(cycle.indexOf(candidate)-cycle.indexOf(phase)+5)%5]),'Relative label differs: '+phase+' / '+candidate);
  check(root(host).querySelectorAll('.kplex-view-guide').length===10&&[...root(host).querySelectorAll('.kplex-view-guide')].every(element=>!element.hasAttribute('data-kplex-edge-id')&&doc.defaultView.getComputedStyle(element).pointerEvents==='none'),'Decorative cycles gained interaction authority');
  check(app.metadataCache.getFileCache(app.vault.getFileByPath(path(name))).frontmatter.phase===phase,'Focus changed stored phase');
 }
 check(await app.vault.read(app.vault.getFileByPath(path('Memory')))===originalBody&&JSON.stringify(p.index.neighbours(p.index.get(path('Memory')),'child').map(row=>row.page.path).sort())===originalRelations,'Relative perspective changed canonical relationships');
 cases.push({id:'wood-metal-relative-labels-preserve-stored-phases-and-canonical-evidence'});
 for(const name of ['Conflict','Unmapped']){await focus(name);for(const candidate of cycle)check(region('wuxing',candidate)?.querySelector('.kplex-view-region-description')?.textContent===p.translator('facets.relativeUnavailable'),'Unknown/conflicting focus claimed a relative role')}
 cases.push({id:'conflicting-unassigned-focus-no-assumed-relative-phase'});
 await focus('Concept');await action('selection.center');
 const before=await app.vault.read(app.vault.getFileByPath(path('Concept')));
 await action('node.assign-category',{assignmentId:JSON.stringify(['facets','wuxing','category','metal'])});
 const dialog=()=>[...doc.querySelectorAll('.modal')].find(element=>element.querySelector('.modal-title')?.textContent===p.translator('assignment.title'));
 await until(dialog,'Native category assignment preview absent');
 const apply=[...dialog().querySelectorAll('button')].find(button=>button.textContent===p.translator('assignment.apply'));check(apply,'Native Apply absent');apply.click();
 await until(()=>!dialog()&&app.metadataCache.getFileCache(app.vault.getFileByPath(path('Concept')))?.frontmatter.phase==='metal','Confirmed assignment did not converge');
 check((await app.vault.read(app.vault.getFileByPath(path('Concept')))).includes('Disposable Wu Xing native fixture.')&&await app.vault.read(app.vault.getFileByPath(path('Memory')))===originalBody,'Assignment changed unrelated content/source relationship');
 await action('view.property-assignment.undo');
 const undo=()=>[...doc.querySelectorAll('.modal')].find(element=>element.querySelector('.modal-title')?.textContent===p.translator('assignment.undo'));
 await until(undo,'Native Undo preview absent');[...undo().querySelectorAll('button')].find(button=>button.textContent===p.translator('assignment.undo')).click();
 await until(()=>!undo()&&app.metadataCache.getFileCache(app.vault.getFileByPath(path('Concept')))?.frontmatter.phase==='wood','Guarded Undo did not converge');
 check((await app.vault.read(app.vault.getFileByPath(path('Concept')))).split('---').slice(2).join('---')===before.split('---').slice(2).join('---'),'Assignment/Undo rewrote note body');
 cases.push({id:'native-property-preview-confirm-save-guarded-undo-preserves-body-and-source-relationships'});
 await focus('Memory');await action('view.fit');await wait(150);
 const source=[...root(host).querySelectorAll('.kplex-thought[data-kplex-path]')].find(element=>element.dataset.kplexPath===path('Concept')),target=region('wuxing','metal');check(source&&target,'Native property drag endpoints absent');
 const sourceBox=source.getBoundingClientRect(),targetBox=target.getBoundingClientRect();
 const from={x:Math.round(sourceBox.x+sourceBox.width/2),y:Math.round(sourceBox.y+sourceBox.height/2)},to={x:Math.round(targetBox.x+targetBox.width/2),y:Math.round(targetBox.bottom-22)};
 check(source.contains(doc.elementFromPoint(from.x,from.y)),'Native property drag source is obscured');
 const input=/** Use the accepted trusted HTML transport without manufacturing its payload. */ (type,point,modifiers=[])=>native.webContents.sendInputEvent({type,x:point.x,y:point.y,...(type==='mouseMove'?{}:{button:'left',clickCount:1}),modifiers});
 const dragProof=await c.htmlDrag({contents:native.webContents,from,to,input,wait,until});
 await until(dialog,'Native region drop did not open property preview');[...dialog().querySelectorAll('button')].find(button=>button.textContent===p.translator('assignment.apply')).click();
 await until(()=>!dialog()&&app.metadataCache.getFileCache(app.vault.getFileByPath(path('Concept')))?.frontmatter.phase==='metal','Native dropped property assignment did not converge');
 check(await app.vault.read(app.vault.getFileByPath(path('Memory')))===originalBody,'Native property drop removed/rewrote the source relationship');
 await action('view.property-assignment.undo');await until(undo,'Native drop Undo preview absent');[...undo().querySelectorAll('button')].find(button=>button.textContent===p.translator('assignment.undo')).click();await until(()=>!undo()&&app.metadataCache.getFileCache(app.vault.getFileByPath(path('Concept')))?.frontmatter.phase==='wood','Native property drop Undo did not converge');
 check(await app.vault.read(app.vault.getFileByPath(path('Memory')))===originalBody,'Native drop Undo changed canonical source relationships');
 cases.push({id:'trusted-native-property-area-drop-preserves-source-relationship-and-undo',transport:'Electron_CDP',...dragProof});
 const rules=structuredClone(c.stateExample);rules.source='rules';rules.name='Native rule probe';
 for(const [id,rule]of Object.entries({seed:'note.phase == "water"',research:'this.phase == "water" and note.phase == "wood"',draft:'edge.role == "child" and note.phase == "fire"',published:'note.phase == "metal"'}))rules.categories[id].rule=rule;
 await configure(['state'],rules);await preset('state');await focus('Memory');
 check(region('state','research')?.textContent.includes('2 shown locally'),'Focus/candidate native rules did not classify two Wood notes');
 p.openSettings();const tab=p.settingsTab;await until(()=>tab.containerEl.isConnected,'Native Settings absent');
 const settingsDoc=tab.containerEl.ownerDocument;
 for(const key of ['settings.ui.plex.behavior','view.wuxing']){check(tab.openSettingsPage(p.translator(key)),'Native Facets page absent');await wait(80)}
 const manage=[...settingsDoc.querySelectorAll('.setting-item')].find(row=>row.querySelector('.setting-item-name')?.textContent===p.translator('facets.manage')&&row.getBoundingClientRect().height>0);check(manage,'Native manager absent');(manage.querySelector('button')??manage).click();await until(()=>settingsDoc.querySelector('.kplex-style-manager-row'),'Preset library absent');
 [...settingsDoc.querySelectorAll('.kplex-style-manager-row')].find(row=>row.querySelector('.kplex-style-manager-name')?.textContent==='Native rule probe').click();
 await until(()=>settingsDoc.querySelector('.kplex-predicate-rule-editor textarea'),'Shared Code rule editor absent');
 const textarea=settingsDoc.querySelector('.kplex-predicate-rule-editor textarea'),save=()=>[...settingsDoc.querySelectorAll('.modal button')].find(button=>button.textContent===p.translator('common.save')&&button.getBoundingClientRect().height>0);
 const type=value=>{Object.getOwnPropertyDescriptor(settingsDoc.defaultView.HTMLTextAreaElement.prototype,'value').set.call(textarea,value);textarea.dispatchEvent(new settingsDoc.defaultView.Event('input',{bubbles:true}))};
 textarea.focus();type('not node.typo.exists()');await until(()=>save()?.disabled,'Invalid authored rule did not block native Save');check(settingsDoc.activeElement===textarea,'Validation stole native typing focus');
 const correctedRule='note.phase == "water" or note.phase == "earth"';type(correctedRule);await until(()=>save()&&!save().disabled,'Corrected rule did not enable native Save');save().click();await until(()=>p.settings.canvasViewSettings.wuxing?.values.presets.state.categories.seed.rule===correctedRule,'Native edited rule did not publish durably');await p.settingsWriteQueue;app.setting.close();
 cases.push({id:'native-shared-rules-editor-focus-invalid-save-guard-and-correction'});
 await focus('Memory');
 // Actual assignment/Undo above changes native source revisions. Cached positive incidence
 // is enough for layout, but Wander correctly requires a prepared center. Establish that
 // distinct fixture precondition through the existing foreground owner, outside zero-work scopes.
 const beforeWanderScope=p.index.viewScopeCoverage(path('Memory'));
 if(!beforeWanderScope.prepared){
  // The local baseline producer deliberately refuses eager source-backed sessions. Reuse the
  // same public, mode-aware visible-center watchdog that the real canvas owns after note edits.
  await p.ensureIndexReady('view-open');const neighborhood=p.index.getNeighborhood(path('Memory'));
  const presented=[neighborhood.parents.length,neighborhood.children.length,neighborhood.leftFriends.length,neighborhood.rightFriends.length,neighborhood.siblings.length];
  const recovered=await p.index.recheckVisibleCenter(path('Memory'),presented,'local-ready',()=>center(host)===path('Memory')&&x.workspace.getLeafById(host.id)===host);
  c.progress={...c.progress,wanderPreparation:{mode:p.index.isOnDemandMode()?'on-demand':'eager',recovered,before:beforeWanderScope,after:p.index.viewScopeCoverage(path('Memory')),sourceReady:p.index.isCenterRecoverySourceReady(),deferred:p.index.preparationDeferred,localForeground:p.index.usesLocalForeground(),sourceRevision:p.getIndexSourceRevision(),fullSourceRevision:p.index.fullSemanticSourceRevision,maintenanceCurrent:p.index.fullSemanticMaintenanceRevision===p.index.sourceAcquisition.getMaintenanceRevision(),policyCurrent:p.index.fullSemanticPolicyRevision===p.index.semanticPolicyRevision}};
 }
 await until(()=>p.index.viewScopeCoverage(path('Memory')).prepared&&!p.index.hasActiveSemanticPreparation(),'Wander fixture did not acquire prepared local coverage');
 cases.push({id:'native-wander-prepared-fixture-after-real-note-edits',before:beforeWanderScope,after:p.index.viewScopeCoverage(path('Memory')),mode:p.index.isOnDemandMode()?'on-demand':'eager'});
 for(const id of ['classic','mindmap','wuxing']){
  await choose(host,id);panel(host).querySelector('.kplex-filter-panel-header button').click();await wait(150);
  const beforeWander=center(host);await action('view.wander.start');await until(()=>root(host).querySelector('.kplex-wander-controls'),'Shared Wander controls absent: '+id);
  await until(()=>{const scope=p.index.viewScopeCoverage(center(host));c.progress={...c.progress,wander:{view:id,hidden:doc.hidden,focused:doc.hasFocus(),nativeFocused:native.isFocused(),scope,graphClass:root(host).querySelector('.kplex-plex')?.className,reason:root(host).querySelector('.kplex-wander-controls [role="status"]')?.textContent,nodes:root(host).querySelectorAll('.kplex-thought[data-kplex-path]').length}};return center(host)!==beforeWander},'Wander did not navigate through the current view: '+id);
  await action('view.wander.stop');await until(()=>!root(host).querySelector('.kplex-wander-controls'),'Shared Wander did not stop: '+id);cases.push({id:'native-wander-start-navigate-stop-'+id});
  await focus('Memory');
 }
 for(const id of ['classic','mindmap','wuxing']){
  await choose(host,id);panel(host).querySelector('.kplex-filter-panel-header button').click();await focus('Memory');await action('view.fit');await wait(100);
  if(id==='mindmap')check(session.layoutRoot(path('Memory'))===path('Memory'),'Alt-click precondition must start from a different map root');
  const node=[...root(host).querySelectorAll('.kplex-thought[data-kplex-path]')].find(element=>element.dataset.kplexPath===path('Concept'));check(node,'Native Alt-click target absent: '+id);
  const box=node.getBoundingClientRect(),x=Math.round(box.x+box.width/2),y=Math.round(box.y+box.height/2);check(node.contains(doc.elementFromPoint(x,y)),'Native Alt-click target obscured');
  for(const type of ['mouseDown','mouseUp'])native.webContents.sendInputEvent({type,x,y,button:'left',clickCount:1,modifiers:['alt']});
  await until(()=>center(host)===path('Concept')&&(id!=='mindmap'||session.layoutRoot(path('Concept'))===path('Concept')),'Native Alt-click did not explicitly center the node: '+id);
  cases.push({id:'native-alt-click-explicit-center-'+id});
 }
 await choose(host,'mindmap');panel(host).querySelector('.kplex-filter-panel-header button').click();await focus('Memory');
 const childField=p.settings.hierarchy.children[0],missing=path('Placeholder');check(!app.vault.getFileByPath(missing),'Placeholder fixture must not exist');
 // This is an actual owned-note edit. Let normal incremental metadata/source publication show
 // the unresolved child; presentation-only zero-work assertions above deliberately end earlier.
 await app.fileManager.processFrontMatter(app.vault.getFileByPath(path('Memory')),frontmatter=>{frontmatter[childField]=[...frontmatter[childField],'[['+missing+']]']});
 const ghost=()=>[...root(host).querySelectorAll('.kplex-thought[data-kplex-path]')].find(element=>element.textContent.includes('Placeholder'));
 await until(ghost,'Normal note edit did not publish the owned placeholder');await action('view.fit');await wait(120);
 const ghostBox=ghost().getBoundingClientRect(),gx=Math.round(ghostBox.x+ghostBox.width/2),gy=Math.round(ghostBox.y+ghostBox.height/2),beforeModals=doc.querySelectorAll('.modal-container').length;
 for(const type of ['mouseDown','mouseUp'])native.webContents.sendInputEvent({type,x:gx,y:gy,button:'left',clickCount:1,modifiers:['control']});
 await until(()=>doc.querySelectorAll('.modal-container').length>beforeModals,'Ctrl-placeholder click did not open its native creation choice');
 check(center(host)===path('Memory')&&session.layoutRoot(path('Memory'))===path('Memory')&&!app.vault.getFileByPath(missing),'Ctrl-placeholder creation choice was replaced by rerooting or an implicit write');
 for(const type of ['keyDown','keyUp'])native.webContents.sendInputEvent({type,keyCode:'Escape'});await until(()=>doc.querySelectorAll('.modal-container').length===beforeModals,'Native placeholder choice did not cancel');
 cases.push({id:'native-control-placeholder-creation-choice-retains-root-and-cancels-without-write'});
 await preset('wuxing');
}
