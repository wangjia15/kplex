/** Shared read-only row and physical-option projections; configuration is never mutated by presentation. */
import assert from 'node:assert/strict';import test from 'node:test';import {loadPortableModules} from './support/portableTypeScript.mjs';
const loaded=loadPortableModules(['src/core/contracts/ontologyConfiguration.ts','src/ui/features/ontologyPresentation.ts']);const c=loaded.exports;
const t=(key,params={})=>key+JSON.stringify(params);
const input={ontologyPairingVersion:1,hierarchy:{hidden:['Hidden'],parents:['based on/quoted in','Legacy'],children:['Legacy'],leftFriends:['supports/supported by'],rightFriends:['challenges/challenged by'],previous:['replies to/replied by'],next:[],exclusions:['Meta']}};
const before=JSON.stringify(input),views=c.ontologyFieldViews(c.ontologyConfiguration(input),[{name:'topic',normalized:'topic',count:4},{name:'based on',normalized:'based-on',count:6}]);
test('manager collapses pairs while per-field options retain both same-role endpoints',()=>{
 const all=c.ontologyManagerEntries(views,'all','',t);assert.equal(all.length,8);assert.equal(views.length,12);assert.equal(c.ontologyManagerEntries(views,'left','',t).length,1);assert.equal(c.ontologyManagerEntries(views,'right','',t).length,1);
 assert.deepEqual(c.ontologySelectionMatches(['supports','supported by'],views,'support'),['supports','supported by']);assert.equal(JSON.stringify(input),before);
});
test('role orientation is independent of partner search and raw declaration side',()=>{
 const next=c.ontologyManagerEntries(views,'next','replies',t);assert.equal(next.length,1);assert.equal(next[0].first.name,'replied by');assert.equal(next[0].second.name,'replies to');
 const child=c.ontologyManagerEntries(views,'child','based',t);assert.equal(child[0].first.name,'quoted in');assert.equal(child[0].second.name,'based on');
 const first=c.ontologyManagerEntries(views,'all','supports',t)[0];assert.deepEqual(c.ontologyManagerEntries(views,'all','supported by',t)[0],first);
});
test('Unassigned, Excluded, Hidden and legacy multiple assignments remain truthful',()=>{
 assert.equal(c.ontologyManagerEntries(views,'unassigned','',t)[0].first.count,4);assert.equal(c.ontologyManagerEntries(views,'excluded','',t)[0].first.name,'Meta');assert.equal(c.ontologyManagerEntries(views,'hidden','',t)[0].first.name,'Hidden');
 const legacy=views.find(v=>v.name==='Legacy');assert.deepEqual(legacy.roles,['parent','child']);assert.equal(legacy.role,'parent');assert(c.ontologyFieldDetail(legacy,t).includes('multipleAssignments'));assert.equal(JSON.stringify(input),before);
});
test('direct physical matches precede partner matches while role eligibility is unchanged',()=>{
 assert.deepEqual(c.ontologySelectionMatches(['quoted in','based on'],views,'based'),['based on','quoted in']);assert.deepEqual(c.ontologySelectionMatches(['quoted in'],views,'based'),['quoted in']);assert.deepEqual(c.ontologySelectionMatches(['Meta'],views,'based'),[]);
});

test('explicit document counts hide returned unassigned zeroes even when partial and keep configured fields without uses',()=>{
 const counts=new Map([['topic',{count:0,partial:false}],['meta',{count:0,partial:false}],['hidden',{count:0,partial:false}]]);
 const updated=c.withOntologyDocumentCounts(views,counts);assert(!updated.some(field=>field.name==='topic'));
 assert.equal(updated.find(field=>field.name==='Meta').documentCount,0);assert.equal(updated.find(field=>field.name==='Hidden').documentCount,0);
 counts.set('topic',{count:0,partial:true});assert(!c.withOntologyDocumentCounts(views,counts).some(field=>field.name==='topic'));
 counts.set('meta',{count:0,partial:true});assert(c.withOntologyDocumentCounts(views,counts).some(field=>field.name==='Meta'&&field.documentCount===0&&field.countPartial));
 counts.set('topic',{partial:true});assert(c.withOntologyDocumentCounts(views,counts).some(field=>field.name==='topic'&&field.documentCount===undefined&&field.countPartial));
 counts.set('topic',{count:2,partial:false});assert.equal(c.withOntologyDocumentCounts(views,counts).find(field=>field.name==='topic').documentCount,2);
 assert.equal(views.find(field=>field.name==='topic').count,4);assert.equal(JSON.stringify(input),before);
});
