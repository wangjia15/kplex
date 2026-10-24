/**
 * Real-IDB checks of the PR210 diagnostic harness itself: fixed finite event delivery, exact final
 * documents, independent oracle rejection, subsequent edit/reopen and unconditional cleanup. This
 * reduced fixture validates tooling contracts; it is not the matched performance study or native UX.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import {chromiumHarness} from './support/browserTypeScript.mjs';
import {contributorBrowserBundle, contributorBrowserInitialize} from './support/contributorBrowserFixture.mjs';
import {sourceEventBrowserInitialize} from './support/sourceEventWorkFixture.mjs';
import {collect, hostOracle, semanticView} from './support/cachedSourceFixture.mjs';

const bundle = await contributorBrowserBundle(['src/core/graph/compiler.ts',
  'src/adapters/obsidian/ontologySourceCollector.ts', 'src/adapters/obsidian/metadataSourceCollector.ts']);

for (const eventHeavy of [false, true]) {
  test(`event-work harness ${eventHeavy ? 'fixed3 waves' : 'true no-event control'} preserves documents, semantics and lifecycle`, /** The browser runs the exact shared fixture installed by the diagnostic runner. */ async () => {
    const browser = await chromiumHarness(bundle);
    try {
      assert.equal(await browser.evaluate(contributorBrowserInitialize), true);
      assert.equal(await browser.evaluate(sourceEventBrowserInitialize({collect, hostOracle, semanticView})), true);
      const result = await browser.evaluate(String.raw`(async()=>{
        const B=sourceEventWork,context=await B.setup('event-work-harness-${eventHeavy}',8);B.context=context;
        const f=context.fixture,ids=[...f.files.keys()],initial=[...f.texts];
        try {
          const before=await B.semanticOracle(context);B.reset(context);
          for(const body of f.texts.values()){
            equal(body.split('\n').length,3,'Representative Markdown has three actual lines');
            ok(!body.includes('\\n'),'Markdown must not contain a literal escaped newline');
          }
          const run=await B.run(context,${eventHeavy},${eventHeavy});
          equal(run.delivered.map(item=>[item.index,item.ordinal]),${eventHeavy ? '[[0,1],[7,2],[0,3]]' : '[]'},'Exact finite delivery order');
          if(${eventHeavy}){
            equal(f.texts.get(ids[0]),'Friends:: [['+ids[1]+']]\n[Reference 3](https://example.com/event/0)\nStatus:: event-3','Repeated owner keeps its final third edit');
            equal(f.texts.get(ids[7]),'Friends:: [['+ids[0]+']]\n[Reference 2](https://example.com/event/3)\nStatus:: event-2','Unvisited owner keeps the second edit');
            for(let index=1;index<7;index++)equal(f.texts.get(ids[index]),initial[index][1],'Every unrelated owner remains unchanged');
          }else equal([...f.texts],initial,'No-event control preserves every exact document');
          const after=await B.semanticOracle(context);
          if(!${eventHeavy})equal(after.semanticDigest,before.semanticDigest,'No-event semantics remain unchanged');
          const saved=f.texts.get(ids[0]);f.texts.set(ids[0],'Friends:: [[Deliberate oracle mismatch]]');
          let rejected=false;
          try{await B.semanticOracle(context);}catch(error){rejected=String(error).includes('oracle mismatch');}
          finally{f.texts.set(ids[0],saved);}
          ok(rejected,'Independent fresh-document oracle rejects a deliberately mismatching selected source');
          await B.semanticOracle(context);await B.subsequentEdit(context);
          const edited=await B.semanticOracle(context);await B.reopen(context);
          const reopened=await B.semanticOracle(context);equal(reopened.semanticDigest,edited.semanticDigest,'Reopen preserves final exact semantics');
          return {delivered:run.delivered.length,leases:reopened.leases,repairs:reopened.repairs,impacts:reopened.impacts};
        }finally{window.eventWorkCleanup=await B.cleanup(context);}
      })()`);
      assert.equal(result.delivered, eventHeavy ? 3 : 0);
      assert.equal(result.leases + result.repairs + result.impacts, 0);
      const cleanup = await browser.evaluate('window.eventWorkCleanup');
      assert.equal(cleanup.closed, true); assert.equal(cleanup.repositoryClosed, true);
      assert.equal(cleanup.remainingEventDisposers, 0); assert.deepEqual(cleanup.timers, [null, null, null, null]);
    } finally {
      try { await browser.evaluate('sourceEventWork.cleanup(sourceEventWork.context)'); }
      finally { await browser.cleanup(); }
    }
  });
}
