/** Native attention-editor acceptance for Wu Xing. Uses only test-owned notes, the existing editor controller and exact window; no alternative editor binding or production instrumentation is installed. */
export async function acceptWuXingEditor(x){
 const {app,p,c,workspace,native,host,restores,cases,path,root,check,wait,until,localReady,choose,panel,reveal,quiet}=x;
 const tab=p.settingsTab,session=host.view.documentSession.plexView;
 const configure=(path,value)=>p.updateCanvasViewConfiguration('wuxing',{field:'presets',path:['wuxing',...path]},{kind:'set',value});
 const region=id=>[...root(host).querySelectorAll('[data-kplex-decoration]')].find(element=>element.dataset.kplexDecoration===JSON.stringify(['facets','wuxing','category',id]));
 const stop=quiet();await configure(['spacing'],80);await until(localReady,'Configuration local proof/active work did not settle');await wait(200);stop('type-configuration-zero-source-work');
 p.openSettings();await until(()=>tab.containerEl.isConnected,'Native Settings absent');
 for(const key of ['settings.ui.plex.behavior','view.wuxing']){check(tab.openSettingsPage(p.translator(key)),'Native view settings page absent: '+key);await wait(80)}
 const ownerDocument=tab.containerEl.ownerDocument;
 const manage=[...ownerDocument.querySelectorAll('.setting-item')].find(row=>row.querySelector('.setting-item-name')?.textContent===p.translator('facets.manage')&&row.getBoundingClientRect().height>0);check(manage,'Native preset manager action absent');(manage.querySelector('button')??manage).click();
 await until(()=>ownerDocument.querySelector('.kplex-style-manager-row'),'Native preset library absent');
 const preset=[...ownerDocument.querySelectorAll('.kplex-style-manager-row')].find(row=>row.querySelector('.kplex-style-manager-name')?.textContent===p.translator('facets.presetWuXing'));check(preset,'Native Wu Xing preset absent');preset.click();await wait(120);
 // Native declarative subpages can live outside PluginSettingTab.containerEl. Use the owning Settings document, as the existing accepted settings driver does.
 const row=[...tab.containerEl.ownerDocument.querySelectorAll('.setting-item')].find(element=>element.querySelector('.setting-item-name')?.textContent===p.translator('wuxing.label')&&element.getBoundingClientRect().height>0);
 const input=row?.querySelector('input');check(input,'Native phase label field absent');input.value='Memory / 記憶';input.dispatchEvent(new input.ownerDocument.defaultView.Event('input',{bubbles:true}));
 const save=[...ownerDocument.querySelectorAll('.modal button')].find(button=>button.textContent===p.translator('common.save')&&button.getBoundingClientRect().height>0);check(save&&!save.disabled,'Native preset Save absent/disabled');save.click();
 await until(()=>p.settings.canvasViewSettings.wuxing?.values.presets?.wuxing?.categories.water.label==='Memory / 記憶','Native setting did not publish');await p.settingsWriteQueue;app.setting.close();
 await until(()=>region('water')?.textContent.includes('Memory / 記憶'),'Native label did not reach the region');cases.push({id:'native-settings-preset-manager-durable-multilingual-label'});
 host.view.centerPresentation.update({embedCentralNode:true,centralNodeMarkdownMode:'source'});
 await until(()=>root(host).querySelector('.kplex-central-editor-content .cm-content'),'Attention native source editor absent');
 await reveal(host);const content=root(host).querySelector('.kplex-central-editor-content .cm-content');content.focus();
 await until(()=>workspace.activeLeaf?.view.editor&&root(host).querySelector('.kplex-central-editor-leaf-host')?.contains(workspace.activeLeaf.view.containerEl),'Native embedded leaf focus absent');
 const leaf=workspace.activeLeaf,editor=leaf.view.editor,element=root(host).querySelector('.kplex-central-editor-content');
 check(leaf.view.file.path===path('Memory'),'Editor document identity differs from attention');
 // Native file identity and .cm-content exist before asynchronous open completes. Establish an actually loaded document before inserting the dirty-buffer precondition.
 await until(()=>!element.querySelector('.kplex-central-editor-status')&&editor.getValue().includes('Disposable Wu Xing native fixture.'),'Native source document did not finish loading');
 const overlay=root(host).querySelector('.kplex-central-editor-overlay');check(overlay?.getBoundingClientRect().width>0,'Editor phase anchor has no native bounds');
 const visibleBounds=root(host).querySelector('.kplex-plex').getBoundingClientRect(),openingBounds=overlay.getBoundingClientRect();
 check(openingBounds.left+openingBounds.width/2>=visibleBounds.left&&openingBounds.left+openingBounds.width/2<=visibleBounds.right&&openingBounds.top+openingBounds.height/2>=visibleBounds.top&&openingBounds.top+openingBounds.height/2<=visibleBounds.bottom,'Autozoom-off native editor opening is outside the canvas viewport');
 const cameraBeforeExpansion=root(host).querySelector('.kplex-camera').style.transform,expandedDocument=editor.getValue(),expandedCursor=JSON.stringify(editor.getCursor());
 const namedButton=label=>[...element.querySelectorAll('button')].find(button=>(button.getAttribute('aria-labelledby')??'').split(/\s+/).map(id=>button.ownerDocument.getElementById(id)?.textContent??'').join(' ')===label);
 const maximize=namedButton(p.translator('centralEditor.maximize'));check(maximize,'Existing native editor expansion control absent');maximize.click();
 await until(()=>overlay.classList.contains('is-maximized'),'Native editor did not expand');await wait(80);
 const centeredExpanded=()=>{const box=overlay.getBoundingClientRect(),viewport=root(host).querySelector('.kplex-plex').getBoundingClientRect();
  c.progress={phase:'expanded-native-phase-anchor',cases,geometry:{centerX:box.x+box.width/2-viewport.x,centerY:box.y+box.height/2-viewport.y,viewportWidth:viewport.width,viewportHeight:viewport.height}};
  check(Math.abs(c.progress.geometry.centerX-viewport.width/2)<3&&Math.abs(c.progress.geometry.centerY-viewport.height/2)<3,'Expanded Wu Xing attention editor is not centered in the owning viewport')};
 centeredExpanded();await configure(['categories','water','values'],['water-not-mapped']);await wait(100);centeredExpanded();
 check(root(host).querySelector('.kplex-central-editor-content')===element&&leaf.view.file.path===path('Memory'),'Expanded reclassification retargeted the centered attention editor');
 await configure(['categories','water','values'],['water']);await wait(100);centeredExpanded();
 const expandedNativeBounds=native.getBounds(),expandedViewportSize={width:root(host).clientWidth,height:root(host).clientHeight};
 native.setBounds({...expandedNativeBounds,width:Math.max(1000,expandedNativeBounds.width-120),height:Math.max(700,expandedNativeBounds.height-50)});
 await until(()=>root(host).clientWidth!==expandedViewportSize.width||root(host).clientHeight!==expandedViewportSize.height,'Expanded native resize did not change the viewport');await wait(100);centeredExpanded();
 native.setBounds(expandedNativeBounds);await until(()=>root(host).clientWidth===expandedViewportSize.width&&root(host).clientHeight===expandedViewportSize.height,'Expanded native viewport did not restore');await wait(100);centeredExpanded();
 const restore=namedButton(p.translator('centralEditor.restore'));check(restore,'Native editor restore control absent');restore.click();await until(()=>!overlay.classList.contains('is-maximized'),'Native editor did not restore');
 await wait(100);check(root(host).querySelector('.kplex-central-editor-content')===element&&leaf.view.editor===editor&&editor.getValue()===expandedDocument&&JSON.stringify(editor.getCursor())===expandedCursor,'Expansion replaced the native editor/document/content/caret');
 check(root(host).querySelector('.kplex-camera').style.transform===cameraBeforeExpansion,'Expansion did not restore the exact pre-expansion camera');cases.push({id:'native-attention-editor-expanded-reclassified-resized-and-restored-at-phase-anchor'});
 const marker='\nKplex-220-dirty-content\n';editor.replaceRange(marker,editor.getCursor('to'));const line=editor.getValue().split('\n').findIndex(text=>text.includes('Kplex-220-dirty-content'));editor.setCursor({line,ch:8});
 const value=editor.getValue(),cursor=JSON.stringify(editor.getCursor());
 const dirtyAtReclassification=!(await app.vault.read(app.vault.getFileByPath(path('Memory')))).includes(marker.trim());check(dirtyAtReclassification,'Dirty native editor precondition was not observed');
 const attentionBounds=overlay.getBoundingClientRect();
 await configure(['categories','water','values'],['unmapped-water']);await until(()=>root(host).querySelector('.kplex-node-badge')?.textContent.includes(p.translator('facets.unassigned')),'Reclassification did not update the focused category badge');
 const editorBounds=overlay.getBoundingClientRect();
 check(Math.abs(editorBounds.x-attentionBounds.x)<1&&Math.abs(editorBounds.y-attentionBounds.y)<1,'Presentation-only reclassification moved the centered attention editor');
 c.progress={phase:'reclassification-native-identity',cases,identity:{element:root(host).querySelector('.kplex-central-editor-content')===element,editor:leaf.view.editor===editor,document:leaf.view.file.path===path('Memory'),content:editor.getValue()===value,caret:JSON.stringify(editor.getCursor())===cursor,focus:element.contains(element.ownerDocument.activeElement),documentFocused:element.ownerDocument.hasFocus(),activeTag:element.ownerDocument.activeElement?.tagName}};
 check(Object.entries(c.progress.identity).filter(([key])=>!['documentFocused','activeTag'].includes(key)).every(([,value])=>value),'Reclassification retargeted or replaced native content/caret/focus');
 const viewportBefore={width:root(host).clientWidth,height:root(host).clientHeight};
 const resizeBounds=native.getBounds();native.setBounds({...resizeBounds,width:Math.max(1000,resizeBounds.width-140),height:Math.max(700,resizeBounds.height-60)});
 await until(()=>root(host).clientWidth!==viewportBefore.width||root(host).clientHeight!==viewportBefore.height,'Native resize did not actually change the canvas viewport');await wait(250);
 check(editor.getValue()===value&&JSON.stringify(editor.getCursor())===cursor&&element.contains(element.ownerDocument.activeElement),'Ordinary window resize lost dirty text/caret/focus');
 await choose(host,'classic');panel(host).querySelector('.kplex-filter-panel-header button').click();await choose(host,'wuxing');panel(host).querySelector('.kplex-filter-panel-header button').click();content.focus();
 check(root(host).querySelector('.kplex-central-editor-content')===element&&leaf.view.editor===editor&&editor.getValue()===value&&JSON.stringify(editor.getCursor())===cursor,'Compatible view switch replaced the native editor');
 cases.push({id:'attention-native-editor-phase-reclassification-resize-compatible-switch',dirtyAtReclassification,documentRetained:true,contentRetained:true,caretRetained:true});
 if(c.includeSidecar){
 if(c.compareSidecar){await choose(host,'classic');panel(host).querySelector('.kplex-filter-panel-header button').click();}
 const surface=[...p.actionSurfaceHosts].find(([,registration])=>registration.leaf===host)?.[0];check(surface,'Native action surface absent');
 const sidecarOutcome=await p.actionManager.dispatch({id:'view.sidecar.toggle',source:'internal',surfaceId:surface});check(sidecarOutcome.status==='completed','Shared Sidecar action failed: '+JSON.stringify(sidecarOutcome));
 const side=p.sidecarLeaves.get(host);check(side,'Owned Sidecar absent');await until(()=>side.view.file?.path===path('Memory'),'Sidecar document absent');content.focus();
 await p.actionManager.dispatch({id:'graph.focus',source:'internal',surfaceId:surface});
 const selection=await p.actionManager.dispatch({id:'selection.center',source:'internal',surfaceId:surface});check(selection.status==='completed','Shared native selection did not execute');await p.actionManager.dispatch({id:'selection.move.right',source:'internal',surfaceId:surface});
 c.progress={phase:'sidecar-editor-identity',cases,sidecarIdentity:{view:session.definition.id,comparison:c.compareSidecar,attention:centerPath(),oldEditorConnected:element.isConnected,oldLeafType:leaf.view.getViewType(),oldDocument:leaf.view.file?.path===path('Memory'),currentEditor:root(host).querySelector('.kplex-central-editor-content')===element,sidecarDocument:side.view.file?.path===path('Memory'),content:editor.getValue()===value}};
 /** Capture only the owned attention identity at the combined Sidecar boundary. */
 function centerPath(){return host.view.documentSession.centerPath===path('Memory')}
 check(leaf.view.file?.path===path('Memory')&&p.sidecarLeaves.get(host)===side&&side.view.file?.path===path('Memory')&&editor.getValue()===value,'Selection redirected editor or Sidecar');
 await configure(['categories','fire','values'],['fire','water']);await wait(100);check(leaf.view.file.path===path('Memory')&&p.sidecarLeaves.get(host)===side&&side.view.file.path===path('Memory'),'Mapping redirected native documents');
 cases.push({id:'selection-and-phase-mapping-preserve-editor-and-owned-sidecar'});
 await p.closeSidecar(host);await reveal(host);content.focus();editor.setCursor(editor.lastLine(),editor.getLine(editor.lastLine()).length);
 }else{await reveal(host);content.focus();editor.setCursor(editor.lastLine(),editor.getLine(editor.lastLine()).length);}
 /** Keep the original guarded clipboard lane intact and explicitly separate native typed-input lifecycle coverage. */
 async function clipboardInsertion(){
 // Follow the existing support-report driver's guarded text/empty policy. Raw writeBuffer does
 // not certify restoration of standard native formats; never replace rich/custom clipboard data.
 const clipboard=require('electron').clipboard,formats=clipboard.availableFormats();
 check(formats.length===0||formats.length===1&&formats[0]==='text/plain','Clipboard has rich/custom formats; leave it untouched');
 const originalClipboard={empty:formats.length===0,text:clipboard.readText(),formats};
 restores.push(()=>{if(originalClipboard.empty)clipboard.clear();else clipboard.writeText(originalClipboard.text);
  if(clipboard.readText()!==originalClipboard.text||JSON.stringify(clipboard.availableFormats())!==JSON.stringify(originalClipboard.formats))throw Error('Original native clipboard text/formats were not restored');cases.push({id:'native-clipboard-original-text-and-formats-restored',originalEmpty:originalClipboard.empty})});
 const paste='Kplex-220-native-clipboard-'+Date.now(),keys=[];clipboard.writeText(paste);
 const keyDown=event=>{if(event.ctrlKey)keys.push({key:event.key,trusted:event.isTrusted,inEditor:element.contains(event.target)})};element.ownerDocument.addEventListener('keydown',keyDown,true);restores.push(()=>element.ownerDocument.removeEventListener('keydown',keyDown,true));
 if(c.osInput){c.progress={phase:'await-os-paste',cases,pasteReady:true};await until(()=>editor.getValue().includes(paste),'OS paste did not reach exact native editor',120000)}
 else{for(const type of ['keyDown','keyUp'])native.webContents.sendInputEvent({type,keyCode:'V',modifiers:['control']});await until(()=>editor.getValue().includes(paste),'Trusted native paste did not reach editor')}
 if(c.osInput){c.progress={phase:'await-os-select-copy',cases};await until(()=>clipboard.readText().includes('Disposable Wu Xing native fixture.')&&clipboard.readText().includes(paste),'OS select/copy did not deliver owned document text',120000)}
 else{for(const code of ['A','C'])for(const type of ['keyDown','keyUp'])native.webContents.sendInputEvent({type,keyCode:code,modifiers:['control']});await until(()=>clipboard.readText().includes('Disposable Wu Xing native fixture.')&&clipboard.readText().includes(paste),'Trusted native copy did not copy the fixture')}
 check(keys.some(key=>key.trusted&&key.inEditor&&key.key.toLowerCase()==='v')&&keys.some(key=>key.trusted&&key.inEditor&&key.key.toLowerCase()==='c'),'Trusted exact native editor clipboard keys absent');
 cases.push({id:'windows-native-editor-clipboard-keys',transport:c.osInput?'OS_CUA':'Electron',keys});
  return paste;
 }
 let inserted;
 if(c.lane==='editor-lifecycle'){
  inserted='Kplex-222-native-typed-'+Date.now();await native.webContents.insertText(inserted);await until(()=>editor.getValue().includes(inserted),'Native typed insertion did not reach the owned editor');
  cases.push({id:'windows-native-editor-typed-input-without-clipboard',transport:'Electron_insertText',clipboardAccessed:false});
 }else inserted=await clipboardInsertion();
 const modelBeforeNavigation={dirtyMarker:editor.getValue().includes(marker.trim()),nativeInsertion:editor.getValue().includes(inserted)};
 check(modelBeforeNavigation.dirtyMarker&&modelBeforeNavigation.nativeInsertion,'Owned native content was lost before explicit navigation');
 p.notifyNavigation(path('Goal'),host);await until(()=>host.view.documentSession.centerPath===path('Goal')&&root(host).querySelector('.kplex-central-editor-content .cm-content'),'Explicit note activation did not navigate');
 await until(()=>!element.isConnected,'Explicit navigation did not retire the old native document');
 // Detachment initiates the host's asynchronous save; DOM retirement is not its completion signal. Observe the file under the same existing20-second native-step bound without forcing a save ourselves.
 const saveDeadline=Date.now()+20000;let saved=await app.vault.read(filesMemory());
 while(!(saved.includes(marker.trim())&&saved.includes(inserted))&&Date.now()<saveDeadline){await wait(100);saved=await app.vault.read(filesMemory())}
 c.progress={phase:'native-save-result',cases,modelBeforeNavigation,savedMarkers:{dirtyMarker:saved.includes(marker.trim()),nativeInsertion:saved.includes(inserted)}};
 check(saved.includes(marker.trim())&&saved.includes(inserted),'Normal explicit navigation failed to save native content');
 /** Reacquire the owned file by its exact path rather than holding a stale native editor identity. */
 function filesMemory(){const file=app.vault.getFileByPath(path('Memory'));check(file,'Owned Memory fixture disappeared');return file}
 const currentContent=root(host).querySelector('.kplex-central-editor-content');check(currentContent!==element,'Explicit document change did not retire the old host');
 cases.push({id:'explicit-attention-navigation-saves-content-and-retires-old-native-document'});
 const mainParent=host.parent,mainIndex=mainParent.children.indexOf(host),documentSession=host.view.documentSession,migrationGeneration=host.view.getPlexFoldGeneration();
 check(typeof workspace.moveLeafToPopout==='function','Native popout migration unavailable');workspace.moveLeafToPopout(host);
 // DOM adoption precedes onWindowMigrated's React teardown/remount. Do not mistake the adopted old editor or its already-resolved readiness promise for the new native host.
 await until(()=>host.view.containerEl.ownerDocument!==document&&host.view.getPlexFoldGeneration()>migrationGeneration,'Editor popout did not finish native React migration');await host.view.waitUntilReady();await reveal(host);
 await until(()=>root(host).querySelector('.kplex-central-editor-content .cm-content'),'Popout attention editor did not remount');
 check(host.view.documentSession===documentSession&&host.view.documentSession.centerPath===path('Goal')&&session.definition.id==='wuxing','Popout changed native session/view/attention');
 const popoutSurface=[...p.actionSurfaceHosts].find(([,registration])=>registration.leaf===host)?.[0];check(popoutSurface,'Popout action surface absent');
 const focusOutcome=await p.actionManager.dispatch({id:'editor.focus',source:'internal',surfaceId:popoutSurface});
 c.progress={phase:'popout-editor-focus',cases,focusOutcome,activeNativeGoal:workspace.activeLeaf?.view.file?.path===path('Goal'),ownerDocumentFocused:host.view.containerEl.ownerDocument.hasFocus()};
 check(focusOutcome.status==='completed','Shared popout editor focus action did not complete');
 await until(()=>workspace.activeLeaf?.view.file?.path===path('Goal')&&root(host).querySelector('.kplex-central-editor-leaf-host')?.contains(workspace.activeLeaf.view.containerEl),'Popout editor opened a different document');
 const popoutGeneration=host.view.getPlexFoldGeneration();host.parent.removeChild(host);mainParent.insertChild(Math.min(mainIndex,mainParent.children.length),host);await workspace.revealLeaf(host);
 await until(()=>host.view.containerEl.ownerDocument===document&&host.view.getPlexFoldGeneration()>popoutGeneration,'Main return did not finish native React migration');await host.view.waitUntilReady();await reveal(host);
 await until(()=>host.view.containerEl.ownerDocument===document&&root(host).querySelector('.kplex-central-editor-content .cm-content'),'Main-window return lost the attention editor');
 check(host.view.documentSession===documentSession&&host.view.documentSession.centerPath===path('Goal')&&session.definition.id==='wuxing','Main return changed native session/view/attention');
 cases.push({id:'attention-editor-popout-main-remount-correct-document-and-session'});
 host.view.centerPresentation.update({embedCentralNode:false});await until(()=>!root(host).querySelector('.kplex-central-editor-content'),'Editor cleanup did not unmount');
 check(!element.isConnected,'Retired source editor remains connected');
 cases.push({id:'native-editor-explicit-collapse-cleanup'});
}
