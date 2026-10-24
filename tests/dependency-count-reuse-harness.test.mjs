/**
 * Portable test-only contracts for synthetic dependency workloads and reversible observers.
 * Isolated VM realms protect Node/test prototypes; production IndexedDB behavior is covered by
 * the separate real-browser lane rather than by these small method doubles.
 */
import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import { resolve, join } from "node:path";
import { tmpdir } from "node:os";
import { installDependencyCountReuseFixture } from "./support/dependencyCountReuseFixture.mjs";
import { attemptReceiptFilename, canSkipSavedArm, validateResumeIdentity, ownedIndexedDbSize } from "../scripts/testing/dependency-count-reuse.mjs";

/** Model owned directories and synthetic database files without creating or traversing real profiles. */
function metadataState(path) {
  const file = path.endsWith(".ldb");
  return { isSymbolicLink: () => false, isDirectory: () => !file, isFile: () => file, size: 17 };
}

/** A live backend retirement is an explicitly incomplete metadata observation, never a false zero. */
test("owned file stat records a listed-file race without failing completed database work", async () => {
  const profile = join(tmpdir(), "kplex-source-idb-stat-contract", "profile");
  const observed = await ownedIndexedDbSize(profile, {
    readdir: async () => [{ name: "present.ldb" }, { name: "retired.ldb" }],
    lstat: async path => { if (path.endsWith("retired.ldb")) throw Object.assign(new Error("Retired"), { code: "ENOENT" }); return metadataState(path); },
  });
  assert.equal(observed.status, "unstable"); assert.equal(observed.bytes, null); assert.equal(observed.files, null);
  assert.equal(observed.observedRegularFileBytes, 17); assert.equal(observed.observedFiles, 1);
  assert.deepEqual(observed.missingEntries, ["retired.ldb"]);
});

/** The metadata fix preserves ownership, aliases, non-race errors and finite retained receipts. */
test("owned file stat still rejects unsafe targets and unexpected metadata failures", async () => {
  const profile = join(tmpdir(), "kplex-source-idb-stat-contract", "profile");
  await assert.rejects(ownedIndexedDbSize(resolve("foreign-profile")), /Unowned/);
  await assert.rejects(ownedIndexedDbSize(profile, { lstat: async () => ({ isSymbolicLink: () => true }) }), /alias/);
  await assert.rejects(ownedIndexedDbSize(profile, { lstat: async path => metadataState(path), readdir: async () => { throw Object.assign(new Error("Denied"), { code: "EACCES" }); } }), /Denied/);
  const indexedRoot = join(profile, "Default", "IndexedDB");
  await assert.rejects(ownedIndexedDbSize(profile, {
    lstat: async path => { if (path !== indexedRoot && path.startsWith(indexedRoot)) throw Object.assign(new Error("Retired"), { code: "ENOENT" }); return metadataState(path); },
    readdir: async () => Array.from({ length: 4225 }, (_, index) => ({ name: String(index) })),
  }), /metadata entry bound exceeded/);
  for (const alias of [join(profile, "Default"), indexedRoot]) {
    await assert.rejects(ownedIndexedDbSize(profile, {
      lstat: async path => path === alias ? { isSymbolicLink: () => true } : metadataState(path), readdir: async () => [],
    }), /alias/);
  }
});

/** Stable observations retain exact totals while a vanished directory remains explicitly unknown. */
test("owned file stat distinguishes observed totals from a retired directory", async () => {
  const profile = join(tmpdir(), "kplex-source-idb-stat-contract", "profile");
  const observed = await ownedIndexedDbSize(profile, { lstat: async path => metadataState(path), readdir: async () => [{ name: "present.ldb" }] });
  assert.equal(observed.status, "observed"); assert.equal(observed.bytes, 17); assert.equal(observed.files, 1);
  const retired = await ownedIndexedDbSize(profile, { lstat: async path => metadataState(path), readdir: async () => { throw Object.assign(new Error("Retired"), { code: "ENOENT" }); } });
  assert.equal(retired.status, "unstable"); assert.equal(retired.bytes, null); assert.deepEqual(retired.missingEntries, ["."]);
});

/** A stopped cohort may reuse results only under the exact recorded runtime and measurement inputs. */
test("repair resume rejects changed identities and explicitly qualifies legacy protocol adoption", () => {
  const directory = resolve("owned-repair-receipts");
  const expected = { mode: "full", node: "v22.22.2", platform: "win32", base: "accepted", sourceHashes: { A: "old", F: "new" }, bundleHashes: { A: "old-bundle", F: "new-bundle" }, conditions: { transport: 8 }, study: "PR207", directory, results: [] };
  const protocol = { version: "dependency-repair-207-v1", transportBatch: 8, seedBatch: 32, fixtureSha256: "fixture", browserHarnessSha256: "browser", contributorFixtureSha256: "contributor" };
  const previous = { ...structuredClone(expected), protocol };
  assert.equal(validateResumeIdentity(previous, expected, protocol, null, directory), null);
  for (const field of ["mode", "node", "platform", "base", "sourceHashes", "bundleHashes", "conditions", "study"])
    assert.throws(/** Each independent identity mismatch must fail before browser launch. */() => validateResumeIdentity({ ...previous, [field]: "changed" }, expected, protocol, null, directory), /differs/);
  assert.throws(/** A changed fixture cannot inherit a previously accepted runtime-only comparison. */() => validateResumeIdentity(previous, expected, { ...protocol, fixtureSha256: "other" }, null, directory), /protocol differs/);
  const legacy = structuredClone(expected);
  assert.throws(/** Missing old proof must remain missing instead of silently becoming a fresh hash. */() => validateResumeIdentity(legacy, expected, protocol, null, directory), /explicit current-hash/);
  const attestation = { protocol, legacyAttestation: { basis: "Current hashes, modification times and observed no edits", limitation: "No pre-cohort fixture hash was recorded" } };
  assert.deepEqual(validateResumeIdentity(legacy, expected, protocol, attestation, directory), attestation.legacyAttestation);
});

/** Retained failed work is never promoted into a passing sample, and passed inputs must still match. */
test("repair resume skips only matching passed receipts and preserves separate attempts", () => {
  const config = { owners: 128, distribution: "mixed", operation: "changed", pair: 1, wide: false };
  const receipt = { name: "timing-128-mixed-changed-1-F", status: "passed", ...config, detailed: false };
  const entry = { name: receipt.name, status: "passed" };
  assert.equal(canSkipSavedArm(entry, receipt, config, false), true);
  assert.equal(canSkipSavedArm({ ...entry, status: "incomplete" }, { ...receipt, status: "incomplete" }, config, false), false);
  assert.throws(/** An absent receipt is not evidence of a passing arm. */() => canSkipSavedArm(entry, null), /receipt mismatch/);
  assert.throws(/** Summary status cannot conceal a failed native receipt. */() => canSkipSavedArm(entry, { ...receipt, status: "failed" }), /receipt mismatch/);
  assert.throws(/** Changing owner count cannot reuse an earlier measurement. */() => canSkipSavedArm(entry, receipt, { ...config, owners: 256 }, false), /input owners differs/);
  assert.equal(attemptReceiptFilename(receipt.name, []), `${receipt.name}.json`);
  assert.equal(attemptReceiptFilename(receipt.name, [{ name: receipt.name, status: "incomplete" }]), `${receipt.name}.attempt-2.json`);
  assert.equal(attemptReceiptFilename(receipt.name, [entry, entry]), `${receipt.name}.attempt-3.json`);
});

/** Isolated realm avoids mutating native Node/other test prototypes. */
function realm() {
  const context = vm.createContext({ TextEncoder, performance });
  vm.runInContext(`window={sourceModules:{},value:/** Fixture installation needs no real request in this observer-only realm. */()=>{}};
    IDBObjectStore=class {/** Expose only the store name consumed by operation attribution. */constructor(){this.name='rows';}};
    IDBIndex=class {/** Bind index calls to their observed store. */constructor(){this.objectStore={name:'rows'};}};
    IDBCursor=class {/** Expose the cursor's owning store name for attribution. */constructor(){this.source={name:'rows'};}};
    IDBDatabase=class {};
    for(const name of ['get','getAll','getAllKeys','count','put','add','delete','openCursor','openKeyCursor'])IDBObjectStore.prototype[name]=/** Return an identity-sensitive store result through the installed observer. */function(){return this.name};
    for(const name of ['get','getKey','getAll','getAllKeys','count','openCursor','openKeyCursor'])IDBIndex.prototype[name]=/** Preserve an observable index result while testing wrapper retirement. */function(){return this.objectStore.name};
    IDBCursor.prototype.delete=/** Provide a cursor retirement identity without emulating storage. */function(){};IDBCursor.prototype.continue=/** Provide a cursor traversal identity without scheduling native work. */function(){};
    IDBDatabase.prototype.transaction=/** Supply an exact transaction result for forwarding assertions. */function(){return 'native transaction'};
    (${installDependencyCountReuseFixture.toString()})();`, context);
  return context;
}

test("detailed phase observer restores exact prototypes and nested phases after a rejected repair", /** Exercise nested attribution, rejection and exact independent cleanup in an isolated realm. */async () => {
  const context = realm();
  const result = await vm.runInContext(`(/** Keep all installed prototype wrappers and fault injection within this disposable realm. */async()=>{
    const nativeGet=IDBObjectStore.prototype.get,nativeCount=IDBIndex.prototype.count,nativeTransaction=IDBDatabase.prototype.transaction;
    const repository={
      /** Model an indexed proof operation nested beneath another awaited phase. */async authenticateLocalCountReuse(){new IDBIndex().count();},
      /** Verify attribution returns to staging after the nested proof completes. */async stageLocalDependencies(db,rows){new IDBObjectStore().put(rows[0]);await this.authenticateLocalCountReuse();new IDBObjectStore().get();},
      /** Reject after one request so cleanup is checked on the failure path. */async repairLocalDependencies(){new IDBObjectStore().get();throw new Error('injected repair fault');},
      /** Forward the controlled rejection through an enclosing activation phase. */async activate(){await this.repairLocalDependencies();},
    };
    const originalStage=repository.stageLocalDependencies,originalRepair=repository.repairLocalDependencies;
    const observer=window.dependencyCountReuse.observe(repository);
    let rejected=false;
    try{
      await repository.stageLocalDependencies(null,[{key:'synthetic',index:0}]);
      try{await repository.activate();}catch(error){rejected=error.message==='injected repair fault';}
      new IDBObjectStore().get();new IDBDatabase().transaction(['rows'],'readwrite');
      return {rejected,operations:observer.operations,staging:observer.staging};
    }finally{
      observer.retire();
      if(IDBObjectStore.prototype.get!==nativeGet||IDBIndex.prototype.count!==nativeCount||IDBDatabase.prototype.transaction!==nativeTransaction||repository.stageLocalDependencies!==originalStage||repository.repairLocalDependencies!==originalRepair)throw new Error('Observer leaked wrapped identities');
    }
  })()`, context);
  assert.equal(result.rejected, true);
  assert.equal(result.operations["authentication-proof|index.count|rows"], 1);
  assert.equal(result.operations["membership-staging|get|rows"], 1);
  assert.equal(result.operations["selected-count-repair|get|rows"], 1);
  assert.equal(result.operations["other|get|rows"], 1);
  assert.equal(result.operations["other|transaction:readwrite|rows"], 1);
  assert.equal(result.staging.pages, 1);
  assert.equal(result.staging.records, 1);
});

test("synthetic genuine fact edits preserve projection fields while mixed controls change exact keys", /** Keep semantic fact changes distinct from local membership changes in benchmark inputs. */() => {
  const context = realm();
  const facts = vm.runInContext(`(/** Capture finite synthetic variants without opening storage or a browser. */()=>{const f=window.dependencyCountReuse.facts;return {old:f(0,0),fresh:f(0,1),changed:f(0,1,true),wide:f(0,1,false,true)}})()`, context);
  assert.notEqual(facts.old.metadata[0].value, facts.fresh.metadata[0].value);
  assert.equal(facts.old.resolution[0].target, facts.fresh.resolution[0].target);
  assert.notEqual(facts.old.resolution[0].count, facts.fresh.resolution[0].count);
  assert.equal(facts.old.resolution.length, facts.changed.resolution.length);
  assert.notEqual(facts.old.resolution[0].target, facts.changed.resolution[0].target);
  assert.ok(facts.wide.resolution[0].target.length > 2400);
});

test("late negative control changes only the final resolved host fact after the same long prefix", /** Prove the unfavorable zero-hit control preserves its long common membership prefix. */() => {
  const context = realm();
  const facts = vm.runInContext(`(/** Capture equal-length variants differing only at the final resolved target. */()=>{const f=window.dependencyCountReuse.facts;return {fresh:f(0,1),late:f(0,1,'late')}})()`, context);
  assert.deepEqual(facts.late.metadata, facts.fresh.metadata);
  assert.deepEqual(facts.late["body-urls"], facts.fresh["body-urls"]);
  assert.deepEqual(facts.late.values, facts.fresh.values);
  assert.deepEqual(facts.late.resolution.slice(0, -1), facts.fresh.resolution.slice(0, -1));
  assert.notEqual(facts.late.resolution.at(-1).target, facts.fresh.resolution.at(-1).target);
  assert.equal(JSON.stringify({ ...facts.late.resolution.at(-1), target: facts.fresh.resolution.at(-1).target }), JSON.stringify(facts.fresh.resolution.at(-1)));
});

test("PR207 mixed and mostly-distinct inputs exercise actual changed projections without changing PR204 defaults", /** Keep representative ordinary maintenance separate from unchanged reuse and duplicate-only controls. */() => {
  const context = realm();
  const variants = vm.runInContext(`(/** Export deterministic source facts without opening a database or instrumenting CPU. */()=>{
    const f=window.dependencyCountReuse.facts;
    return {legacy:f(3,0),explicitLegacy:f(3,0,false,false,'reuse'),mixed:f(3,0,false,false,'mixed'),
      changed:f(3,1,true,false,'mixed'),distinct:f(3,0,false,false,'distinct'),otherOwner:f(4,0,false,false,'distinct')};
  })()`, context);
  assert.deepEqual(variants.legacy, variants.explicitLegacy);
  assert.equal(new Set(variants.distinct.resolution.map(/** Distinct targets should remain distinct before canonical projection. */fact => fact.target)).size, 144);
  const mixedTargets = new Set(variants.mixed.resolution.map(/** Count genuine repeated and unique target identities. */fact => fact.target));
  assert(mixedTargets.size > 24 && mixedTargets.size < 144);
  assert.notEqual(variants.distinct.resolution[0].target, variants.otherOwner.resolution[0].target);
  assert.notEqual(variants.mixed.resolution[0].target, variants.changed.resolution[0].target);
  assert.notEqual(variants.mixed.metadata[1].value, variants.changed.metadata[1].value);
  assert.notEqual(variants.mixed.metadata[2].normalizedFieldName, variants.changed.metadata[2].normalizedFieldName);
  assert.notEqual(variants.mixed["body-urls"][0].url, variants.changed["body-urls"][0].url);
});

test("detailed observer counts cursor advancement and deletion as separate native operations", /** Preserve the cost of every reclamation cursor continuation instead of counting only cursor creation. */() => {
  const context = realm();
  const result = vm.runInContext(`(/** Restore exact cursor method identities after the bounded diagnostic interval. */()=>{
    const originalContinue=IDBCursor.prototype.continue,originalDelete=IDBCursor.prototype.delete;
    const observer=window.dependencyCountReuse.observe({});
    try {const cursor=new IDBCursor();cursor.continue();cursor.continue();cursor.delete();return observer.operations;}
    finally {observer.retire();if(IDBCursor.prototype.continue!==originalContinue||IDBCursor.prototype.delete!==originalDelete)throw Error('Cursor observer leaked');}
  })()`, context);
  assert.equal(result["other|cursor.continue|rows"], 2);
  assert.equal(result["other|cursor.delete|rows"], 1);
});

test("detailed observer separates native requests, delivered memberships and terminal transaction coverage", /** Confirm a bulk request records all delivered occurrences while distinct keys retain multiplicity information. */async () => {
  const context = realm();
  const result = await vm.runInContext(`(/** Own finite event-capable doubles solely for observer accounting, without emulating IndexedDB correctness. */async()=>{
    window.sourceModules.SOURCE_LOCAL_DEPENDENCY_STORE='rows';
    let transaction,request;
    IDBDatabase.prototype.transaction=/** Retain native terminal subscriptions for explicit delivery. */function(){return transaction={events:{},addEventListener(name,callback){this.events[name]=callback;}};};
    IDBObjectStore.prototype.getAll=/** Return one request containing repeated selected membership keys. */function(){return request={result:[{key:'A'},{key:'A'},{key:'B'}],events:{},addEventListener(name,callback){this.events[name]=callback;}};};
    const originalGet=IDBObjectStore.prototype.getAll;
    const repository={/** Deliver every request and transaction event before the production phase resolves. */async repairLocalDependencies(){
      const tx=new IDBDatabase().transaction(['rows'],'readwrite');const store=new IDBObjectStore();store.transaction=tx;
      store.getAll();request.events.success();transaction.events.complete();
    }};
    const observer=window.dependencyCountReuse.observe(repository);
    try{await repository.repairLocalDependencies();return {operations:observer.operations,delivered:observer.delivered,lifetimes:observer.lifetimes};}
    finally{observer.retire();if(IDBObjectStore.prototype.getAll!==originalGet)throw Error('Read observer leaked');}
  })()`, context);
  assert.equal(result.operations["selected-count-repair|getAll|rows"], 1);
  assert.equal(result.delivered["selected-count-repair|rows"].rows, 3);
  assert(result.delivered["selected-count-repair|rows"].bytes > 0);
  assert.equal(result.lifetimes.complete, 1);
  assert.equal(result.lifetimes.pending, 0);
  assert.equal(result.lifetimes.repairRows, 3);
  assert.equal(result.lifetimes.repairDistinctKeys, 2);
});

/** A terminal heartbeat and bounded long-task queue must survive idempotent diagnostic retirement. */
test("responsiveness observer includes the terminal gap and bounds long-task receipts", () => {
  const context = realm();
  const result = vm.runInContext(`(/** Use a deterministic clock without starting real timers or browser work. */()=>{
    let now=0,tick,cleared=0,disconnected=0,instance;
    performance={now:/** Supply only the clock consumed by the diagnostic. */()=>now};
    window.setInterval=/** Retain the heartbeat callback without scheduling a Node timer. */callback=>{tick=callback;return 7;};
    window.clearInterval=/** Verify retirement owns the original timer identity. */id=>{if(id!==7)throw Error('Timer identity');cleared++;};
    window.PerformanceObserver=class {static supportedEntryTypes=['longtask'];
      /** Retain a finite queued-record source for terminal draining. */constructor(callback){this.callback=callback;instance=this;}
      /** No actual browser observer is installed in this portable contract. */observe(){}
      /** Include ten eligible tasks plus two records outside the observed window. */takeRecords(){return [...Array.from({length:10},/** Generate deterministic durations in increasing order. */(_,i)=>({startTime:i,duration:50+i})),{startTime:-1,duration:90},{startTime:100,duration:90}];}
      /** Count resource retirement independently of timer clearing. */disconnect(){disconnected++;}
    };
    const observer=window.dependencyCountReuse.observeResponsiveness();now=16;tick();now=40;tick();now=100;
    const report=observer.stop();observer.stop();instance.callback({getEntries:/** A queued callback after stop cannot add a duplicate task. */()=>[{startTime:1,duration:999}]});
    return {report,cleared,disconnected};
  })()`, context);
  assert.equal(result.report.samples, 2);
  assert.equal(result.report.largestObservedGapMs, 60);
  assert.equal(result.report.longTaskCount, 10);
  assert.equal(result.report.maxObservedLongTaskMs, 59);
  assert.equal(result.report.largestLongTasks.length, 8);
  assert.equal(result.report.cleanupComplete, true);
  assert.equal(result.cleared, 1);
  assert.equal(result.disconnected, 1);
});

/** A diagnostic failure must attempt every cleanup owner and preserve the failure rather than become a pass. */
test("responsiveness retirement independently handles timer and observer failures", () => {
  const context = realm();
  const result = vm.runInContext(`(/** Inject cleanup faults only inside this isolated VM realm. */()=>{
    let clears=0,disconnects=0,drains=0;
    window.setInterval=/** Return one owned synthetic timer without scheduling work. */()=>9;
    window.clearInterval=/** Fail the first retirement attempt while allowing a targeted retry. */()=>{if(++clears===1)throw Error('Injected clear failure');};
    window.PerformanceObserver=class {static supportedEntryTypes=['longtask'];
      /** No callback is delivered by this failure-only observer. */constructor(){}
      /** Preserve successful installation before retirement faults are injected. */observe(){}
      /** A drain error must not prevent either independent resource retirement. */takeRecords(){drains++;throw Error('Injected drain failure');}
      /** Record that disconnect runs even when timer clearing failed. */disconnect(){disconnects++;}
    };
    const observer=window.dependencyCountReuse.observeResponsiveness();const firstComplete=observer.stop().cleanupComplete;
    const report=observer.stop();return {firstComplete,report,clears,disconnects,drains};
  })()`, context);
  assert.equal(result.firstComplete, false);
  assert.equal(result.report.cleanupComplete, true);
  assert.equal(result.report.cleanupErrors.length, 2);
  assert.equal(result.clears, 2);
  assert.equal(result.disconnects, 1);
  assert.equal(result.drains, 1);
});

/** Reopen diagnostics retain finite event timing and restore all bindings after an observed owner rejects. */
test("reopen observer bounds native event history and restores rejected repository owners", async () => {
  const context = realm();
  const result = await vm.runInContext(`(/** Native event doubles test accounting and cleanup, not IndexedDB semantics. */async()=>{
    window.sourceModules.SOURCE_LOCAL_KEY_STORE='keys';
    const request=/** Return an event-capable request without emulating storage. */()=>({events:{},
      /** Preserve every subscribed diagnostic event. */addEventListener(name,callback){(this.events[name]??=[]).push(callback);},
      /** Deliver one explicit native event in controlled order. */emit(name){for(const callback of this.events[name]??[])callback();}});
    IDBFactory=class {/** Keep open requests separate from transaction requests. */open(){return request();}};
    IDBDatabase.prototype.transaction=/** Return a terminal-event-capable native transaction double. */function(){return request();};
    IDBObjectStore.prototype.get=/** Supply a genuine identity-sensitive request for first-success timing. */function(){return request();};
    IDBObjectStore.prototype.put=/** Keep ledger-write classification separate from read accounting. */function(){return request();};
    const originalOpen=IDBFactory.prototype.open,originalGet=IDBObjectStore.prototype.get,originalTx=IDBDatabase.prototype.transaction;
    const repository={/** Preserve a successful ordinary flush. */async flush(){return true;},
      /** Reject one observed closure while keeping restoration mandatory. */async completeLocalDependencyInventory(){throw Error('Injected closure failure');},
      /** Count repair is not required for this clean-reopen control. */async repairLocalDependencies(){return 'ready';}};
    const originalComplete=repository.completeLocalDependencyInventory,observer=window.dependencyCountReuse.observeReopen();
    try{
      observer.attach(repository);const open=new IDBFactory().open();open.emit('success');
      for(let i=0;i<19;i++){const tx=new IDBDatabase().transaction(['meta'],'readonly'),store=new IDBObjectStore();store.transaction=tx;store.name=i===18?'keys':'meta';const native=i===18?store.put({}):store.get();native.emit('success');tx.emit('complete');}
      let rejected=false;try{await repository.completeLocalDependencyInventory();}catch(error){rejected=error.message==='Injected closure failure';}
      return {report:observer.report,rejected};
    }finally{
      observer.retire();observer.retire();
      if(IDBFactory.prototype.open!==originalOpen||IDBObjectStore.prototype.get!==originalGet||IDBDatabase.prototype.transaction!==originalTx||repository.completeLocalDependencyInventory!==originalComplete)throw Error('Reopen observer leaked a binding');
    }
  })()`, context);
  assert.equal(result.rejected, true);
  assert.equal(result.report.transactions.length, 16);
  assert.equal(result.report.droppedTransactions, 3);
  assert.equal(result.report.completedTransactions, 19);
  assert.equal(result.report.pendingTransactions, 0);
  assert.equal(result.report.countKeyWrites, 1);
  assert.equal(result.report.repairEntries, 0);
  assert.equal(result.report.cleanup.restored, true);
});
