/** Controlled callbacks exercise actual latest-value delivery without a timer or fake writer. */
import assert from 'node:assert/strict';import test from 'node:test';import {loadPortableModules} from './support/portableTypeScript.mjs';
const {exports:{LatestSliderValue}}=loadPortableModules(['src/ui/components/latestSliderValue.ts']);
/** Settle both the accepted callback and the next delivery microtask. */
const tick=async()=>{await Promise.resolve();await Promise.resolve()};
test('a slow slider delivers first and latest, keeping the newest thumb draft until completion',async()=>{
 const calls=[],drafts=[],releases=[],failures=[],q=new LatestSliderValue(v=>drafts.push(v),e=>failures.push(e));
 const apply=value=>new Promise(resolve=>{calls.push(value);releases.push(resolve)});
 q.submit(1,apply);for(const value of [1.2,1.4,1.8,2.5])q.submit(value,apply);
 assert.deepEqual(calls,[1]);assert.equal(drafts.at(-1),2.5);releases.shift()();await tick();assert.deepEqual(calls,[1,2.5]);assert.equal(drafts.at(-1),2.5,'Older completion cannot rewind the thumb');
 releases.shift()();await tick();assert.equal(drafts.at(-1),null);assert.deepEqual(failures,[]);
});
test('axes retain independent latest values and synchronous callers remain synchronous',async()=>{
 const calls=[],releases=[],draft=[];const a=new LatestSliderValue(v=>draft.push(v),assert.fail),b=new LatestSliderValue(()=>{},assert.fail),apply=v=>new Promise(r=>{calls.push(v);releases.push(r)});
 a.submit(1,apply);a.submit(2,apply);b.submit(10,apply);b.submit(20,apply);assert.deepEqual(calls,[1,10]);
 releases.shift()();await tick();releases.shift()();await tick();assert.deepEqual(calls,[1,10,2,20]);for(const r of releases)r();await tick();
 const sync=[];new LatestSliderValue(()=>{},assert.fail).submit(7,v=>sync.push(v));assert.deepEqual(sync,[7]);
});
test('closing a rail finishes the latest intent without updating unmounted UI; retired targets remain guarded',async()=>{
 for(const retired of [false,true]){let alive=true,release;const calls=[],drafts=[],q=new LatestSliderValue(v=>drafts.push(v),assert.fail);
 const apply=v=>{if(!alive)return;calls.push(v);return new Promise(r=>release=r)};q.submit(1,apply);q.submit(3,apply);q.dispose();const count=drafts.length;if(retired)alive=false;release();await tick();assert.deepEqual(calls,retired?[1]:[1,3]);assert.equal(drafts.length,count);q.submit(8,apply);assert.equal(calls.length,retired?1:2);if(!retired){release();await tick();assert.equal(drafts.length,count)}}
});
test('failure is reported once, does not retry a value, and does not strand a newer explicit input',async()=>{
 let reject,release;const calls=[],errors=[],drafts=[],q=new LatestSliderValue(v=>drafts.push(v),e=>errors.push(e));const error=new Error('save failed');
 q.submit(1,v=>{calls.push(v);return new Promise((r,j)=>reject=j)});q.submit(4,v=>{calls.push(v);return new Promise(r=>release=r)});reject(error);await tick();assert.deepEqual(calls,[1,4]);assert.deepEqual(errors,[error]);assert.equal(drafts.at(-1),4);release();await tick();assert.equal(drafts.at(-1),null);
 q.submit(8,()=>{throw error});assert.equal(errors.length,2);assert.equal(drafts.at(-1),null);
});

test('an explicit reset discards unsent gesture values while an accepted callback finishes',async()=>{
 let release;const calls=[],drafts=[],q=new LatestSliderValue(value=>drafts.push(value),assert.fail);
 const apply=value=>{calls.push(value);return new Promise(resolve=>release=resolve)};
 q.submit(1,apply);q.submit(3,apply);q.cancelPending();assert.equal(drafts.at(-1),null);
 release();await tick();assert.deepEqual(calls,[1]);assert.equal(drafts.at(-1),null);
 q.submit(2,apply);assert.deepEqual(calls,[1,2]);release();await tick();
});
