/** Actual production canvas, native drag adapter, ActionManager, property modal and original
 * metadata convergence. FileManager/Vault are finite host facts; no feature owner is replaced. */
import {legacyWuXingPreset} from './support/facetPresetArchive.mjs';
import assert from 'node:assert/strict';
import test from 'node:test';
import {chromiumHarness} from './support/browserTypeScript.mjs';
import {plexViewBrowserModules} from './support/plexViewBrowser.mjs';
import {initializeColorDom} from './support/nativeColorControls.mjs';
import {canvasSceneFixture} from './support/canvasSceneFixture.mjs';
const output=await plexViewBrowserModules({nativeControls:true});
const initialize=`${canvasSceneFixture}
 settings.canvasViewSettings=M.editViewConfigurationAt(M.wuXingViewDefinition,{}, {field:'presets',path:['wuxing']},{kind:'set',value:(${legacyWuXingPreset.toString()})(M.FACET_TEMPLATES.wuxing)});
 const persisted=new Map(),bodies=new Map(),suffix='# Body: keep exact text and [[Source relationship]]',cancels=new Set(),relations=[];
 let nativeSaves=0;const propertyRequests=[];
 for(const [path,page]of pages){const frontmatter={phase:['water','private'],parents:['[[Original parent]]'],title:path};persisted.set(path,frontmatter);
   const body=JSON.stringify(frontmatter)+String.fromCharCode(10)+suffix;bodies.set(path,body);page.file.stat.size=body.length;fieldCaches.set(path,{frontmatter});}
 Object.assign(plugin.app.vault,nativeEvents,{cachedRead:async file=>{work.body++;return bodies.get(file.path)}});
 plugin.app.workspace.iterateAllLeaves=()=>{};
 plugin.app.fileManager={processFrontMatter:async(file,mutate)=>{const next=structuredClone(persisted.get(file.path));mutate(next);persisted.set(file.path,next);
   const body=JSON.stringify(next)+String.fromCharCode(10)+suffix;bodies.set(file.path,body);file.stat.mtime++;file.stat.size=body.length;
   const cache={frontmatter:next};fieldCaches.set(file.path,cache);nativeSaves++;for(const ref of [...events])if(ref?.name==='changed')ref.callback(file,body,cache);
 }};
 const owner=new M.CanvasPropertyAssignmentActions(plugin.app,plugin.translator,()=>['parents'],(file,field,mutate,current)=>M.writeRelationshipMetadata(plugin.app,file,new Set([M.normalizeFieldName(field)]),mutate,{
   own:cancel=>{cancels.add(cancel);return()=>cancels.delete(cancel)},pending:()=>{},savedPendingMessage:()=> 'Saved metadata pending',current}));
 plugin.canAssignCanvasProperty=(page,target)=>owner.eligible(page,target);
 plugin.openCanvasPropertyAssignment=request=>{propertyRequests.push(request);return owner.open(request)};
 plugin.canUndoCanvasPropertyAssignment=scope=>owner.canUndo(scope);plugin.undoCanvasPropertyAssignment=scope=>owner.undo(scope);
 plugin.openRelationModal=request=>relations.push(request);
 const dragManager={draggable:null,dragLink(event,linktext,sourcePath,title,source){event.dataTransfer.setData('text/plain',linktext);return{type:'link',linktext,sourcePath,title,source,file:pages.get(linktext)?.file}},
   onDragStart(event,value){this.draggable=value},onDragEnd(){this.draggable=null}};plugin.app.dragManager=dragManager;
 const register=async(ui,id)=>{ui.props.actionSurfaceId=id;ui.render();await wait();return plugin.actionManager.registerSurface({id,generation:1,
   get implementations(){return ui.ports.current.implementations},readSnapshot:()=>({mounted:true,visible:true,windowId:'test',center:M.actionNodeRef(pages.get(ui.props.activePath)),
    selected:ui.ports.current.readSelected(),focusRegion:'graph',interactionRevision:0,viewRevision:ui.session.getSnapshot()})})};
 const node=(ui,path)=>[...ui.container.querySelectorAll('[data-kplex-keyboard-id]')].find(row=>row.dataset.kplexPath===path);
 const phase=(ui,id)=>[...ui.container.querySelectorAll('[data-kplex-decoration]')].find(row=>row.dataset.kplexDecoration===JSON.stringify(['facets','wuxing','category',id]));
 const point=(ui,id)=>{const b=phase(ui,id).querySelector(':scope > rect').getBoundingClientRect();return{x:b.x+b.width/2,y:b.y+Math.min(b.height/2,16)}};
 const drop=(ui,id,dataTransfer=new DataTransfer())=>{const p=point(ui,id),target=document.elementFromPoint(p.x,p.y);check(target&&ui.container.contains(target),'Drop hits actual category region');
   for(const type of ['dragover','drop'])target.dispatchEvent(new DragEvent(type,{bubbles:true,cancelable:true,dataTransfer,clientX:p.x,clientY:p.y}));};
 const button=(modal,key)=>[...modal.contentEl.querySelectorAll('button')].find(row=>row.textContent===plugin.translator(key));
 const finish=async(key='assignment.apply')=>{const modal=M.TestModal.instances.at(-1);check(modal?.modalEl.isConnected,'Real native confirmation opened');button(modal,key).click();await waitFor(()=>!modal.modalEl.isConnected);await wait()};
 const dispatch=async(ui,id,extra={})=>{const outcome=await plugin.actionManager.dispatch({id,source:'context-menu',surfaceId:ui.props.actionSurfaceId,...extra});await wait();return outcome};
`;
async function scenario(code){const host=await chromiumHarness(output.outputFiles[0].text+';window.sourceModules=sourceModules;');try{assert.equal(await host.evaluate(initializeColorDom),true);return await host.evaluate(`(async()=>{${initialize}\n${code}\n})()`)}finally{await host.cleanup()}}

test('native category drops and accessible center assignment use the same real writer and bounded Undo',async()=>{
 assert.equal(await scenario(`
 const ui=await mount(M.wuXingViewDefinition),release=await register(ui,'assign-facets');await dispatch(ui,'view.fit');
 const origin=node(ui,'B.md'),originalParents=structuredClone(persisted.get('B.md').parents),data=new DataTransfer();
 origin.dispatchEvent(new DragEvent('dragstart',{bubbles:true,cancelable:true,dataTransfer:data}));const captured=dragManager.draggable;
 check(captured?.source.occurrence.id===origin.dataset.kplexKeyboardId,'Exact displayed occurrence captured by shared transport');
 drop(ui,'metal',data);origin.dispatchEvent(new DragEvent('dragend',{bubbles:true,dataTransfer:data}));await finish();
 check(persisted.get('B.md').phase.join(',')==='private,metal','Actual native field assignment persisted');
 check(JSON.stringify(persisted.get('B.md').parents)===JSON.stringify(originalParents)&&bodies.get('B.md').endsWith(suffix),'Source relationships and body retained');
 check(relations.length===0&&ui.moves.length===0&&ui.props.activePath==='A.md','Category assignment neither relinks nor navigates');
 const center=node(ui,'A.md'),request={target:{kind:'explicit',node:M.actionNodeRef(pages.get('A.md')),occurrenceId:center.dataset.kplexKeyboardId},args:{assignmentId:JSON.stringify(['facets','wuxing','category','metal'])}};
 await dispatch(ui,'node.assign-category',request);await finish();
 check(node(ui,'A.md')===center&&center.querySelector('.kplex-node-badge').textContent==='Metal','Center assignment follows cached publication without duplicating or replacing attention');
 check(propertyRequests.length===2&&nativeSaves===2,'Drop and accessible action share one effect owner');
 await dispatch(ui,'view.property-assignment.undo');await finish('assignment.undo');check(center.querySelector('.kplex-node-badge').textContent==='Water','Undo reclassifies from actual metadata');
 check(persisted.get('B.md').phase.includes('metal')&&!owner.canUndo(ui.container.querySelector('.kplex-plex')),'Undo is bounded to this canvas latest field');
 release();ui.close();owner.dispose();plugin.actionManager.dispose();check(events.size===0&&cancels.size===0,'All native/canvas lifetimes retired');style.remove();return true;
 `),true);
});

test('cross-view source occurrence cannot remove relationships and stale or plain-text drags cannot assign',async()=>{
 assert.equal(await scenario(`
 const target=await mount(M.wuXingViewDefinition),source=await mount(M.mindMapViewDefinition),releaseA=await register(target,'target-facets'),releaseB=await register(source,'source-mindmap');
 await dispatch(target,'view.fit');const initialSource=JSON.stringify(source.session.getState()),camera=source.container.querySelector('.kplex-camera').style.transform;
 const origin=node(source,'B.md'),data=new DataTransfer(),parents=JSON.stringify(persisted.get('B.md').parents);
 origin.dispatchEvent(new DragEvent('dragstart',{bubbles:true,cancelable:true,dataTransfer:data}));const stale=dragManager.draggable;check(stale?.source.occurrence,'Mind Map exports exact source identity');
 drop(target,'metal',data);origin.dispatchEvent(new DragEvent('dragend',{bubbles:true,dataTransfer:data}));await finish();
 check(JSON.stringify(persisted.get('B.md').parents)===parents&&relations.length===0,'Cross-view assignment retains every source relationship');
 check(JSON.stringify(source.session.getState())===initialSource&&source.container.querySelector('.kplex-camera').style.transform===camera,'Source view/root/camera unchanged');
 const before=nativeSaves,requests=propertyRequests.length;dragManager.draggable=stale;drop(target,'water',data);await wait();
 check(nativeSaves===before&&propertyRequests.length===requests,'Ended source occurrence cannot regain write authority');dragManager.draggable=null;
 const text=new DataTransfer();text.setData('text/plain','[[B.md]]');drop(target,'water',text);await wait();
 check(nativeSaves===before&&propertyRequests.length===requests,'Arbitrary text is not file-edit authorization');
 releaseA();releaseB();target.close();source.close();owner.dispose();plugin.actionManager.dispose();check(events.size===0&&cancels.size===0,'Cross-view lifetimes retired');style.remove();return true;
 `),true);
});

test('every registered view yields native editor drops without navigating or opening graph actions',async()=>{
 assert.equal(await scenario(`
 for(const definition of [...M.builtInPlexViews.available,M.exampleViewDefinition]){
   const ui=await mount(definition),release=await register(ui,'editor-drop-'+definition.id),root=ui.container.querySelector('.kplex-plex');let delivered=0,navigations=0;
   ui.props.onActivate=()=>navigations++;ui.render();const editor=document.createElement('div');editor.className='kplex-central-editor-overlay';root.append(editor);
   editor.addEventListener('drop',()=>delivered++);dragManager.draggable={type:'file',file:pages.get('B.md').file};const data=new DataTransfer();
   const over=new DragEvent('dragover',{bubbles:true,cancelable:true,dataTransfer:data}),event=new DragEvent('drop',{bubbles:true,cancelable:true,dataTransfer:data});editor.dispatchEvent(over);editor.dispatchEvent(event);
   check(delivered===1&&!over.defaultPrevented&&!event.defaultPrevented&&navigations===0,'Native editor owns drag/drop in '+definition.id);
   check(propertyRequests.length===0&&relations.length===0&&nativeSaves===0,'No graph action during native editor drop');dragManager.draggable=null;editor.remove();release();ui.close();
 }
 owner.dispose();plugin.actionManager.dispose();check(events.size===0&&cancels.size===0,'All native-editor test surfaces retired');style.remove();return true;
 `),true);
});

test('external native vault notes remain unrelated after assignment and stale/future presets cannot retarget a pending write',async()=>{
 assert.equal(await scenario(`
 const ui=await mount(M.wuXingViewDefinition),release=await register(ui,'external-facets');await dispatch(ui,'view.fit');
 const original=pages.get('B.md'),file={...original.file,path:'External.md',name:'External.md',basename:'External',stat:{mtime:1,ctime:1,size:1}},page={...original,path:file.path,name:'External',file,neighbours:new Map()};pages.set(file.path,page);
 persisted.set(file.path,{phase:'water',parents:['[[Outside relationship]]']});const body=JSON.stringify(persisted.get(file.path))+String.fromCharCode(10)+suffix;
 bodies.set(file.path,body);file.stat.size=body.length;fieldCaches.set(file.path,{frontmatter:persisted.get(file.path)});
 const before=JSON.stringify(ui.session.getState()),camera=ui.container.querySelector('.kplex-camera').style.transform;
 dragManager.draggable={type:'link',file,linktext:file.path,sourcePath:'External source.md'};drop(ui,'metal');
 check(propertyRequests.at(-1).unrelated,'Explicit native link source gets classification-only explanation');await finish();
 check(persisted.get(file.path).phase==='metal'&&persisted.get(file.path).parents[0]==='[[Outside relationship]]','External note classified without removing its relationship');
 check(!node(ui,file.path)&&relations.length===0&&ui.props.activePath==='A.md','No connection, attention change or neighborhood expansion');
 check(JSON.stringify(ui.session.getState())===before&&ui.container.querySelector('.kplex-camera').style.transform===camera,'Canvas intent and camera retained');
 drop(ui,'water');const pending=M.TestModal.instances.at(-1),saves=nativeSaves;ui.session.updateState({version:1,preset:'para'});ui.render();await wait();
 button(pending,'assignment.apply').click();await waitFor(()=>pending.modalEl.getAttribute('aria-busy')==='false');
 check(nativeSaves===saves&&persisted.get(file.path).phase==='metal'&&pending.modalEl.isConnected,'Preset change rejects the captured write and retains its preview');pending.close();
 ui.session.updateState({version:1,preset:'unknown-future'});ui.render();await wait();check(!ui.container.querySelector('.kplex-view-error'),'Future preset has safe visible fallback');
 const outcome=await dispatch(ui,'node.assign-category',{target:{kind:'explicit',node:M.actionNodeRef(pages.get('A.md'))}});check(outcome.status==='unavailable','Future intent grants no property action');
 check(nativeSaves===saves,'Fallback never rewrites note metadata');dragManager.draggable=null;release();ui.close();owner.dispose();plugin.actionManager.dispose();check(events.size===0&&cancels.size===0,'External and stale request lifetimes retired');style.remove();return true;
 `),true);
});

test('trusted Chromium pen gesture reuses measured category hit-testing and the native assignment action',async()=>{
 const host=await chromiumHarness(output.outputFiles[0].text+';window.sourceModules=sourceModules;');
 try{
  await host.command('Emulation.setDeviceMetricsOverride',{width:1400,height:1000,deviceScaleFactor:1,mobile:false});assert.equal(await host.evaluate(initializeColorDom),true);
  const coordinates=await host.evaluate(`(async()=>{${initialize}
    const ui=await mount(M.wuXingViewDefinition),release=await register(ui,'pen-facets');await dispatch(ui,'view.fit');
    const source=node(ui,'B.md').getBoundingClientRect(),target=point(ui,'metal');
    window.assignmentProbe={ui,finish,check,verify:()=>check(persisted.get('B.md').phase.includes('metal')&&nativeSaves===1&&relations.length===0,'Pen drop uses only the property writer'),
      cleanup:()=>{release();ui.close();owner.dispose();plugin.actionManager.dispose();check(events.size===0&&cancels.size===0,'Pen gesture resources retired');style.remove()}};
    return{source:{x:source.x+source.width/2,y:source.y+source.height/2},target};
  })()`);
  await host.command('Input.dispatchMouseEvent',{type:'mousePressed',...coordinates.source,button:'left',buttons:1,clickCount:1,pointerType:'pen'});
  await host.command('Input.dispatchMouseEvent',{type:'mouseMoved',...coordinates.target,button:'none',buttons:1,pointerType:'pen'});
  await host.evaluate('new Promise(resolve=>setTimeout(resolve,80))');
  assert.equal(await host.evaluate('Boolean(assignmentProbe.ui.container.querySelector(".is-property-drop-target"))'),true);
  await host.command('Input.dispatchMouseEvent',{type:'mouseReleased',...coordinates.target,button:'left',buttons:0,clickCount:1,pointerType:'pen'});
  assert.equal(await host.evaluate('(async()=>{await assignmentProbe.finish();assignmentProbe.verify();assignmentProbe.cleanup();delete window.assignmentProbe;return true})()'),true);
 }finally{await host.cleanup()}
});
