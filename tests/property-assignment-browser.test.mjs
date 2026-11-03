/** Actual shared native property action/modal and existing metadata convergence owner. The
 * fixture models FileManager/Vault/MetadataCache only; it never implements the field transform. */
import assert from 'node:assert/strict';
import test from 'node:test';
import {colorEditorScenario} from './support/colorEditorBrowser.mjs';

const initialize=`
 const M=sourceModules,t=M.createTranslator('en'),check=(value,message)=>{if(!value)throw Error(message)},copy=value=>structuredClone(value);
 const equal=(a,b,message)=>check(JSON.stringify(a)===JSON.stringify(b),message+' '+JSON.stringify([a,b]));
 const suffix=['# Body','Keep [[Original relationship]] and exact note text.'].join(String.fromCharCode(10));
 let frontmatter={phase:['water','private'],parents:['[[Parent]]'],title:'Keep title'},body=JSON.stringify(frontmatter)+String.fromCharCode(10)+suffix;
 let cache={frontmatter:copy(frontmatter)},current=true,protectedFields=['parents'],beforeCallback=null,rejectDisk=false,emitChanged=true;
 const file={path:'Note.md',basename:'Note',extension:'md',stat:{mtime:1,size:body.length}},other={path:'Other.md',extension:'md',stat:{mtime:1,size:1}};
 const callbacks=new Set(),cancels=new Set(),views=[],work={bodyReads:0,nativeCalls:0,saves:0,mutationCallbacks:0};
 const channel={on:(name,callback)=>{const ref={name,callback};callbacks.add(ref);return ref},offref:ref=>callbacks.delete(ref)};
 const app={workspace:{iterateAllLeaves:callback=>views.forEach(callback)},vault:{...channel,getFileByPath:path=>path===file.path?file:null,cachedRead:async()=>{work.bodyReads++;return body}},
 metadataCache:{...channel,getFileCache:target=>target===file?cache:null},fileManager:{processFrontMatter:async(target,mutate)=>{
   work.nativeCalls++;if(beforeCallback)await beforeCallback;const next=copy(frontmatter);work.mutationCallbacks++;mutate(next);
   if(rejectDisk)throw Error('Expected native disk rejection');frontmatter=next;body=JSON.stringify(frontmatter)+String.fromCharCode(10)+suffix;
   file.stat.mtime++;file.stat.size=body.length;cache={frontmatter:copy(frontmatter)};work.saves++;
   if(emitChanged)for(const ref of [...callbacks])if(ref.name==='changed')ref.callback(file,body,cache);
 }}};
 const owner=new M.CanvasPropertyAssignmentActions(app,t,()=>protectedFields,(file,field,mutate,alive)=>M.writeRelationshipMetadata(app,file,new Set([M.normalizeFieldName(field)]),mutate,{
   own:cancel=>{cancels.add(cancel);return()=>cancels.delete(cancel)},pending:()=>{},savedPendingMessage:()=>t('note.savedMetadataPending'),current:alive}));
 const page={path:file.path,name:'Note',file,url:null,isFolder:false,isTag:false,neighbours:new Map()},scope=document.createElement('div');document.body.append(scope);
 const legacy={...M.FACET_TEMPLATES.wuxing,field:'phase',categories:Object.fromEntries(M.FACET_TEMPLATES.wuxing.order.map(id=>[id,{...M.FACET_TEMPLATES.wuxing.categories[id],values:[id],assignment:id}]))};
 const configuration={status:'available',values:{presets:{wuxing:legacy}}},assignment=M.facetPropertyAssignments({version:1,preset:'wuxing'},configuration).find(target=>target.value==='metal');
 const request={scope,page,assignment,current:()=>current,unrelated:false};
 const last=()=>M.TestModal.instances.at(-1),button=(modal,label)=>[...modal.contentEl.querySelectorAll('button')].find(row=>row.textContent===label);
 const open=()=>{check(owner.open(request),'Shared action admitted');return last()};
 const apply=async modal=>{button(modal,t('assignment.apply')).click();await waitFor(()=>!modal.modalEl.isConnected)};
 const cleanup=()=>{owner.dispose();check(callbacks.size===0&&cancels.size===0,'Every native observer/cancel lease retired');scope.remove();check(window.migrationListeners===0,'Native modal ownership retired')};
`;
const scenario=body=>colorEditorScenario(`(async()=>{${initialize}\n${body}\ncleanup();return true})()`);

test('native property confirmation writes once, preserves note/body/relationships and guarded Undo restores only the field',async()=>{
 assert.equal(await scenario(`
 const original=copy(frontmatter),m=open();equal(work,{bodyReads:0,nativeCalls:0,saves:0,mutationCallbacks:0},'Preview reads cache only');
 check(m.contentEl.textContent.includes(t('assignment.sharedField')),'Preview explains shared property scope');await apply(m);
 equal(frontmatter,{...original,phase:['private','metal']},'Actual native mutation applies the shared field transform');
 check(body.endsWith(suffix)&&work.saves===1&&work.nativeCalls===1,'Body and relationship writer are not replaced');
 check(work.bodyReads===2,'One explicit saved-buffer guard plus existing convergence read');check(owner.canUndo(scope),'Applied exact field has one scoped receipt');
 check(owner.undo(scope),'Undo admitted');const undo=last();button(undo,t('assignment.undo')).click();await waitFor(()=>!undo.modalEl.isConnected);
 equal(frontmatter,original,'Undo restores the exact original list and unrelated properties');check(!owner.canUndo(scope),'Receipt consumed once');
 check(callbacks.size===0&&cancels.size===0,'Convergence observers released after actual completion');
 `),true);
});

test('existing-category drop is a no-op and later field edits disable Undo without overwriting content',async()=>{
 assert.equal(await scenario(`
 frontmatter.phase=['private','metal'];cache={frontmatter:copy(frontmatter)};
 check(owner.open(request),'Existing category accepted as no-op');check(M.TestModal.instances.length===0,'No redundant modal or write');equal(work,{bodyReads:0,nativeCalls:0,saves:0,mutationCallbacks:0},'No source work for no-op');
 frontmatter.phase=['water'];cache={frontmatter:copy(frontmatter)};await apply(open());
 frontmatter.phase=['Later user edit'];cache={frontmatter:copy(frontmatter)};
 check(!owner.canUndo(scope)&&!owner.undo(scope),'Undo cannot overwrite a later field value');equal(frontmatter.phase,['Later user edit'],'Later content retained');
 `),true);
});

test('dirty native Markdown buffer refuses assignment while retaining exact editor identity and preview',async()=>{
 assert.equal(await scenario(`
 const native=Object.assign(new M.TextFileView(),{file,getViewType:()=> 'markdown',getViewData:()=>body+' unsaved typing'});views.push({view:native});
 const m=open();button(m,t('assignment.apply')).click();await waitFor(()=>m.modalEl.getAttribute('aria-busy')==='false');
 check(m.modalEl.isConnected&&m.contentEl.textContent.includes(t('assignment.retry')),'Failure retains preview and actionable recovery');
 check(work.saves===0&&work.nativeCalls===0&&!owner.canUndo(scope),'Dirty buffer never enters FileManager');check(views[0].view===native,'Native editor identity retained');
 check(native.getViewData().endsWith(' unsaved typing'),'Native content untouched');equal(frontmatter.phase,['water','private'],'Saved property untouched');m.close();
 `),true);
});

test('changed canvas/preset or retired source file cannot publish a queued native property edit',async()=>{
 assert.equal(await scenario(`
 const m=open();let release;beforeCallback=new Promise(resolve=>release=resolve);button(m,t('assignment.apply')).click();await waitFor(()=>work.nativeCalls===1);
 m.close();check(m.modalEl.isConnected,'Cancel excluded while durable native outcome is pending');current=false;release();
 await waitFor(()=>m.modalEl.getAttribute('aria-busy')==='false');check(work.saves===0,'Retired request fails in FileManager before mutation');
 equal(frontmatter.phase,['water','private'],'Field unchanged');check(!owner.canUndo(scope),'No false receipt');m.close();
 `),true);
});

test('native disk rejection publishes no optimistic assignment and releases every convergence listener',async()=>{
 assert.equal(await scenario(`
 rejectDisk=true;const m=open();button(m,t('assignment.apply')).click();await waitFor(()=>m.modalEl.getAttribute('aria-busy')==='false');
 check(work.nativeCalls===1&&work.saves===0&&!owner.canUndo(scope),'Actual storage rejection is not success');equal(frontmatter.phase,['water','private'],'Native field remains original');
 check(m.modalEl.isConnected&&m.contentEl.textContent.includes(t('styles.operation.notSaved')),'Truthful failure retained');check(callbacks.size===0&&cancels.size===0,'Rejected write observers released');m.close();
 `),true);
});

test('newly protected ontology field and ambiguous cached coordinates never authorize a scalar rewrite',async()=>{
 assert.equal(await scenario(`
 check(!owner.eligible(page,{...assignment,field:'parents'}),'Configured ontology field is not a category assignment target');
 cache={frontmatter:{phase:'water',Phase:'metal'}};check(owner.open(request),'Ambiguous cached field handled without writes');check(window.notices.at(-1)===t('assignment.unavailable'),'Ambiguity explained');
 cache={frontmatter:copy(frontmatter)};const m=open();protectedFields.push('phase');button(m,t('assignment.apply')).click();
 await waitFor(()=>m.modalEl.getAttribute('aria-busy')==='false');check(work.saves===0&&work.nativeCalls===0,'Protection rechecked at commit');m.close();
 `),true);
});

test('unrelated assignment explains classification-only behavior and Connect remains a distinct explicit action',async()=>{
 assert.equal(await scenario(`
 let connects=0;check(owner.open({...request,unrelated:true,connect:()=>connects++}),'External note preview admitted');const m=last();
 check(m.contentEl.textContent.includes(t('assignment.unrelated')),'No implicit connection explained');button(m,t('assignment.connectOnly')).click();
 check(connects===1&&!m.modalEl.isConnected&&work.saves===0,'Separate Connect action performs no category mutation');
 `),true);
});

test('saved-pending convergence remains a saved outcome without optimistic scene or false retry',async()=>{
 assert.equal(await scenario(`
 emitChanged=false;const m=open();button(m,t('assignment.apply')).click();await waitFor(()=>work.saves===1);
 for(const cancel of [...cancels])cancel();await waitFor(()=>!m.modalEl.isConnected);
 equal(frontmatter.phase,['private','metal'],'Actual native save retained');check(window.notices.includes(t('styles.operation.savedRefreshPending')),'Saved-pending recovery is truthful');
 check(callbacks.size===0&&cancels.size===0,'Pending observers retired');
 `),true);
});
