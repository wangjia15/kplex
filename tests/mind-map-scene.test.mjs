/** Actual shared scene admission/measurement around finite canonical incidence. Cold source acquisition and native editor behavior have separate host lanes. */
import assert from 'node:assert/strict';
import test from 'node:test';
import {plexViewModules,viewPage} from './support/plexViewFixture.mjs';
const M=await plexViewModules(['src/ui/plexViews/prepareScene.ts','src/core/plex/views/mindmap/definition.ts','src/adapters/obsidian/actionNode.ts']);

/** Real shared read/scene policy with explicit cached coverage and no source or file-reading capability. */
function fixture(){
 const children={R:['B','C'],B:['D'],C:['D'],D:['R']},pages=new Map(['R','A','B','C','D'].map(id=>{const page=viewPage(id);page.file.stat={mtime:1,size:1,ctime:1};return[id,page]}));
 let current=true;const source={get:id=>pages.get(id),titleFor:page=>page.name,isVisiblePage:()=>true,captureSemanticGateRead:()=>({isCurrent:()=>current}),
  neighbours:(page,role)=>role==='child'?(children[page.path]??[]).map(id=>({page:pages.get(id),role,relationType:1,linkDirection:1})):[],
  sortNeighbours:rows=>rows.sort((a,b)=>a.page.path.localeCompare(b.page.path)),viewScopeCoverage:()=>({coverage:'local',prepared:true,complete:true,pending:false}),explainRelationship:()=>null};
 const settings={...M.migrateAndMergeSettings({groupRelations:false}),maxItemCount:32,canvasViewSettings:{mindmap:{version:1,values:{initialGenerations:3}}}};
 const prepare=(state=null,matches=()=>true,bindings=[],sections)=>M.prepareViewScene(M.mindMapViewDefinition,M.plexViewRead(source,()=>current,32,'A',256),source,'A',state,settings,()=>current,undefined,matches,
  {translate:key=>key,unfolded:new Set(),layoutRoot:'R',...(sections?{sections}:{})},{bindings,supports:()=>true});
 return{pages,source,settings,children,prepare,retire:()=>{current=false}};
}

test('real shared admission retains child provenance, reference sizing, measured editor geometry and exact filtered ancestry',()=>{
 const f=fixture(),first=f.prepare();assert.equal(first.failure,false);assert.equal(first.scene.entryOccurrence,'root');assert.equal(first.projection.attention,'A');
 const copies=first.scene.nodes.filter(row=>row.page.path==='D');assert.equal(copies.length,2);assert(copies.every(row=>row.semanticSourceId==='B'||row.semanticSourceId==='C'));
 const reference=first.scene.nodes.find(row=>row.page.path==='R'&&row.occurrenceId!=='root');assert(reference);assert.equal(reference.role,'child');
 const target=copies.find(row=>row.semanticSourceId==='B'),page=f.pages.get('D'),referenceId=M.actionNodeRef(page);
 const binding={id:'binding',viewId:'mindmap',occurrenceId:target.occurrenceId,target:{nodeId:'D',path:page.file.path,fileIdentity:referenceId.fileIdentity},dimensions:{width:660,height:410},mode:'source',closing:false};
 const prepared=f.prepare(first.projection.stateSuggestion,()=>false,[binding]);assert.equal(prepared.failure,false);
 assert.deepEqual(prepared.scene.nodes.map(row=>row.page.path),['R','B','D'],'Only the real root/B/D ancestry is pinned by the exact binding');
 const D=prepared.scene.nodes.find(row=>row.page.path==='D');assert.equal(D.width,660);assert.equal(D.height,410);assert.equal(prepared.scene.boundEditors[0].binding.id,binding.id);
 assert.equal(prepared.scene.edges.length,2);assert(prepared.scene.edges.every(edge=>edge.role==='child'));
 f.retire();assert.equal(f.prepare().failure,true);
});

test('root outlines coexist with another occurrence editor and reject stale or wrong-document section proof',()=>{
 const f=fixture(),rootFile=f.pages.get('R').file,page={...viewPage('section:R:one'),file:rootFile,
  transient:{kind:'section',sourcePath:'R',sectionId:'one',heading:'Heading',level:1,line:1,start:0,end:10}};
 let live=true;const sections={snapshot:{documentId:'R',path:'R',revision:'rev-1',rows:[{id:'one',label:'Heading',level:1,parent:null,children:[],line:1,start:0,end:10}],visible:['one'],provenance:[]},
  isCurrent:()=>live,page:ref=>ref.sectionId==='one'?page:null};
 const first=f.prepare(null,()=>true,[],sections);assert.equal(first.failure,false);assert.equal(first.scene.nodes.filter(row=>row.page.transient?.kind==='section').length,1);
 const child=first.scene.nodes.find(row=>row.page.path==='B'),target=M.actionNodeRef(child.page);
 const binding={id:'bound-B',viewId:'mindmap',occurrenceId:child.occurrenceId,target:{nodeId:'B',path:'B',fileIdentity:target.fileIdentity},dimensions:{width:660,height:410},mode:'source',closing:false};
 const both=f.prepare(null,()=>false,[binding],sections);assert.equal(both.failure,false);assert.equal(both.scene.nodes.filter(row=>row.page.transient?.kind==='section').length,1,'Validated central rows survive graph filtering');
 assert.equal(both.scene.boundEditors[0].binding.id,binding.id);assert.equal(both.scene.boundEditors[0].binding.target.nodeId,'B');
 const editor=both.scene.nodes.find(row=>row.occurrenceId===child.occurrenceId),heading=both.scene.nodes.find(row=>row.page.transient?.kind==='section');
 assert.equal(editor.width,660);assert.equal(editor.height,410);assert(Math.abs(editor.x-heading.x)>=(editor.width+heading.width)/2,'Measured outline width separates the existing editor');
 const rootTarget=M.actionNodeRef(f.pages.get('R')),rootBinding={...binding,id:'bound-R',occurrenceId:'root',target:{nodeId:'R',path:'R',fileIdentity:rootTarget.fileIdentity}};
 const blocked=f.prepare(null,()=>true,[rootBinding],sections);assert.equal(blocked.failure,false);assert(!blocked.scene.nodes.some(row=>row.page.transient?.kind==='section'),'The central editor excludes only its own outline');
 live=false;assert(!f.prepare(null,()=>true,[],sections).scene.nodes.some(row=>row.page.transient?.kind==='section'));
 live=true;assert(!f.prepare(null,()=>true,[],{...sections,snapshot:{...sections.snapshot,documentId:'A'}}).scene.nodes.some(row=>row.page.transient?.kind==='section'));
});

test('the real hierarchy reader admits the full bounded scene and coverage never starts preparation',()=>{
 const f=fixture();f.children.R=[];
 for(let i=0;i<32;i++){
  const parent='P'+i;f.children.R.push(parent);f.children[parent]=[];
  for(const id of [parent,...Array.from({length:32},(_,j)=>parent+'-'+j)]){const page=viewPage(id);page.file.stat={mtime:1,ctime:1,size:1};f.pages.set(id,page);if(id!==parent)f.children[parent].push(id)}
 }
 f.settings.canvasViewSettings.mindmap.values.initialGenerations=2;
 // This case exercises an explicit256-note cap, independently of the editable type default.
 f.settings.canvasViewSettings.mindmap.values.maximumOccurrences=256;
 const result=f.prepare();assert.equal(result.failure,false);assert.equal(result.scene.nodes.length,256);assert(result.projection.truncated);assert.equal(result.projection.preparation.parents.length,8);
 const native={diagnosticsClosed:false,persistentCachePurged:false,hasCurrentCanonicalCenter:()=>false,hasCurrentOnDemandCachedScope:()=>false,
  hostPreviewScopes:new Map(),onDemandHostScopes:new Map(),onDemandTasks:new Map(),onDemandPreviewTasks:new Map(),onDemandGateTasks:new Map(),onDemandBuildWaiters:new Map(),semanticPreparationTasks:new Map(),semanticDemandCounts:new Map(),onDemandBaselineTask:null,get:id=>f.pages.get(id)};
 assert.deepEqual(M.GraphIndex.prototype.viewScopeCoverage.call(native,'B'),{coverage:'cached',prepared:false,complete:false,pending:false});
 native.onDemandTasks.set('B',{});assert.equal(M.GraphIndex.prototype.viewScopeCoverage.call(native,'B').pending,true);
 native.hasCurrentCanonicalCenter=()=>true;assert.equal(M.GraphIndex.prototype.viewScopeCoverage.call(native,'B').complete,true);
 native.diagnosticsClosed=true;assert.deepEqual(M.GraphIndex.prototype.viewScopeCoverage.call(native,'B'),{coverage:'unavailable',prepared:false,complete:false,pending:false});
});

test('pair reads cannot acquire authority from a retired read, hidden target or old canonical identity alias',()=>{
 const f=fixture();f.source.cachedViewRelation=(source,target,role)=>f.source.neighbours(f.source.get(source),role).find(row=>row.page.path===target)??null;
 const read=M.plexViewRead(f.source,()=>true,32,'A');assert.equal(read.relation('B','D','child').items.length,1);
 f.source.isVisiblePage=page=>page.path!=='D';const hidden=M.plexViewRead(f.source,()=>true,32,'A');assert.equal(hidden.relation('B','D','child').items.length,0);
 f.retire();assert.equal(read.relation('B','D','child').coverage,'unavailable');
 const canonical={get:id=>({path:id==='old'?'renamed':id}),isVisiblePage:()=>true,neighbours:()=>[{page:{path:'D'}}]};
 assert.equal(M.GraphIndex.prototype.cachedViewRelation.call(canonical,'old','D','child'),null);
});

test('the shared peer port displays the bounded aggregate without adding or duplicating canonical gate totals',()=>{
 const f=fixture(),result=f.prepare(),root=result.scene.nodes.find(node=>node.occurrenceId==='root');assert.equal(result.failure,false);
 root.peerPort={side:'left',count:4,complete:false,shownCount:2};root.gateStats={top:{visibleCount:1,hasAny:true},bottom:{visibleCount:10,hasAny:true},left:{visibleCount:99,hasAny:true},right:{visibleCount:99,hasAny:true}};
 const stats=M.physicalGateStats(root);assert.deepEqual(stats.left,{visibleCount:4,complete:false,hasAny:true,shownCount:2});assert.equal(stats.bottom.visibleCount,10);assert.equal(stats.top.visibleCount,1);
});

test('visible Mind Map peer gates reuse canonical count proof independently of truncated branch incidence',()=>{
 const f=fixture(),root=f.prepare().scene.nodes.find(node=>node.occurrenceId==='root');
 root.peerPort={side:'left',count:2,complete:false};let calls=0;
 const gates={top:{visibleCount:3,hasAny:true},bottom:{visibleCount:3,hasAny:true},left:{visibleCount:7,hasAny:true,complete:false,coverage:'local'},right:{visibleCount:9,hasAny:true,complete:false,coverage:'local'}};
 const source={get:f.source.get,gateStats:()=>{calls++;return gates}};
 const node=M.projectNodeCounts(root,source),stats=M.physicalGateStats(node);
 assert.equal(calls,1,'One existing count-owner read; no additional source or role traversal');
 assert.equal(stats.left.visibleCount,16);assert.equal(stats.left.coverage,'local');assert.equal(stats.left.complete,false);
 assert.equal(stats.top.visibleCount,3);assert.equal(stats.bottom.visibleCount,3);assert.equal(root.peerPort.count,2,'Projection remains detached');
 gates.left={visibleCount:0,hasAny:true,complete:true};gates.right={visibleCount:0,hasAny:false,complete:true};
 const zero=M.physicalGateStats(M.projectNodeCounts(root,source)).left;
 assert.equal(zero.visibleCount,0);assert.equal(zero.complete,true);assert.equal(zero.hasAny,true,'Filtered relationship fill survives zero visible peers');
 gates.right={visibleCount:0,hasAny:false,complete:false,countUnavailable:true};
 assert.equal(M.physicalGateStats(M.projectNodeCounts(root,source)).left.countUnavailable,true,'Missing metadata cannot become certified zero');
 assert.equal(M.projectNodeCounts({...root,page:{...root.page,transient:{kind:'section'}}},source).peerPort.count,2,'Synthetic section proof is never substituted');
});
