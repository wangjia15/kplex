/** Actual portable frontier owner: bounded leases, zero redundant acquisition and exact lifetime retirement. */
import assert from 'node:assert/strict';
import test from 'node:test';
import {loadPortableModules} from './support/portableTypeScript.mjs';
const {exports:{PlexHierarchyDemand}}=loadPortableModules(['src/application/PlexHierarchyDemand.ts']);

test('explicit frontier demand is bounded, exact and stable across ordinary render/geometry updates',()=>{
 const active=new Set(),calls=[],releases=[];const owner=new PlexHierarchyDemand(id=>{assert(!active.has(id));active.add(id);calls.push(id);return()=>{assert(active.delete(id));releases.push(id)}},2);
 assert.deepEqual(calls,[],'Registration alone acquires no sources');
 assert.deepEqual(owner.synchronize('mindmap','R',['R','B','B','C','D']),{status:'limited',held:['B','C'],unavailable:[]});
 const B=owner.capture('B'),future=owner.capture('D');
 owner.synchronize('mindmap','R',['C','B','R']);assert.deepEqual(calls,['B','C']);assert.equal(B(),true);
 owner.synchronize('mindmap','R',['B','D']);assert.deepEqual(calls,['B','C','D']);assert.deepEqual(releases,['C']);assert.equal(future(),false);
 owner.synchronize('mindmap','NewRoot',['B']);assert.equal(B(),false);assert.deepEqual([...active],['B']);
 owner.dispose();owner.dispose();assert.equal(active.size,0);assert.equal(owner.snapshot().status,'closed');
 assert.equal(owner.synchronize('mindmap','R',['B']).status,'closed');assert.equal(calls.length,releases.length);
});

test('unavailable acquisition never becomes a ready empty tree or retries on unrelated paint',()=>{
 let attempts=0;const owner=new PlexHierarchyDemand(()=>{attempts++;throw Error('Unavailable scope')});
 assert.deepEqual(owner.synchronize('mindmap','R',['B']),{status:'unavailable',held:[],unavailable:['B']});
 owner.synchronize('mindmap','R',['B']);assert.equal(attempts,1);owner.synchronize('mindmap','R',[]);
 owner.synchronize('mindmap','R',['B']);assert.equal(attempts,2);owner.dispose();
});

test('malformed requests preserve owned scopes and special opaque IDs remain valid',()=>{
 let releases=0;const owner=new PlexHierarchyDemand(()=>()=>releases++);
 owner.synchronize('mindmap','R',['__proto__']);
 for(const args of [['../view','R',['B']],['mindmap','',['B']],['mindmap','R',['']]])assert.equal(owner.synchronize(...args).status,'invalid');
 assert.deepEqual(owner.snapshot().held,['__proto__']);assert.equal(releases,0);owner.dispose();assert.equal(releases,1);
});

test('reentrant disposal releases a newly returned lease and rejects captured late work',()=>{
 let owner,released=0;owner=new PlexHierarchyDemand(()=>{owner.dispose();return()=>released++});
 assert.equal(owner.synchronize('mindmap','R',['B','C']).status,'closed');assert.equal(released,1);assert.deepEqual(owner.snapshot().held,[]);
 assert.equal(owner.capture('B')(),false);
});

test('reentrant scope replacement cannot admit stale remaining parents or retire its replacement',()=>{
 let owner;const live=new Set(),calls=[];owner=new PlexHierarchyDemand(id=>{calls.push(id);live.add(id);if(id==='B')owner.synchronize('mindmap','Other',['C']);return()=>live.delete(id)});
 owner.synchronize('mindmap','R',['B','D']);assert.deepEqual(calls,['B','C']);assert.deepEqual([...live],['C']);assert.deepEqual(owner.snapshot().held,['C']);owner.dispose();assert.equal(live.size,0);
});

test('teardown attempts every release and reports an actual failed release instead of claiming cleanup',()=>{
 const released=[];const owner=new PlexHierarchyDemand(id=>()=>{released.push(id);if(id==='B')throw Error('Release failed')});
 owner.synchronize('mindmap','R',['B','C']);assert.throws(()=>owner.dispose(),AggregateError);assert.deepEqual(released,['B','C']);assert.equal(owner.snapshot().status,'closed');
});


test('a failed release returned after reentrant disposal is observable rather than swallowed as admission failure',()=>{
 let owner;owner=new PlexHierarchyDemand(()=>{owner.dispose();return()=>{throw Error('Late release failed')}});
 assert.throws(()=>owner.synchronize('mindmap','R',['B']),/Late release failed/);assert.equal(owner.snapshot().status,'closed');
});
