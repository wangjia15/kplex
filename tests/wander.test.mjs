/** Production Wander route, scheduling, geometry and real DOM controls; native/device evidence is separate. */
import assert from 'node:assert/strict';
import test from 'node:test';
import {build} from 'esbuild';
import {mkdtempSync, rmSync, readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import ts from 'typescript';
import {browserBundle, chromiumHarness} from './support/browserTypeScript.mjs';
const temp=mkdtempSync(join(tmpdir(),'kplex-wander-'));
await build({stdin:{resolveDir:process.cwd(),contents:'export * from "./src/core/plex/wanderRoute"; export * from "./src/application/WanderController"; export * from "./src/ui/components/centerArrival"; export * from "./src/core/plex/actions";'},outfile:join(temp,'api.mjs'),bundle:true,format:'esm',platform:'node'});
const api=await import(pathToFileURL(join(temp,'api.mjs')));
test.after(()=>rmSync(temp,{recursive:true,force:true}));

/** Walk the same finite projected candidates a new center would display. */
function routeWalk(edges,random=()=>0,start='A') {
 let center=start,route=api.beginWanderRoute(center),visits=[center];
 for(let move=0;move<600;move++){
  const next=api.chooseWanderDestination(route,center,edges[center]??[],random);
  if(!next)return {visits,route};center=next.identity;route=next.route;visits.push(center);
 }
 assert.fail('route did not terminate');
}
test('dead-end chain unwinds C → B → A before taking its alternate branch',()=>{
 const {visits}=routeWalk({A:['B','D'],B:['A','C'],C:['B'],D:['A','E'],E:['D']});
 assert.deepEqual(visits,['A','B','C','B','A','D','E','D','A']);
});
test('two-node, empty and finite cycle components stop instead of oscillating',()=>{
 assert.deepEqual(routeWalk({A:['B'],B:['A']}).visits,['A','B','A']);
 assert.deepEqual(routeWalk({A:[]}).visits,['A']);
 const cyclic=routeWalk({A:['B','C'],B:['A','C'],C:['A','B']});
 assert(cyclic.visits.length<20);assert(cyclic.visits.includes('C'));
});
test('recency is weighted and decays, with previous visits remaining eligible outside the active trail',()=>{
 assert(api.wanderWeight('B',['B'])<api.wanderWeight('C',['B']));
 assert(api.wanderWeight('B',['B',...Array(20).fill('C')])>api.wanderWeight('B',['B']));
 const route=api.beginWanderRoute('A',['B']);
 assert.equal(api.chooseWanderDestination(route,'A',['B','C'],()=>0).identity,'B');
 assert.equal(api.chooseWanderDestination(route,'A',['B','C'],()=>0.5).identity,'C');
});
test('route bounds, lost predecessors, duplicate opaque IDs and seeded determinism',()=>{
 const long=Object.fromEntries(Array.from({length:300},(_,i)=>[String(i),[...(i?[String(i-1)]:[]),String(i+1)]]));
 const bounded=routeWalk(long,()=>0,'0');assert(bounded.route.trail.length<=64);assert(bounded.route.recent.length<=40);assert(bounded.route.moves<=256);
 const r=api.chooseWanderDestination(api.beginWanderRoute('A'),'A',['B','B'],()=>0);assert.equal(r.identity,'B');
 assert.equal(api.chooseWanderDestination(r.route,'B',[],()=>0),null);
 const edges={'A/x':['folder:/','Case'],'folder:/':['A/x'],'Case':['A/x']};
 assert.deepEqual(routeWalk(edges,()=>0.6,'A/x'),routeWalk(edges,()=>0.6,'A/x'));
});

/** A manual injected clock deliberately retains cancelled callbacks to test generation fencing. */
function harness({zen=false,edges={A:['B','D'],B:['A'],D:['A']},ready=true}={}) {
 let time=0,center='A',serial=0;const timers=new Map(),cancelled=[],moves=[],highlights=[];
 let sceneReady=ready,navigateValid=true,selection=null;const rejected=new Set();
 const ports={
  readScene:()=>({center,ready:sceneReady,candidates:(edges[center]??[]).map(id=>({node:{identity:id,path:id,kind:'file',fileIdentity:id+'-1'},occurrenceId:id+'-tile'}))}),
  highlight:d=>{selection=d;highlights.push(d.node.identity);return true},clear:()=>{selection=null},
  navigate:d=>{if(!navigateValid||rejected.has(d.node.identity)||!(edges[center]??[]).includes(d.node.identity))return false;center=d.node.identity;moves.push({center,time});return true},
  readZen:()=>zen,setZen:value=>{zen=value},now:()=>time,random:()=>0,
  schedule:(callback,delay)=>{const id=++serial;timers.set(id,{callback,at:time+delay});return()=>{const item=timers.get(id);if(item)cancelled.push(item.callback);timers.delete(id)}}
 };
 const controller=new api.WanderController(ports);
 return {controller,timers,moves,highlights,cancelled,
  read:()=>({time,center,zen,selection,ready:sceneReady}),setCenter:value=>{center=value},setReady:value=>{sceneReady=value},invalidate:()=>{navigateValid=false},reject:identity=>rejected.add(identity),
  advance:ms=>{const end=time+ms;let limit=10000;while(limit--){const next=[...timers.entries()].sort((a,b)=>a[1].at-b[1].at)[0];if(!next||next[1].at>end)break;time=next[1].at;timers.delete(next[0]);next[1].callback();}assert(limit>0);time=end;}
 };
}
test('start snapshots Zen once; repeated start is idempotent; Stop and disposal fence late callbacks',()=>{
 for(const zen of [false,true]){
  const h=harness({zen});h.controller.start();h.controller.start();assert.equal(h.timers.size,1);assert.equal(h.read().zen,true);
  h.advance(101);assert.equal(h.read().selection.node.identity,'B');h.controller.stop();
  for(const callback of h.cancelled)callback();h.advance(20000);
  assert.equal(h.moves.length,0);assert.equal(h.read().zen,zen);assert.equal(h.read().selection,null);assert.equal(h.timers.size,0);
  h.controller.start();h.controller.dispose();h.controller.start();h.advance(10000);assert.equal(h.timers.size,0);
 }
});
test('Pause retains route and Zen; Play uses a new manually selected center',()=>{
 const h=harness();h.controller.start();h.advance(1200);assert.equal(h.moves.length,0);
 h.controller.pause();assert.equal(h.read().zen,true);assert.equal(h.read().selection,null);
 h.setCenter('D');h.controller.play();h.advance(2000);assert.equal(h.moves[0].center,'A');assert.equal(h.timers.size,1);
 h.controller.stop();
});
test('one pace means a whole cycle; changing pace affects the next cycle without timer churn',()=>{
 const h=harness({edges:{A:['B'],B:['A','C'],C:['B','D'],D:['C']}});h.controller.setSeconds(3);h.controller.start();h.advance(100);
 h.controller.setSeconds(15);assert.equal(h.timers.size,1);h.advance(550);assert.equal(h.moves[0].time,650);
 h.advance(2450);assert.equal(h.moves.length,1);h.advance(1200);assert.equal(h.moves[1].time,4300);
 h.advance(13799);assert.equal(h.moves.length,2);h.advance(1300);assert.equal(h.moves.length,3);
 h.controller.stop();
});
test('scene/animation completion extends pacing rather than starting overlapping navigation',()=>{
 const h=harness({edges:{A:['B'],B:['A','C'],C:['B']}});h.controller.setSeconds(3);h.controller.start();h.advance(650);h.setReady(false);
 h.advance(10000);assert.equal(h.moves.length,1);assert.equal(h.controller.getSnapshot().phase,'transitioning');assert.equal(h.timers.size,1);
 h.setReady(true);h.advance(100);assert.equal(h.read().selection,null);h.advance(599);assert.equal(h.moves.length,1);
 h.advance(1000);assert.equal(h.moves.length,2);h.controller.stop();
});
test('invalidation during anticipation never commits route or stale activation; unavailability pauses',()=>{
 const h=harness();h.controller.start();h.advance(101);h.invalidate();h.advance(31000);
 assert.equal(h.moves.length,0);assert.equal(h.controller.getSnapshot().phase,'paused');assert.equal(h.controller.getSnapshot().reason,'unavailable');assert.equal(h.timers.size,0);
});
test('exhaustion pauses with retry, holding Zen; fast stop/restart rejects the prior callback',()=>{
 const h=harness({edges:{A:['B'],B:['A']}});h.controller.setSeconds(3);h.controller.start();h.advance(8000);
 assert.deepEqual(h.moves.map(m=>m.center),['B','A']);assert.equal(h.controller.getSnapshot().reason,'exhausted');assert.equal(h.read().zen,true);
 h.controller.play();h.advance(100);h.controller.stop();const old=[...h.cancelled];h.controller.start();for(const callback of old)callback();
 assert.equal(h.timers.size,1);h.advance(1000);assert.equal(h.moves.length,3);h.controller.stop();
});
test('catalog publishes Wander via the normal stable action command and exposes Stop',()=>{
 assert.equal(api.ACTION_BY_ID.get('view.wander.start').command.id,'kplex-wander');assert.equal(api.ACTION_BY_ID.get('view.wander.start').command.defaultPublished,true);
 assert.equal(api.ACTION_BY_ID.get('view.wander.stop').command.defaultPublished,false);
});

/** Decode transform samples for direct screen-space geometry assertions. */
function sample(frame){return [...frame.transform.matchAll(/-?[\d.]+/g)].map(v=>Number(v[0]));}
test('arrival geometry starts at the real screen rectangle across zooms, bends once and lands naturally',()=>{
 for(const scale of [.3,.7,1,2,3])for(const [left,top] of [[10,100],[600,100],[250,10],[250,650]]){
  const previous={left,top,width:90,height:32},current={left:250,top:250,width:130*scale,height:40*scale};
  const frames=api.centerArrivalFrames(previous,current,scale),first=sample(frames[0]),last=sample(frames.at(-1));
  assert.equal(first[0]*scale+current.left,previous.left);assert.equal(first[1]*scale+current.top,previous.top);
  assert(Math.abs(first[2]*current.width-previous.width)<1e-8);assert(Math.abs(first[3]*current.height-previous.height)<1e-8);
  assert.deepEqual(last,[0,0,1,1]);assert.equal(frames.length,5);assert.equal(frames.at(-1).opacity,1);
  const mid=sample(frames[2]);assert(mid[2]>first[2]+(1-first[2])*.65);
 }
});
test('real DOM curved arrival preserves scale, cancels superseded motion and retains no fill',async()=>{
 const browser=await chromiumHarness(await browserBundle(['src/ui/components/centerArrival.ts','src/ui/components/ElementMotion.ts']));
 try{
  const r=await browser.evaluate(`(async()=>{
   const {centerArrivalFrames,ElementMotion}=window.sourceModules,motion=new ElementMotion();
   const camera=document.createElement('div'),node=document.createElement('div');camera.style.cssText='position:absolute;left:250px;top:150px;transform:scale(.7);transform-origin:0 0';node.style.cssText='width:130px;height:40px;';camera.append(node);document.body.append(camera);
   const target=node.getBoundingClientRect(),previous={left:40,top:350,width:63,height:22};
   const animation=motion.play(node,centerArrivalFrames(previous,target,.7),{duration:1000,easing:'linear'});animation.pause();animation.currentTime=0;const first=node.getBoundingClientRect();
   animation.currentTime=500;const mid=node.getBoundingClientRect();const active=motion.isRunning();motion.cancelAll();const stopped=node.getBoundingClientRect();
   const final=motion.play(node,centerArrivalFrames(previous,target,.7),{duration:20});await final.finished;await Promise.resolve();const landing=node.getBoundingClientRect();camera.remove();
   return{first:[first.left,first.top,first.width,first.height],mid:[mid.left,mid.top],target:[target.left,target.top,target.width,target.height],stopped:[stopped.left,stopped.top,stopped.width,stopped.height],landing:[landing.left,landing.top,landing.width,landing.height],active,running:motion.isRunning(),animations:node.getAnimations().length};
  })()`);
  r.first.forEach((value,i)=>assert(Math.abs(value-[40,350,63,22][i])<.05));assert.equal(r.active,true);assert.equal(r.running,false);assert.equal(r.animations,0);assert.deepEqual(r.target,r.stopped);assert.deepEqual(r.target,r.landing);
 }finally{await browser.cleanup()}
});
test('Wander controls match actual Plex button styles and reuse the accessible 3–15 second layout rail',async()=>{
 const result=await build({stdin:{resolveDir:process.cwd(),loader:'tsx',contents:`import React from 'react';export {createElement} from 'react';export {createRoot} from 'react-dom/client';export {WanderControls} from './src/ui/features/WanderControls';export {LayoutSlider} from './src/ui/components/LayoutSlider';export {createTranslator} from './src/lang';`},bundle:true,write:false,platform:'browser',format:'iife',globalName:'sourceModules'});
 const browser=await chromiumHarness(result.outputFiles[0].text);
 try{
  const r=await browser.evaluate(`(async()=>{const {createElement,createRoot,WanderControls,LayoutSlider,createTranslator}=window.sourceModules;const style=document.createElement('style');style.textContent=${JSON.stringify(readFileSync('styles.css','utf8'))};document.head.append(style);const container=document.createElement('div');container.className='kplex-view-host';document.body.append(container);const root=createRoot(container);let stops=0,toggles=0;root.render(createElement('div',{className:'kplex-app'},createElement(WanderControls,{state:{phase:'paused',seconds:7,reason:'exhausted'},translate:createTranslator("en"),stopIcon:'x',playbackIcon:'play',paceIcon:'timer',onStop:()=>stops++,onToggle:()=>toggles++,onSeconds:()=>{}}),createElement('div',{className:'kplex-zoom-controls'},createElement('button',null,'zoom')),createElement(LayoutSlider,{label:'reference',caption:'reference',icon:'timer',value:7,displayValue:'7',min:3,max:15,step:1,onChange:()=>{}})));await new Promise(r=>setTimeout(r,50));const controls=container.querySelector('.kplex-wander-controls'),buttons=[...controls.querySelectorAll('button')],slider=controls.querySelector('input'),reference=container.querySelector('.kplex-zoom-controls button');const buttonStyle=getComputedStyle(buttons[0]),referenceStyle=getComputedStyle(reference),railStyle=getComputedStyle(slider);buttons[0].click();buttons[1].click();const output={stops,toggles,labels:buttons.map(b=>b.getAttribute('aria-label')),title:buttons.some(b=>b.hasAttribute('title')),min:slider.min,max:slider.max,value:slider.value,rangeCount:controls.querySelectorAll('input[type=range]').length,sharedRail:!!slider.closest('.kplex-density-rail'),buttonStyle:[buttonStyle.backgroundColor,buttonStyle.color,buttonStyle.height,buttonStyle.width,buttonStyle.borderRadius],referenceStyle:[referenceStyle.backgroundColor,referenceStyle.color,referenceStyle.height,referenceStyle.width,referenceStyle.borderRadius],rangeAppearance:railStyle.appearance,marker:!!slider.closest('[data-kplex-wander-control]'),status:container.querySelector('[role=status]').textContent};root.unmount();container.remove();style.remove();return output})()`);
  assert.equal(r.stops,1);assert.equal(r.toggles,1);assert.deepEqual(r.labels,['Stop wandering','Resume wandering']);assert.equal(r.title,false);assert.equal(r.min,'3');assert.equal(r.max,'15');assert.equal(r.value,'7');assert.equal(r.rangeCount,1);assert.equal(r.marker,true);assert.match(r.status,/paused/);assert.equal(r.sharedRail,true);assert.equal(r.rangeAppearance,'none');assert.deepEqual(r.buttonStyle,r.referenceStyle);
 }finally{await browser.cleanup()}
});

/** Extract the production callback so dependency/geometry tests exercise the actual graph owner. */
function graphCallback(name,dependencies) {
 const source=ts.createSourceFile('graph.tsx',readFileSync('src/ui/PlexGraph.tsx','utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);let expression;
 const visit=node=>{if(ts.isVariableDeclaration(node)&&node.name.getText(source)===name)expression=node.initializer.getText(source);ts.forEachChild(node,visit)};visit(source);assert(expression);
 const code=ts.transpileModule(`const selected=${expression};`,{compilerOptions:{target:ts.ScriptTarget.ES2021}}).outputText;
 return Function(...Object.keys(dependencies),code+';return selected')(...Object.values(dependencies));
}
test('captured center geometry follows the explicit occurrence over stale keyboard selection; missing source falls back',()=>{
 const rect=left=>({left,top:40,width:80,height:30,right:left+80,bottom:70});
 const elements=[{dataset:{kplexPath:'A',kplexKeyboardId:'primary'},getBoundingClientRect:()=>rect(20)},{dataset:{kplexPath:'A',kplexKeyboardId:'expanded'},getBoundingClientRect:()=>rect(220)}];
 const incomingCenter={current:null},navigationOccurrence={current:{identity:'A',id:'expanded'}},wanderMotion={current:false};
 const capture=graphCallback('prepareNavigation',{viewport:{current:{querySelectorAll:()=>elements,getBoundingClientRect:()=>({left:0,top:0,right:600,bottom:500})}},selection:{readSelected:()=>({id:'primary'})},incomingCenter,navigationOccurrence,wanderMotion});
 capture('A','user');assert.equal(incomingCenter.current.rect.left,220);assert.equal(navigationOccurrence.current,null);
 capture('A','wander');assert.equal(incomingCenter.current.rect.left,20);assert.equal(wanderMotion.current,true);
 capture('missing','user');assert.equal(incomingCenter.current.rect,null);assert.equal(wanderMotion.current,false);
});
test('temporary selection release preserves user-owned selection and falls back when its saved occurrence disappears',()=>{
 let selected='wander',restored=[];const wanderSelection={current:{center:'A',previous:'saved',owned:'wander'}},wanderMotion={current:true},incomingCenter={current:{}},selection={readSelected:()=>selected?{id:selected}:null,select:id=>{restored.push(id);if(id==='saved')return false;selected=id;return true}};
 let cancels=0;const clear=graphCallback('clearWander',{wanderSelection,wanderMotion,incomingCenter,selection,activePath:'A',sceneMotion:{cancelAll:()=>cancels++}});
 clear();assert.deepEqual(restored,['saved',null]);assert.equal(cancels,1);assert.equal(incomingCenter.current,null);
 restored=[];selected='user';wanderSelection.current={center:'A',previous:'saved',owned:'wander'};clear();assert.deepEqual(restored,[]);assert.equal(selected,'user');
});
test('a rejected preflight target is discarded so another displayed destination remains available',()=>{
 const h=harness();h.controller.setSeconds(3);h.controller.start();h.advance(101);h.reject('B');h.advance(1300);
 assert.deepEqual(h.moves.map(item=>item.center),['D']);assert.deepEqual(h.highlights,['B','D']);h.controller.stop();
});

test('Wander readiness uses the current local certificate independently of physical gates and corpus counts',()=>{
 const center={path:'A'},scope={coverage:'local',prepared:true,complete:false,pending:false},scene={failed:false};let canonical=center,reads=0;
 const candidates=[{node:{identity:'B'},occurrenceId:'B-tile'}];
 const viewport={current:{isConnected:true}},plugin={isKplexLeafVisible:()=>true};let running=false;
 const dependencies={viewport,persistentNeighborhood:{center},scene,index:{get:()=>canonical,viewScopeCoverage:()=>{reads++;return scope},gateStats:()=>{throw Error('Readiness must not request gate counts')}},activePath:'A',viewFailed:false,
 plugin,hostLeaf:{},sceneTransitioning:false,pathChangedThisRender:false,sceneMotion:{isRunning:()=>running},nodeDrag:null,connectDrag:null,areaSettingsMode:false,relationshipUpdating:false,wanderCandidates:candidates};
 const read=graphCallback('readWanderScene',dependencies);
 assert.equal(read().ready,true);assert.equal(read().candidates,candidates);
 scope.prepared=false;scope.pending=true;assert.equal(read().ready,false,'Unprepared demand must wait, not fabricate local readiness');
 scope.prepared=true;scope.pending=false;scope.coverage='local';assert.equal(read().ready,true,'Incomplete corpus/gate counts do not block local navigation');
 canonical={path:'A'};assert.equal(read().center,null,'Replaced canonical incarnation is not the displayed center');assert.equal(read().ready,false);canonical=center;
 running=true;assert.equal(read().ready,false);running=false;viewport.current.isConnected=false;assert.equal(read().ready,false);viewport.current.isConnected=true;
 plugin.isKplexLeafVisible=()=>false;assert.equal(read().ready,false);plugin.isKplexLeafVisible=()=>true;
 scene.failed=true;assert.equal(read().ready,false);scene.failed=false;
 for(const field of ['viewFailed','sceneTransitioning','pathChangedThisRender','nodeDrag','connectDrag','areaSettingsMode','relationshipUpdating'])
  assert.equal(graphCallback('readWanderScene',{...dependencies,[field]:true})().ready,false,field);
 assert(reads>0,'Only the existing cache-only local certificate is consulted');
});
