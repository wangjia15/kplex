/** Immutable pre-extraction Classic outputs complement the existing semantic/layout/interaction suites. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import {plexViewModules,classicFixture,classicGeometrySnapshot} from './support/plexViewFixture.mjs';
const M=await plexViewModules();

test('Classic preserves ordered caps, occupied exclusions and defined sibling precedence',()=>{
  const f=classicFixture(M),n=f.neighborhood;
  assert.equal(n.center,f.pages.get('root'));
  assert.deepEqual(Object.fromEntries(['parents','children','leftFriends','rightFriends','siblings'].map(key=>[key,n[key].map(r=>r.page.path)])),
    {parents:['p2','p1'],children:['c1','c2'],leftFriends:['l','prev'],rightFriends:['r','next'],siblings:['s1','s2']});
  assert.deepEqual(n.siblings.map(r=>[r.role,r.relationType]),[['sibling',1],['sibling',1]]);
  assert.equal(f.work.neighbours,8);assert.equal(f.work.counts,0);assert.equal(f.work.title,0);
  f.index.plugin.settings.renderSiblings=false;
  assert.deepEqual(M.GraphIndex.prototype.getNeighborhood.call(f.index,'root').siblings,[]);
  assert.equal(M.GraphIndex.prototype.getNeighborhood.call(f.index,'missing'),null);
});

test('Classic geometry matches the accepted pre-extraction matrix exactly',()=>{
  const expected=JSON.parse(readFileSync(new URL('./fixtures/plex-views/classic-geometry.json',import.meta.url),'utf8'));
  assert.deepEqual(JSON.parse(JSON.stringify(classicGeometrySnapshot(M))),expected);
});
