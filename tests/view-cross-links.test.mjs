/** Cache-only canonical cross-links through the real shared occurrence adapter; no source, parser or native write capabilities exist in this fixture. */
import assert from 'node:assert/strict';
import test from 'node:test';
import {plexViewModules,viewPage} from './support/plexViewFixture.mjs';
const M=await plexViewModules(['src/ui/plexViews/crossLinks.ts','src/ui/plexViews/reflowArea.ts']);

/** Exact canonical pages and finite incidence retain real role/type/direction; duplicate displayed occurrences are independent. */
function fixture(){
 const pages=new Map(['R','B','C','D'].map(id=>[id,viewPage(id)])),calls=[];
 const node=(id,copy,x,y=0)=>({page:pages.get(id),occurrenceId:copy,x,y,width:100,height:40,physicalPorts:{left:'parent',bottom:'child',right:'left'},peerPort:{side:'right',count:1,complete:true}});
 const B=node('B','B1',0),B2=node('B','B2',900),C=node('C','C',200),D=node('D','D',1000);
 const read={get:id=>pages.get(id),visibleRelationshipsWithin:(source,within)=>{calls.push(source.path);return (source.path==='B'?[['C','child'],['D','next']]:source.path==='C'?[['B','parent']]:[])
  .filter(([id])=>within.has(id)).map(([id,role])=>({page:pages.get(id),role,relationType:1,typeDefinition:'exact-'+role,linkDirection:1}));}};
 return{pages,nodes:[B,B2,C,D],read,calls,settings:M.migrateAndMergeSettings({}),B,B2,C,D};
}

test('extra canonical links choose exact compatible occurrences and semantic physical gates without collapsing copies',()=>{
 const f=fixture(),edges=[];assert.deepEqual(M.appendOccurrenceCrossLinks(f.nodes,edges,f.read,f.settings),{limited:false});
 assert.equal(edges.length,2);assert.deepEqual(edges.map(e=>[e.sourceOccurrence,e.targetOccurrence,e.sourcePort,e.targetPort,e.typeDefinition]),
 [['B1','C','bottom','left','exact-child'],['B2','D','right','right','exact-next']]);
 assert(edges.every(e=>e.kind==='semantic'&&e.isCrossLink&&e.direction===1));assert.deepEqual(f.calls,['B','C','D'],'One cached incidence read per unique admitted canonical page');
 const child=edges[0];assert.equal(child.sourcePath,'B');assert.equal(child.targetPath,'C');
 const seeded=[{...child,isCrossLink:undefined}];M.appendOccurrenceCrossLinks(f.nodes,seeded,f.read,f.settings);assert.equal(seeded.length,2,'Primary semantic pair wins over its duplicate visual occurrence');
});

test('unsupported, filtered, synthetic, replaced and reciprocal endpoints cannot gain cross-link authority',()=>{
 const f=fixture();f.C.physicalPorts={};f.D.page={...f.D.page,transient:{kind:'group'}};const edges=[];
 M.appendOccurrenceCrossLinks(f.nodes,edges,f.read,f.settings);assert.deepEqual(edges,[]);
 f.pages.set('C',viewPage('C'));f.C.physicalPorts={left:'parent'};f.D.page=f.pages.get('D');f.D.physicalPorts={};f.D.peerPort=undefined;
 M.appendOccurrenceCrossLinks(f.nodes,edges,f.read,f.settings);assert.deepEqual(edges,[],'Stale canonical/native incarnation is not an admitted endpoint');
 const other=fixture();M.appendOccurrenceCrossLinks(other.nodes.filter(n=>n.page.path!=='C'),edges,other.read,other.settings);assert.equal(edges.length,1);assert.equal(edges[0].targetPath,'D');
});

test('bounded occurrence pairing reports limitation instead of treating discarded work as a complete empty graph',()=>{
 const f=fixture(),nodes=Array.from({length:140},(_,i)=>({...f.B,occurrenceId:'B'+i,x:i}));nodes.push(...Array.from({length:140},(_,i)=>({...f.C,occurrenceId:'C'+i,x:i})));
 const edges=[];assert.equal(M.appendOccurrenceCrossLinks(nodes,edges,f.read,f.settings).limited,true);assert.equal(edges.length,0);assert.equal(f.calls.length,1);
});

test('parent-area filtering retains exact matching ancestry and repacks measured subtree tiles',()=>{
 const f=fixture(),nodes=[{...f.B,branch:{parent:'root'}},{...f.C,branch:{parent:'B1'}},{...f.B2,branch:{parent:'root'}},{...f.D,branch:{parent:'B2'}}];
 const panel={left:-300,top:-300,width:600,height:160,contentTop:-300,contentHeight:600};
 const layout=M.reflowArea(panel,nodes,'D',(node,value)=>node.page.path===value,{columns:2,columnGap:24,rowGap:16});
 assert.deepEqual(layout.nodes.map(n=>n.occurrenceId),['B2','D']);assert(layout.localPositions.get('D').x>layout.localPositions.get('B2').x);assert.equal(layout.count,2);
 assert.equal(layout.localPositions.get('B1'),undefined);assert(layout.contentHeight>=160);
});


test('optional stable area filtering retains exact ancestors and bottom-aligned positions without creating overflow',()=>{
 const f=fixture(),nodes=[{...f.B,branch:{parent:'root'}},{...f.C,branch:{parent:'B1'}},{...f.B2,branch:{parent:'root'}},{...f.D,branch:{parent:'B2'}}];
 const panel={left:-300,top:-300,width:1400,height:500,contentTop:-300,contentHeight:500};
 const layout=M.reflowArea(panel,nodes,'D',(node,value)=>node.page.path===value,{columns:2,columnGap:24,rowGap:16,filterLayout:'keep'});
 assert.deepEqual(layout.nodes.map(n=>n.occurrenceId),['B2','D']);assert.equal(layout.count,2);assert.equal(layout.contentHeight,500);
 for(const node of layout.nodes)assert.deepEqual(layout.localPositions.get(node.occurrenceId),{x:node.x-panel.left,y:node.y-panel.contentTop});
 assert.equal(layout.localPositions.get('B1'),undefined,'Canonical duplicate does not replace the actual ancestor');
});
