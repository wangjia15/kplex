/** Actual native controls and production queue/reconciliation prototypes in Chromium. Native Markdown syntax and OS clipboard acceptance remain separate host lanes. */
import {archivedFacetPresets} from './support/facetPresetArchive.mjs';
import assert from 'node:assert/strict';
import test from 'node:test';
import {colorEditorScenario} from './support/colorEditorBrowser.mjs';
const initialize=`
 const ARCHIVE=${JSON.stringify(archivedFacetPresets)};
 const M=sourceModules,t=M.createTranslator('en'),copy=value=>structuredClone(value),check=(value,message)=>{if(!value)throw Error(message)};
 const p=await createAppearanceHost({canvasViewSettings:{wuxing:{version:2,values:{presets:{arc:ARCHIVE.arc}}}}});p.viewSettingsRegistry=M.builtInCanvasViewSettings;p.manifest={id:'k-plex'};
 let disk=copy(p.writes.at(-1));p.writes=[];p.loadData=async()=>copy(disk);p.saveData=async value=>{disk=copy(value);p.writes.push(copy(value))};p.initializeSettingsReconciliation(copy(disk));
 const app={workspace:{on:()=>({}),offref:()=>{}}},tab=new M.KplexSettingTab(app,p),last=()=>M.TestModal.instances.at(-1);
 const button=(modal,label)=>[...modal.contentEl.querySelectorAll('button')].find(row=>row.textContent===label);
 const field=(modal,name)=>[...modal.contentEl.querySelectorAll('input,select')].find(input=>input.closest('.setting-item')?.querySelector('.setting-item-name')?.textContent===name);
 const input=(element,value)=>{element.value=value;element.dispatchEvent(new Event(element.tagName==='SELECT'?'change':'input',{bubbles:true}))};
 const toggle=(element,value)=>{element.checked=value;element.dispatchEvent(new Event('change',{bubbles:true}))};
 const pkg=(id='arc')=>M.exportFacetPackage(id,(ARCHIVE[id]??M.FACET_TEMPLATES[id]),{name:id,labels:Object.fromEntries((ARCHIVE[id]??M.FACET_TEMPLATES[id]).order.map(key=>[key,key])),helpMarkdown:M.effectiveFacetHelp(id,(ARCHIVE[id]??M.FACET_TEMPLATES[id]),t),locale:'en'},[],[],[],M.FACETS_AUTHORING_CONTEXT);
 const plan=(value,id,state=p.readPortableSharingState())=>M.preparePortableImport(value,{targetId:id,replace:false,lensIds:[],replacePalette:[]},state);
 const manager=()=>{tab.openCanvasViewManager('wuxing');return last()};
 const openImport=()=>{const m=manager();button(m,t('sharing.importPreset')).click();return {manager:m,modal:last()}};
 const fill=(modal,value)=>input(modal.contentEl.querySelector('textarea'),JSON.stringify(value));
 const drain=async()=>{await p.settingsWriteQueue;await Promise.resolve();await new Promise(resolve=>setTimeout(resolve,20))};
`;
const scenario=body=>colorEditorScenario(`(async()=>{${initialize}\n${body}\ntab.hide();return true})()`);

test('real atomic writer imports two presets independently, strips AI context, retains disabled dependency lenses and palette',async()=>{
 assert.equal(await scenario(`
 const value=pkg(),dependency={id:'shared-lens',name:'Shared lens',scope:'node',mode:'include',expression:'note.state == "draft"'};
 value.lenses=[dependency];value.preset.unassignedColor={kind:'palette',id:'shared-color'};value.palette=[{id:'shared-color',name:'Shared color',light:'#fff',dark:'#000'}];
 const beforeHistory=JSON.stringify(p.settings.navigationHistory),beforeOntology=JSON.stringify(p.settings.hierarchy),beforePolicy=p.index.semanticRevision;
 const prepared=M.preparePortableImport(value,{targetId:'import-one',replace:false,lensIds:['shared-lens'],replacePalette:[]},p.readPortableSharingState());
 await p.importPortableSharing(prepared,()=>true);check(p.writes.length===1,'One snapshot for preset/lens/palette');
 check(disk.canvasViewSettings.wuxing.values.presets['import-one'].helpMarkdown===value.preset.helpMarkdown,'Literal Help saved');
 check(disk.graphLenses.find(lens=>lens.id==='shared-lens').enabled===false,'Dependency arrives disabled');check(disk.colorPreferences.palette.some(pair=>pair.id==='shared-color'),'Palette committed with preset');
 check(!JSON.stringify(disk.canvasViewSettings).includes('aiContext'),'AI context is not persisted as live settings');
 await p.importPortableSharing(plan(pkg('para'),'import-two'),()=>true);check(p.writes.length===2,'Second independent operation');
 check(p.readPortableSharingState().presets['import-one']&&p.readPortableSharingState().presets['import-two'],'Both definitions survive');
 check(JSON.stringify(p.settings.navigationHistory)===beforeHistory&&JSON.stringify(p.settings.hierarchy)===beforeOntology,'No navigation/ontology mutation');
 check(p.index.semanticRevision===beforePolicy,'No semantic invalidation');
 `),true);
});

test('atomic storage failure, retired source and stale preview publish none of preset/palette/lenses',async()=>{
 assert.equal(await scenario(`
 const value=pkg(),prepared=plan(value,'will-fail'),before=JSON.stringify(p.settings),beforeDisk=JSON.stringify(disk);
 p.saveData=async()=>{throw Error('Injected disk refusal')};let failed=false;try{await p.importPortableSharing(prepared,()=>true)}catch{failed=true}
 check(failed&&JSON.stringify(p.settings)===before&&JSON.stringify(disk)===beforeDisk,'Failed save publishes nothing');
 p.saveData=async data=>{disk=copy(data);p.writes.push(copy(data))};failed=false;try{await p.importPortableSharing(prepared,()=>false)}catch{failed=true}
 check(failed&&p.writes.length===0,'Retired source never writes');
 await p.updateCanvasViewConfiguration('wuxing',{field:'presets',path:['will-fail']},{kind:'set',value:ARCHIVE.para});
 const latest=JSON.stringify(disk);failed=false;try{await p.importPortableSharing(prepared,()=>true)}catch{failed=true}
 check(failed&&JSON.stringify(disk)===latest,'Stale preview never overwrites a target');
 `),true);
});

test('native import preview shows exact payload, collision choices and safe Help; Cancel writes nothing',async()=>{
 assert.equal(await scenario(`
 const {modal}=openImport(),value=pkg(),before=JSON.stringify(disk);fill(modal,value);button(modal,t('sharing.preview')).click();
 check(modal.contentEl.querySelector('pre').textContent.includes('helpMarkdown'),'Exact payload and Help in preview');
 check(button(modal,t('sharing.apply')).disabled,'Existing ARC identity needs explicit replace');
 const target=modal.contentEl.querySelector('input[type=text]');input(target,'imported-native');check(!button(modal,t('sharing.apply')).disabled,'Unique target enables reviewed import');
 let nativeCalls=0;window.testNativeMarkdownRender=async(app,source,host,path,component)=>{nativeCalls++;check(component.loaded&&path==='','Native component lifetime');host.createEl('h1',{text:'Finite completion'})};
 button(modal,t('sharing.previewHelp')).click();await waitFor(()=>modal.contentEl.querySelector('h1'));check(nativeCalls===1,'Shared native Markdown owner used');
 modal.close();check(JSON.stringify(disk)===before&&p.writes.length===0,'Preview/Cancel have no settings effect');
 check(window.testMarkdownComponents.every(component=>!component.loaded),'Help component disposed on Cancel');
 `),true);
});

test('native preview uses actual installed capacity before enabling Import, with localized recovery and no write',async()=>{
 assert.equal(await scenario(`
 const huge=pkg();huge.preset.categories=Object.fromEntries(Object.entries(huge.preset.categories).map(([id,category])=>[id,{...category,values:Array.from({length:60},(_,index)=>'alias-'+index+'x'.repeat(80))}]));
 check(JSON.stringify(huge.preset).length>16384&&M.validatePortablePackage(huge).status==='valid','Package exceeds installed16K but parses within portable limit');const before=JSON.stringify(disk),{modal}=openImport();fill(modal,huge);button(modal,t('sharing.preview')).click();input(modal.contentEl.querySelector('input[type=text]'),'oversized-native');
 check(button(modal,t('sharing.apply')).disabled&&modal.contentEl.textContent.includes(t('sharing.capacity')),'Actual stored-library cap disables Import with recovery copy');
 check(JSON.stringify(disk)===before&&p.writes.length===0,'Capacity preview never writes');modal.close();
 `),true);
});

test('native Import commits one reviewed plan, source/choice edits invalidate it, and failed saves require fresh preview',async()=>{
 assert.equal(await scenario(`
 let {modal}=openImport();fill(modal,pkg());button(modal,t('sharing.preview')).click();input(modal.contentEl.querySelector('input[type=text]'),'native-one');
 fill(modal,{...pkg(),version:99});check(button(modal,t('sharing.apply')).disabled,'Typing retires old plan');button(modal,t('sharing.preview')).click();check(!modal.contentEl.querySelector('pre'),'Future source stays refused');
 fill(modal,pkg());button(modal,t('sharing.preview')).click();input(modal.contentEl.querySelector('input[type=text]'),'native-one');
 const liveBefore=JSON.stringify(p.settings);p.saveData=async()=>{throw Error('Injected write failure')};button(modal,t('sharing.apply')).click();await waitFor(()=>modal.modalEl.getAttribute('aria-busy')==='false');
 check(modal.modalEl.isConnected&&button(modal,t('sharing.apply')).disabled,'Failure retains source and retires preview');check(JSON.stringify(p.settings)===liveBefore,'Failed import has no live change');
 p.saveData=async data=>{disk=copy(data);p.writes.push(copy(data))};button(modal,t('sharing.preview')).click();input(modal.contentEl.querySelector('input[type=text]'),'native-one');button(modal,t('sharing.apply')).click();
 await waitFor(()=>!modal.modalEl.isConnected);check(p.writes.length===1&&p.readPortableSharingState().presets['native-one'],'Successful native import closes after durable commit');
 `),true);
});

test('manager export includes only selected dependencies, native prompt stays inert and clipboard feedback follows fulfillment',async()=>{
 assert.equal(await scenario(`
 p.settings.graphLenses=[{id:'private-lens',name:'Private lens',enabled:true,scope:'node',mode:'include',expression:'file.path.contains("Private/")'}];
 const m=manager(),exportButton=button(m,t('sharing.exportPreset'));exportButton.click();let modal=last(),source=modal.contentEl.querySelector('textarea');
 check(source.value&&!source.value.includes('private-lens'),'No silent active/private dependency export');
 const dependency=[...modal.contentEl.querySelectorAll('details input[type=checkbox]')][0];toggle(dependency,true);check(!source.value,'Private selector export requires consent');
 const permission=[...modal.contentEl.querySelectorAll('input[type=checkbox]')].at(-1);toggle(permission,true);check(source.value.includes('private-lens')&&!source.value.includes('"enabled"'),'Explicit selected and reviewed dependency only');
 let fulfill;Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:value=>new Promise(resolve=>{window.copiedPackage=value;fulfill=resolve})}});
 button(modal,t('sharing.copyJson')).click();check(!modal.contentEl.textContent.includes(t('footprints.copied')),'Pending clipboard is not success');fulfill();await waitFor(()=>modal.contentEl.textContent.includes(t('footprints.copied')));check(window.copiedPackage===source.value,'Exact visible bytes copied');modal.close();
 button(m,t('sharing.copyPrompt')).click();modal=last();check(modal.contentEl.querySelector('textarea').value===M.FACETS_AUTHORING_CONTEXT,'Detailed prompt and Help instructions stay plain source');modal.close();
 check(p.writes.length===0,'Export/prompt/clipboard never persist or activate anything');
 `),true);
});

test('existing lens manager routes source-scoped sharing, preserves unsaved drafts and retires only its own child',async()=>{
 assert.equal(await scenario(`
 const {React:R,flushSync}=M,index={suggestionCatalog:()=>({tags:[],noteTypes:[],folders:[],properties:[],paths:[]})};let writes=0,requests=[],retired=0;
 const lenses=[{id:'lens',name:'Opening',enabled:true,scope:'node',mode:'include',expression:'note.state == "draft"'}];
 const onShareLens=request=>{requests.push(request);const element=createDiv();document.body.append(element);return{element,retire:()=>{retired++;element.remove()}}};
 const props={index,revision:0,value:M.EMPTY_PLEX_FILTER,onChange:()=>{},lenses,onLensesChange:()=>{writes++;return Promise.resolve({refreshPending:false})},onShareLens,
  layoutMode:'keep',onLayoutModeChange:()=>{},showSiblings:false,onShowSiblingsChange:()=>{},visibility:{},onVisibilityChange:()=>{},sortOrder:'name',onSortOrderChange:()=>{},translate:t};
 const container=createDiv();document.body.append(container);const root=M.createRoot(container);flushSync(()=>root.render(R.createElement(M.PlexFilter,props)));
 flushSync(()=>container.querySelector('button').click());await waitFor(()=>document.querySelector('.kplex-lens-main'));flushSync(()=>document.querySelector('.kplex-lens-main').click());
 const name=document.querySelector('.kplex-lens-editor input');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(name,'Unsaved draft');name.dispatchEvent(new Event('input',{bubbles:true}));await new Promise(resolve=>setTimeout(resolve,0));
 flushSync(()=>[...document.querySelectorAll('button')].find(button=>button.textContent===t('sharing.importLens')).click());check(requests[0].mode==='import'&&requests[0].sourceScope.ownerDocument===document,'Captured native source document');
 check(document.querySelector('.kplex-lens-editor input').value==='Unsaved draft'&&writes===0,'Opening sharing preserves unsaved draft and activation');
 flushSync(()=>document.querySelector('button[aria-label="'+t('sharing.exportLens')+'"]').click());check(retired===1&&requests[1].mode==='export'&&requests[1].lens.id==='lens','Export captures exact installed lens and retires prior owned child');
 flushSync(()=>root.unmount());check(retired===2&&!document.querySelector('.kplex-filter-panel'),'Unmount retires sharing child/panel');
 `),true);
});

/** Direct draft transfer keeps the same validator, truthful clipboard and temporary URL cleanup. */
test('preset editor has one accessible action row and exports unsaved JSON without saving',async()=>{
 assert.equal(await scenario(`
 const m=manager();[...m.contentEl.querySelectorAll('.kplex-style-manager-row')].find(row=>row.textContent.startsWith('Wu Xing')).click();const editor=last();
 check(editor.modalEl.classList.contains('kplex-facet-preset-editor'),'Preset editor opts into responsive large sizing');
 const footer=editor.contentEl.querySelector('.kplex-style-editor-actions');check(footer.querySelectorAll('.setting-item').length===1,'All footer actions share one row');
 check([...footer.querySelectorAll('button')].every(button=>button.classList.contains('kplex-icon-action')&&button.getAttribute('aria-label')&&!button.hasAttribute('title')),'Icon actions have accessible names without native title tooltips');
 input(field(editor,t('facets.name')),'Unsaved workflow');input(field(editor,t('facets.layout')),'vertical');
 let finish;Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:value=>new Promise(resolve=>{window.draftJson=value;finish=resolve})}});
 button(editor,t('sharing.copyJson')).click();check(!editor.contentEl.textContent.includes(t('footprints.copied')),'Pending copy is not success');finish();await waitFor(()=>editor.contentEl.textContent.includes(t('footprints.copied')));
 const value=JSON.parse(window.draftJson);check(M.validatePortablePackage(value).status==='valid'&&value.preset.name==='Unsaved workflow'&&value.preset.layout==='vertical','Copy exports the exact valid unsaved draft');
 let blob,revoked=0,clicked=0;const create=URL.createObjectURL,revoke=URL.revokeObjectURL;URL.createObjectURL=value=>{blob=value;return 'blob:owned-draft'};URL.revokeObjectURL=value=>{check(value==='blob:owned-draft','Exact URL released');revoked++};
 const click=event=>{if(event.target.tagName==='A'&&event.target.download==='kplex-preset.json'){event.preventDefault();clicked++}};document.addEventListener('click',click);
 try{button(editor,t('sharing.download')).click();check(await blob.text()===window.draftJson&&clicked===1&&revoked===1&&!editor.contentEl.querySelector('a[download]'),'Save file uses exact JSON and cleans its link/URL');}finally{URL.createObjectURL=create;URL.revokeObjectURL=revoke;document.removeEventListener('click',click)}
 button(editor,t('facets.restore')).click();check(editor.contentEl.textContent.includes(t('facets.resetStatus'))&&field(editor,t('facets.layout')).value==='circular','Reset explains the unsaved change and restores the preset layout');
 check(p.writes.length===0,'Copy, file export and Reset never persist settings');button(editor,t('common.cancel')).click();check(p.writes.length===0,'Cancel discards the reset and unsaved edits');m.close();
 `),true);
});

/** Read-only native help explains import without becoming a settings editor or granting write authority. */
test('empty import explains paste/file and offers read-only format Help with a compact footer',async()=>{
 assert.equal(await scenario(`
 const {manager:m,modal}=openImport();const source=modal.contentEl.querySelector('textarea');check(source.placeholder===t('sharing.pasteHint')&&modal.contentEl.querySelector('input[type=file]'),'Both input paths are explained and available');
 check(modal.contentEl.querySelectorAll('.kplex-style-editor-actions .setting-item').length===1&&button(modal,t('sharing.apply')).disabled,'One action row and no unreviewed import');
 window.testNativeMarkdownRender=async(app,source,element)=>{window.formatSource=source;element.createEl('h2',{text:'Controlled native format Help'})};
 modal.contentEl.querySelector('.kplex-package-intro button').click();const help=last();await waitFor(()=>help.contentEl.querySelector('h2'));
 check(help.titleEl.textContent===t('sharing.formatHelp'),'Standalone guidance retains its complete localized title');
 check(window.formatSource===t('sharing.formatGuide')&&window.formatSource.includes('kplex-preset'),'Native renderer receives the localized format guide');
 check(!button(help,t('view.editHelp')),'Read-only format guide has no misleading Edit preset action');help.close();check(modal.modalEl.isConnected&&!source.value&&p.writes.length===0,'Closing Help preserves the import and writes nothing');
 check(window.testMarkdownComponents.every(component=>!component.loaded),'Guide components unloaded');modal.close();m.close();delete window.testNativeMarkdownRender;
 `),true);
});
