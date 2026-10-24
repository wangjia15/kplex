/** Passive shutdown completion accounting is tested separately from genuine Chromium lifecycle tests. */
import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import { installRestartCompletionObserver } from "./support/restartCompletionObserver.mjs";

/** Supply real EventTarget events without emulating IndexedDB request semantics. */
function realm() {
  const context = vm.createContext({ EventTarget, Event });
  vm.runInContext("window=this;IDBDatabase=class{transaction(){return new EventTarget()}}", context);
  vm.runInContext(`(${installRestartCompletionObserver.toString()})()`, context);
  return context;
}

/** Request success is insufficient: all actual complete/abort events must be observed. */
test("restart drain waits for every native transaction terminal event", async () => {
  const context = realm();
  const result = await vm.runInContext(`(async()=>{
    const d=window.__kplexRestartCompletion,a=new IDBDatabase().transaction(),b=new IDBDatabase().transaction();
    let resolved=false;const draining=d.drain().then(()=>{resolved=true});
    a.dispatchEvent(new Event('success'));await Promise.resolve();if(resolved)throw Error('Request success passed drain');
    a.dispatchEvent(new Event('complete'));await Promise.resolve();if(resolved)throw Error('Partial completion passed drain');
    b.dispatchEvent(new Event('abort'));await draining;const before=d.snapshot();const after=d.retire();d.retire();
    return {before,after,resolved};
  })()`, context);
  assert.equal(result.before.started, 2); assert.equal(result.before.completed, 1); assert.equal(result.before.aborted, 1);
  assert.equal(result.before.pendingTransactions, 0); assert.equal(result.after.bindingsRestored, true); assert.equal(result.resolved, true);
});

/** A pending owner or competing binding cannot be silently discarded as successful cleanup. */
test("restart observer refuses premature retirement and duplicate installation", () => {
  const context = realm();
  assert.throws(() => vm.runInContext("new IDBDatabase().transaction();__kplexRestartCompletion.retire()", context), /Native transactions remain/);
  assert.throws(() => vm.runInContext(`(${installRestartCompletionObserver.toString()})()`, context), /Previous restart completion observer/);
});
