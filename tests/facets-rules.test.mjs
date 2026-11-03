/** Actual shared grammar/engine and Facets rule projection, with finite cache-only ports. */
import {archivedFacetPresets} from './support/facetPresetArchive.mjs';
import assert from 'node:assert/strict';
import test from 'node:test';
import {plexViewModules} from './support/plexViewFixture.mjs';
const M=await plexViewModules(['src/core/plex/predicate.ts','src/core/plex/predicateParser.ts','src/core/plex/views/facets/rules.ts',
 'src/core/plex/views/facets/templates.ts','src/core/plex/views/facets/projection.ts','src/core/plex/views/wuxing/definition.ts','src/lens/GraphLensSimple.ts']);
const compile=source=>M.compileGraphPredicate(M.parseGraphPredicateExpression(source));
const node=(id,name=id)=>({id,path:id+'.md',name,kind:'document',file:{extension:'md',path:id+'.md',name:id+'.md'},tags:[],aliases:[],noteType:null});
const center=node('focus'),candidate=node('candidate'),context={node:{node:candidate},center};
const available=value=>({status:'available',value});
const preset=rules=>({...archivedFacetPresets.arc,source:'rules',categories:Object.fromEntries(archivedFacetPresets.arc.order.map((id,i)=>[id,{...archivedFacetPresets.arc.categories[id],rule:rules[i]}]))});

test('opt-in current/candidate properties share the actual field provider while legacy this semantics stay unchanged',()=>{
 const reads=[];const engine=new M.GraphPredicateEngine({getNoteProperty:()=>undefined,readNoteProperty:(node,key)=>{reads.push([node.id,key]);return available(node.id==='focus'?'wood':'metal')}});
 assert.equal(engine.matches(compile('this.phase == "wood"'),context),false);
 assert.deepEqual(engine.evaluateAvailable(compile('this.phase == "wood" and note.phase == "metal"'),context),available(true));
 assert.deepEqual(reads,[['focus','phase'],['candidate','phase']]);
 assert.deepEqual(engine.evaluateAvailable(compile('this.name == "focus" and node.name == "candidate"'),context),available(true));
 assert.equal(reads.length,2,'Fixed attributes never fetch arbitrary metadata');
 assert.deepEqual([...compile('this.phase == note.phase').dependencies.focusProperties],['phase']);
});

test('unknown metadata remains unknown under negation, with known absence and short-circuit truth kept distinct',()=>{
 for(const state of ['unavailable','unsupported']){
  const engine=new M.GraphPredicateEngine({getNoteProperty:()=>undefined,readNoteProperty:()=>({status:state})});
  for(const expression of ['not note.phase.exists()','note.phase != "wood"','not (note.phase == "wood")'])
   assert.equal(engine.evaluateAvailable(compile(expression),context).status,state);
  assert.deepEqual(engine.evaluateAvailable(compile('node.name == "candidate" or note.phase.exists()'),context),available(true));
  assert.deepEqual(engine.evaluateAvailable(compile('node.name == "other" and not note.phase.exists()'),context),available(false));
 }
 const absent=new M.GraphPredicateEngine({getNoteProperty:()=>undefined,readNoteProperty:()=>available(undefined)});
 assert.deepEqual(absent.evaluateAvailable(compile('not note.phase.exists()'),context),available(true));
 assert.equal(new M.GraphPredicateEngine().evaluateAvailable(compile('not node.unknown.exists()'),context).status,'unsupported');
 assert.equal(absent.evaluateAvailable(compile('not edge.role.exists()'),context).reason,'relationship');
});

test('operators retain exact equality, case-insensitive text, list semantics and unsupported object boundaries',()=>{
 const engine=new M.GraphPredicateEngine({getNoteProperty:()=> 'Water',readNoteProperty:()=>available('Water')});
 for(const [expression,expected]of [['note.phase == "water"',false],['note.phase.equals("water")',true],['note.phase != "water"',true]]){
  assert.equal(engine.matches(compile(expression),context),expected);assert.deepEqual(engine.evaluateAvailable(compile(expression),context),available(expected));
 }
 for(const value of [{phase:'wood'},[['wood']],Array(257).fill('wood'),'x'.repeat(4097)]){
  const e=new M.GraphPredicateEngine({getNoteProperty:()=>value,readNoteProperty:()=>available(value)});
  assert.equal(e.evaluateAvailable(compile('not note.phase.equals("wood")'),context).reason,'value');
 }
});

function fixture(rules){
 const definition=preset(rules),nodes=new Map([center,candidate,node('other')].map(row=>[row.id,row]));
 const counters={properties:0,evidence:0,availability:0,relations:0},phases={focus:'wood',candidate:'metal',other:'water'};
 const relations=[{node:candidate,role:'parent',relationType:1,direction:2,definition:'Recorded parent'},
  {node:candidate,role:'child',relationType:2,direction:1,definition:'Recorded child'},
  {node:nodes.get('other'),role:'child',relationType:1,direction:1,definition:'Recorded child'}];
 let current=true,metadata='available',pending=false;
 const decisions=[{active:true,evidence:{id:'active',sourceKind:'frontmatter-link',fieldName:'parents',declaredRole:'parent',declaredByPath:'focus.md',declaredTargetPath:'candidate.md'}},
  {active:false,suppressionReason:'frontmatter-overrides-body-ontology',evidence:{id:'suppressed',sourceKind:'body-link',fieldName:'child',declaredRole:'child'}}];
 const read={coverage:'cached',isCurrent:()=>current,node:id=>nodes.get(id),compare:(a,b)=>a.id.localeCompare(b.id),scope:()=>({pending}),
  relations:(id,role)=>{counters.relations++;return{items:id==='focus'?relations.filter(row=>row.role===role):[],coverage:'cached',truncated:false}},
  properties:{read:(id,key)=>{counters.properties++;return metadata==='available'?available(key==='phase'?phases[id]:undefined):{status:metadata}},availability:()=>{counters.availability++;return metadata}},
  evidence:()=>{counters.evidence++;return{coverage:'cached',value:{decisions}}}};
 const project=()=>M.projectFacets({attention:'focus',maximum:20,state:{version:1,preset:'arc'},configuration:{status:'available',values:{presets:{arc:definition}}},read});
 const membership=(projection,id)=>JSON.parse(projection.occurrences.find(row=>row.nodeId===id).groupingPartition).slice(2);
 return{definition,read,counters,relations,decisions,project,membership,setCurrent:value=>current=value,setMetadata:value=>metadata=value,setPending:value=>pending=value};
}

test('all canonical contexts classify a unique note once; cross-category matches conflict instead of taking the first role',()=>{
 const f=fixture(['edge.role == "child"','edge.role == "parent"','node.name == "absent"']),before=JSON.stringify(f.relations),p=f.project();
 assert.deepEqual(f.membership(p,'candidate'),['status','conflicting']);assert.deepEqual(f.membership(p,'other'),['category','add']);
 assert.deepEqual(f.membership(p,'focus'),['status','unresolved'],'No fabricated center self-edge');
 assert.equal(p.occurrences.length,3);assert.equal(p.edges.length,3);assert.equal(f.counters.properties,0);assert.equal(f.counters.evidence,0);
 for(const edge of p.edges)assert(f.relations.includes(edge.relation));assert.equal(JSON.stringify(f.relations),before);
});

test('shared rule frame reads focus/candidate fields only once across categories and relationship contexts',()=>{
 const f=fixture(['note.phase == this.phase','note.phase == "metal"','note.phase == "water"']);
 const p=f.project();assert.deepEqual(f.membership(p,'focus'),['category','add']);assert.deepEqual(f.membership(p,'candidate'),['category','relate']);
 assert.equal(f.counters.properties,3,'Focus this.phase and candidate note.phase reuse the same native field read');assert.equal(f.counters.evidence,0);
 const plan=M.compileFacetRules(f.definition);assert.equal(M.compileFacetRules(structuredClone(f.definition)),plan,'Compiled syntax retained by preset rule revision');
 const deps=M.wuXingViewDefinition.propertyDependencies({version:1,preset:'arc'},{status:'available',values:{presets:{arc:f.definition}}});assert.deepEqual(deps,{fields:['phase'],evidence:false});
 f.setMetadata('unavailable');f.setPending(false);assert.deepEqual(f.membership(f.project(),'candidate'),['status','unresolved']);
 f.setPending(true);assert.deepEqual(f.membership(f.project(),'candidate'),['status','checking']);
 f.setCurrent(false);assert.equal(f.project(),null);
});

test('canonical evidence is lazy, pair-scoped and retains active/suppressed provenance without mutation',()=>{
 const f=fixture(['evidence.active == true and evidence.declaredRole == "parent"','evidence.active == false and evidence.sourceKind == "body-link"','node.name == "absent"']);
 const before=JSON.stringify(f.decisions),p=f.project();assert.deepEqual(f.membership(p,'candidate'),['status','conflicting']);
 assert.equal(f.counters.evidence,2,'One pair read for each unique related note, reused across roles/categories');
 assert.equal(f.counters.properties,0);assert.equal(JSON.stringify(f.decisions),before);assert.equal(p.edges.length,3);
});

test('unsupported/invalid/budget-excess rule plans stay unresolved without field/evidence work',()=>{
 for(const rules of [['not node.typo.exists()','node.name == "x"','node.name == "y"'],['note.phase ==','node.name == "x"','node.name == "y"'],
  [Array.from({length:17},(_,i)=>'note.field'+i+'.exists()').join(' or '),'node.name == "x"','node.name == "y"']]){
  const f=fixture(rules);assert.equal(M.compileFacetRules(f.definition).status,'invalid');assert.deepEqual(f.membership(f.project(),'candidate'),['status','unresolved']);
  assert.equal(f.counters.properties,0);assert.equal(f.counters.evidence,0);
 }
});

test('unavailable compound inputs cannot borrow an earlier field proof or force a fabricated center relationship',()=>{
 let generation=1;
 const engine=new M.GraphPredicateEngine({getNoteProperty:()=>undefined,readNoteProperty:(_node,key)=>{
  const captured=generation;if(key==='later')generation++;
  return{status:'available',value:'wood',isCurrent:()=>generation===captured};
 }});
 assert.equal(engine.evaluateAvailable(compile('note.phase == "wood" and note.later == "wood"'),context).status,'unavailable');
 const f=fixture(['node.name == "focus" or edge.role == "child"','node.name == "absent"','node.name == "missing"']);
 assert.deepEqual(f.membership(f.project(),'focus'),['category','add'],'Known local truth may dominate a missing relationship; no self-edge exists');
 const frame=fixture(['note.phase == this.phase','node.name == "absent"','node.name == "missing"']);
 frame.read.properties.read=id=>{const captured=generation;if(id==='other')generation++;return{status:'available',value:'wood',isCurrent:()=>generation===captured}};
 assert.equal(frame.project(),null,'Final projection rejects field epochs invalidated by a later admitted read');
});

test('lossless Simple conversion never changes strict case/type comparisons and preserves original code when unsupported',()=>{
 for(const source of ['note.phase == "Wood"','note.priority == 3','note.phase != "wood"','this.phase == note.phase','note.priority >= 3'])
  assert.equal(M.tryParseLosslessGraphLensSimpleExpression(source),null,source);
 for(const source of ['note.phase.equals("wood")','not note.phase.exists()','file.hasTag("work")'])assert(M.tryParseLosslessGraphLensSimpleExpression(source),source);
 assert(M.tryParseGraphLensSimpleExpression('note.phase == "Wood"'),'Legacy lens conversion remains compatible');
});

test('oversized pair evidence yields an explicit unresolved result instead of a partial positive/negative guess',()=>{
 const f=fixture(['evidence.active == true','node.name == "absent"','node.name == "missing"']);
 f.decisions.push(...Array.from({length:255},(_,i)=>({active:true,evidence:{id:'extra'+i,sourceKind:'obsidian-link'}})));
 assert.deepEqual(f.membership(f.project(),'candidate'),['status','unresolved']);assert.equal(f.counters.properties,0);
});
