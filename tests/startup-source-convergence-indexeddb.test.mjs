/**
 * Real IndexedDB startup recovery through actual coordinator members and GraphIndex owners.
 * Native host facts and a deliberate optional snapshot-evidence fault are controlled; source
 * acquisition, persistence, semantic preparation and automatic notification are production code.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import {contributorBrowserBundle, contributorBrowserInitialize} from './support/contributorBrowserFixture.mjs';
import {chromiumHarness} from './support/browserTypeScript.mjs';
import {hostOracle, collect} from './support/cachedSourceFixture.mjs';
import {fullCenterIndex, centerGateSettings} from './support/requestedCenterGateFixture.mjs';
import {startupSourceCoordinatorSource} from './support/startupSourceCoordinator.mjs';

const bundle = await contributorBrowserBundle(['src/main.ts', 'src/index/GraphIndex.ts', 'src/index/GraphBuilder.ts',
  'src/index/IndexSnapshot.ts', 'src/core/graph/compiler.ts', 'src/adapters/obsidian/metadataSourceCollector.ts',
  'src/adapters/obsidian/ontologySourceCollector.ts'], {'src/main.ts': startupSourceCoordinatorSource()});

for (const fault of ['metadata', 'evicted-unsaved']) test(`real ${fault} recovery automatically completes the stranded startup coordinator`, /** Recover through native metadata notification, never a manual second adoption call. */ async () => {
  const browser = await chromiumHarness(bundle);
  try {
    assert.equal(await browser.evaluate(contributorBrowserInitialize), true);
    assert.equal(await browser.evaluate(`(async()=>{
      const assert=Object.assign((v,m)=>ok(v,m),{equal}),M=sourceModules,f=await fixture('coordinator-source-recovery-${fault}'),fault=${JSON.stringify(fault)};
      const collect=${collect.toString()},hostOracle=${hostOracle.toString()},fullCenterIndex=${fullCenterIndex.toString()},centerGateSettings=${centerGateSettings.toString()};
      let initial,index,release,resume,restoreTransaction;
      const until=async(predicate,message)=>{const end=Date.now()+10000;while(!predicate()){ok(Date.now()<end,message);await new Promise(done=>setTimeout(done,20));}};
      try {
        f.text=f.texts;f.add('A.md','Friends:: [[B]]');f.add('B.md','');
        f.app.vault.getName=()=> 'coordinator-source-recovery-${fault}';
        f.app.vault.getAbstractFileByPath=path=>f.files.get(path)??(path==='/'||path===''?f.app.vault.getRoot():null);
        await f.acquire();ok(await f.acquisition.reconcile(),'Seed real neutral source authority');
        const semantic={hierarchy:{hidden:[],parents:[],children:[],leftFriends:['Friends'],rightFriends:[],previous:[],next:[]},inferAllLinksAsFriends:false,inverseInfer:false,showFullTagName:true,tagStyleList:[],maxLabelLength:30};
        initial=await fullCenterIndex(M,f,await hostOracle(f,[...f.files.keys()],semantic,{noteTypeField:'Type',primaryTagField:'Style'},true),semantic,centerGateSettings({showFolderNodes:false}));
        const settings={...initial.plugin.settings,lastActivePath:'A.md',pinnedNodes:[]};
        ok(await f.cache.writeSnapshot({createdAt:Date.now(),urlAliasVersion:2,vaultSignature:M.computeVaultSignature(f.app),settingsSignature:M.computeIndexSettingsSignature(settings),discoveredFields:[]},
          [...initial.state.pages.values()].map(page=>M.persistedPageFromGraphPage(page)),[...initial.state.evidence.declarations()].map(item=>M.persistedDeclarationFromEvidence(item))),'Seed genuine complete warm acceleration');
        initial.destroy();initial=null;f.acquisition.close();
        const p=new M.StartupSourceCoordinator();Object.assign(p,{app:f.app,settings,layoutReady:true,indexPreparationAdmitted:true,
          notifyIndexStatus(){},hasVisibleKplexSurface:()=>false,refreshBookmarkedEntryPoints:async()=>{},
          performRebuild:async()=>{throw Error('Recovery cannot force a full build');}});
        index=new M.GraphIndex(p,f.app);p.index=index;index.scheduleOrphanCleanup=()=>{};
        const readyInventory=[],ready=index.sourceAcquisition.inventoryReady;
        index.sourceAcquisition.inventoryReady=/** Observe the relevant producer's actual release order. */function(...args){readyInventory.push(!!this.inventory);return ready.apply(this,args);};
        const gate=new Promise(done=>{resume=done}),flush=index.sourceAcquisition.flush,reconcile=index.sourceAcquisition.reconcile;
        index.sourceAcquisition.flush=async function(...args){await gate;return flush.apply(this,args);};
        index.sourceAcquisition.reconcile=async function(...args){await gate;return reconcile.apply(this,args);};
        index.indexedDb.iterateSnapshotEvidence=async()=>{throw Error('Owned optional evidence fault');};
        release=index.acquireSemanticDemand('A.md');ok((await index.restorePersistedSnapshot(['A.md'])).restored,'Early preview survives');
        equal((await index.waitForSnapshotHydration()).restored,false,'Optional evidence failure remains incomplete');
        ok(index.hasSourceBackedStartup(),'Actual warm recovery route retained');
        const metadata=f.metadata.get('B.md'),repository=index.sourceAcquisition.repository,transaction=repository.transaction;
        let rejecting=fault==='evicted-unsaved';
        if(fault==='metadata')f.metadata.delete('B.md');
        else{
          repository.transaction=/** Inject a storage error at the existing per-source write boundary. */function(...args){
            if(rejecting&&args[2]==='readwrite'&&args[3]==='B.md')return Promise.reject(new DOMException('Owned quota fault','QuotaExceededError'));
            return transaction.apply(this,args);
          };
          restoreTransaction=()=>{rejecting=false;repository.transaction=transaction;};
          f.texts.set('B.md','Status:: recovering');f.app.vault.trigger('modify',f.files.get('B.md'));
        }
        index.sourceAcquisition.flush=flush;index.sourceAcquisition.reconcile=reconcile;resume();
        let attempts=0;const adopt=index.adoptStartupSources;
        index.adoptStartupSources=function(...args){attempts++;return adopt.apply(this,args);};
        await p.finishStartupIndexPreparation();
        equal(p.initialIndexComplete,false,'Failed source prerequisites cannot establish completion');
        if(fault==='metadata')ok(index.getSourceAcquisitionCounters().pendingMetadata>0,'Actual source reconciliation found missing metadata');
        else{
          ok(repository.unsaved.has('B.md'),'Actual write failure leaves an unsaved source mask');
          // Inject the exact post-eviction state, not a new eviction algorithm or budget. Recovery
          // must reacquire through the source owner, since repository memory replay has no payload.
          const retained=repository.memory.get('B.md');
          if(retained){repository.memoryBytes-=retained.bytes;repository.memory.delete('B.md');}
          ok(repository.unsaved.has('B.md')&&!repository.memory.has('B.md'),'Evicted source remains explicitly masked');
        }
        equal(attempts,1,'The actual coordinator attempted adoption once');
        ok(index.get('A.md').neighbours.get('B.md')?.isLeftFriend,'Early coherent relation remains navigable');
        restoreTransaction?.();f.metadata.set('B.md',metadata);f.app.metadataCache.trigger('changed',f.files.get('B.md'));
        await until(()=>index.sourceAcquisition.hasSemanticDependencies()&&!index.hasPendingSemanticPreparation(),'Real source/semantic prerequisite recovery did not close');
        await until(()=>p.initialIndexComplete,'Recovered owners did not automatically resume initial adoption');
        equal(attempts,2,'Genuine recovery coalesces to one second attempt');
        ok(readyInventory.length>0&&readyInventory.every(active=>!active),'Recovery notification follows inventory owner release');
        equal(index.getSemanticPreparationDiagnostics().fullBuilds,0,'No forced graph rebuild');
        equal(repository.unsaved.size,0,'Only actual durable source recovery clears the mask');
        ok(index.get('A.md').neighbours.get('B.md')?.isLeftFriend,'Recovered canonical relation survives');
        return true;
      } finally {restoreTransaction?.();resume?.();release?.();initial?.destroy();index?.destroy();f.close();}
    })()`), true);
  } finally { await browser.cleanup(); }
});
