/** Typed source-owned revision IDs and deterministic provenance/folding policy, without parsing. */
import assert from 'node:assert/strict';
import test from 'node:test';
import {loadPortableModules} from './support/portableTypeScript.mjs';
const {exports:M}=loadPortableModules(['src/core/plex/views/sections.ts']);
const row=(id,parent,level,line,children=[])=>({id,label:'Repeated',parent,children,level,line,start:line*10,end:line*10+9});
const snapshot=()=>({documentId:'opaque:root',path:'Notes/Source.md',revision:'source-9',
 rows:[row('group',null,1,1,['one','two']),row('one','group',2,2),row('two','group',2,3),row('other',null,1,4)],
 visible:['group','one','two','other'],provenance:[{sectionId:'one',target:'opaque:X',role:'child'},{sectionId:'two',target:'opaque:X',role:'child'},
  {sectionId:'two',target:'opaque:Y',role:'child'}]});
const reference=(sectionId,extra={})=>({documentId:'opaque:root',revision:'source-9',sectionId,...extra});

test('central section source is capability-driven and explicitly separates attention from a pinned root',()=>{
 assert.equal(M.plexSectionDocument({capabilities:{}},'attention','root'),null);
 assert.equal(M.plexSectionDocument({capabilities:{sections:false},sectionSource:'layout-root'},'attention','root'),null);
 assert.equal(M.plexSectionDocument({capabilities:{sections:true}},'attention','root'),'attention');
 assert.equal(M.plexSectionDocument({capabilities:{sections:true},sectionSource:'layout-root'},'attention','root'),'root');
 assert.equal(M.plexSectionDocument({capabilities:{sections:true},sectionSource:'layout-root'},'attention'),null);
});

test('central outline composition preserves canonical evidence and bounds source-owned duplicate headings',()=>{
 const s=snapshot(),relation={node:{id:'opaque:Y'},role:'child',relationType:1,direction:1};
 const p={attention:'attention',root:'root',entry:'root',occurrences:[{id:'root',nodeId:s.documentId,representation:'thought'},{id:'Y',nodeId:'opaque:Y',representation:'thought'}],
  edges:[{id:'recorded',kind:'semantic',source:'root',target:'Y',sourceNode:s.documentId,targetNode:'opaque:Y',sourcePort:'bottom',targetPort:'left',relation}],truncated:false};
 const result=M.appendPlexSections(p,s,20);assert.equal(result.occurrences.length,6);assert.equal(new Set(result.occurrences.map(row=>row.id)).size,6);
 assert(result.occurrences.slice(2).every(row=>row.section.documentId===s.documentId&&!row.branch&&Object.keys(row.ports).length===0));
 assert.equal(result.edges.length,1);assert.equal(result.edges[0].sourceSection.sectionId,'two');assert.equal(result.edges[0].relation,relation);
 for(const field of ['id','source','target','sourceNode','targetNode','sourcePort','targetPort'])assert.equal(result.edges[0][field],p.edges[0][field]);
 assert.equal(p.occurrences.length,2);assert.equal(p.edges[0].sourceSection,undefined,'Composition cannot mutate source graph/policy input');
 const bounded=M.appendPlexSections(p,s,3);assert.equal(bounded.occurrences.length,3);assert.equal(bounded.truncated,true);
 assert.throws(()=>M.appendPlexSections(p,{...s,documentId:'other'},20));assert.throws(()=>M.appendPlexSections(p,s,1));
});

test('single declarations and genuine multiple declarations use distinct IDs or their lowest common visible ancestor',()=>{
 const s=snapshot();assert(M.validPlexSectionSnapshot(s));
 assert.deepEqual(M.plexSectionAnchor(s,'opaque:Y','child'),reference('two'));
 assert.deepEqual(M.plexSectionAnchor(s,'opaque:X','child'),reference('group'),'Multiple declarations never pick the first heading');
 assert.equal(M.plexSectionAnchor(s,'opaque:Y','parent'),null,'A different canonical role has no borrowed source placement');
 assert.equal(M.plexSectionAnchor({...s,provenance:[...s.provenance,{sectionId:'other',target:'opaque:X',role:'child'}]},'opaque:X','child'),null,'Separate roots use aggregate header');
 assert.equal(M.plexSectionAnchor({...s,provenance:[...s.provenance,{sectionId:null,target:'opaque:Y',role:'child'}]},'opaque:Y','child'),null,'Preamble participates explicitly');
});

test('folds resolve to current visible ancestors and collapse returns the note header',()=>{
 const s={...snapshot(),visible:['group','other']};
 assert.deepEqual(M.visiblePlexSection(s,reference('one')),reference('group'));
 assert.deepEqual(M.plexSectionAnchor(s,'opaque:Y','child'),reference('group'));
 assert.equal(M.visiblePlexSection({...s,visible:[]},reference('one')),null);
 assert.equal(M.plexSectionAnchor({...s,visible:[]},'opaque:Y','child'),null);
});

test('old source revisions, different documents and duplicate heading labels never bind another row',()=>{
 const s=snapshot();
 for(const ref of [reference('two',{revision:'source-8'}),reference('two',{documentId:'other-doc'}),reference('Repeated'),reference('deleted')]){
  assert.equal(M.plexSectionReference(s,ref),false);assert.equal(M.visiblePlexSection(s,ref),null);
 }
 assert.equal(M.plexSectionReference(s,reference('two')),true);
});

test('bounded section snapshots reject duplicate identities, broken hierarchies and oversized source output',()=>{
 const s=snapshot();
 for(const malformed of [{...s,rows:[...s.rows,s.rows[0]]},{...s,visible:['unknown']},{...s,visible:['one','one']},
  {...s,rows:s.rows.map(row=>row.id==='one'?{...row,parent:'missing'}:row)},
  {...s,rows:s.rows.map(row=>row.id==='one'?{...row,level:1}:row)},
  {...s,rows:Array.from({length:257},(_,n)=>row('row'+n,null,1,n+1)),visible:[]},
  {...s,provenance:Array(4097).fill(s.provenance[0])}])assert.equal(M.validPlexSectionSnapshot(malformed),false);
});
