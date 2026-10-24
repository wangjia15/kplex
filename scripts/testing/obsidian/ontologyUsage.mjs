/** Exact-build native ontology-use extension in the explicitly selected disposable Small vault.
 * Owns two timestamped documents and real Settings/modal interactions; restores configuration/layout.
 * Existing acquisition seeds fixture data only. Measured UI/query actions cannot acquire or write it. */
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {validateTarget} from './runner.mjs';
import {runControlledProbe} from './controlledProbe.mjs';

/** Use actual indexed name facts, native controls and independent opening actions. */
async function scenario(app,c){
 const p=app.plugins.plugins['k-plex'];if(!p||app.setting.isOpen||app.vault.getFiles().length>=1000)throw Error('Clean disposable Small vault required');
 const layout=app.workspace.getLayout(),settings=structuredClone(p.settings),files=[],dialogs=[],restores=[],prefix='Kplex194-usage-'+Date.now(),field='Kplex194 usage property';
 const check=(value,message)=>{if(!value)throw Error(message)},wait=ms=>new Promise(resolve=>window.setTimeout(resolve,ms));
 /** Bound waits without changing native scheduler policy. */
 const until=async(read,message)=>{const end=Date.now()+30000;while(!(await read())){check(!c.closed&&Date.now()<end,message);await wait(40)}};
 /** Locate actual native buttons without interpolating quoted localized captions into selectors. */
 const button=(modal,key)=>{const found=[...modal.contentEl.querySelectorAll('button')].find(element=>element.textContent===p.translator(key));check(found,'Missing action '+key);return found;};
 const cases=[],work={reads:0,parses:0,acquisitions:0,replacements:0,settings:0};c.progress={cases,work};
 /** Observe one existing operation, preserving all arguments and scheduling. */
 const observe=(owner,name,key)=>{const original=owner[name];owner[name]=function(...args){work[key]++;return original.apply(this,args)};restores.push(()=>owner[name]=original);};
 try{
  await p.settingsWriteQueue;await until(()=>!p.isStartupInitializing(),'Startup pending');
  for(const name of ['One','Two']){
   const path=prefix+' '+name+'.md';check(!app.vault.getFileByPath(path),'Fixture collision');
   const file=await app.vault.create(path,'---\n'+field+': scalar\n---\n['+field+':: another scalar]\n');files.push(file);p.index.insertCreatedFile(file);
   await until(()=>app.metadataCache.getFileCache(file)?.frontmatter?.[field]==='scalar','Fixture metadata absent');
   const body=await p.index.sourceAcquisition.readRequestedBody(file,()=>!c.closed);check(body,'Fixture body unavailable');const seeded=await p.index.sourceAcquisition.acquire(file,body);check(seeded.current&&seeded.saved,'Fixture facts not stored');
  }
  await p.assignFieldToOntology(field,'hidden',null);
  // Prepare the historical discovery catalog before cleaning the two owned fixtures later.
  await p.rebuildIndex(true,true,'ontology-discovery');
  await until(()=>{c.progress.pending={urls:p.index.urlOwnerTasks.size,timer:p.rebuildTimer!==null,building:p.index.building,semantics:p.index.hasPendingSemanticPreparation()};return p.index.urlOwnerTasks.size===0&&p.rebuildTimer===null&&!p.index.building&&!p.index.hasPendingSemanticPreparation();},'Fixture work pending');
  const native=require('@electron/remote').getCurrentWindow();native.show();native.focus();native.webContents.focus();
  p.openSettings();check(p.settingsTab.openSettingsPage(p.translator('settings.ui.ontology')),'Ontology Settings absent');
  await until(()=>{const doc=p.settingsTab.containerEl.ownerDocument;return doc.defaultView?.innerWidth>100&&doc.hasFocus()&&[...doc.querySelectorAll('.setting-item-name')].some(element=>element.textContent===p.translator('ontology.manager.title')&&element.getClientRects().length)},'Actual Settings owner absent');
  const entry=[...p.settingsTab.containerEl.ownerDocument.querySelectorAll('.setting-item')].find(row=>row.querySelector('.setting-item-name')?.textContent===p.translator('ontology.manager.title')&&row.getClientRects().length);check(entry,'Manager entry absent');(entry.querySelector('button')??entry).click();
  const manager=[...p.settingsTab.ontologyManagers][0];dialogs.push(manager);
  const search=manager.manager.search;search.value=field;search.dispatchEvent(new search.ownerDocument.defaultView.Event('input',{bubbles:true}));
  const row=manager.manager.list.querySelector('.kplex-style-manager-row');check(row?.textContent.includes(field),'Configured physical field absent');row.click();const editor=[...manager.children][0];dialogs.push(editor);
  observe(app.vault,'read','reads');observe(app.vault,'cachedRead','reads');observe(p.index.metadataParser,'parse','parses');observe(p.index.sourceAcquisition,'acquire','acquisitions');observe(p.index.indexedDb.sources,'replace','replacements');observe(p,'saveData','settings');
  button(editor,'ontology.usage.show').click();const list=[...editor.usageDialogs][0];dialogs.push(list);await until(()=>!list.loading,'Usage list pending');
  check(list.documents.length===2&&list.documents.every(document=>document.path.startsWith(prefix)),'Unassigned scalar/inline uses incomplete or duplicated');
  check(list.manager.list.querySelectorAll('.setting-item').length===2,'Actual document rows absent');
  list.manager.search.value='Two';list.manager.search.dispatchEvent(new list.contentEl.ownerDocument.defaultView.Event('input',{bubbles:true}));check(list.manager.list.querySelectorAll('.setting-item').length===1,'Keyword filter not applied');
  const copy=button(list,'footprints.copyMarkdown');copy.click();await until(()=>list.clipboard?.state==='copied','Native clipboard failed');
  const copied=await list.contentEl.ownerDocument.defaultView.navigator.clipboard.readText();check(copied==='- [['+files[1].path+']]','Filtered Markdown clipboard mismatch');
  for(const count of Object.values(work))check(count===0,'Read-only list performed source/settings work');cases.push('actual Settings scalar/inline lookup, keyword filter and native Markdown copy with zero source/settings work');
  for(const restore of restores.splice(0).reverse())restore();
  const current=list.manager.list.querySelector('.setting-item'),action=key=>[...current.querySelectorAll('.clickable-icon')].find(element=>element.getAttribute('aria-label')===p.translator(key,{name:files[1].basename}));
  action('ontology.usage.openTab').click();await until(()=>app.workspace.getLeavesOfType('markdown').some(leaf=>leaf.view.file===files[1]),'New native document tab absent');cases.push('separate native new-tab action');
  action('ontology.usage.openPlex').click();await until(()=>[...app.workspace.getLeavesOfType('k-plex-react-view'),...app.workspace.getLeavesOfType('k-plex-sidepanel-view')].some(leaf=>p.documentSession(leaf)?.centerPath===files[1].path),'Plex center did not navigate');cases.push('separate normal Plex navigation');
  check(editor.modalEl.isConnected&&editor.opened,'Navigation discarded ontology draft');
  for(const file of files){
   const before=app.metadataCache.getFileCache(file);await app.vault.modify(file,'Cleaned owned count-refresh fixture.\n');
   await until(()=>{const cache=app.metadataCache.getFileCache(file);return cache&&cache!==before&&cache.frontmatter?.[field]===undefined},'Cleaned fixture metadata pending');
   const body=await p.index.sourceAcquisition.readRequestedBody(file,()=>!c.closed);check(body,'Cleaned fixture body absent');const saved=await p.index.sourceAcquisition.acquire(file,body);check(saved.current&&saved.saved,'Cleaned fixture source pending');
  }
  button(list,'settings.refresh').click();await until(()=>!list.loading,'Cleaned uses pending');check(list.documents.length===0,'Cleaned property still has documents');
  check(manager.manager.list.textContent.includes(field)&&manager.manager.list.textContent.includes(p.translator('ontology.manager.documents',{count:0})),'Assigned zero field disappeared or lost shared count');
  cases.push('Show documents zero updates manager while assigned field remains visible');list.close();
  button(editor,'ontology.manager.remove').click();button(editor,'ontology.manager.confirmRemove').click();await until(()=>!editor.opened,'Assignment removal pending');manager.close();
  check(p.index.unassignedOntologyFields().some(item=>item.name===field&&item.count>0),'Historical discovery fixture was not retained');
  p.settingsTab.openOntologyManager('unassigned');const unassigned=[...p.settingsTab.ontologyManagers][0];dialogs.push(unassigned);
  unassigned.manager.search.value=field;unassigned.manager.search.dispatchEvent(new unassigned.contentEl.ownerDocument.defaultView.Event('input',{bubbles:true}));
  check(unassigned.manager.list.textContent.includes(field),'Stale unassigned field absent before explicit recount');
  await until(()=>p.index.urlOwnerTasks.size===0&&p.rebuildTimer===null&&!p.index.hasPendingSemanticPreparation(),'Post-cleanup work pending');
  observe(app.vault,'read','reads');observe(app.vault,'cachedRead','reads');observe(p.index.metadataParser,'parse','parses');observe(p.index.sourceAcquisition,'acquire','acquisitions');observe(p.index.indexedDb.sources,'replace','replacements');observe(p,'saveData','settings');
  if(c.partialZero){
   const repository=p.index.indexedDb.sources,query=repository.querySources,key=unassigned.fields().find(item=>item.name===field)?.key;check(key,'Physical recount key absent');
   // Preserve the real lookup and its results, then inject incomplete coverage for this one field.
   repository.querySources=async(...args)=>{const complete=await query.apply(repository,args);return args[0]==='field'&&args[1]===key?false:complete;};restores.push(()=>repository.querySources=query);
  }
  button(unassigned,'ontology.manager.refreshCounts').click();await until(()=>!unassigned.refreshing,'Explicit recount pending');
  check(!unassigned.manager.list.textContent.includes(field),'Confirmed-zero unassigned field remains visible');
  for(const count of Object.values(work))check(count===0,'Cached recount performed source/settings work');
  cases.push(c.partialZero?'partial-zero cached recount removes stale unassigned field with zero source/settings work':'explicit cached recount removes stale unassigned field with zero source/settings work');return {cases,work,indexExtension:false,partialZero:c.partialZero};
 }finally{
  const failures=[],clean=async run=>{try{await run()}catch(error){failures.push(String(error))}};
  for(const restore of restores.reverse())await clean(restore);for(const dialog of dialogs.reverse())await clean(()=>dialog?.close());if(app.setting.isOpen)await clean(()=>app.setting.close());
  await clean(()=>app.workspace.changeLayout(layout));
  for(const file of files)await clean(async()=>{check(file.path.startsWith(prefix)&&app.vault.getFileByPath(file.path)===file,'Fixture ownership changed');await app.vault.delete(file);});
  await clean(()=>p.settingsWriteQueue);p.settings=settings;await clean(()=>p.saveSettings(false,false));await wait(2500);await clean(()=>app.vault.adapter.write(p.manifest.dir+'/data.json',c.originalData));
  if(failures.length)throw Error('Usage fixture cleanup: '+failures.join('; '));
 }
}
if(process.env.KPLEX_TEST_VAULT_NAME!=='kplex-test-small')throw Error('Explicit disposable Small vault required');
const target=validateTarget({vaultName:process.env.KPLEX_TEST_VAULT_NAME,vaultPath:process.env.KPLEX_TEST_VAULT_PATH,configDir:process.env.KPLEX_TEST_CONFIG_DIR});
await runControlledProbe('ontology-usage-194',scenario,'c.originalData='+JSON.stringify(readFileSync(join(target.pluginDir,'data.json'),'utf8'))+';c.partialZero='+JSON.stringify(process.env.KPLEX_ONTOLOGY_USAGE_PARTIAL_ZERO==='true')+';',[
 'src/adapters/obsidian/ontologyUsage.ts','src/ui/OntologyUsageModal.ts','src/ui/AddToOntologyModal.ts','src/main.ts',
]);
