/** Native Mind Map interaction acceptance using only its caller's disposable fixture. Shared UI/action/drag owners remain real; captured method observations and trusted renderer inputs are reported separately. Cleanup belongs to the enclosing controlled probe. */

/** Exercise measured parent controls, F4 destinations and bidirectional native body drops without installing a test view or writing outside the owned fixture. */
export async function acceptMindMapInteractions({app,p,c,host,hosts,restores,path,root,session,nodes,act,check,wait,until,clickNative,cases,instance}) {
 await until(()=>root(host)?.isConnected&&root(host).ownerDocument.defaultView===document.defaultView,'Interaction fixture is not mounted in the live main document');
 const doc=root(host).ownerDocument,win=doc.defaultView.require('@electron/remote').getCurrentWindow();
 /** Deliver actual owning-window keyboard events, including the public F4 shortcut. */
 const key=code=>{for(const type of ['keyDown','keyUp'])win.webContents.sendInputEvent({type,keyCode:code})};
 /** Measure a visible native DOM element in its actual document. */
 const center=element=>{const box=element.getBoundingClientRect();check(box.width>0&&box.height>0,'Visible native drag target required');return{x:Math.round(box.left+box.width/2),y:Math.round(box.top+box.height/2)}};
 /** Reuse the reviewed trusted HTML drag transport; Chromium supplies its payload, and finally releases the debugger. */
 const drag=async(from,to)=>{
  check(!app.dragManager.draggable,'Competing native drag');win.show();win.focus();win.webContents.focus();
  const fromPoint=typeof from==='function'?center(from()):from,toPoint=typeof to==='function'?center(to()):to;
  const hit=doc.elementFromPoint(fromPoint.x,fromPoint.y),source=typeof from==='function'?from():null;
  c.progress={...c.progress,dragGeometry:{from:fromPoint,to:toPoint,sourceVisible:!!source&&source.contains(hit),hitClass:typeof hit?.className==='string'?hit.className:null,sourceId:source?.dataset.kplexKeyboardId,sourceBounds:source?.getBoundingClientRect().toJSON(),canvasBounds:root(host).getBoundingClientRect().toJSON(),camera:root(host).querySelector('.kplex-camera')?.style.transform,viewport:{width:doc.defaultView.innerWidth,height:doc.defaultView.innerHeight}}};
  check(!source||source.contains(hit),'Native drag source must be visible at its actual hit-test point');
  const inputs=[];
  /** Bounded trusted-input diagnostics identify host activation or geometry failures without replacing events. */
  const trace=event=>{if(inputs.length<12)inputs.push({type:event.type,trusted:event.isTrusted,x:event.clientX,y:event.clientY,sourceId:event.target?.closest?.('[data-kplex-keyboard-id]')?.dataset.kplexKeyboardId});c.progress={...c.progress,dragInputs:inputs}};
  for(const name of ['mousedown','pointerdown','dragstart'])doc.addEventListener(name,trace,true);
  const drops=[];/** Observe actual delivery before React consumes it; no payload or handler is replaced. */
  const observe=event=>{const source=app.dragManager.draggable?.source,hit=doc.elementFromPoint(event.clientX,event.clientY);drops.push({trusted:event.isTrusted,x:event.clientX,y:event.clientY,hitClass:typeof hit?.className==='string'?hit.className:null,gate:hit?.closest('[data-kplex-gate]')?.dataset.kplexGate,occurrence:hit?.closest('[data-kplex-keyboard-id]')?.dataset.kplexKeyboardId,insideParent:!!parentPanel()?.contains(hit),root:session(host).layoutRoot(path('A')),sourceKind:source?.kind,sourceId:source?.occurrence?.id,canonicalSource:source?.node?.identity,relationshipOrigin:source?.occurrence?.relationship?.origin.identity});c.progress={...c.progress,nativeDrops:drops}};
  doc.addEventListener('drop',observe,true);
  try{const receipt=await c.htmlDrag({contents:win.webContents,from:fromPoint,to:toPoint,
   input:(type,point,modifiers=[])=>win.webContents.sendInputEvent({type,x:point.x,y:point.y,button:'left',clickCount:1,modifiers}),wait,until});
   await wait(80);check(!win.webContents.debugger.isAttached(),'Native drag debugger leaked');return{...receipt,drops};
  }finally{doc.removeEventListener('drop',observe,true);for(const name of ['mousedown','pointerdown','dragstart'])doc.removeEventListener(name,trace,true)}
 };
 const parentPanel=()=>root(host).querySelector('.kplex-zone-parent');
 if(c.nativeDragOnly){
  const compass=c.prepareViewport?app.workspace.createLeafInParent(app.workspace.rootSplit,1):app.workspace.getLeaf('split');hosts.push(compass);await compass.setViewState({type:'k-plex-react-view',active:true});await compass.view.waitUntilReady();compass.view.centerPresentation.update({embedCentralNode:false});p.notifyNavigation(path('C'),compass);
  await until(()=>compass.view.documentSession.centerPath===path('C')&&root(compass)?.isConnected,'Native drag-only Compass absent');await act(compass,'view.fit');
  const opened=[],open=p.openRelationModal;
  p.openRelationModal=function(options){check(options.origin.path.startsWith(path('').slice(0,-3))&&options.fixedTarget?.path.startsWith(path('').slice(0,-3)),'Non-fixture native drag relationship');const modal=open.call(this,options);opened.push({modal,options});return modal};
  restores.push(()=>{p.openRelationModal=open;for(const value of opened)value.modal.close()});
  await c.acceptNativeDrag({app,p,c,host,compass,restores,path,root,session,nodes,act,check,wait,until,clickNative,drag,opened,cases,instance});return;
 }

 check(parentPanel(),'Measured parent area absent');check(Number(parentPanel().querySelector('.kplex-zone-count').textContent)===13,'Parent area lost available occurrences');
 const parentWidthBefore=parseFloat(parentPanel().style.width),childBefore=parseFloat(nodes(host).find(node=>node.dataset.kplexKeyboardId===JSON.stringify([path('R'),path('P')])).style.left);
 await act(host,'view.layout-controls');
 const columns=()=>[...root(host).querySelectorAll('.kplex-layout-panel input[type=range]')].find(element=>element.getAttribute('aria-label')===p.translator('graph.parentColumns'));
 check(columns()&&Number(columns().min)===1&&Number(columns().max)===3,'Shared parent columns rail absent');columns().focus();key('End');
 await until(()=>p.settings.canvasViewSettings.mindmap.values.parentColumns===3,'Native parent columns did not save');await p.settingsWriteQueue;
 check((await p.loadData()).canvasViewSettings.mindmap.values.parentColumns===3,'Parent columns not durable');
 await until(()=>parseFloat(parentPanel().style.width)>parentWidthBefore,'Measured parent columns did not widen the area');
 check(parseFloat(nodes(host).find(node=>node.dataset.kplexKeyboardId===JSON.stringify([path('R'),path('P')])).style.left)>childBefore,'Parent area width did not affect horizontal tree baseline');
 await act(host,'view.layout-controls');await act(host,'view.areas.toggle');
 const frame=()=>root(host).querySelector('.kplex-area-frame.kplex-area-parent'),height=()=>frame()?.querySelector('[role=separator]');
 const cameraBefore=root(host).querySelector('.kplex-camera').style.transform;
 check(height(),'Shared parent area resize control absent');height().focus();key('Home');await until(()=>session(host).getAreaHeights().parentHeight===140,'Parent height did not reach its per-canvas owner');
 check(parentPanel().querySelector('.kplex-zone-scroll').scrollHeight>parentPanel().querySelector('.kplex-zone-scroll').clientHeight,'Overflow parents not scrollable');
 check(session(host).layoutRoot(path('A'))===path('R'),'Parent controls rerooted map');
 check(root(host).querySelector('.kplex-camera').style.transform===cameraBefore,'Parent resize discarded camera intent');
 const areaSession=host.getViewState();check(areaSession.state.plexSession?.plexView,'Existing native view state omitted its session');
 cases.push({id:'trusted-parent-columns-and-height-scroll',columns:3,height:140,parents:13,layoutRootRetained:true});await act(host,'view.areas.toggle');
 const cross=root(host).querySelectorAll('.is-cross-link');check(cross.length>0,'Enabled native canonical cross-link absent');
 cases.push({id:'production-mindmap-canonical-cross-links',visible:cross.length});
 // F4 owns only this canvas. Native text insertion targets its search input, never a note editor.
 await workspaceFocus();const observedKey=event=>{c.progress={...c.progress,f4:{trusted:event.isTrusted,key:event.key,target:event.target?.className,windowFocused:win.isFocused(),contentsFocused:win.webContents.isFocused(),documentFocused:doc.hasFocus()}}};doc.addEventListener('keydown',observedKey,true);try{key('F4')}finally{await wait(50);doc.removeEventListener('keydown',observedKey,true)}const search=()=>root(host).querySelector('input.kplex-search');
 await until(()=>doc.activeElement===search(),'F4 did not focus owning canvas search');check(!session(host).editors.bindings.length,'Search unexpectedly opened an editor');
 await win.webContents.insertText(path('C'));
 const result=()=>[...doc.querySelectorAll('.kplex-search-result')].find(element=>element.textContent.includes(path('C')));
 await until(result,'Native F4 result absent');await clickNative(result);await until(()=>session(host).layoutRoot(path('C'))===path('C'),'F4 result did not become map root');
 cases.push({id:'trusted-f4-result-reroots-owning-map'});
 // Split a real Compass destination to exercise common exports/imports without an alternate drag implementation.
 const compass=app.workspace.getLeaf('split');hosts.push(compass);await compass.setViewState({type:'k-plex-react-view',active:true});await compass.view.waitUntilReady();
 compass.view.centerPresentation.update({embedCentralNode:false});p.notifyNavigation(path('A'),compass);await until(()=>compass.view.documentSession.centerPath===path('A'),'Compass fixture destination absent');
 const mapCenter=()=>nodes(host).find(node=>node.dataset.kplexKeyboardId==='root'),compassCenter=()=>root(compass).querySelector('.kplex-role-center');
 await until(()=>mapCenter()&&compassCenter(),'Two native canvas centers absent');await act(host,'view.fit');await act(compass,'view.fit');
 const outward=await drag(mapCenter,compassCenter);await until(()=>compass.view.documentSession.centerPath===path('C'),'Mind Map export did not navigate Compass');
 session(host).setRoot(path('R'));await act(host,'view.fit');
 const inward=await drag(compassCenter,mapCenter);await until(()=>session(host).layoutRoot(path('C'))===path('C'),'Compass center drop did not reroot Mind Map');
 check(compass.view.documentSession.centerPath===path('C'),'Destination drop changed source canvas');
 cases.push({id:'trusted-bidirectional-compass-mindmap-center-drops',outward,inward,physicalCrossWindowGesture:false});
 session(host).setRoot(path('R'));await until(()=>nodes(host).find(node=>node.dataset.kplexKeyboardId==='root')?.dataset.kplexPath===path('R'),'Parent target root not rendered');await act(host,'view.fit');await act(host,'view.areas.toggle');await until(frame,'Parent target frame absent');
 let geometry,stableSince=Date.now();
 await until(()=>{const rect=frame()?.getBoundingClientRect(),source=compassCenter()?.getBoundingClientRect(),key=JSON.stringify([rect?.toJSON(),source?.toJSON(),root(host).querySelector('.kplex-camera')?.style.transform]);if(key!==geometry){geometry=key;stableSince=Date.now()}return nodes(host).find(node=>node.dataset.kplexKeyboardId==='root')?.dataset.kplexPath===path('R')&&Date.now()-stableSince>=120},'Parent target/source geometry did not settle');
 const opened=[],open=p.openRelationModal;
 p.openRelationModal=function(options){check(options.origin.path.startsWith(path('').slice(0,-3))&&options.fixedTarget?.path.startsWith(path('').slice(0,-3)),'Drop attempted a non-fixture relationship');const modal=open.call(this,options);opened.push({modal,options});return modal};
 restores.push(()=>{p.openRelationModal=open;for(const value of opened)value.modal.close()});
 const bounds=frame().getBoundingClientRect();let point;
 // The earlier failed samples landed on a real parent's child gate. Choose an actual blank area
 // pixel now, rather than pretending a gate is a root-relative background relationship target.
 for(let y=Math.ceil(bounds.top+6);!point&&y<bounds.bottom-4;y+=6)for(let x=Math.ceil(bounds.left+4);!point&&x<bounds.right-4;x+=6){
  const hit=doc.elementFromPoint(x,y);if(hit&&parentPanel().contains(hit)&&!hit.closest('[data-kplex-path], [data-kplex-gate], button, input, .kplex-zone-tools'))point={x,y};
 }
 check(point,'No blank parent-area drop pixel');c.progress={...c.progress,areaTarget:{point,hit:doc.elementFromPoint(point.x,point.y)?.className}};
 const parentDelivery=await drag(compassCenter,point);await until(()=>opened.length===1&&opened[0].modal.modalEl.isConnected,'Semantic parent-area drop did not open shared composer');
 const {modal,options}=opened[0];c.progress={...c.progress,areaDrop:{origin:options.origin.path,target:options.fixedTarget?.path,role:options.semanticRole,mode:options.mode,point,frame:bounds.toJSON(),hit:doc.elementFromPoint(point.x,point.y)?.className}};
 check(options.origin.path===path('R')&&options.fixedTarget.path===path('C')&&options.semanticRole==='parent'&&options.mode==='create','Area drop lost canonical root/target/role '+JSON.stringify(c.progress.areaDrop));
 modal.close();await until(()=>!modal.modalEl.isConnected,'Cancelled composer did not close');
 check(!p.index.neighbours(p.index.get(path('R')),'parent').some(row=>row.page.path===path('C')),'Cancelled area drop wrote a relation');
 cases.push({id:'trusted-cross-view-parent-area-shared-composer',cancelledWithoutWrite:true,sourceCanvasRetained:true,delivery:parentDelivery});
 await c.acceptNativeDrag({app,p,c,host,compass,restores,path,root,session,nodes,act,check,wait,until,clickNative,drag,opened,cases,instance});
 /** Capture the intended owning canvas before submitting its keyboard shortcut. */
 async function workspaceFocus(){app.workspace.setActiveLeaf(host,{focus:true});doc.defaultView.require('@electron/remote').app.focus({steal:true});win.show();win.focus();win.webContents.focus();root(host).focus();await until(()=>win.isFocused()&&win.webContents.isFocused()&&doc.hasFocus()&&doc.activeElement===root(host),'Owning window/graph focus not admitted');await wait(50)}
}
