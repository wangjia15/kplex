/** Bounded native HTML-drag proof in the caller's owned fixture. The temporary non-Classic definition has no editor, parser, writer or registry lifetime of its own. */
export async function acceptNativeOccurrenceDrag({app,p,c,host,compass,restores,path,root,session,nodes,act,check,wait,until,clickNative,drag,opened,cases,instance}) {
 const owner=session(host),registry=owner.registry,prior=owner.definition.id;
 const ids={r:path('P'),c:path('Q'),b:path('B')},child=p.settings.hierarchy.children[0];
 const definition={id:'test.native-occurrence-drag',version:1,labelKey:'Native occurrence proof',icon:'network',navigation:'rooted',capabilities:{sections:false,descendants:false,editor:false,compact:false},defaultState:null,restoreState:()=>null,
  project(input){const r=input.read.node(ids.r),other=input.read.node(ids.c),b=input.read.node(ids.b);if(!r||!other||!b)return null;
   const first=input.read.relations(r.id,'child').items.find(row=>row.node.id===b.id),second=input.read.relations(other.id,'child').items.find(row=>row.node.id===b.id);
   return{attention:input.attention,layoutRoot:r.id,entry:'r',frame:'r',coverage:'cached',truncated:false,occurrences:[
    {id:'r',nodeId:r.id,representation:'thought',ports:{top:'parent',bottom:'child'}},{id:'c',nodeId:other.id,representation:'thought',role:'child',ports:{top:'parent',bottom:'child'}},
    {id:'b-first',nodeId:b.id,representation:'thought',role:'child',relation:first,ports:{left:'parent',bottom:'child'}},{id:'b-second',nodeId:b.id,representation:'thought',role:'child',relation:second,ports:{left:'parent',bottom:'child'}}],
    edges:[...(first?[{id:'rb',kind:'semantic',source:'r',target:'b-first',sourceNode:r.id,targetNode:b.id,sourcePort:'bottom',targetPort:'left',relation:first}]:[]),...(second?[{id:'cb',kind:'semantic',source:'c',target:'b-second',sourceNode:other.id,targetNode:b.id,sourcePort:'bottom',targetPort:'left',relation:second}]:[])]};},
  layout(_projection,measurements){const points={r:[0,0],c:[-210,140],'b-first':[230,-120],'b-second':[230,140]};return{positions:new Map(measurements.map(row=>[row.id,{x:points[row.id][0],y:points[row.id][1],width:row.width,height:row.height}])),areas:[]};}};
 const captured=[],manager=app.dragManager,start=manager.onDragStart;
 manager.onDragStart=function(...args){const result=start.apply(this,args),source=this.draggable?.source;if(source?.kind==='kplex-node-link')captured.push({trusted:args[0].isTrusted,id:source.occurrence?.id,origin:source.occurrence?.relationship?.origin.identity,role:source.role});return result};
 restores.push(()=>{manager.onDragStart=start;owner.registry=registry});
 owner.registry=new registry.constructor([...registry.available,definition]);owner.select(definition.id);owner.setRoot(ids.r);
 await until(()=>nodes(host).filter(node=>node.dataset.kplexPath===ids.b).length===2&&!root(host).querySelector('.kplex-view-error'),'Two same-role native occurrences absent');
 // Creating the second pane can resize the source after the first scene commits. Admit a usable
 // actual viewport before explicitly fitting; native input must hit the source card itself.
 await app.workspace.revealLeaf(host);
 await until(()=>{const viewport=root(host).querySelector('.kplex-plex');c.progress={...c.progress,sourceViewport:{width:viewport?.clientWidth,height:viewport?.clientHeight,root:root(host).getBoundingClientRect().toJSON()}};return viewport?.clientWidth>=350&&viewport.clientHeight>=300},'Usable source canvas required before native drag fit');
 await wait(160);await act(host,'view.fit');
 const node=id=>nodes(host).find(element=>element.dataset.kplexKeyboardId===id),file=id=>app.vault.getFileByPath(id);
 const identities=Object.values(ids).map(id=>({id,canonical:p.index.allPages().find(page=>page.path===id),file:file(id)}));
 check(identities.every(row=>row.canonical),'Published fixture endpoints absent');
 const beforeR=await app.vault.read(file(ids.r)),beforeC=await app.vault.read(file(ids.c)),beforeB=await app.vault.read(file(ids.b));
 const childrenBefore=structuredClone(app.metadataCache.getFileCache(file(ids.r)).frontmatter[child]);
 c.progress={...c.progress,phase:'native-duplicate-deliver'};const count=opened.length;await drag(()=>node('b-second'),()=>node('r').querySelector('[data-kplex-gate="top"]'));
 await until(()=>opened.length===count+1&&opened[count].modal.modalEl.isConnected,'Second native occurrence did not open composer');
 const {modal,options}=opened[count],source=captured.at(-1);
 check(source?.trusted&&source.id==='b-second'&&source.origin===ids.c&&source.role==='child','Native HTML payload lost exact second occurrence/source');
 check(options.mode==='create'&&options.origin.path===ids.r&&options.fixedTarget.path===ids.b&&options.semanticRole==='parent'&&options.existingDirection===undefined,'Second occurrence borrowed first R→B relink authority');
 c.progress={...c.progress,phase:'native-duplicate-save'};const parent=p.defaultOntologyField('parent');
 await until(()=>modal.modalEl.querySelector('.kplex-add-related-ontology-search input')?.value===parent&&typeof modal.submitCallback==='function','Canonical creation composer/ontology not ready');
 check(p.ontologyFieldsForRole('parent').some(field=>field.toLocaleLowerCase()===parent.toLocaleLowerCase()),'Parent ontology field unavailable');
 await until(()=>modal.modalEl.querySelector('button[data-kplex-primary-action="true"]')?.disabled===false,'Native additive save unavailable');await clickNative(()=>modal.modalEl.querySelector('button[data-kplex-primary-action="true"]'));
 await until(()=>!modal.modalEl.isConnected,'Native additive save did not settle');
 await until(()=>JSON.stringify(app.metadataCache.getFileCache(file(ids.r))?.frontmatter?.[parent]).includes('B'),'Added parent declaration absent');
 check(JSON.stringify(app.metadataCache.getFileCache(file(ids.r)).frontmatter[child])===JSON.stringify(childrenBefore),'Existing R→B child declaration was removed');
 const identityChecks=identities.map(({id,canonical,file:original})=>({id,canonicalRetained:p.index.allPages().find(page=>page.path===id)===canonical,currentReadIdentity:p.index.get(id)?.path===id&&p.index.get(id)?.file===original,nativeRetained:file(id)===original}));check(identityChecks.every(row=>row.canonicalRetained&&row.currentReadIdentity&&row.nativeRetained),'Native additive save replaced canonical/native identity: '+JSON.stringify(identityChecks));
 check(await app.vault.read(file(ids.c))===beforeC&&await app.vault.read(file(ids.b))===beforeB,'Native additive drop altered unrelated source/target notes');
 check((await app.vault.read(file(ids.r))).includes(beforeR.slice(beforeR.indexOf('# P'))),'Native additive drop altered the original body');
 cases.push({id:'trusted-native-second-occurrence-additive-save',sourceId:source.id,canonicalOriginMatched:true,mode:options.mode,canonicalAndNativeIdentityRetained:true,originalChildDeclarationRetained:true,otherSourceBytesRetained:true,targetBytesRetained:true});
 c.progress={...c.progress,phase:'native-text-drop-restore-production'};owner.select(prior);owner.registry=registry;owner.setRoot(path('R'));await until(()=>owner.definition.id==='mindmap'&&node('root'),'Production Mind Map did not restore');await act(host,'view.fit');
 await until(()=>!p.index.hasPendingSemanticPreparation()&&!p.index.hasActiveSemanticPreparation(),'Native additive source maintenance did not settle');
 /** Reuse the same actual native relink/save/publication oracle across registered view policies. */
 async function relinkRoundtrip(canvas,view){
  c.progress={...c.progress,phase:'native-parent-child-relink',relinkView:view};
  check(await p.index.prepareRelationshipPair(path('R'),path('P')),'Relink fixture pair not ready');
  await until(()=>!p.index.hasPendingSemanticPreparation()&&!p.index.hasActiveSemanticPreparation(),'Relink fixture preparation pending');
  await app.workspace.revealLeaf(canvas);await wait(160);
  const center=()=>nodes(canvas).find(element=>element.dataset.kplexPath===path('R'));
  for(const [gate,role]of [['top','parent'],['bottom','child']]){
   await act(canvas,'view.fit');
   // Fitting empty phase regions can make a real card smaller than the OS drag threshold.
   // Use the shipped zoom action before the gesture, rather than manufacturing a drag payload.
   for(let step=0;step<14;step++){
    const scale=Number(root(canvas).querySelector('.kplex-camera')?.style.transform.match(/scale\(([^)]+)\)/)?.[1]);
    if(scale>=0.65)break;await act(canvas,'view.zoom-in');
   }
   const source=()=>nodes(canvas).find(element=>element.dataset.kplexPath===path('P'));
   await until(()=>source()&&center(),'Production relink source/root absent');
   source().scrollIntoView({block:'nearest',inline:'nearest'});await wait(120);
   let geometry,stableSince=Date.now();
   await until(()=>{const a=source()?.getBoundingClientRect(),b=center()?.querySelector('[data-kplex-gate="'+gate+'"]')?.getBoundingClientRect(),next=JSON.stringify([a?.toJSON(),b?.toJSON(),root(canvas).querySelector('.kplex-camera')?.style.transform]);if(next!==geometry){geometry=next;stableSince=Date.now()}return source()?.isConnected&&a?.width>0&&b?.width>0&&Date.now()-stableSince>=120},'Relink source/target geometry did not settle');
   const count=opened.length;await drag(source,()=>center().querySelector('[data-kplex-gate="'+gate+'"]'));
   await until(()=>opened.length===count+1&&opened[count].modal.modalEl.isConnected,'Native relink composer absent');const {modal,options}=opened[count];
   c.progress={...c.progress,relinkAttempt:{view,gate,role,mode:options.mode,origin:options.origin.path,target:options.fixedTarget?.path,pairReady:p.index.isSemanticWriteReady(path('R'),path('P'))}};
   check(options.mode==='relink'&&options.origin.path===path('R')&&options.fixedTarget.path===path('P')&&options.semanticRole===role,'Production parent/child move lost exact context');
   await until(()=>modal.modalEl.querySelector('.kplex-relation-actions button.mod-cta')?.disabled===false,'Native relink save unavailable');await clickNative(()=>modal.modalEl.querySelector('.kplex-relation-actions button.mod-cta'));
   await until(()=>!modal.modalEl.isConnected&&p.index.isSemanticWriteReady(path('R'),path('P'))&&p.index.neighbours(p.index.get(path('R')),role).some(row=>row.page.path===path('P')),'Native relink was not published');
   await until(()=>!root(canvas).querySelector('.kplex-relationship-updating'),'Published native relink left updating feedback stuck');
   check(session(canvas).definition.id===view&&canvas.view.documentSession.centerPath===path('R')||view==='mindmap'&&owner.layoutRoot(path('C'))===path('R'),'Native relink changed its navigation context');
   const field=p.defaultOntologyField(role),raw=app.metadataCache.getFileCache(file(path('R')))?.frontmatter?.[field],values=Array.isArray(raw)?raw:[raw],saved=await app.vault.read(file(path('R')));
   check(values.some(value=>typeof value==='string'&&app.metadataCache.getFirstLinkpathDest(value.replace(/^\[\[/,'').replace(/\]\]$/,'').split('|')[0],path('R'))===file(path('P'))&&saved.includes(value)),'Published relation missing from saved metadata');
   c.progress={...c.progress,relinkSaves:[...(c.progress.relinkSaves??[]),{view,role,canonicalPublished:true,persistedMetadata:true,updatingRetired:true}]};
  }
  cases.push({id:'trusted-native-parent-child-relink-feedback-settles',view,actualSaves:2,rootRetained:true,canonicalRolesConfirmed:true,persistedMetadataConfirmed:true,updatingFeedbackRetired:true});
 }
 await relinkRoundtrip(host,'mindmap');
 c.progress={...c.progress,phase:'native-text-drop-open-editor'};const expanded=await act(host,'editor.expand',undefined,{kind:'explicit',node:{identity:path('R'),path:path('R'),kind:'file'},occurrenceId:'root'});check(expanded.status==='completed','Native text-drop editor unavailable');
 await until(()=>instance(host)?.view.editor&&root(host).querySelector('.kplex-central-editor-overlay .cm-content'),'Native source editor absent');
 c.progress={...c.progress,phase:'native-text-drop-editor-ready'};const leaf=instance(host),editor=leaf.view.editor,before=editor.getValue(),binding=owner.editors.bindings[0].id;
 const bodyIndex=before.split('\n').findIndex(line=>line==='# R');check(bodyIndex>=0,'Owned body absent from actual editor');const bodyPosition={line:bodyIndex,ch:3};editor.setCursor(bodyPosition);editor.scrollIntoView({from:bodyPosition,to:bodyPosition},true);
 const bodyLine=()=>[...root(host).querySelectorAll('.kplex-central-editor-overlay .cm-line')].find(line=>/^(?:#\s*)?R$/.test(line.textContent.trim()));
 await until(bodyLine,'Owned Markdown body line absent');c.progress={...c.progress,phase:'native-text-drop-focus-body'};await clickNative(bodyLine);
 c.progress={...c.progress,phase:'native-text-drop-deliver'};await drag(()=>root(compass).querySelector('.kplex-role-center'),bodyLine);
 c.progress={...c.progress,phase:'native-text-drop-check-result'};await until(()=>editor.getValue()!==before,'Native text drop did not reach CodeMirror');
 check(instance(host)===leaf&&owner.editors.bindings[0].id===binding&&owner.layoutRoot(path('C'))===path('R'),'Native text drop retargeted root/editor');
 const after=editor.getValue();check(after.includes('C'),'Native source did not insert its captured C link');
 const closed=await act(host,'editor.collapse');check(closed.status==='completed','Native text-drop save/collapse failed');
 check(await app.vault.read(file(path('R')))===after,'Native text-drop edits were not durably saved');
 cases.push({id:'trusted-native-occurrence-editor-text-drop',sameNativeInstance:true,sameBinding:true,rootRetained:true,durableSave:true});
 p.notifyNavigation(path('R'),compass);await until(()=>compass.view.documentSession.centerPath===path('R')&&nodes(compass).some(element=>element.dataset.kplexPath===path('P')),'Compass relink fixture absent');
 await relinkRoundtrip(compass,'classic');
 owner.select('wuxing');p.notifyNavigation(path('R'),host);await until(()=>owner.definition.id==='wuxing'&&host.view.documentSession.centerPath===path('R')&&nodes(host).some(element=>element.dataset.kplexPath===path('P')),'Wu Xing relink fixture absent');
 await relinkRoundtrip(host,'wuxing');

}
