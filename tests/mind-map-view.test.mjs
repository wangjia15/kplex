/** Real pure Mind Map policy/state/geometry. Finite inputs do not stand in for cold production acquisition or native acceptance. */
import assert from 'node:assert/strict';
import test from 'node:test';
import {loadPortableModules} from './support/portableTypeScript.mjs';
const {exports:M}=loadPortableModules(['src/core/plex/views/mindmap/state.ts','src/core/plex/views/mindmap/configuration.ts','src/core/plex/views/mindmap/layout.ts','src/core/plex/views/mindmap/definition.ts','src/core/plex/views/mindmap/occurrences.ts','src/core/plex/views/hierarchy.ts']);

/** Finite canonical incidence and explicit coverage certificates; no reader, scheduler or native API is supplied to the policy. */
function graphInput(children,options={}){
 const ids=new Set(['R','A',...Object.keys(children),...Object.values(children).flat()]);const nodes=new Map([...ids].map(id=>[id,{id,kind:'markdown',label:id}]));
 let current=true,reads=0;const rows=id=>(children[id]??[]).map(target=>({node:nodes.get(target),role:'child',relationType:1,direction:1}));
 const read={coverage:'cached',isCurrent:()=>current,node:id=>{reads++;return nodes.get(id)??null},scope:id=>options.scope?.(id)??{coverage:'local',prepared:true,complete:true,pending:false},
  relations:(id,role,max)=>{reads++;const all=role==='child'?rows(id):[];return{items:all.slice(0,max),coverage:'cached',truncated:all.length>max}},
  relation:(id,target,role='child')=>({items:role==='child'?rows(id).filter(row=>row.node.id===target):[],coverage:'cached',truncated:false}),compare:(a,b)=>a.id.localeCompare(b.id)};
 return{input:{attention:'A',layoutRoot:'R',maximum:32,state:null,read,...options.input},nodes,project(){return M.mindMapViewDefinition.project(this.input)},get reads(){return reads},retire(){current=false}};
}

test('measured touch control envelopes remain disjoint at dense spacing and preserve thought/editor rectangles',()=>{
 const g=graphInput({R:['A','B','C'],A:['D','E'],B:['F']});
 g.input.state={version:1,scope:'R',initialGenerations:1,expanded:[JSON.stringify(['R','A']),JSON.stringify(['R','B'])],collapsed:[],sides:{}};
 for(const arrangement of ['left','right','balanced']){
 g.input.configuration={status:'available',values:{arrangement}};
 const projection=g.project();assert(projection);
 const measurements=projection.occurrences.map(row=>({id:row.id,width:row.id==='root'?220:120,height:row.id==='root'?90:32,
  expandedWidth:120,expandedReserve:0,mini:null,envelope:null,...(row.branch.canExpand?{controlReserve:{right:48,bottom:48}}:{})}));
  const layout=M.layoutMindMap(projection,measurements,{...M.mindMapConfiguration(),arrangement,horizontalDensity:4,verticalDensity:4}),rects=[];
  for(const m of measurements){const r=layout.positions.get(m.id);assert.equal(r.width,m.width);assert.equal(r.height,m.height);
   const box={id:m.id,left:r.x-r.width/2,top:r.y-r.height/2,right:r.x+r.width/2+(m.controlReserve?.right??0),bottom:r.y+r.height/2+(m.controlReserve?.bottom??0)};
   for(const other of rects)assert(box.right<=other.left||box.left>=other.right||box.bottom<=other.top||box.top>=other.bottom,'Measured control overlaps '+box.id+' / '+other.id);
   rects.push(box);
  }
 }
 assert.equal(M.mindMapViewDefinition.hierarchy.primary,'center');assert.equal(M.mindMapViewDefinition.hierarchy.controls,'measured');
});

test('matching one duplicate occurrence keeps only its real ancestor path, and broken/cyclic ancestry confers no visibility',()=>{
 const rows=[{id:'root'},{id:'B',parent:'root'},{id:'C',parent:'root'},{id:'D1',parent:'B'},{id:'D2',parent:'C'},
  {id:'missing-parent',parent:'absent'},{id:'cycle',parent:'cycle'}];
 assert.deepEqual([...M.hierarchyPathClosure(rows,['D2'],'root')],['root','D2','C']);
 assert.deepEqual([...M.hierarchyPathClosure(rows,['missing-parent','cycle'],'root')],['root']);
});

test('cycle references reveal the nearest earlier occurrence on their own branch without traversing another duplicate',()=>{
 const rows=[{id:'root',canonical:'R'},{id:'earlier',canonical:'N',parent:'root'},
  {id:'middle',canonical:'M',parent:'earlier'},{id:'reference',canonical:'N',parent:'middle',reference:true},
  {id:'other-copy',canonical:'N',parent:'root'},{id:'root-reference',canonical:'R',parent:'middle',reference:true}];
 assert.equal(M.hierarchyReferenceAncestor(rows,'reference'),'earlier');assert.equal(M.hierarchyReferenceAncestor(rows,'root-reference'),'root');
 assert.equal(M.hierarchyReferenceAncestor(rows,'other-copy'),null,'A non-reference does not gain follow authority');
 assert.equal(M.hierarchyReferenceAncestor(rows.filter(row=>row.id!=='earlier'),'reference'),null,'Broken ancestry cannot jump to another same-note branch');
 assert.equal(M.hierarchyReferenceAncestor([...rows,{id:'reference',canonical:'N'}],'reference'),null,'Ambiguous occurrence IDs are rejected');
 assert.equal(M.hierarchyReferenceAncestor([{id:'loop',canonical:'N',parent:'loop',reference:true}],'loop'),null);
 assert.equal(M.hierarchyReferenceAncestor(Array.from({length:2049},(_,i)=>({id:String(i),canonical:'N'})),'0'),null);
 const deep=[{id:'root',canonical:'N'}];for(let i=1;i<10;i++)deep.push({id:String(i),canonical:'X',parent:i===1?'root':String(i-1)});
 deep.push({id:'too-deep',canonical:'N',parent:'9',reference:true});assert.equal(M.hierarchyReferenceAncestor(deep,'too-deep'),null,'Reference walking keeps the existing depth bound');
 assert.equal(M.hierarchyReferenceAncestor(deep,'too-deep',20),'root','An explicit declared depth reveals the genuine earlier ancestor');
});

/** Optional depth affects presentation ancestry only; invalid or exceeded bounds grant no visibility/reveal. */
test('declared hierarchy depths retain complete paths while invalid caps remain closed',()=>{
 const rows=[{id:'root',canonical:'N'}];for(let depth=1;depth<=21;depth++)rows.push({id:String(depth),canonical:'N'+depth,parent:depth===1?'root':String(depth-1)});
 assert.deepEqual([...M.hierarchyPathClosure(rows,['20'],'root')],['root']);
 assert.equal(M.hierarchyPathClosure(rows,['20'],'root',20).size,21);
 assert.deepEqual([...M.hierarchyPathClosure(rows,['21'],'root',20)],['root']);
 const reference=[...rows.slice(0,20),{id:'reference',canonical:'N',parent:'19',reference:true}];
 assert.equal(M.hierarchyReferenceAncestor(reference,'reference',20),'root');
 for(const maximum of [0,21,NaN,Infinity,1.5]){
  assert.deepEqual([...M.hierarchyPathClosure(rows,['1'],'root',maximum)],['root']);
  assert.equal(M.hierarchyReferenceAncestor(reference,'reference',maximum),null);
 }
});

test('retained unshown branches cannot bias the visible root split under partial coverage',()=>{
 const sides=Object.fromEntries(Array.from({length:20},(_,i)=>[M.mindMapOccurrence(['R','Previously-shown-'+i]),1]));
 const f=graphInput({R:['B','C']},{scope:()=>({coverage:'local',prepared:true,complete:false,pending:false}),input:{configuration:{status:'available',values:{arrangement:'balanced'}},state:{version:1,scope:'R',initialGenerations:1,expanded:[],collapsed:[],sides}}});
 const p=f.project();assert.deepEqual([...new Set(p.occurrences.filter(row=>row.branch.depth===1).map(row=>row.branch.side))].sort(),[-1,1]);
 for(const[id,side]of Object.entries(sides))assert.equal(p.stateSuggestion.sides[id],side,'Partial absence cannot delete retained intent');
});

test('canonical children form stable two-sided occurrences, diamonds remain distinct and ancestor cycles are references',()=>{
 const f=graphInput({R:['B','C','R'],B:['D'],C:['D'],D:['R']},{input:{configuration:{status:'available',values:{initialGenerations:3,arrangement:'balanced'}}}});
 const p=f.project();assert.equal(p.layoutRoot,'R');assert.equal(p.attention,'A');assert.equal(p.root,'root');assert.equal(p.editor,undefined);
 const diamonds=p.occurrences.filter(row=>row.nodeId==='D');assert.equal(diamonds.length,2);assert.notEqual(diamonds[0].id,diamonds[1].id);
 const references=p.occurrences.filter(row=>row.branch.reference);assert(references.length>=1);for(const row of references){assert.equal(row.branch.expanded,false);assert.equal(row.branch.canExpand,false)}
 assert(p.edges.every(edge=>edge.kind==='semantic'&&edge.relation.role==='child'&&f.input.read.relation(edge.sourceNode,edge.targetNode).items.length===1));
 assert(p.occurrences.some(row=>row.branch.side===-1));assert(p.occurrences.some(row=>row.branch.side===1));assert(p.preparation.parents.length<=8);
 const oldSides=p.stateSuggestion.sides;f.input.state=p.stateSuggestion;f.input.attention='C';const moved=f.project();assert.deepEqual(moved.occurrences.map(row=>[row.id,row.branch.side]),p.occurrences.map(row=>[row.id,row.branch.side]));
 f.nodes.set('AA',{id:'AA'});const old=f.input.read.relations;f.input.read.relations=(id,...args)=>id==='R'?{items:[{node:f.nodes.get('AA'),role:'child',relationType:1,direction:1},...old(id,...args).items],coverage:'cached',truncated:false}:old(id,...args);
 const added=f.project();for(const [id,side]of Object.entries(oldSides))assert.equal(added.stateSuggestion.sides[id],side,'Arriving earlier sibling cannot rebalance existing branches');
 f.retire();assert.equal(f.project(),null);
});

test('default map keeps children right, every peer role left and parents above, including a childless root',()=>{
 const f=graphInput({R:['B'],B:['D'],Friend:['FriendChild'],Parent:['R','Sibling']});
 const original=f.input.read.relations,context={parent:['Parent'],left:['Friend'],right:['Challenger'],previous:['Previous'],next:['Next']};
 for(const id of Object.values(context).flat())if(!f.nodes.has(id))f.nodes.set(id,{id,kind:'markdown',label:id});
 f.input.read.relations=(id,role,max)=>id==='R'&&role!=='child'?{items:(context[role]??[]).slice(0,max).map(target=>({node:f.nodes.get(target),role,relationType:1,direction:1})),coverage:'local',truncated:false}:original(id,role,max);
 let p=f.project();assert.equal(p.occurrences.length,7);assert.deepEqual(new Set(p.edges.map(edge=>edge.relation.role)),new Set(['parent','child','left','right','previous','next']));
 assert.deepEqual(p.occurrences[0].ports,{top:'parent',bottom:'child',left:'left'});
 for(const edge of p.edges)assert.equal(edge.sourcePort,edge.relation.role==='child'?'bottom':edge.relation.role==='parent'?'top':'left','Root connections retain their semantic gate rather than the destination layout direction');
 const geometry=projection=>M.layoutMindMap(projection,projection.occurrences.map(row=>({id:row.id,width:row.nodeId==='Friend'?660:180,height:row.nodeId==='Friend'?410:40})),M.mindMapConfiguration());
 let layout=geometry(p),rect=id=>layout.positions.get(p.occurrences.find(row=>row.nodeId===id).id);
 assert(rect('B').x>0);for(const id of ['Friend','Challenger','Previous','Next'])assert(rect(id).x<0);assert(rect('Parent').y<0);
 for(const id of ['Friend','Parent']){const row=p.occurrences.find(row=>row.nodeId===id);f.input.state=M.mindMapViewDefinition.hierarchy.reduce(f.input.state,p,{kind:'toggle',occurrenceId:row.id});p=f.project();}
 layout=geometry(p);assert(p.occurrences.some(row=>row.nodeId==='FriendChild'));assert(p.occurrences.some(row=>row.nodeId==='Sibling'));assert(p.occurrences.some(row=>row.nodeId==='R'&&row.branch.reference));
 const positions=[...layout.positions.values()];for(let i=0;i<positions.length;i++)for(let j=i+1;j<positions.length;j++){const a=positions[i],b=positions[j];assert(Math.abs(a.x-b.x)>=(a.width+b.width)/2||Math.abs(a.y-b.y)>=(a.height+b.height)/2,'Expanded editor/context forests overlap');}
 f.input.state=null;f.input.read.relations=(id,role,max)=>id==='R'&&role==='child'?{items:[],coverage:'local',truncated:false}:id==='R'&&role==='parent'?{items:[{node:f.nodes.get('Parent'),role:'parent',relationType:1,direction:1}],coverage:'local',truncated:false}:{items:[],coverage:'local',truncated:false};
 p=f.project();assert.deepEqual(p.occurrences.map(row=>row.nodeId),['R','Parent'],'A childless note still exposes its parents');
});

test('expanded descendants keep child edges on bottom and every peer edge on the outward side, without merging duplicate canonical occurrences',()=>{
 const f=graphInput({R:['B'],B:['D'],F:['E']},{input:{configuration:{status:'available',values:{initialGenerations:3}}}});
 const context={R:{left:['F']},B:{left:['BF'],right:['BX'],previous:['BP'],next:['BN']},F:{left:['FF'],right:['FX'],previous:['FP'],next:['FN']}};
 for(const roles of Object.values(context))for(const id of Object.values(roles).flat())if(!f.nodes.has(id))f.nodes.set(id,{id,kind:'markdown',label:id});
 const read=f.input.read.relations;f.input.read.relations=(id,role,max)=>role==='child'?read(id,role,max):{items:(context[id]?.[role]??[]).slice(0,max).map(target=>({node:f.nodes.get(target),role,relationType:1,direction:1})),coverage:'local',truncated:false};
 const p=f.project(),B=p.occurrences.find(row=>row.nodeId==='B'),F=p.occurrences.find(row=>row.nodeId==='F');
 assert.equal(B.branch.side,1);assert.equal(F.branch.side,-1);assert.deepEqual(B.ports,{left:'parent',bottom:'child',right:'left'});assert.deepEqual(F.ports,{left:'left',bottom:'child',right:'parent'});
 for(const [row,side]of [[B,'right'],[F,'left']]){
  const edges=p.edges.filter(edge=>edge.source===row.id);assert.equal(edges.length,5);assert.equal(edges.find(edge=>edge.relation.role==='child').sourcePort,'bottom');
  assert(edges.filter(edge=>edge.relation.role!=='child').every(edge=>edge.sourcePort===side));assert.equal(row.peerPort.count,4);assert.equal(row.peerPort.complete,true);
 }
 assert(p.preparation.parents.length<=8);assert(p.occurrences.length<=256);
});

test('measured parent columns grow above a fixed root and reserve the horizontal branch baseline',()=>{
 const f=graphInput({R:['Child']});const parents=Array.from({length:7},(_,i)=>'Parent'+i);
 for(const id of parents)f.nodes.set(id,{id,kind:'markdown',label:id});const read=f.input.read.relations;
 f.input.read.relations=(id,role,max)=>id==='R'&&role==='parent'?{items:parents.slice(0,max).map(id=>({node:f.nodes.get(id),role:'parent',relationType:1,direction:1})),coverage:'local',truncated:false}:read(id,role,max);
 const p=f.project(),measurements=p.occurrences.map(row=>({id:row.id,width:row.nodeId==='Parent0'?440:180,height:40}));
 const layout=(columns,density=1,heights={})=>{f.input.configuration={status:'available',values:{parentColumns:columns}};return M.layoutMindMap(f.project(),measurements,{...M.mindMapConfiguration(),parentColumns:columns,horizontalDensity:density},heights)};
 const one=layout(1),three=layout(3),area=three.areas.find(row=>row.id==='parent'),root=three.positions.get('root');
 assert.equal(root.x,0);assert.equal(root.y,0);assert(area.bounds.y+area.bounds.height< -root.height/2);assert.equal(area.heightPreference.key,'parentHeight');assert.equal(area.dropRole,'parent');
 assert(area.viewport.contentHeight>=area.viewport.height);assert(p.occurrences.filter(row=>parents.includes(row.nodeId)).every(row=>row.areaId==='parent'));
 const parentRects=parents.map(id=>three.positions.get(p.occurrences.find(row=>row.nodeId===id).id));assert.equal(new Set(parentRects.slice(0,3).map(row=>row.y)).size,1);assert.equal(new Set(parentRects.slice(0,3).map(row=>row.x)).size,3);
 const child=p.occurrences.find(row=>row.nodeId==='Child').id;assert(three.positions.get(child).x>one.positions.get(child).x,'Wider measured parent area moves the horizontal baseline outward');
 const sparse=layout(3,0.1);assert(sparse.positions.get(child).x>three.positions.get(child).x);assert.equal(sparse.positions.get('root').width,root.width,'Density never changes node interior size');
 const resized=layout(3,1,{parentHeight:140});assert(resized.areas[0].bounds.height>=140);assert.equal(resized.areas[0].viewport.contentHeight,resized.areas[0].bounds.height);assert.equal(resized.areas[0].heightPreference.value,140);assert.equal(resized.areas[0].viewport.scrollable,false);assert.deepEqual(resized.positions.get('root'),root);assert.equal(resized.positions.get(child).x,three.positions.get(child).x,'Height does not change horizontal anchors');
 for(const id of [0,4,1.5])assert.equal(M.mindMapConfiguration({status:'available',values:{parentColumns:id}}),null);
});

test('fold and generation reducers are occurrence-scoped, bounded, and do not confuse unknown empty incidence with a proven leaf',()=>{
 const f=graphInput({R:['B','C'],B:['D'],C:['D']},{scope:id=>id==='B'?{coverage:'cached',prepared:false,complete:false,pending:false}:{coverage:'local',prepared:true,complete:true,pending:false}});
 let p=f.project();const B=p.occurrences.find(row=>row.nodeId==='B');assert.equal(B.branch.canExpand,true);assert.equal(B.branch.expanded,false);
 f.input.state=M.mindMapViewDefinition.hierarchy.reduce(null,p,{kind:'toggle',occurrenceId:B.id});p=f.project();assert(p.occurrences.some(row=>row.nodeId==='D'));assert.deepEqual(p.preparation.parents,['B']);assert.equal(p.occurrences.find(row=>row.nodeId==='B').branch.status,'partial','Known cached children are usable even before full metadata preparation');
 f.input.state=M.mindMapViewDefinition.hierarchy.reduce(f.input.state,p,{kind:'expand-generation'});p=f.project();assert.equal(p.occurrences.filter(row=>row.nodeId==='D').length,2);
 f.input.state=M.mindMapViewDefinition.hierarchy.reduce(f.input.state,p,{kind:'collapse-generation'});p=f.project();assert.equal(p.occurrences.filter(row=>row.nodeId==='D').length,0);
 assert.equal(M.mindMapViewDefinition.hierarchy.reduce(f.input.state,p,{kind:'toggle',occurrenceId:'foreign'}),null);
 const unknown=graphInput({R:[]},{scope:()=>({coverage:'cached',prepared:false,complete:false,pending:true})}).project();assert.equal(unknown.occurrences[0].branch.canExpand,true);assert.equal(unknown.occurrences[0].branch.status,'loading');
 const unavailable=graphInput({R:[]});unavailable.input.read.relations=()=>({items:[],coverage:'unavailable',truncated:false});const absent=unavailable.project().occurrences[0];assert.equal(absent.branch.canExpand,true);assert.equal(absent.peerPort.complete,false,'An unavailable role read cannot certify an empty peer gate');
});

test('high-degree and deep incidence is finite, explicit frontier retention wins, and exact live ancestry survives a truncated prefix',()=>{
 const children={R:Array.from({length:80},(_,i)=>'B'+String(i).padStart(2,'0'))};for(const B of children.R)children[B]=[B+'D'];
 const f=graphInput(children,{input:{maximum:16,configuration:{status:'available',values:{initialGenerations:2}}}});let p=f.project();assert(p.truncated);assert.equal(p.preparation.parents.length,8);assert(p.occurrences.length<=129);assert(f.reads<1000);
 const pinned='B15',editor=M.mindMapOccurrence(['R',pinned,pinned+'D']);f.input.state=p.stateSuggestion;f.input.retainedScopes=['B09','B10','B11','B12','B13','B14',pinned];f.input.editors=[{occurrenceId:editor,nodeId:pinned+'D'}];
 // New sorts outside the finite display prefix must not retire B's existing native editor path.
 f.input.read.relations=(id,role,max)=>{const all=(children[id]??[]).map(target=>({node:f.nodes.get(target),role:'child',relationType:1,direction:1}));return{items:all.slice(0,id==='R'?4:max),coverage:'cached',truncated:all.length>4}};
 p=f.project();assert(p.occurrences.some(row=>row.id===editor));assert(p.preparation.parents.includes(pinned));assert(p.preparation.parents.length<=8);assert(p.occurrences.length<=129);
 delete f.input.read.relation;p=f.project();assert(!p.occurrences.some(row=>row.id===editor),'Absent canonical pair cannot be invented to preserve an editor');
});

test('fold/sides restoration is detached, bounded, future-safe and scoped to the authoritative session root',()=>{
 const raw={version:1,scope:'R',initialGenerations:2,expanded:['B1'],collapsed:[],sides:{B1:-1},futureData:{flags:[true,null]}};
 const state=M.restoreMindMapState(raw);assert.equal(state.version,1);raw.expanded[0]='mutated';raw.futureData.flags.push(false);
 assert.deepEqual(state.expanded,['B1']);assert.deepEqual(state.futureData,{flags:[true,null]});
 assert.equal(M.scopeMindMapState(state,'R',3).initialGenerations,2,'Type defaults do not reopen generations in an existing map');
 const other=M.scopeMindMapState(state,'C',1);assert.equal(other.scope,'C');assert.deepEqual(other.expanded,[]);assert.deepEqual(other.sides,{});
 for(const value of [{version:99,future:true},{...state,expanded:['x'.repeat(4097)]},{...state,sides:{B1:0}},{...state,futureData:'x'.repeat(12000)}])assert.equal(M.restoreMindMapState(value).version,0);
});

test('type configuration validates exact ranges and leaves unavailable payloads inert',()=>{
 const defaults=M.mindMapConfiguration();assert.equal(defaults.initialGenerations,1);assert.equal(defaults.maximumDepth,10);assert.equal(defaults.maximumOccurrences,500);
 assert.equal(M.mindMapConfiguration({status:'unavailable',reason:'unsupported'}),null);
 for(const values of [{maximumDepth:21},{initialGenerations:1.5},{maximumOccurrences:2001},{arrangement:'unknown'},{verticalSpacing:NaN},{maximumDepth:null},{horizontalDensity:0},{horizontalDensity:0.05},{verticalDensity:Infinity}])assert.equal(M.mindMapConfiguration({status:'available',values}),null);
});

test('Mind Map horizontal and vertical density independently compact measured gaps without changing root, occurrence identity or node/editor dimensions',()=>{
 const f=graphInput({R:['B','C'],B:['D']},{input:{configuration:{status:'available',values:{initialGenerations:2}}}}),p=f.project();
 const sizes=p.occurrences.map(row=>({id:row.id,width:row.nodeId==='B'?660:180,height:row.nodeId==='B'?410:40}));
 const base=M.layoutMindMap(p,sizes,M.mindMapConfiguration()),horizontal=M.layoutMindMap(p,sizes,M.mindMapConfiguration({status:'available',values:{horizontalDensity:2}})),vertical=M.layoutMindMap(p,sizes,M.mindMapConfiguration({status:'available',values:{verticalDensity:2}}));
 for(const row of p.occurrences){const a=base.positions.get(row.id),h=horizontal.positions.get(row.id),v=vertical.positions.get(row.id);assert.equal(h.y,a.y);assert.equal(v.x,a.x);assert.equal(h.width,a.width);assert.equal(v.height,a.height);}
 assert.deepEqual(horizontal.positions.get('root'),base.positions.get('root'));assert.deepEqual(vertical.positions.get('root'),base.positions.get('root'));
 const B=p.occurrences.find(row=>row.nodeId==='B'),C=p.occurrences.find(row=>row.nodeId==='C');assert(horizontal.positions.get(B.id).x<base.positions.get(B.id).x);assert(Math.abs(vertical.positions.get(B.id).y-vertical.positions.get(C.id).y)<Math.abs(base.positions.get(B.id).y-base.positions.get(C.id).y));
 const spacious=M.layoutMindMap(p,sizes,M.mindMapConfiguration({status:'available',values:{horizontalDensity:0.1,verticalDensity:0.1}}));
 const root=spacious.positions.get('root'),b=spacious.positions.get(B.id),c=spacious.positions.get(C.id);assert.equal(b.x-b.width/2-(root.x+root.width/2),960,'Minimum horizontal density gives ten times the96px default gap');assert(Math.abs(b.y-c.y)-(b.height+c.height)/2>=240,'Minimum vertical density gives at least ten times the24px default gap');
 assert.equal(b.width,660);assert.equal(b.height,410);assert.deepEqual(root,base.positions.get('root'));
});

test('renamed or missing roots require explicit recovery, and reduced limits retain a live editor path only through real canonical pairs',()=>{
 const f=graphInput({R:['B'],B:['D'],D:['E']},{input:{configuration:{status:'available',values:{initialGenerations:3}}}});let p=f.project();
 const D=p.occurrences.find(row=>row.nodeId==='D');f.input.state=p.stateSuggestion;f.input.editors=[{occurrenceId:D.id,nodeId:'D'}];
 f.input.configuration={status:'available',values:{maximumDepth:1,maximumOccurrences:16}};p=f.project();assert(p.occurrences.some(row=>row.id===D.id));assert(!p.occurrences.some(row=>row.nodeId==='E'));
 f.nodes.set('R',{id:'Renamed'});assert.equal(f.project(),null,'An old root alias cannot silently reroot the map');f.nodes.delete('R');assert.equal(f.project(),null);
});

test('measured subtree bands preserve the root and prevent overlaps before/after an editor expands',()=>{
 const occurrences=[{id:'R',branch:{depth:0,side:1}},...Array.from({length:30},(_,i)=>({id:'N'+i,branch:{parent:i<2?'R':'N'+Math.floor((i-2)/2),side:i%2?-1:1}}))];
 const projection={entry:'R',occurrences};const measurements=occurrences.map(({id})=>({id,width:180,height:40}));
 for(const expanded of [false,true]){
  if(expanded)Object.assign(measurements.find(row=>row.id==='N3'),{width:660,height:410,editor:true});
  const layout=M.layoutMindMap(projection,measurements,M.mindMapConfiguration());assert.deepEqual(layout.positions.get('R'),{x:0,y:0,width:180,height:40});
  const rows=[...layout.positions.values()];assert.equal(rows.length,occurrences.length);
  for(let i=0;i<rows.length;i++)for(let j=i+1;j<rows.length;j++){const a=rows[i],b=rows[j];assert(Math.abs(a.x-b.x)>=(a.width+b.width)/2||Math.abs(a.y-b.y)>=(a.height+b.height)/2,'Measured rectangles overlap')}
 }
 assert.throws(()=>M.layoutMindMap({entry:'R',occurrences:[{id:'R',branch:{side:1}},{id:'X',branch:{parent:'X',side:1}}]},[{id:'R',width:1,height:1},{id:'X',width:1,height:1}],M.mindMapConfiguration()),/ancestry/);
});

/** Parent column directions must agree with real branch ports and survive visibility pruning. */
test('parent forests expand outward by column with matching ports and disjoint measured tiles',()=>{
 const f=graphInput({R:['Child'],P0:['Q0'],P1:['Q1'],P2:['Q2'],Q0:['Grandchild']});const parents=['P0','P1','P2'],read=f.input.read.relations;
 f.input.read.relations=(id,role,max)=>id==='R'&&role==='parent'?{items:parents.slice(0,max).map(id=>({node:f.nodes.get(id),role:'parent',relationType:1,direction:1})),coverage:'local',truncated:false}:read(id,role,max);
 for(const columns of [1,2,3])for(const touch of [false,true]){
  f.input.configuration={status:'available',values:{parentColumns:columns,initialGenerations:3}};const p=f.project(),sizes=p.occurrences.map(row=>({id:row.id,width:row.nodeId==='P0'?360:180,height:40,...(touch&&(row.branch.canExpand||row.branch.expanded)?{controlReserve:{right:48,bottom:48}}:{})}));
  const verify=projection=>{
   // A minimum height leaves room; measured forests also grow beyond it without clipping.
   const layout=M.layoutMindMap(projection,sizes,{...M.mindMapConfiguration(),parentColumns:columns},{parentHeight:800}),rects=[...layout.positions].map(([id,r])=>{const reserve=sizes.find(size=>size.id===id)?.controlReserve;return {id,left:r.x-r.width/2,right:r.x+r.width/2+(reserve?.right??0),top:r.y-r.height/2,bottom:r.y+r.height/2+(reserve?.bottom??0)}});
   for(const row of projection.occurrences.filter(row=>parents.includes(row.nodeId))){
    const side=columns>1&&parents.indexOf(row.nodeId)%columns===0?-1:1,child=projection.occurrences.find(child=>child.branch.parent===row.id),a=layout.positions.get(row.id),b=layout.positions.get(child.id);
    assert.equal(row.branch.side,side);assert.equal(Math.sign(b.x-a.x),side);assert.equal(row.ports[side===1?'left':'right'],'parent');assert.equal(row.peerPort.side,side===1?'right':'left');
    assert.equal(projection.edges.find(edge=>edge.target===child.id).targetPort,side===1?'left':'right');
   }
   for(let i=0;i<rects.length;i++)for(let j=i+1;j<rects.length;j++){const a=rects[i],b=rects[j];assert(a.right<=b.left||a.left>=b.right||a.bottom<=b.top||a.top>=b.bottom,'Outward subtree thought/control tiles overlap '+JSON.stringify({columns,touch,a,b,area:layout.areas[0]}));}
  };
  verify(p);const removed=new Set([p.occurrences.find(row=>row.nodeId==='P0').id]);for(const row of p.occurrences)if(removed.has(row.branch.parent))removed.add(row.id);
  verify({...p,occurrences:p.occurrences.filter(row=>!removed.has(row.id)),edges:p.edges.filter(edge=>!removed.has(edge.source)&&!removed.has(edge.target))});
 }
});


test('parent minimum height grows upward while bottom-aligned rows and root-relative branches stay fixed',()=>{
 const f=graphInput({R:['Child']});const parents=['P0','P1','P2'];for(const id of parents)f.nodes.set(id,{id,kind:'markdown',label:id});
 const read=f.input.read.relations;f.input.read.relations=(id,role,max)=>id==='R'&&role==='parent'?{items:parents.map(id=>({node:f.nodes.get(id),role:'parent',relationType:1,direction:1})),coverage:'local',truncated:false}:read(id,role,max);
 const p=f.project(),sizes=p.occurrences.map(row=>({id:row.id,width:180,height:40})),configuration={...M.mindMapConfiguration(),parentColumns:2};
 const compact=M.layoutMindMap(p,sizes,configuration,{parentHeight:140}),tall=M.layoutMindMap(p,sizes,configuration,{parentHeight:800});
 assert.deepEqual([...tall.positions],[...compact.positions],'Empty minimum-height space belongs above parents; no root/card/branch moves');
 const a=compact.areas[0],b=tall.areas[0];assert.equal(b.bounds.height,800);assert.equal(a.bounds.y+a.bounds.height,b.bounds.y+b.bounds.height);assert(b.bounds.y<a.bounds.y);
 assert.equal(b.viewport.contentHeight,b.viewport.height);assert.equal(b.viewport.initialScrollTop,0);assert.equal(b.viewport.scrollable,false);assert.equal(b.heightPreference.value,800);
 const bottom=Math.max(...p.occurrences.filter(row=>row.areaId==='parent').map(row=>{const r=tall.positions.get(row.id);return r.y+r.height/2}));
 assert.equal(b.bounds.y+b.bounds.height-bottom,16,'Measured bottom padding remains next to root');
});

test('expanded parent forests and large native editor measurements grow past the preference ceiling without scrolling',()=>{
 const children=Array.from({length:26},(_,i)=>'D'+i),f=graphInput({P:children},{input:{maximum:64,configuration:{status:'available',values:{initialGenerations:3}}}});f.nodes.set('P',{id:'P',kind:'markdown',label:'P'});
 const read=f.input.read.relations;f.input.read.relations=(id,role,max)=>id==='R'&&role==='parent'?{items:[{node:f.nodes.get('P'),role:'parent',relationType:1,direction:1}],coverage:'local',truncated:false}:read(id,role,max);
 const p=f.project(),parent=p.occurrences.find(row=>row.nodeId==='P');assert.equal(p.occurrences.length,28);assert(parent.branch.expanded);
 const sizes=p.occurrences.map(row=>({id:row.id,width:row.id===parent.id?660:180,height:row.id===parent.id?1100:50,controlReserve:{right:32,bottom:32}}));
 const layout=M.layoutMindMap(p,sizes,M.mindMapConfiguration(),{parentHeight:140}),area=layout.areas[0];assert(area.bounds.height>1100);assert.equal(area.heightPreference.value,140);assert.equal(area.viewport.contentHeight,area.viewport.height);assert.equal(area.viewport.scrollable,false);
 for(const row of p.occurrences.filter(row=>row.areaId==='parent')){const r=layout.positions.get(row.id);assert(r.y-r.height/2>=area.bounds.y);assert(r.y+r.height/2+32<=area.bounds.y+area.bounds.height);}
 assert.equal(layout.positions.get(parent.id).height,1100,'Native editor dimensions unchanged');assert.equal(layout.positions.get('root').y,0);
});
