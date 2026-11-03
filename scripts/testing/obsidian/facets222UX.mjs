/** Exact-build maintainer UX acceptance in disposable Small. The existing native controller
 * owns fixtures, input, settings, captures and unconditional restoration. Clipboard is untouched. */
export async function acceptFacets222UX(x){
 const {app,p,c,host,native,workspace,files,releases,restores,cases,path,root,center,check,wait,until,choose,panel,quiet,reveal}=x;
 const doc=root(host).ownerDocument,t=p.translator,session=host.view.documentSession.plexView;
 const settingsDoc=()=>p.settingsTab?.containerEl?.ownerDocument??doc;
 const button=(element,label)=>[...element.querySelectorAll('button')].find(el=>el.getAttribute('aria-label')===label||el.textContent===label);
 const field=(element,label)=>[...element.querySelectorAll('.setting-item')].find(row=>row.querySelector('.setting-item-name')?.textContent===label)?.querySelector('input,select,textarea');
 const editor=()=>settingsDoc().querySelector('.kplex-facet-preset-editor');
 const transfer=()=>settingsDoc().querySelector('.kplex-portable-package-modal');
 const manager=()=>[...settingsDoc().querySelectorAll('.modal')].find(el=>el.querySelector('.kplex-style-manager-row'));
 const change=(input,value)=>{check(input,'Native field absent');input.value=value;input.dispatchEvent(new input.ownerDocument.defaultView.Event(input.tagName==='SELECT'?'change':'input',{bubbles:true}));};
 /** Trusted native pointer input targets the real current element, never a stale coordinate. */
 const click=async element=>{check(element?.isConnected,'Native click target absent');element.scrollIntoView({block:'nearest'});
  const owner=element.ownerDocument.defaultView.require('@electron/remote').getCurrentWindow();owner.restore();owner.show();owner.focus();owner.webContents.focus();await until(()=>element.ownerDocument.hasFocus(),'Invoking dialog focus absent');
  const r=element.getBoundingClientRect(),x=Math.round(r.x+r.width/2),y=Math.round(r.y+r.height/2),hit=element.ownerDocument.elementFromPoint(x,y);
  check(hit&&element.contains(hit),'Native pointer target is obscured/outside its viewport: '+element.className+' / '+hit?.className);
  for(const type of ['mouseDown','mouseUp'])owner.webContents.sendInputEvent({type,x,y,button:'left',clickCount:1});await wait(120);};
 const key=async(keyCode,modifiers=[],owner=doc)=>{const contents=owner.defaultView.require('@electron/remote').getCurrentWindow().webContents;for(const type of ['keyDown','keyUp'])contents.sendInputEvent({type,keyCode,modifiers});await wait(160);};
 const action=async(id,args)=>{const surface=[...p.actionSurfaceHosts].find(([,entry])=>entry.leaf===host)?.[0];check(surface,'Native action surface absent');return p.actionManager.dispatch({id,source:'internal',surfaceId:surface,...(args?{args}:{})});};
 const selected=()=>{const surface=[...p.actionSurfaceHosts].find(([,entry])=>entry.leaf===host)?.[0];return p.actionManager.readSnapshot(surface)?.selected;};
 /** Captures contain only this controller's generated notes and owned settings dialogs. */
 const capture=async(name,element)=>{const r=element.getBoundingClientRect();require('node:fs').writeFileSync(c.screenshotPrefix+'-ux-'+name+'.png',(await element.ownerDocument.defaultView.require('@electron/remote').getCurrentWindow().webContents.capturePage({x:Math.max(0,Math.ceil(r.x)),y:Math.max(0,Math.ceil(r.y)),width:Math.floor(r.width),height:Math.floor(r.height)})).toPNG());};
 const close=async element=>{const cancel=button(element,t('common.cancel'))??button(element,t('styles.operation.close'));if(cancel)await click(cancel);else await key('Escape',[],element.ownerDocument);await until(()=>!element.isConnected,'Owned dialog did not close');};
 restores.push(async()=>{for(let i=0;i<10;i++){const owned=[...settingsDoc().querySelectorAll('.kplex-markdown-help-modal,.kplex-portable-package-modal,.kplex-facet-preset-editor,.kplex-style-manager-modal')].at(-1);if(!owned)break;await close(owned);}if(app.setting.isOpen)app.setting.close();});
 check(!app.setting.isOpen&&!doc.querySelector('.modal'),'User-owned modal/settings must not be touched');
 await choose(host,'wuxing');
 for(const width of [1280,640]){
  native.setBounds({...native.getBounds(),width,height:900});await wait(250);
  if(!panel(host))await choose(host,'wuxing');
  const group=panel(host).querySelector('[data-kplex-view-choice="preset"]'),rects=[group.querySelector('select'),...group.querySelectorAll('button')].map(el=>el.getBoundingClientRect());
  check(!panel(host).querySelector('[data-kplex-view-choice="layout"]'),'Retired layout selector is still exposed');
  check(rects.length===3&&rects.every(r=>Math.abs(r.bottom-rects[0].bottom)<3)&&rects[2].width<50,'Preset/cog/Info split or Info stretched');
  await capture('selectors-'+width,panel(host));cases.push({id:'native-preset-controls-travel-together',windowWidth:width,controlWidths:rects.map(r=>r.width)});
 }
 native.setBounds({...native.getBounds(),width:1280,height:900});await wait(200);
 await click(panel(host).querySelector('[data-kplex-view-choice="preset"] button'));await until(editor,'Preset cog did not open editor');
 const form=editor(),settingsWindow=form.ownerDocument.defaultView.require('@electron/remote').getCurrentWindow(),settingsBounds=settingsWindow.getBounds();let restoredBounds=false;
 const restoreSettingsBounds=()=>{if(!restoredBounds&&!settingsWindow.isDestroyed())settingsWindow.setBounds(settingsBounds);restoredBounds=true};restores.push(restoreSettingsBounds);
 settingsWindow.restore();settingsWindow.setBounds({...settingsBounds,width:1280,height:900});await wait(250);
 const footer=form.querySelector('.kplex-style-editor-actions'),buttons=[...footer.querySelectorAll('button')];
 c.progress={...c.progress,uxEditor:{width:form.getBoundingClientRect().width,height:form.getBoundingClientRect().height,ownerWidth:form.ownerDocument.defaultView.innerWidth,mainWidth:doc.defaultView.innerWidth,sameDocument:form.ownerDocument===doc,computedWidth:form.ownerDocument.defaultView.getComputedStyle(form).width,computedMaximum:form.ownerDocument.defaultView.getComputedStyle(form).maxWidth}};await capture('preset-diagnostic',form);
 check(form.getBoundingClientRect().width>=900,'Preset editor is unnecessarily narrow '+JSON.stringify(c.progress.uxEditor));
 check(footer.querySelectorAll('.setting-item').length===1&&buttons.length>=7,'Preset actions do not share one row');
 const tops=buttons.map(el=>Math.round(el.getBoundingClientRect().top));check(Math.max(...tops)-Math.min(...tops)<3,'Wide-screen footer wrapped');
 check(buttons.every(el=>el.getAttribute('aria-label')&&el.querySelector('svg')&&!el.hasAttribute('title')),'Icon/name/tooltip contract failed');
 const help=form.querySelector('.kplex-facet-help-settings');help.open=true;await wait(120);
 const sourceRow=help.querySelector('.kplex-facet-help-source'),info=sourceRow.querySelector('.setting-item-info').getBoundingClientRect(),area=sourceRow.querySelector('textarea').getBoundingClientRect();
 check(area.top>=info.bottom&&area.width>=sourceRow.getBoundingClientRect().width-4,'Help textarea does not fill a separate row below its description');
 cases.push({id:'native-preset-help-full-width-below-description',width:area.width,rowWidth:sourceRow.getBoundingClientRect().width});
 await capture('preset-help-source',form);
 help.open=false;
 await capture('preset-editor',form);cases.push({id:'native-wide-preset-editor-single-icon-row',width:form.getBoundingClientRect().width,buttons:buttons.length});
 const before=JSON.stringify(p.readPortableSharingState().presets.wuxing),attention=center(host);
 await wait(300);const stop=quiet();
 change(field(form,t('facets.layout')),'concentric');
 check(field(form,t('facets.layout')).value==='concentric'&&JSON.stringify(p.readPortableSharingState().presets.wuxing)===before,'Unsaved layout changed accepted configuration');
 await click(button(form,t('facets.restore')));check(form.textContent.includes(t('facets.resetStatus'))&&field(form,t('facets.layout')).value==='circular','Reset has no visible feedback or wrong defaults');
 change(field(form,t('facets.layout')),'vertical');
 // Native Save opens an OS picker that blocks CLI transport. Complete that separate
 // check through Computer Use, outside this CLI-controlled transaction. Browser tests
 // retain exact bytes/URL cleanup/clipboard fulfillment; this case claims controls only.
 check(button(form,t('sharing.copyJson'))&&button(form,t('sharing.download')),'Direct JSON actions absent');
 cases.push({id:'native-draft-json-actions-present',nativeFileCompletionVerified:false,clipboardAccessed:false});
 await click(button(form,t('common.save')));await until(()=>!form.isConnected&&p.readPortableSharingState().presets.wuxing.layout==='vertical','Preset layout Save did not publish');
 check(center(host)===attention,'Saving layout changed attention');stop('native-preset-draft-reset-save-zero-source-work');
 await click(button(manager(),t('sharing.importPreset')));await until(transfer,'Import dialog absent');
 const incoming=transfer(),source=incoming.querySelector('textarea');check(source.placeholder===t('sharing.pasteHint')&&incoming.querySelector('input[type=file]'),'Import inputs are unexplained/missing');
 check(incoming.querySelectorAll('.kplex-style-editor-actions .setting-item').length===1&&button(incoming,t('sharing.apply')).disabled,'Import footer or review guard failed');
 const body=incoming.querySelector('.kplex-style-editor-body');check(body.scrollHeight<=body.clientHeight+2,'Empty import scrolls unnecessarily on a large screen');
 await capture('import-empty',incoming);const guideStop=quiet();await click(incoming.querySelector('.kplex-package-intro button'));
 await until(()=>settingsDoc().querySelector('.kplex-markdown-help-modal h2'),'Native format guide did not render');const guide=settingsDoc().querySelector('.kplex-markdown-help-modal');
 check(guide.querySelector('.modal-title')?.textContent===t('sharing.formatHelp'),'Standalone format guidance title was wrapped as a preset name');
 check(guide.querySelector('a[href="https://github.com/zsviczian/kplex/blob/main/docs/PORTABLE_PRESETS.md"]')&&!button(guide,t('view.editHelp')),'Format guide lacks reference or falsely offers preset editing');
 await capture('format-help',guide);await close(guide);guideStop('native-import-format-help-zero-source-work');
 await close(incoming);await close(manager());restoreSettingsBounds();if(app.setting.isOpen)app.setting.close();await wait(250);
 cases.push({id:'native-import-paste-file-guidance-single-footer-and-readonly-help'});
 await reveal(host);await action('view.areas.toggle');
 const wood=JSON.stringify(['facets','wuxing','category','wood']);
 const widthHandle=()=>root(host).querySelector('.'+doc.defaultView.CSS.escape('kplex-area-'+wood)+' .is-width-handle');
 await until(widthHandle,'Native shared width control absent after area mode commit');
 const columns=()=>['Concept','Concept2'].map(name=>[...root(host).querySelectorAll('.kplex-thought')].find(el=>el.dataset.kplexPath===path(name))?.getBoundingClientRect().x);
 const columnStop=quiet();
 for(const [keyCode,multiple]of [['End',true],['Home',false]]){
  check(widthHandle(),'Native shared width control absent');widthHandle().focus();await key(keyCode);await wait(200);
  const xs=columns();check(xs.every(Number.isFinite)&&(xs[0]!==xs[1])===multiple,'Native area width did not reflow measured columns: '+JSON.stringify({keyCode,xs}));
 }
 columnStop('native-facets-area-columns-zero-source-work');cases.push({id:'native-facets-width-keyboard-one-and-multiple-columns'});
 await action('view.areas.toggle');
 await choose(host,'classic');panel(host).querySelector('.kplex-filter-panel-header button').click();
 const compass=()=>root(host).querySelector('.kplex-role-center:not(.is-kplex-section)'),compassSections=()=>compass()?.querySelector('.kplex-section-fold-handle');
 await until(compassSections,'Compass central section toggle absent');await click(compassSections());
 await until(()=>root(host).querySelector('.is-kplex-section'),'Compass explicit outline absent');
 check(center(host)===path('Memory')&&root(host).querySelector('.kplex-section-tree-edge'),'Compass outline changed attention or bypassed shared tree');
 await click(compassSections());await until(()=>!root(host).querySelector('.is-kplex-section'),'Compass outline did not close');
 cases.push({id:'native-compass-central-sections-shared-source-tree-and-fold'});
 await choose(host,'wuxing');panel(host).querySelector('.kplex-filter-panel-header button').click();
 // Real incremental note edits are outside zero-work presentation intervals.
 const child=p.settings.hierarchy.children[0],parents=[];
 for(let i=0;i<3;i++){
  const leaf=await app.vault.create(path('Outward '+i),'# Disposable outward child\n');files.push(leaf);p.index.insertCreatedFile(leaf);releases.push(p.index.acquireSemanticDemand(leaf.path));
  const body='---\n'+JSON.stringify(child)+': '+JSON.stringify(['[['+path('Memory')+']]','[['+leaf.path+']]'])+'\n---\n# Disposable parent\n';
  const parent=await app.vault.create(path('Parent '+i),body);files.push(parent);parents.push(parent);p.index.insertCreatedFile(parent);releases.push(p.index.acquireSemanticDemand(parent.path));
 }
 await until(()=>p.index.neighbours(p.index.get(path('Memory')),'parent').length>=3&&!p.index.hasActiveSemanticPreparation(),'Owned parent incidence did not settle');
 await choose(host,'mindmap');panel(host).querySelector('.kplex-filter-panel-header button').click();session.setAreaHeight('parentHeight',800);await reveal(host);
 const card=name=>[...root(host).querySelectorAll('.kplex-thought')].find(el=>el.dataset.kplexPath===path(name)&&!el.querySelector('.kplex-reference-label'));
 await until(()=>parents.every((_,i)=>card('Parent '+i)),'Native parent occurrences absent');
 await until(()=>!p.index.hasActiveSemanticPreparation(),'Native Mind Map metadata did not settle');
 const rootCard=root(host).querySelector('[data-kplex-keyboard-id="root"]'),gates=p.index.gateStats(p.index.get(path('Memory')));
 check(rootCard.querySelector('.is-branch-disclosure svg'),'Native branch disclosure lacks its distinct chevron');
 const expected={top:gates.top.visibleCount,bottom:gates.bottom.visibleCount,left:gates.left.visibleCount+gates.right.visibleCount};
 for(const [side,value]of Object.entries(expected))check(rootCard.querySelector('.gate-wrap-'+side+' .kplex-gate-count')?.textContent===String(value),'Native Mind Map count differs from canonical owner: '+side);
 cases.push({id:'native-mindmap-canonical-gate-counts',expected});
 await action('selection.center');await action('graph.focus');await key('Up',['alt']);await key('Right');
 check(selected()?.node.path?.includes('/Parent '),'Native arrow selection did not enter a parent');
 const picked=selected().node.path,initialRoot=session.layoutRoot(path('Memory'));await key('Enter',['alt']);await until(()=>session.state.expanded.includes(selected()?.occurrenceId),'Modified Enter did not expand selected parent');
 await key('Enter',['alt']);await until(()=>session.state.collapsed.includes(selected()?.occurrenceId),'Modified Enter did not fold selected parent');
 check(center(host)===path('Memory')&&session.layoutRoot(path('Memory'))===initialRoot&&selected().node.path===picked,'Enter changed root/attention/selection');cases.push({id:'native-arrow-selected-alt-enter-fold-unfold-no-navigation'});
 for(let i=0;i<3;i++){await click(card('Parent '+i).querySelector('.is-branch-disclosure'));await until(()=>card('Outward '+i),'Parent did not expand');}
 for(const columns of [1,2,3]){
  await wait(250);const columnsStop=quiet();await p.updateCanvasViewSetting('mindmap','parentColumns',columns);await wait(250);columnsStop('native-parent-columns-'+columns+'-zero-source-work');
  for(let i=0;i<3;i++){const a=card('Parent '+i).getBoundingClientRect(),b=card('Outward '+i).getBoundingClientRect(),direction=columns>1&&i%columns===0?-1:1;
   check(Math.sign(b.x+b.width/2-a.x-a.width/2)===direction,'Native parent column expanded inward: '+columns+'/'+i);}
  cases.push({id:'native-parent-column-outward-directions',columns});
 }
 await action('view.fit');await capture('mindmap-parent-columns',root(host).querySelector('.kplex-plex'));
 // Only this controller's generated root is edited; ordinary incremental indexing settles
 // before measuring presentation-only heading folds and native editor coexistence.
 const memoryFile=app.vault.getFileByPath(path('Memory'));
 await app.vault.modify(memoryFile,(await app.vault.read(memoryFile))+'\n## Summary\n[['+path('Outward 0')+']]\n## Links\n[['+path('Outward 1')+']]\n## Notes\nAdditional outline text.\n');
 await until(()=>(app.metadataCache.getFileCache(memoryFile)?.headings?.length??0)>=3&&!p.index.hasActiveSemanticPreparation(),'Root note edit did not settle');await wait(250);
 const central=()=>root(host).querySelector('[data-kplex-keyboard-id="root"]');
 const sectionControl=()=>central().querySelector('.kplex-section-fold-handle:not(.is-branch-disclosure)');
 const headings=()=>[...root(host).querySelectorAll('.is-kplex-section')];
 check(sectionControl()&&central().querySelector('.is-branch-disclosure'),'Root must expose independent section and branch controls');
 check([...root(host).querySelectorAll('.kplex-thought:not(.is-kplex-section)')].filter(el=>el!==central()).every(el=>!el.querySelector('.kplex-section-fold-handle:not(.is-branch-disclosure)')),'A noncentral note exposes a Markdown section toggle');
 await action('view.pan.right');await wait(100);const manualCamera=root(host).querySelector('.kplex-camera').style.transform;
 await click(sectionControl());await until(()=>headings().length>=3,'Native central outline did not appear');
 check(root(host).querySelectorAll('.kplex-section-tree-edge').length===headings().length,'Native root outline bypassed the shared tree renderer');
 check(root(host).querySelector('.kplex-camera').style.transform===manualCamera,'Section expansion lost manual camera intent');
 for(const label of ['Summary','Links','Notes']){
  const card=headings().find(el=>el.querySelector('.kplex-thought-text')?.textContent===label),text=card?.querySelector('.kplex-thought-text');
  check(text&&text.scrollWidth<=text.clientWidth+1,'Native Mind Map heading was clipped: '+label);
 }
 cases.push({id:'native-mindmap-heading-labels-fit-shared-section-measurement'});
 await capture('mindmap-root-sections',root(host).querySelector('.kplex-plex'));
 const allHeadings=headings().length,headingFold=headings().find(el=>el.querySelector('.kplex-section-fold-handle'))?.querySelector('.kplex-section-fold-handle');
 check(headingFold,'Native nested heading fold absent');await wait(300);const foldStop=quiet();await click(headingFold);
 await until(()=>headings().length<allHeadings,'Native heading fold did not work');foldStop('native-mindmap-heading-fold-zero-source-work');
 check(central().querySelector('.is-branch-disclosure').getAttribute('aria-expanded')==='true','Heading fold collapsed the graph branch');
 cases.push({id:'native-mindmap-central-only-sections-shared-tree-independent-fold-camera',headings:allHeadings});
 p.notifyNavigation(path('Concept'),host);await until(()=>center(host)===path('Concept'),'Attention move absent');await wait(150);
 check(headings().length>0&&central().dataset.kplexPath===path('Memory')&&session.layoutRoot(path('Concept'))===path('Memory'),'Ordinary attention replaced the pinned root outline');
 cases.push({id:'native-mindmap-attention-retains-root-outline'});
 // Open an actual existing occurrence editor without replacing the root's section source.
 await action('view.fit');await wait(100);await click(card('Parent 1').querySelector('.kplex-thought-corner-action'));
 await until(()=>session.editors.bindings.length===1&&root(host).querySelector('.kplex-central-editor-content .cm-content'),'Native nonroot editor did not open');
 check(headings().length>0&&session.editors.bindings[0].target.nodeId===path('Parent 1'),'Root outline replaced or retargeted the other editor');
 await action('view.fit');await wait(150);
 const content=root(host).querySelector('.kplex-central-editor-content .cm-content');content.focus();
 await until(()=>workspace.activeLeaf?.view.file?.path===path('Parent 1'),'Native editor focus did not select its own document');
 const leaf=workspace.activeLeaf,nativeEditor=leaf.view.editor,binding=session.editors.bindings[0];
 nativeEditor.setCursor(nativeEditor.lastLine(),nativeEditor.getLine(nativeEditor.lastLine()).length);await native.webContents.insertText('Kplex-222-root-outline-editor');
 await until(()=>nativeEditor.getValue().includes('Kplex-222-root-outline-editor'),'Native typed text did not reach the owned editor');
 const value=nativeEditor.getValue(),cursor=JSON.stringify(nativeEditor.getCursor()),node=headings()[0].querySelector('.kplex-section-fold-handle');
 await click(node);await wait(150);
 const editorFacts={leafSame:workspace.activeLeaf===leaf,editorSame:leaf.view.editor===nativeEditor,valueSame:nativeEditor.getValue()===value,
  cursorSame:JSON.stringify(nativeEditor.getCursor())===cursor,focused:content.contains(doc.activeElement),bindingSame:session.editors.bindings[0]?.id===binding.id,
  contentConnected:content.isConnected,activeElement:doc.activeElement?.className,beforeLength:value.length,afterLength:nativeEditor.getValue().length,
  attentionSame:center(host)===path('Concept'),rootSame:session.layoutRoot(path('Concept'))===path('Memory'),
  beforeCursor:cursor,afterCursor:JSON.stringify(nativeEditor.getCursor()),markerRetained:nativeEditor.getValue().includes('Kplex-222-root-outline-editor')};c.progress={...c.progress,rootOutlineEditor:editorFacts};
 check(editorFacts.leafSame&&editorFacts.editorSame&&editorFacts.valueSame&&editorFacts.cursorSame&&editorFacts.focused&&editorFacts.bindingSame&&editorFacts.attentionSame&&editorFacts.rootSame,
  'Heading folding disturbed editor document/content/caret/focus '+JSON.stringify(editorFacts));
 check((await action('editor.collapse',{bindingId:binding.id})).status==='completed','Existing native editor collapse/save failed');
 await until(()=>!session.editors.bindings.length&&!root(host).querySelector('.kplex-central-editor-content'),'Native editor cleanup incomplete');
 check((await app.vault.read(app.vault.getFileByPath(path('Parent 1')))).includes('Kplex-222-root-outline-editor'),'Native editor collapse lost content');
 cases.push({id:'native-mindmap-root-outline-other-editor-focus-content-caret-save-cleanup'});
 await click(central().querySelector('.kplex-thought-corner-action'));
 await until(()=>session.editors.bindings.length===1&&session.editors.bindings[0].target.nodeId===path('Memory'),'Root editor identity absent');
 await until(()=>!headings().length&&!sectionControl(),'Root editor did not exclude its own section outline/control');
 const rootBinding=session.editors.bindings[0];check((await action('editor.collapse',{bindingId:rootBinding.id})).status==='completed','Root editor cleanup failed');
 await until(()=>!session.editors.bindings.length&&sectionControl(),'Root section control did not return after editor close');
 cases.push({id:'native-mindmap-root-editor-excludes-only-own-outline'});
 await choose(host,'wuxing');await until(()=>!root(host).querySelector('.kplex-section-fold-handle'),'Unsupported Facets exposes a section toggle');
 await choose(host,'mindmap');panel(host).querySelector('.kplex-filter-panel-header button').click();
 p.notifyNavigation(path('Memory'),host);await until(()=>center(host)===path('Memory'),'Owned attention did not restore');
 cases.push({id:'native-facets-sections-disabled-after-view-switch'});
 // Controlled native presentation interval: forward the actual canonical neighborhood while
 // withholding detailed evidence. Genuine private snapshot holds are covered by the real-IDB
 // browser regression; this checks exact-build native rendering, not whole-app restart timing.
 const sourceEvidence=p.index.evidenceFrom,savedRead=p.index.getSectionPreviewNeighborhood;
 let restoredPreview=false;
 const restorePreview=()=>{if(restoredPreview)return;restoredPreview=true;p.index.evidenceFrom=sourceEvidence;p.index.getSectionPreviewNeighborhood=savedRead;p.index.notifyPresentation()};
 restores.push(restorePreview);
 p.index.evidenceFrom=function(id){return id===memoryFile.path?[]:sourceEvidence.call(this,id)};
 p.index.getSectionPreviewNeighborhood=function(id){return id===memoryFile.path?this.getNeighborhood(id):savedRead.call(this,id)};
 try{
  await choose(host,'classic');panel(host).querySelector('.kplex-filter-panel-header button').click();await until(compassSections,'Preview Compass central toggle absent');
  await click(compassSections());
  const previewTarget=name=>[...root(host).querySelectorAll('.kplex-thought')].find(el=>el.dataset.kplexPath?.startsWith('kplex-section-target:')&&el.dataset.kplexPath.endsWith(':'+path(name)));
  await until(()=>previewTarget('Outward 0')&&previewTarget('Outward 1'),'Compass dropped section targets while evidence was withheld');
  cases.push({id:'native-compass-outline-retains-saved-targets-before-evidence',controlledEvidenceHold:true});
  await choose(host,'mindmap');panel(host).querySelector('.kplex-filter-panel-header button').click();await until(sectionControl,'Preview Mind Map central toggle absent');
  if(!headings().length)await click(sectionControl());await until(()=>headings().length,'Preview outline absent');
  // A previous explicit heading fold is preserved across supported views. Expand its actual
  // source ancestor before checking nested physical links; do not assume a fresh fold state.
  for(let n=0;n<6&&!headings().some(el=>el.querySelector('.kplex-thought-text')?.textContent==='Summary');n++){
   const folded=headings().map(el=>el.querySelector('.kplex-section-fold-handle[aria-expanded="false"]')).find(Boolean);
   check(folded,'Preview source ancestor cannot be expanded');await action('view.fit');await click(folded);
  }
  await until(()=>headings().some(el=>el.querySelector('.kplex-thought-text')?.textContent==='Summary'),'Preview nested outline absent');
  await action('view.fit');await wait(100);
  for(const [name,label]of [['Outward 0','Summary'],['Outward 1','Links']]){
   const id=JSON.stringify([memoryFile.path,path(name)]),edge=[...root(host).querySelectorAll('[data-kplex-edge-id]')].find(el=>el.dataset.kplexEdgeId===id);
   const heading=headings().find(el=>el.querySelector('.kplex-thought-text')?.textContent===label);check(edge&&heading,'Preview canonical edge/heading absent');
   const start=edge.getPointAtLength(0),point=new doc.defaultView.DOMPoint(start.x,start.y).matrixTransform(edge.getScreenCTM()),box=heading.getBoundingClientRect();
   check(Math.abs(point.x-(box.left+box.right)/2)<3&&Math.abs(point.y-box.bottom)<3,'Mind Map edge starts at root instead of '+label+' while evidence is withheld');
  }
  cases.push({id:'native-mindmap-saved-connectors-start-at-physical-sections-before-evidence',controlledEvidenceHold:true});
  await wait(250);const previewStop=quiet();p.index.notifyPresentation();await wait(250);previewStop('native-preview-section-presentation-zero-source-work');
  const sourceCache=app.metadataCache.getFileCache,replacedCache={...sourceCache.call(app.metadataCache,memoryFile)};
  app.metadataCache.getFileCache=function(file){return file===memoryFile?replacedCache:sourceCache.call(this,file)};
  try{
   await choose(host,'classic');panel(host).querySelector('.kplex-filter-panel-header button').click();await until(compassSections,'Retired-proof Compass toggle absent');
   if(!root(host).querySelector('.is-kplex-section'))await click(compassSections());
   // Replacing metadata before the new read yields a current proof. Replace it once more after
   // expansion so this interval exercises actual proof retirement rather than an initial cache.
   await until(()=>root(host).querySelector('.is-kplex-section'),'Retired-proof outline absent');
   app.metadataCache.getFileCache=function(file){return file===memoryFile?{...replacedCache}:sourceCache.call(this,file)};
   p.index.notifyPresentation();
   await until(()=>[...root(host).querySelectorAll('.kplex-thought')].some(el=>el.dataset.kplexPath===path('Outward 0')),'Metadata proof retirement erased the canonical Compass target');
   cases.push({id:'native-retired-section-metadata-proof-retains-canonical-header-targets',controlledEvidenceHold:true});
  }finally{app.metadataCache.getFileCache=sourceCache;p.index.notifyPresentation();}
 }finally{restorePreview();}
 await choose(host,'mindmap');panel(host).querySelector('.kplex-filter-panel-header button').click();
 // The root does not consume a non-root scope. Eight admitted branch scopes can therefore
 // expose depth9; host admission must preserve that card without enlarging source demand.
 await wait(250);const depthSettingStop=quiet();await p.updateCanvasViewSetting('mindmap','maximumDepth',20);await wait(160);
 depthSettingStop('native-depth-configuration-zero-source-work');
 const depthFiles=[];
 for(let i=0;i<=10;i++){
  const yaml=JSON.stringify(child)+': '+JSON.stringify(i<10?['[['+path('Depth '+(i+1))+']]']:[]);
  const file=await app.vault.create(path('Depth '+i),'---\n'+yaml+'\n---\n# Disposable depth fixture\n');
  files.push(file);depthFiles.push(file);p.index.insertCreatedFile(file);releases.push(p.index.acquireSemanticDemand(file.path));
 }
 await until(()=>depthFiles.every(file=>app.metadataCache.getFileCache(file))&&!p.index.hasActiveSemanticPreparation()
  &&depthFiles.slice(0,-1).every((file,i)=>{const page=p.index.get(file.path);return page&&p.index.neighbours(page,'child').some(row=>row.page.path===depthFiles[i+1].path)}),'Canonical depth chain did not settle');
 session.setRoot(path('Depth 0'));p.notifyNavigation(path('Depth 0'),host);await until(()=>card('Depth 1')&&center(host)===path('Depth 0'),'Depth root did not render');
 for(let i=1;i<=8;i++){
  await action('view.fit');await wait(80);await click(card('Depth '+i).querySelector('.is-branch-disclosure'));
  await until(()=>card('Depth '+(i+1))||root(host).querySelector('.kplex-view-error'),'Expanded depth frontier did not settle');
  check(!root(host).querySelector('.kplex-view-error')&&card('Depth '+(i+1)),'Deep bounded branch invalidated the entire view at '+(i+1));
 }
 check(card('Depth 9')&&!card('Depth 10'),'Ninth-depth admission changed the bounded frontier');
 cases.push({id:'native-mindmap-depth-nine-admission',configuredMaximumDepth:20});
 await action('view.fit');await wait(80);await click(card('Depth 9').querySelector('.is-branch-disclosure'));await wait(200);
 check(card('Depth 9')&&!card('Depth 10')&&!root(host).querySelector('.kplex-view-error')
  &&center(host)===path('Depth 0')&&session.layoutRoot(path('Depth 0'))===path('Depth 0'),'Existing eight-scope limit broke the view or changed navigation');
 cases.push({id:'native-mindmap-eight-scope-limit-retains-visible-frontier'});
 await action('view.fit');await capture('mindmap-depth-frontier',root(host).querySelector('.kplex-plex'));
}
