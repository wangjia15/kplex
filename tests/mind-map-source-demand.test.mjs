/** Actual GraphIndex/IndexedDB frontier preparation and cancellation for Mind Map. Native host cache/files are finite doubles; source/demand/publication owners are production code. */
import assert from 'node:assert/strict';
import test from 'node:test';
import {contributorBrowserBundle,contributorBrowserInitialize} from './support/contributorBrowserFixture.mjs';
import {chromiumHarness} from './support/browserTypeScript.mjs';
import {centerGateSettings} from './support/requestedCenterGateFixture.mjs';
const bundle=await contributorBrowserBundle(['src/index/GraphIndex.ts','src/ui/plexViews/prepareScene.ts',
 'src/application/PlexHierarchyDemand.ts','src/core/plex/views/mindmap/definition.ts']);

for(const mode of ['on-demand','eager'])test('unprepared Mind Map branches use existing source owners and retire held covers ('+mode+')',{timeout:90000},async()=>{
 const browser=await chromiumHarness(bundle);
 try{
  assert.equal(await browser.evaluate(contributorBrowserInitialize),true);
  assert.equal(await browser.evaluate(`(async()=>{
   const mode=${JSON.stringify(mode)},name='mindmap-cold-frontier-'+mode,M=sourceModules,f=await fixture(name),releases=[];let owner,index,unblock;
   const until=async(read,message)=>{const end=Date.now()+15000;while(!read()){ok(Date.now()<end,message);await new Promise(resolve=>setTimeout(resolve,10))}};
   const settle=async()=>{await until(()=>!index.hasPendingSemanticPreparation()&&!index.hasActiveSemanticPreparation(),'Existing preparation did not settle')};
   try{
    f.app.vault.getName=()=>name;f.app.vault.getAbstractFileByPath=path=>f.files.get(path)??(path==='/'||path===''?f.app.vault.getRoot():null);
    const settings={...(${centerGateSettings.toString()})({showFolderNodes:false,renderSiblings:false,maxItemCount:32}),
     hierarchy:{hidden:['Hidden'],parents:['Parent'],children:['Child'],leftFriends:['Friend'],rightFriends:['Right'],previous:['Previous'],next:['Next']},
     inferAllLinksAsFriends:false,inverseInfer:false,showFullTagName:true,tagStyleList:[],indexingMode:mode,urlIndexingMode:'on-demand',lastActivePath:'R.md',pinnedNodes:[]};
    f.add('R.md','',{Child:['[[B.md]]','[[Held.md]]']});f.add('B.md','',{Child:'[[D.md]]'});f.add('D.md','');f.add('Held.md','',{Child:'[[Late.md]]'});f.add('Late.md','');f.add('Attention.md','');
    f.app.metadataCache.resolvedLinks={'R.md':{'B.md':1,'Held.md':1},'B.md':{'D.md':1},'Held.md':{'Late.md':1}};
    index=new M.GraphIndex({app:f.app,settings,getIndexSourceRevision:()=>0,startupDiagnostics:{mark(){},count(){},phase(){},recordWork(){},processed(){}}},f.app);index.scheduleOrphanCleanup=()=>{};
    let inventory=0;const enableInventory=index.sourceAcquisition.enableInventory.bind(index.sourceAcquisition);
    index.sourceAcquisition.enableInventory=()=>{inventory++;if(mode!=='eager')throw Error('No global inventory allowed');return enableInventory()};
    ok(await index.initializeOnDemandBaseline(),'Actual physical baseline');
    if(mode==='eager'){index.sourceAcquisition.enableInventory();await index.sourceAcquisition.reconcile();await index.sourceAcquisition.flush();ok(index.sourceAcquisition.hasSemanticDependencies(),'Actual durable Eager source authority')}
    releases.push(index.acquireSemanticDemand('R.md'));await settle();const initialInventory=inventory;
    const before=index.viewScopeCoverage('B.md');ok(!before.prepared&&!before.complete,'B must be genuinely unprepared before explicit expansion: '+JSON.stringify(before));
    const project=state=>M.mindMapViewDefinition.project({attention:'Attention.md',layoutRoot:'R.md',maximum:32,state,read:M.plexViewRead(index,()=>true,32,'Attention.md',256),retainedScopes:owner?.snapshot().held??[]});
    let projection=project(null);ok(projection,'Root projection');ok(!projection.occurrences.some(row=>row.nodeId==='D.md'),'Collapsed branch excludes its descendants');
    const branch=projection.occurrences.find(row=>row.nodeId==='B.md');ok(branch?.branch.canExpand,'Unknown branch is expandable, never a fabricated leaf');
    const acquire=[];owner=new M.PlexHierarchyDemand(id=>{acquire.push(id);return index.acquireSemanticDemand(id)});
    const expanded=M.mindMapViewDefinition.hierarchy.reduce(null,projection,{kind:'toggle',occurrenceId:branch.id});projection=project(expanded);owner.synchronize('mindmap','R.md',projection.preparation.parents);await settle();
    projection=project(expanded);ok(projection.occurrences.some(row=>row.nodeId==='D.md'),'Actually prepared next generation is displayed');ok(index.viewScopeCoverage('B.md').prepared,'Production owner reports current local preparation');equal(acquire,['B.md'],'Exactly the explicit frontier acquired');
    const stable=[f.reads.length,index.publicationRevision,index.semanticPolicyRevision];
    for(let i=0;i<3;i++)owner.synchronize('mindmap','R.md',project(expanded).preparation.parents);equal(acquire,['B.md'],'Unchanged projection does not reacquire');equal([f.reads.length,index.publicationRevision,index.semanticPolicyRevision],stable,'Pure projection/reconciliation does no source or semantic work');
    owner.synchronize('mindmap','R.md',[]);ok(!index.semanticDemandCounts.has('B.md'),'Collapse releases only its frontier');ok(index.semanticDemandCounts.has('R.md'),'Root retained independently');
    ok(!index.viewScopeCoverage('Held.md').prepared,'Held branch starts unprepared');
    let entered=false;const hold=new Promise(resolve=>unblock=resolve);
    if(mode==='on-demand'){const build=index.hostPreview.build.bind(index.hostPreview);index.hostPreview.build=async(...args)=>{if(args[0]==='Held.md'&&args[1]?.completeHostCover){entered=true;await hold;}return build(...args)}}
    else{const prepare=index.sourceAcquisition.prepareRequestedNeighborhood.bind(index.sourceAcquisition);index.sourceAcquisition.prepareRequestedNeighborhood=async(...args)=>{if(args[0].center.id==='Held.md'){entered=true;await hold;}return prepare(...args)}}
    owner.synchronize('mindmap','R.md',['Held.md']);await until(()=>entered,'Actual Held native/source cover not reached');
    const captured=owner.capture('Held.md');owner.synchronize('mindmap','R.md',[]);ok(!captured(),'Retired frontier loses incarnation authority immediately');unblock();await settle();
    ok(!index.onDemandHostScopes.has('Held.md')&&!index.semanticScopes.has('Held.md'),'Held stale cover cannot publish after collapse');ok(!index.semanticDemandCounts.has('Held.md'),'No retired frontier lease retained');equal(inventory,initialInventory,'No expansion-time global inventory');
    return true;
   }finally{unblock?.();owner?.dispose();for(const release of releases)release();index?.destroy();f.close();}
  })()`),true);
 }finally{await browser.cleanup()}
});
