/** Historical Wu Xing policy/property-lifetime regressions (Facets migration compatibility) use actual implementation modules and finite host facts. No body parser, inventory, scheduler or acquisition capability is supplied. */
import assert from 'node:assert/strict';
import test from 'node:test';
import {plexViewModules,viewPage} from './support/plexViewFixture.mjs';
const M=await plexViewModules(['src/core/plex/views/wuxing/configuration.ts','src/core/plex/views/wuxing/classification.ts',
 'src/core/plex/views/wuxing/definition.ts','src/core/plex/views/wuxing/projection.ts','src/core/plex/views/wuxing/layout.ts','src/ui/plexViews/prepareScene.ts',
 'src/adapters/obsidian/predicateContracts.ts','src/adapters/obsidian/graphContracts.ts','src/core/plex/views/configuration.ts','src/ui/plexViews/scene.ts']);
const legacyDefinition={...M.wuXingViewDefinition,configuration:M.wuXingConfigurationSchema,project:M.projectWuXing};
const config=values=>M.wuXingConfiguration({status:'available',values});
const phase=(id,value)=>({id,name:id,kind:'document',resolution:'resolved',path:'notes/'+id+'.md',url:null,aliases:[],tags:[],noteType:null,
 primaryStyleTag:null,styleTags:[],maxLabelLength:30,file:{path:'notes/'+id+'.md',extension:'md',mtime:1,size:1},value});
/** A deliberately opaque identity and a different native path protect the no-ID-parsing contract. */
function localFixture(maximum=100){
 const nodes=new Map(['attention','a','b','c','d','e','unknown'].map((id,i)=>['opaque:'+id,phase('opaque:'+id,i<6?['water','wood','fire','earth','metal','water'][i]:undefined)]));
 let live=true,fieldReads=0,availabilityReads=0,relationReads=0;
 const read={coverage:'cached',isCurrent:()=>live,node:id=>nodes.get(id)??null,compare:(a,b)=>a.name.localeCompare(b.name),
  relations:(id,role)=>{relationReads++;assert.equal(id,'opaque:attention','Only direct attention incidence may be read');return {coverage:'cached',truncated:false,items:role==='child'?[...nodes.values()].slice(1).map(node=>({node,role,relationType:1,direction:1,definition:'Related'})):[]}},
  properties:{read:(id,field)=>{fieldReads++;assert.equal(field,'phase');return {status:'available',value:nodes.get(id).value}},availability:()=>{availabilityReads++;return 'available'}},
  evidence:()=>{throw Error('No eager evidence expansion')},corpus:{available:false,reason:'unsupported'}};
 const input={attention:'opaque:attention',read,maximum,state:null,configuration:{status:'available',values:{}}};
 return {nodes,read,input,work:()=>({fieldReads,availabilityReads,relationReads}),retire:()=>{live=false}};
}

test('exact scalar/list aliases preserve case, multilingual values and explicit multi-phase conflicts',()=>{
 const c=config({waterValues:' memory , 記憶\n水',woodValues:'Concept, 概念',fireValues:'deadline, 期限',earthValues:'Review',metalValues:'Method'});
 for(const value of ['memory',' 記憶 ','水',['memory','水','memory']])assert.equal(M.classifyWuXingValues(value,c),'water');
 assert.equal(M.classifyWuXingValues('Memory',c),'unmapped');
 assert.equal(M.classifyWuXingValues(['記憶','概念'],c),'conflicting');
 assert.equal(M.classifyWuXingValues({phase:'memory'},c),'unmapped');
 assert.equal(M.classifyWuXingValues(null,c),'unmapped');
 assert.equal(M.classifyWuXingValues(['deadline','期限'],c),'fire');
 assert.equal(M.classifyWuXingValues(Array(257).fill('memory'),c),'unavailable','A partial huge list cannot certify a phase');
 assert.equal(M.classifyWuXingValues('x'.repeat(4097),c),'unavailable');
 assert.equal(M.classifyWuXingValues('water',config({waterValues:'water',woodValues:'water'})),'conflicting','Configuration aliases cannot silently pick the first phase');
});

test('one explicit source is used without property/type/tag fallback; unavailable is distinct from missing',()=>{
 const f=localFixture(),node=f.nodes.get('opaque:attention');node.tags=['#metal'];node.noteType='fire';
 assert.equal(M.classifyWuXingNode(node,f.read,config({source:'property'})),'water');
 assert.equal(M.classifyWuXingNode(node,f.read,config({source:'type'})),'fire');
 assert.equal(M.classifyWuXingNode(node,f.read,config({source:'tag',metalValues:'#metal'})),'metal');
 assert.equal(f.work().fieldReads,1,'Facet modes do not read arbitrary fields');
 node.value=undefined;assert.equal(M.classifyWuXingNode(node,f.read,config({})),'unmapped');
 f.read.properties.read=()=>({status:'unavailable'});assert.equal(M.classifyWuXingNode(node,f.read,config({})),'unavailable');
 f.read.properties.availability=()=> 'unavailable';assert.equal(M.classifyWuXingNode(node,f.read,config({source:'type'})),'unavailable');
 assert.equal(M.classifyWuXingNode({...node,kind:'attachment',file:{extension:'pdf'}},f.read,config({})),'unmapped');
 delete f.read.properties;assert.equal(M.classifyWuXingNode(node,f.read,config({})),'unavailable');
});

test('local projection reads six bounded direct roles, deduplicates canonical notes and retains evidence-bearing endpoints',()=>{
 const f=localFixture(2),original=f.read.relations;f.read.relations=(id,role)=>role==='parent'?{coverage:'cached',truncated:false,items:[{node:f.nodes.get('opaque:a'),role,relationType:1,direction:1}]}:original(id,role);
 const p=legacyDefinition.project(f.input);
 assert.equal(p.occurrences.length,3);assert.equal(p.edges.length,3);assert.equal(p.truncated,true);
 assert.equal(p.editor,p.entry);assert.equal(p.occurrences.find(row=>row.id===p.entry).nodeId,'opaque:attention');
 assert.equal(p.occurrences.find(row=>row.nodeId==='opaque:a').areaId,'wuxing.wood');
 assert.equal(p.edges.filter(edge=>edge.targetNode==='opaque:a').length,2,'Distinct canonical roles remain evidence, not phase links');
 assert(p.edges.every(edge=>edge.kind==='semantic'&&edge.sourceNode==='opaque:attention'&&edge.relation.node.id===edge.targetNode));
 assert.equal(f.work().fieldReads,3,'One selected field per deduplicated note');
 assert.equal(f.work().availabilityReads,0);
 assert.equal(f.work().relationReads,5);
 f.retire();assert.equal(legacyDefinition.project(f.input),null);
});

test('measured ring keeps all five empty phases and outside unclassified lanes; no areas overlap with a large native editor',()=>{
 const f=localFixture(),p=legacyDefinition.project(f.input);
 const measured=p.occurrences.map(row=>({id:row.id,width:row.id===p.editor?720:180,height:row.id===p.editor?430:56,expandedWidth:180,expandedReserve:0,mini:null,envelope:null}));
 const first=M.layoutWuXing(p,measured,config({})),second=M.layoutWuXing(p,measured,config({}));
 assert.deepEqual(first,second,'Same facts/measurements yield exact geometry');
 assert.equal(first.areas.length,8);assert.equal(first.decorations.filter(mark=>mark.kind==='guide').length,5);
 assert(first.areas.every(area=>!area.heightPreference&&!area.dropRole),'Classification areas have neither per-area editing intent nor a semantic relationship-drop role');
 assert(first.areas.every(area=>area.viewport&&area.reflow),'Non-editable phases still use shared bounded viewport/filter/reflow owners');
 for(let i=0;i<first.areas.length;i++)for(let j=i+1;j<first.areas.length;j++){
  const a=first.areas[i].bounds,b=first.areas[j].bounds;
  assert(a.x+a.width<=b.x||b.x+b.width<=a.x||a.y+a.height<=b.y||b.y+b.height<=a.y,`Areas overlap: ${i}/${j}`);
 }
 const attention=first.positions.get(p.entry),water=first.areas.find(area=>area.id==='wuxing.water');
 assert(attention.x>water.bounds.x&&attention.x<water.bounds.x+water.bounds.width);
 assert(attention.y+attention.height/2<water.viewport.y,'Native editor is fixed above its neighbors scroller');
 assert.equal(p.occurrences.find(row=>row.id===p.entry).areaId,undefined,'The native overlay cannot drift when neighbors scroll');
 const empty={...p,occurrences:[p.occurrences[0]],edges:[]};
 assert.equal(M.layoutWuXing(empty,measured.slice(0,1),config({})).areas.length,8);
 const turned=M.layoutWuXing(p,measured,config({start:'fire',guides:false,tints:false}));
 assert.equal(turned.areas[0].id,'wuxing.fire');assert(!turned.decorations.some(mark=>mark.kind==='guide'||mark.tint));
});

test('dense phases use bounded visible height and shared overflow without dropping admitted notes',()=>{
 const f=localFixture(),p=legacyDefinition.project(f.input),attention=p.occurrences[0];
 const occurrences=[attention,...Array.from({length:300},(_,i)=>({id:'dense'+i,nodeId:'opaque:'+i,representation:'thought',areaId:'wuxing.wood',groupingPartition:'wuxing.wood'}))];
 const measured=occurrences.map(row=>({id:row.id,width:180,height:56,expandedWidth:180,expandedReserve:0,mini:null,envelope:null}));
 const layout=M.layoutWuXing({...p,occurrences,edges:[]},measured,config({regionHeight:200}));
 const area=layout.areas.find(area=>area.id==='wuxing.wood');assert(area.viewport.contentHeight>area.viewport.height*10);assert(area.bounds.height<400);
 assert.equal(layout.positions.size,301);assert.equal(area.reflow.columns,1);assert.equal(area.dropRole,undefined,'A phase has no ontology write role');
});

test('type settings validate order, persist field edits independently and preserve future payloads',()=>{
 const definition=legacyDefinition;
 assert.equal(M.readViewConfiguration(definition,{}).status,'available');
 let stored=M.editViewConfiguration(definition,{other:{version:9,values:{future:true}}},'waterValues','記憶');
 stored=M.editViewConfiguration(definition,stored,'fireLabel','Goals');
 assert.equal(stored.wuxing.values.waterValues,'記憶');assert.equal(stored.wuxing.values.fireLabel,'Goals');assert.equal(stored.other.version,9);
 assert.equal(M.wuXingPhaseOrder('water,water,fire,earth,metal'),null);
 assert.throws(()=>M.editViewConfiguration(definition,stored,'order','water,water,fire,earth,metal'));
 assert.equal(M.readViewConfiguration(definition,{wuxing:{version:8,values:{}}}).status,'unavailable');
});

test('existing property owner distinguishes missing cache/field and never reads other fields or note bodies',()=>{
 const file={path:'note.md',extension:'md',stat:{mtime:1,size:1}},node=phase('opaque',undefined);node.file={path:file.path,extension:'md',mtime:1,size:1};
 let cache=null,live=true,currentFile=file,otherReads=0;
 const app={vault:{getFileByPath:path=>currentFile?.path===path?currentFile:null,read:()=>{throw Error('Body read')},cachedRead:()=>{throw Error('Body read')}},metadataCache:{getFileCache:()=>cache}};
 const provider=M.createLegacyPropertyProvider(app,()=>live,()=>file);
 assert.equal(provider.readNoteProperty(node,'phase').status,'unavailable');
 cache={};const missing=provider.readNoteProperty(node,'phase');assert.equal(missing.status,'available');assert.equal(missing.value,undefined);assert.equal(missing.isCurrent(),true);
 cache={frontmatter:{Phase:'water',get unrelated(){otherReads++;throw Error('Unselected field read')}}};
 const selected=provider.readNoteProperty(node,'phase');assert.equal(selected.status,'available');assert.equal(selected.value,'water');assert.equal(selected.isCurrent(),true);assert.equal(missing.isCurrent(),false,'Cache replacement retires the old known-absence proof');assert.equal(otherReads,0);
 currentFile={...file,stat:{...file.stat}};assert.equal(provider.readNoteProperty(node,'phase').status,'unavailable','Same-path/stat replacement cannot stand in for the canonical native file');
 currentFile=file;file.stat.mtime=2;assert.equal(provider.notePropertyAvailability(node),'unavailable');
 file.stat.mtime=1;cache={frontmatter:{get phase(){live=false;return 'water'}}};assert.equal(provider.readNoteProperty(node,'phase').status,'unavailable','A result retired during a synchronous getter is rejected');
 live=true;cache={frontmatter:{phase:'water'}};file.path='renamed.md';assert.equal(provider.readNoteProperty(node,'phase').status,'unavailable');
 file.path='note.md';currentFile=null;assert.equal(provider.readNoteProperty(node,'phase').status,'unavailable','Deletion cannot return a retained field');
});

test('scene property capability rejects unadmitted reads, bounded exhaustion and late publication',()=>{
 const pages=new Map(['Focus.md','Child.md'].map(id=>{const page=viewPage(id);page.file.stat={mtime:1,size:1,ctime:1};return[id,page]}));
 let live=true,calls=0;
 const source={get:id=>pages.get(id),captureSemanticGateRead:()=>({isCurrent:()=>live}),isVisiblePage:()=>true,sortNeighbours:rows=>rows,titleFor:p=>p.name,
  neighbours:()=>[],explainRelationship:()=>null};
 const properties={getNoteProperty:()=>{throw Error('Legacy unsafe absence API is not used')},readNoteProperty:()=>{calls++;return {status:'available',value:'water'}}};
 const read=M.plexViewRead(source,()=>live,1,'Focus.md',0,properties);
 assert.equal(read.properties.read('Child.md','phase').status,'unavailable');assert.equal(calls,0);
 read.node('Focus.md');for(let i=0;i<20;i++)read.properties.read('Focus.md','phase');assert(calls<=9);
 live=false;assert.equal(read.properties.read('Focus.md','phase').status,'unavailable');
});
