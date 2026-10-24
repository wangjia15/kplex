/** Native paired-field and directional-caption acceptance. Uses only the explicit disposable Small
 * vault and existing controller/transport; owns notes, dialogs and leaves and restores raw config.
 * Work guards distinguish pair-only presentation from legitimate note/role source processing. */
import {readFileSync} from 'node:fs';import {join} from 'node:path';import {runControlledProbe} from './controlledProbe.mjs';

/** Exercise actual Settings, ordinary physical declarations, native pairing and two independent views. */
async function scenario(app,c){
 const p=app.plugins.plugins['k-plex'];if(!p||app.setting.isOpen||app.vault.getFiles().length>=1000)throw Error('Clean Small-vault prerequisites required');
 await p.settingsWriteQueue;if(p.settingsReconciliation?.reading)await p.settingsReconciliation.reading;await p.settingsReconciliation?.prepare(false);
 const settings=structuredClone(p.settings),policy=p.savedSettingsPolicy,active=app.workspace.activeLeaf,external=p.externalSettingsReceived;
 const rootName='Kplex-Ontology-190-'+Date.now(),path=name=>rootName+'/'+name+'.md',owned=[],leaves=[],releases=[],restores=[],dialogs=[];
 const check=(value,message)=>{if(!value)throw Error(message)},wait=ms=>new Promise(resolve=>window.setTimeout(resolve,ms));
 /** Native publication/readiness and rendered captions each retain their own observable boundary. */
 const until=async(predicate,message)=>{const end=Date.now()+60000;while(!predicate()){check(!c.closed&&Date.now()<end,message);await wait(40)}};
 const forward='Kplex190 replies to',reverse='Kplex190 replied by';let folder,windowRestore,failure;
 try{
  await until(()=>!p.isStartupInitializing(),'Startup did not settle');
  const remote=require('@electron/remote'),win=remote.getCurrentWindow(),bounds=win.getBounds(),maximized=win.isMaximized();windowRestore=()=>{win.setBounds(bounds);if(maximized)win.maximize()};remote.app.show?.();remote.app.focus({steal:true});win.restore();win.show();win.focus();
  check(!p.ontologyRoleForField(forward)&&!p.ontologyRoleForField(reverse),'Fixture property already configured');
  Object.assign(p.settings,{documentSyncMode:'off',sidecarOpen:false,followActiveFile:false,autoOpenCentralDocument:false,embedCentralNode:false,showPageNodes:true,showFolderNodes:false,showTagNodes:false,showInferredNodes:true,showURLNodes:true,renderSiblings:false,graphDepth:1,graphLenses:[],applyPowerFilter:false,animationSpeed:0});
  p.settings.baseLinkStyle={...p.settings.baseLinkStyle,showLabel:true};p.settings.hierarchyLinkStyles={...p.settings.hierarchyLinkStyles,[forward.toLowerCase().replaceAll(' ','-')]:{showLabel:true,strokeWidth:4,strokeColor:'#cc8800ff'},[reverse.toLowerCase().replaceAll(' ','-')]:{showLabel:true,strokeWidth:7,strokeColor:'#33aaccff'}};await p.saveSettings(false);
  await p.updateOntologyField('previous',[...p.settings.hierarchy.previous,forward],[...p.settings.hierarchy.previous],p.receivedSettingsOwner('hierarchy'));
  await p.updateOntologyField('next',[...p.settings.hierarchy.next,reverse],[...p.settings.hierarchy.next],p.receivedSettingsOwner('hierarchy'));
  folder=await app.vault.createFolder(rootName);
  for(const name of ['A','B','C'])owned.push(await app.vault.create(path(name),name==='B'?forward+':: [['+rootName+'/A]]\n[['+rootName+'/Ghost]]\n':name==='A'?'# First\n\n# Second\n':'A disposable counterpart authoring target.\n'));
  await until(()=>owned.every(file=>app.metadataCache.getFileCache(file)),'Fixture metadata missing');
  for(const file of owned){p.index.insertCreatedFile(file);releases.push(p.index.acquireSemanticDemand(file.path));}
  await until(()=>!p.index.hasPendingSemanticPreparation(),'Fixture semantic demand did not drain');
  /** A real native leaf owns each independent scene and render root. */
  const open=async(type='tab')=>{const leaf=app.workspace.getLeaf(type);leaves.push(leaf);await leaf.setViewState({type:'k-plex-react-view',active:true});await app.workspace.revealLeaf(leaf);await leaf.view.waitUntilReady();return leaf;};
  const leaf=await open(),root=leaf.view.contentEl;
  const labels=owner=>[...owner.view.contentEl.querySelectorAll('.kplex-edge-label')].map(label=>label.textContent);
  p.notifyNavigation(path('A'),leaf);
  try{await until(()=>labels(leaf).includes(forward.toLowerCase().replaceAll(' ','-')),'Unpaired physical label did not render');}catch(error){const neighborhood=p.index.getNeighborhood(path('A'));c.progress={phase:'initial physical caption',labels:labels(leaf),center:root.querySelector('.kplex-role-center')?.dataset.kplexPath,nodes:[...root.querySelectorAll('.kplex-thought')].map(node=>({path:node.dataset.kplexPath,role:node.className})),roles:{forward:p.ontologyRoleForField(forward),reverse:p.ontologyRoleForField(reverse)},baseLink:p.settings.baseLinkStyle,physicalStyle:p.settings.hierarchyLinkStyles[forward.toLowerCase().replaceAll(' ','-')],neighbors:Object.fromEntries(['parents','children','leftFriends','rightFriends','previous','next'].map(key=>[key,neighborhood?.[key]?.map(item=>({path:item.page.path,definition:item.typeDefinition,role:item.role}))])),evidence:p.index.explainRelationship(path('A'),path('B')),diagnostics:p.index.getSemanticPreparationDiagnostics()};throw error;}
  await until(()=>p.getIndexStatus().upToDate&&!p.index.hasPendingSemanticPreparation(),'Pair guard requires controlled readiness');
  const physicalWidth=root.querySelector('.kplex-edge-visible')?.getAttribute('stroke-width');check(physicalWidth==='4','Physical-field style fixture missing');
  const work={reads:0,parses:0,rebuilds:0,invalidations:0,preparations:0,acquisitions:0,publications:0,snapshots:0};
  /** Delegate native calls unchanged; observation starts only after initial fixture source work. */
  const observe=(owner,key,counter)=>{const original=owner?.[key];check(typeof original==='function','Missing native work counter '+key);owner[key]=function(...args){work[counter]++;return original.apply(this,args)};restores.push(()=>{owner[key]=original});};
  observe(app.vault,'read','reads');observe(app.vault,'cachedRead','reads');observe(p.index.metadataParser,'parse','parses');observe(p.index,'rebuild','rebuilds');observe(p.index,'invalidateSemanticPolicy','invalidations');observe(p.index,'refreshSemanticSettings','preparations');observe(p.index,'persistIndexedDbSnapshot','snapshots');observe(p.index.sourceAcquisition,'parse','parses');observe(p.index.sourceAcquisition,'acquire','acquisitions');observe(p.index,'prepareSemanticScope','preparations');observe(p.index,'prepareRelationshipPairOwned','preparations');observe(p.index,'publishRestoredState','publications');observe(p.index,'publishOnDemandHostScope','publications');
  p.openSettings();await until(()=>p.settingsTab.containerEl.isConnected,'Native Settings missing');
  check(p.settingsTab.openSettingsPage(p.translator('settings.ui.ontology')),'Ontology Settings page missing');const managerEntry=[...p.settingsTab.containerEl.ownerDocument.querySelectorAll('.setting-item')].find(row=>row.querySelector('.setting-item-name')?.textContent===p.translator('ontology.manager.title')&&row.getClientRects().length);
  check(managerEntry,'Manage ontology entry absent');(managerEntry.querySelector('button')??managerEntry).click();
  const manager=[...p.settingsTab.ontologyManagers][0];check(manager?.contentEl.isConnected,'Native manager did not open');dialogs.push(manager);
  const search=manager.manager.search;search.value=forward;search.dispatchEvent(new Event('input',{bubbles:true}));
  let row=manager.contentEl.querySelector('.kplex-style-manager-row');check(row?.textContent.includes(forward),'Physical field missing from manager');row.click();
  const editor=[...manager.children][0];dialogs.push(editor);const input=editor.partnerControl.inputEl;input.value=reverse;input.dispatchEvent(new Event('input',{bubbles:true}));
  [...editor.contentEl.querySelectorAll('button')].find(button=>button.textContent===p.translator('common.save')).click();
  await until(()=>!editor.modalEl.isConnected,'Manager pair Save did not close');
  check(p.settings.hierarchy.next.includes(reverse),'Reciprocal standalone assignment/default was moved');
  const filter=manager.contentEl.querySelector('select');filter.value='next';filter.dispatchEvent(new Event('change',{bubbles:true}));
  row=manager.contentEl.querySelector('.kplex-style-manager-row');check(row?.textContent.includes(forward)&&row.textContent.includes(reverse)&&row.querySelector('.kplex-style-manager-name').textContent===reverse,'Manager role orientation lost partner');manager.close();
  app.setting.close();await p.settingsWriteQueue;
  await until(()=>labels(leaf).includes(reverse)&&!labels(leaf).includes(forward),'Stationary inverse caption did not update');
  check(p.inverseOntologyField(forward,'previous')===reverse&&p.ontologyRoleForField(reverse)==='next','Counterpart role/authoring lookup disagrees');check(root.querySelector('.kplex-edge-visible')?.getAttribute('stroke-width')===physicalWidth,'Caption substituted reciprocal field style');
  await wait(250);for(const [key,value] of Object.entries(work))check(value===0,'Pair-only change performed '+key);
  const pairOnly={...work};for(const restore of restores.splice(0))restore();
  p.notifyNavigation(path('B'),leaf);await until(()=>labels(leaf).includes(forward),'Declaring endpoint caption incorrect');
  const second=await open('split');p.notifyNavigation(path('A'),second);await until(()=>labels(second).includes(reverse),'Second view did not retain independent inverse perspective');
  check(labels(leaf).includes(forward),'Second view changed first view caption');
  const popout=await open('window');p.notifyNavigation(path('A'),popout);await until(()=>labels(popout).includes(reverse),'Popout inverse caption missing');
  check(labels(leaf).includes(forward)&&labels(second).includes(reverse),'Popout changed other perspectives');
  const a=owned.find(file=>file.path===path('A')),b=owned.find(file=>file.path===path('B'));
  const evidence=p.index.explainRelationship(path('A'),path('B'));check(evidence?.decisions.some(item=>item.active&&item.evidence.fieldName===forward&&item.evidence.declaredByPath===path('B')),'Caption lost physical declaring source');
  const modal=p.openAddToOntologyModal(forward);check(modal,'Native pairing modal did not open');dialogs.push(modal);
  const modalRoot=modal.contentEl,partner=modal.partnerControl.inputEl;check(partner?.value===reverse,'Native modal current partner absent');
  const save=[...modalRoot.querySelectorAll('button')].find(button=>button.textContent===p.translator('common.save'));check(save,'Native Save missing');save.click();await until(()=>!modal.modalEl.isConnected,'Unchanged native Save did not close');
  // Both authored physical declarations remain; displayed wording alone deduplicates.
  await app.vault.modify(a,'# First\n'+reverse+':: [['+rootName+'/B]]\n# Second\n');
  await until(()=>p.index.explainRelationship(path('A'),path('B'))?.decisions.some(item=>item.active&&item.evidence.fieldName===reverse),'Second authored declaration did not publish');
  await until(()=>labels(second).filter(text=>text===reverse).length===1,'Both-authored caption duplicated');
  const beforeBody=await app.vault.read(b);check(beforeBody.includes(forward+'::'),'Original declaring field was rewritten');
  // An opposite-endpoint explicit creation writes the configured physical counterpart only.
  const target=p.index.get(path('C'));check(target,'Counterpart creation target missing');
  const ghost=p.index.get(rootName+'/Ghost');check(ghost&&!ghost.file,'Unresolved source identity missing');
  const result=await p.createRelationToPage(ghost,'previous',target,forward);check(result.state!=='unavailable','Native counterpart authoring unavailable');
  await until(()=>app.metadataCache.getFileCache(owned.find(file=>file.path===path('C')))?.frontmatter?.[reverse],'Reciprocal physical property missing on destination');
  const destination=app.metadataCache.getFileCache(owned.find(file=>file.path===path('C'))).frontmatter;
  check(!destination[forward]&&JSON.stringify(destination[reverse]).includes('Ghost'),'Opposite-endpoint authoring used arbitrary or mirrored property');
  check(await app.vault.read(b)===beforeBody,'Opposite-endpoint creation rewrote original declaring note');
  const inverse=p.index.explainRelationship(rootName+'/Ghost',path('C'))?.decisions.find(item=>item.active&&item.evidence.sourceKind==='frontmatter-ontology'&&item.evidence.fieldName===reverse)?.evidence;
  check(inverse&&inverse.declaredByPath===path('C'),'Reverse evidence lost original declaration');
  check(await p.unlinkFrontmatterEvidence(inverse),'Reverse-source unlink did not succeed');
  await until(()=>!app.metadataCache.getFileCache(owned.find(file=>file.path===path('C')))?.frontmatter?.[reverse],'Reverse unlink did not remove the actual original property');
  check(await app.vault.read(b)===beforeBody,'Reverse unlink modified unrelated declaring note');
  // A separate parent/child pair exercises actual inline section projection and descendant labels.
  const contains='Kplex190 contains',contained='Kplex190 contained by';
  await p.updateOntologyField('children',[...p.settings.hierarchy.children,contains+'/'+contained],[...p.settings.hierarchy.children],p.receivedSettingsOwner('hierarchy'));
  await app.vault.modify(a,'# First\n'+reverse+':: [['+rootName+'/B]]\n## Nested\n'+contains+':: [['+rootName+'/C]]\n# Second\n');
  await until(()=>p.index.explainRelationship(path('A'),path('C'))?.decisions.some(item=>item.active&&item.evidence.fieldName===contains),'Section physical declaration did not publish');
  p.settings.graphDepth=2;await p.saveSettings(false);await app.workspace.revealLeaf(leaf);win.show();win.focus();p.notifyNavigation(path('A'),leaf);
  await until(()=>root.querySelector('.kplex-role-center')?.dataset.kplexPath===path('A'),'Section probe still owns previous center DOM');
  const actions=[],dispatch=p.actionManager.dispatch;p.actionManager.dispatch=function(request){if(request.id.startsWith('section'))actions.push({id:request.id,target:request.target});return dispatch.call(this,request)};restores.push(()=>{p.actionManager.dispatch=dispatch});
  const fold=root.querySelector('.kplex-role-center .kplex-section-fold-handle');check(fold,'Native section fold control missing');fold.click();
  await until(()=>[...root.querySelectorAll('.kplex-thought')].some(node=>node.dataset.kplexPath?.startsWith('kplex-section-target:')&&node.dataset.kplexPath.endsWith(':'+path('C')))&&labels(leaf).includes(contains),'Transient section caption did not use physical document endpoints');
  const heading=()=>[...root.querySelectorAll('.kplex-thought')].find(node=>node.dataset.kplexPath?.startsWith('kplex-section:')&&node.textContent.includes('First'));
  const nestedFold=()=>heading()?.querySelector('.kplex-section-fold-handle');check(nestedFold(),'Nested section fold control missing');
  if(nestedFold().classList.contains('is-folded'))nestedFold().click();
  await until(()=>nestedFold()?.classList.contains('is-expanded')&&labels(leaf).includes(contains),'Expanded section lost physical directional caption');
  nestedFold().click();await until(()=>{c.progress={phase:'folded section caption',actions,fold:nestedFold()?.className,labels:labels(leaf),edges:[...root.querySelectorAll('.kplex-edge-hit')].map(edge=>edge.dataset.kplexEdgeId),nodes:[...root.querySelectorAll('.kplex-thought')].map(node=>node.dataset.kplexPath)};return nestedFold()?.classList.contains('is-folded')&&labels(leaf).includes(contains);},'Folded section lost physical directional caption');
  check(await app.vault.read(b)===beforeBody,'Section projection changed original physical declaration');
  // Remove the pair through the actual modal: both fields remain ordinary assignments.
  const clear=p.openAddToOntologyModal(forward);dialogs.push(clear);const clearInput=clear.partnerControl.inputEl;clearInput.value='';clearInput.dispatchEvent(new Event('input',{bubbles:true}));[...clear.contentEl.querySelectorAll('button')].find(button=>button.textContent===p.translator('common.save')).click();await until(()=>!clear.modalEl.isConnected,'Native unpair Save did not close');
  check(p.ontologyRoleForField(forward)==='previous'&&p.ontologyRoleForField(reverse)==='next','Unpair lost ordinary assignments');
  return {cases:['ordinary one-field inline discovery','actual Settings manager pair','stationary reciprocal caption with physical-field style unchanged','pair-only zero source/semantic work','independent main/split/popout perspectives','physical source evidence retained','native current-partner unchanged Save','both-authored deduplicated wording','configured counterpart creation from unresolved endpoint','reverse-view unlink of actual original property','actual transient and folded section captions','native unpair preserving roles'],pairOnly,labels:{forward,reverse},ownedNotes:owned.length};
 }catch(error){failure=error;throw error;}finally{
  const errors=[];const clean=async run=>{try{await run()}catch(error){errors.push(String(error))}};
  for(const restore of restores.reverse())await clean(restore);for(const dialog of dialogs)await clean(()=>dialog.close());if(app.setting.isOpen)await clean(()=>app.setting.close());
  await clean(()=>p.settingsWriteQueue);for(const release of releases)await clean(release);for(const leaf of leaves.reverse())await clean(()=>leaf.detach());
  for(const file of owned.reverse())if(app.vault.getFileByPath(file.path)===file)await clean(()=>app.vault.delete(file));if(folder&&app.vault.getFolderByPath(rootName)===folder&&!folder.children.length)await clean(()=>app.vault.delete(folder,true));
  p.settings=settings;p.savedSettingsPolicy=policy;p.externalSettingsReceived=external;await clean(()=>p.index.refreshPresentationSettings());await clean(()=>p.index.refreshSemanticSettings());if(active)await clean(()=>app.workspace.setActiveLeaf(active,{focus:true}));
  await wait(300);await clean(()=>app.vault.adapter.write(p.manifest.dir+'/data.json',c.originalData));if(windowRestore)await clean(windowRestore);
  if(errors.length)throw Error((failure?'Scenario: '+failure+'; ':'')+'Ontology fixture cleanup: '+errors.join('; '));
 }
}
if(process.env.KPLEX_TEST_VAULT_NAME!=='kplex-test-small')throw Error('Ontology pairing requires the explicit Small fixture');
const data=readFileSync(join(process.env.KPLEX_TEST_CONFIG_DIR,'plugins/k-plex/data.json'),'utf8');
await runControlledProbe('ontology-pairs-190',scenario,'c.originalData='+JSON.stringify(data)+';',['src/core/contracts/ontologyConfiguration.ts','src/core/plex/directionalRelationCaption.ts','src/main.ts','src/settings.ts','src/ui/PlexGraph.tsx','src/ui/AddToOntologyModal.ts']);
