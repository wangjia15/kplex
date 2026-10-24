/**
 * Pure safety contracts for the fresh-process PR201 driver. No test launches Obsidian,
 * reads a vault, stages an artifact or terminates a process.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import {assertFreshTarget,assertFreshProcesses,assertPinnedArtifacts} from '../scripts/testing/obsidian/indexingFreshGuards.mjs';

const VAULT='C:\\Obsidian\\kplex-test-small';

/** Construct independent representative native data without accessing a running application. */
function inventory() {
  return {vault:VAULT,windows:[{id:1,title:'Opening - kplex-test-small - Obsidian v1.14.4',url:'app://obsidian.md/index.html',pid:20}],
    processes:[{pid:10,created:100,type:'Browser'},{pid:20,created:101,type:'Tab'},
      {pid:30,created:102,type:'GPU'},{pid:40,created:103,type:'Utility'}]};
}

/** Return complete receipt hashes while keeping each fixture independent. */
function hashes(arm) {
  return {main:arm==='A'?'3b96f51e8b734bd622fb0034f1e17682efb17eda8b6caed6e2d69ac7bd05e5f3'
    :'c39fb4876315a3348b782fe91400398faab1f98de8c0852eb9cc06bf24509a58',manifest:'a'.repeat(64),styles:'b'.repeat(64)};
}

/** Slash/case normalization must preserve the known path and every reported native process. */
test('fresh target admits only the pinned normalized Small vault and records all metrics',()=>{
  const input=inventory(),before=structuredClone(input);
  input.vault='c:/OBSIDIAN/kplex-test-small/';before.vault=input.vault;
  const result=assertFreshTarget(input,VAULT);
  assert.deepEqual(result.browser,{pid:10,created:100});assert.deepEqual(result.renderer,{pid:20,created:101});
  assert.strictEqual(result.processes,input.processes);assert.deepEqual(input,before);
});

/** A second window invalidates restart safety even when it appears to show the same vault. */
test('fresh target rejects additional vault windows',()=>{
  const input=inventory();input.windows.push({...input.windows[0],id:2,title:'Note - excalidraw-test - Obsidian',pid:21});
  assert.throws(()=>assertFreshTarget(input,VAULT),/exactly one/);
});

/** Neither a caller-supplied expectation nor a same-name vault in another directory expands scope. */
test('fresh target rejects mismatched, relative and unapproved vault paths',()=>{
  for(const path of ['C:/Other/kplex-test-small','kplex-test-small','C:/Obsidian/kplex-test']) {
    const input=inventory();input.vault=path;
    assert.throws(()=>assertFreshTarget(input,VAULT),/vault|Small/);
    assert.throws(()=>assertFreshTarget(inventory(),path),/vault|Small/);
  }
});

/** Title and URL jointly guard against another vault, an intermediate page or an unrecognized host. */
test('fresh target rejects window identity mismatches',()=>{
  const wrongTitle=inventory();wrongTitle.windows[0].title='Note - excalidraw-test - Obsidian';
  const wrongUrl=inventory();wrongUrl.windows[0].url='app://obsidian.md/other.html';
  assert.throws(()=>assertFreshTarget(wrongTitle,VAULT),/window/);
  assert.throws(()=>assertFreshTarget(wrongUrl,VAULT),/window/);
});

/** Missing, duplicate or mistyped native identities cannot establish a safe owner. */
test('fresh target rejects ambiguous Browser and renderer identities',()=>{
  const noBrowser=inventory();noBrowser.processes.shift();
  const twoBrowsers=inventory();twoBrowsers.processes.push({pid:11,created:104,type:'Browser'});
  const missingRenderer=inventory();missingRenderer.windows[0].pid=99;
  const wrongRenderer=inventory();wrongRenderer.processes[1].type='Utility';
  const duplicatePid=inventory();duplicatePid.processes.push({...duplicatePid.processes[1]});
  for(const input of [noBrowser,twoBrowsers,missingRenderer,wrongRenderer,duplicatePid])
    assert.throws(()=>assertFreshTarget(input,VAULT),/Browser|renderer|PID/);
});

/** Invalid metrics from any process fail closed rather than silently removing its CPU from totals. */
test('fresh target rejects invalid process metrics including non-renderer entries',()=>{
  for(const invalid of [{pid:0},{pid:1.5},{created:NaN},{created:Infinity},{created:0},{type:''}]) {
    const input=inventory();Object.assign(input.processes[2],invalid);
    assert.throws(()=>assertFreshTarget(input,VAULT),/PID|creation|type/);
  }
});

/** Reloading either owner alone does not satisfy the full-application process boundary. */
test('fresh processes rejects reused Browser or renderer lifetimes',()=>{
  const previous=assertFreshTarget(inventory(),VAULT);
  assert.throws(()=>assertFreshProcesses(previous,{...previous,renderer:{pid:21,created:201}}),/browser lifetime/);
  assert.throws(()=>assertFreshProcesses(previous,{...previous,browser:{pid:11,created:200}}),/renderer lifetime/);
  assert.throws(()=>assertFreshProcesses(previous,{browser:{pid:11,created:200}}),/PID|creation/);
});

/** OS PID recycling is safe only when the independent creation time proves a new lifetime. */
test('fresh processes accepts new lifetimes including PID reuse',()=>{
  const previous=assertFreshTarget(inventory(),VAULT),current={browser:{pid:10,created:200},renderer:{pid:20,created:201}};
  assert.strictEqual(assertFreshProcesses(previous,current),current);
  assert.doesNotThrow(()=>assertFreshProcesses(previous,{browser:{pid:11,created:100},renderer:{pid:21,created:101}}));
});

/** Exact main hashes bind measurements to both pinned runtimes without mutating receipt input. */
test('pinned artifacts admit exact A and F identities',()=>{
  for(const arm of ['A','F']) {
    const input=hashes(arm),before=structuredClone(input);
    assert.strictEqual(assertPinnedArtifacts(input,arm),input);assert.deepEqual(input,before);
  }
});

/** An unknown arm, swapped runtime or incomplete receipt must reject before a driver starts work. */
test('pinned artifacts reject swapped runtimes and missing or malformed companion hashes',()=>{
  assert.throws(()=>assertPinnedArtifacts(hashes('A'),'F'),/pinned F/);
  assert.throws(()=>assertPinnedArtifacts(hashes('F'),'A'),/pinned A/);
  assert.throws(()=>assertPinnedArtifacts(hashes('F'),'candidate'),/A or F/);
  for(const field of ['manifest','styles']) {
    const input=hashes('F');delete input[field];
    assert.throws(()=>assertPinnedArtifacts(input,'F'),/SHA-256/);
    input[field]='not-a-hash';assert.throws(()=>assertPinnedArtifacts(input,'F'),/SHA-256/);
  }
});
