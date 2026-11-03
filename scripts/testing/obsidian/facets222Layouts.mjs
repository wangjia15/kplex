/** Exact-build native layout/band/diagnostic controls. The existing controller owns files, input transport and unconditional restoration. */
export async function acceptFacets222Layouts(x){
 const {app,p,c,host,native,workspace,cases,path,root,center,check,wait,until,choose,panel,quiet,reveal}=x,session=host.view.documentSession.plexView,doc=root(host).ownerDocument;
 const surface=()=>[...p.actionSurfaceHosts].find(([,registration])=>registration.leaf===host)?.[0];
 const action=async(id,args)=>{const result=await p.actionManager.dispatch({id,source:'internal',surfaceId:surface(),...(args?{args}:{})});check(result.status==='completed',id+': '+JSON.stringify(result));return result};
 const choice=async(key,value)=>{if(key==='layout'){const id=session.state.preset,preset=p.readPortableSharingState().presets[id];await p.updateCanvasViewConfiguration('wuxing',{field:'presets',path:[id]},{kind:'set',value:{...preset,layout:value}});await wait(180);return;}await choose(host,'wuxing');const select=panel(host).querySelector('[data-kplex-view-choice="'+key+'"] select');check(select,'Captured '+key+' choice absent');select.focus();select.value=value;select.dispatchEvent(new doc.defaultView.Event('change',{bubbles:true}));await wait(120);panel(host).querySelector('.kplex-filter-panel-header button').click();};
 const decoration=id=>[...root(host).querySelectorAll('[data-kplex-decoration]')].find(element=>element.dataset.kplexDecoration===id);
 const box=element=>{const rect=element.getBBox();return {x:rect.x,y:rect.y,width:rect.width,height:rect.height}};
 const snapshot=()=>({attention:center(host),camera:root(host).querySelector('.kplex-camera').style.transform,state:JSON.stringify(session.getState())});
 const fit=async()=>{await action('view.fit');await wait(160)};
 const capture=async name=>{await reveal(host);await fit();const rect=root(host).querySelector('.kplex-plex').getBoundingClientRect(),image=await native.webContents.capturePage({x:Math.max(0,Math.ceil(rect.x)),y:Math.max(0,Math.ceil(rect.y)),width:Math.floor(rect.width),height:Math.floor(rect.height)});require('node:fs').writeFileSync(c.screenshotPrefix+'-222-'+name+'.png',image.toPNG());};
 const canonical=JSON.stringify(p.index.neighbours(p.index.get(path('Memory')),'child').map(row=>row.page.path).sort()),attention=center(host);
 await action('view.center-editor.toggle');await until(()=>root(host).querySelector('.kplex-central-editor-content .cm-content'),'Attention native editor absent');
 root(host).querySelector('.kplex-central-editor-content .cm-content').focus();await until(()=>workspace.activeLeaf?.view.editor&&root(host).querySelector('.kplex-central-editor-leaf-host')?.contains(workspace.activeLeaf.view.containerEl),'Native embedded editor focus absent');
 const editor=root(host).querySelector('.kplex-central-editor-content'),editorLeaf=workspace.activeLeaf,nativeEditor=editorLeaf.view.editor;
 await until(()=>!editor.querySelector('.kplex-central-editor-status')&&nativeEditor.getValue().includes('Disposable Wu Xing native fixture.'),'Native editor document did not load');const editorValue=nativeEditor.getValue();await wait(250);
 // Enter the invoking canvas's native focus context before measuring presentation-only work.
 // Obsidian's embedded-document blur/activation can perform its own cachedRead; it is not a
 // layout operation and must neither be hidden in counters nor mislabeled as a zero-work pass.
 await reveal(host);const trigger=root(host).querySelector('.kplex-filter-trigger');trigger.focus();await until(()=>doc.activeElement===trigger&&workspace.activeLeaf===host,'Invoking canvas control did not acquire native focus');await wait(750);
 const stop=quiet();await choice('preset','para');
 const endpointIds=()=>[...root(host).querySelectorAll('[data-kplex-edge-id]')].map(element=>element.dataset.kplexEdgeId).sort();let endpoints;
 for(const mode of ['circular','concentric','vertical','horizontal','quadrants']){
  await choice('layout',mode);await until(()=>p.readPortableSharingState().presets.para.layout===mode,'Preset layout did not save');
  check(!root(host).querySelector('.kplex-view-error')&&root(host).querySelectorAll('.kplex-view-region').length===5,'Four categories plus combined Diagnostics lost: '+mode);
  check(root(host).querySelector('.kplex-central-editor-content')===editor&&editorLeaf.view.editor===nativeEditor&&nativeEditor.getValue()===editorValue&&editorLeaf.view.file.path===attention&&center(host)===attention,'Layout retargeted/remounted attention editor: '+mode);
  if(endpoints)check(JSON.stringify(endpointIds())===JSON.stringify(endpoints),'Layout changed canonical displayed endpoints');else endpoints=endpointIds();
  if(mode==='concentric'){
   const paths=[...root(host).querySelectorAll('.kplex-view-region > path')];check(paths.length===4,'Real rounded category bands absent');
   for(const band of paths)check(!band.isPointInFill(new doc.defaultView.DOMPoint(0,0)),'Band fill captured the focused editor hole');
   const inner=box(paths[0]),sample=new doc.defaultView.DOMPoint(inner.x+inner.width/2,inner.y+20);check(paths[0].isPointInFill(sample)&&paths.slice(1).every(band=>!band.isPointInFill(sample)),'Outer native bands overlap an inner category');
   cases.push({id:'native-band-svg-holes-and-disjoint-physical-fill',bands:4});
  }
  await capture('layout-'+mode);cases.push({id:'native-layout-'+mode+'-captured-choice-keeps-editor-and-canonical-endpoints'});
 }
 stop('native-five-layouts-fit-editor-zero-source-work');
 await choice('preset','wuxing');await choice('layout','circular');await fit();
 const layoutToggle=root(host).querySelector('.kplex-layout-toggle');layoutToggle.click();await until(()=>root(host).querySelector('input[aria-label="'+p.translator('facets.combineDiagnostics')+'"]'),'Shared live layout checkbox absent');
 const checkBox=root(host).querySelector('input[aria-label="'+p.translator('facets.combineDiagnostics')+'"]'),separateWidths=JSON.stringify(session.getAreaWidths()),separateHeights=JSON.stringify(session.getAreaHeights());
 check(!checkBox.checked,'Legacy separate fixture mode changed before toggle');const combineStop=quiet();checkBox.click();await until(()=>session.state.combinedDiagnostics?.wuxing===true&&root(host).querySelectorAll('.kplex-view-region').length===6,'Per-canvas combined diagnostics failed');
 for(const [name,key]of [['Unmapped','facets.unassigned'],['Conflict','facets.conflicting'],['Unsupported','facets.cannotClassify']]){
  const nodes=[...root(host).querySelectorAll('.kplex-thought[data-kplex-path]')].filter(element=>element.dataset.kplexPath===path(name));check(nodes.length===1&&nodes[0].querySelector('.kplex-node-badge')?.textContent===p.translator(key),'Distinct diagnostic chip missing/duplicated: '+name);
 }
 check(root(host).querySelector('.kplex-central-editor-content')===editor&&center(host)===attention,'Combined dock retargeted editor');
 checkBox.click();await until(()=>session.state.combinedDiagnostics?.wuxing===false&&root(host).querySelectorAll('.kplex-view-region').length===8,'Separate diagnostics did not restore');
 check(JSON.stringify(session.getAreaWidths())===separateWidths&&JSON.stringify(session.getAreaHeights())===separateHeights,'Combined mode overwrote separate dimensions');combineStop('native-combine-split-diagnostic-chips-zero-source-work');
 cases.push({id:'native-shared-combine-toggle-three-status-chips-and-separate-size-restoration'});layoutToggle.click();
 await choice('preset','para');await choice('layout','concentric');await fit();await action('view.areas.toggle');await until(()=>root(host).querySelector('.is-area-settings-mode'),'Native band area controls did not mount');await wait(160);
 const id=JSON.stringify(['facets','para','category','projects']),frame=()=>root(host).querySelector('.'+doc.defaultView.CSS.escape('kplex-area-'+id));
 const resizeStop=quiet();for(const [axis,delta]of [['width',12],['height',-12]]){
  const handle=frame()?.querySelector(axis==='width'?'.is-width-handle':'.is-height-handle');check(handle,'Band resize handle absent');const rect=handle.getBoundingClientRect(),from={x:Math.round(rect.x+rect.width/2),y:Math.round(rect.y+rect.height/2)},to={x:from.x+(axis==='width'?delta:0),y:from.y+(axis==='height'?delta:0)},before=Number(handle.getAttribute('aria-valuenow'));
  native.webContents.sendInputEvent({type:'mouseMove',...from});native.webContents.sendInputEvent({type:'mouseDown',...from,button:'left',clickCount:1});native.webContents.sendInputEvent({type:'mouseMove',...to,button:'left'});await wait(100);native.webContents.sendInputEvent({type:'mouseUp',...to,button:'left',clickCount:1});await wait(100);
  const after=(axis==='width'?session.getAreaWidths():session.getAreaHeights())[id];check(after>before,'Outward band thickness resize reversed or inert: '+axis);cases.push({id:'native-concentric-outward-'+axis+'-thickness-resize',before,after});
 }
 resizeStop('native-band-width-height-reflow-zero-source-work');await action('view.areas.toggle');await fit();
 // Trusted shared HTML payload to an inner band's empty left strip: outer category bounds
 // must not intercept it. Cancel before any note write; exact canonical source remains intact.
 const bodyBefore=await app.vault.read(app.vault.getFileByPath(path('Memory'))),source=[...root(host).querySelectorAll('.kplex-thought[data-kplex-path]')].find(element=>element.dataset.kplexPath===path('Concept'));
 const target=decoration(id)?.querySelector('path');check(source&&target,'Native band drop endpoints absent');const outer=box(target),world=new doc.defaultView.DOMPoint(outer.x+20,0),screen=world.matrixTransform(target.getScreenCTM()),sourceBox=source.getBoundingClientRect();
 check(target.isPointInFill(world),'Band drop point is outside its actual fill');const from={x:Math.round(sourceBox.x+sourceBox.width/2),y:Math.round(sourceBox.y+sourceBox.height/2)},to={x:Math.round(screen.x),y:Math.round(screen.y)};
 const input=(type,point,modifiers=[])=>native.webContents.sendInputEvent({type,...point,...(type==='mouseMove'?{}:{button:'left',clickCount:1}),modifiers});
 await c.htmlDrag({contents:native.webContents,from,to,input,wait,until});const dialog=()=>[...doc.querySelectorAll('.modal')].find(element=>element.querySelector('.modal-title')?.textContent===p.translator('assignment.title'));
 await until(dialog,'Inner band drop did not open native assignment preview');check(dialog().textContent.includes('projects'),'Outer band intercepted inner category assignment');[...dialog().querySelectorAll('button')].find(button=>button.textContent===p.translator('common.cancel')).click();await until(()=>!dialog(),'Band drop preview Cancel failed');
 check(await app.vault.read(app.vault.getFileByPath(path('Memory')))===bodyBefore&&JSON.stringify(p.index.neighbours(p.index.get(path('Memory')),'child').map(row=>row.page.path).sort())===canonical,'Cancelled band drop altered source relationships');cases.push({id:'native-inner-band-shared-drop-target-excludes-outer-band-cancel-no-write'});
 await choice('preset','wuxing');await choice('layout','circular');check(root(host).querySelector('.kplex-central-editor-content')===editor&&editorLeaf.view.editor===nativeEditor&&nativeEditor.getValue()===editorValue,'Final layout lost native document content/identity');await action('view.center-editor.toggle');
 c.progress={...c.progress,layouts:{modes:5,editorIdentityPreserved:true,canonicalRelationshipsPreserved:true}};
}
