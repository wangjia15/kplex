/** Issue221: real renderer/controller navigation across each registered canvas policy and the
 * public example, with prepared local incidence and intentionally incomplete gate counts.
 * Ordinary Mind Map note clicks and modified clicks both use accepted destination centering. */
import assert from 'node:assert/strict';
import {canvasSceneFixture} from './support/canvasSceneFixture.mjs';
import test from 'node:test';
import {chromiumHarness} from './support/browserTypeScript.mjs';
import {plexViewBrowserModules} from './support/plexViewBrowser.mjs';
const output=await plexViewBrowserModules();
const initialize=canvasSceneFixture;

test('Alt/Option click explicitly centers through shared actions in every view and ordinary Mind Map clicks use accepted centering',async()=>{
 const host=await chromiumHarness(output.outputFiles[0].text+';window.sourceModules=sourceModules;');
 try{assert.equal(await host.evaluate(`(async()=>{${initialize}
 const errors=[];window.addEventListener('error',event=>errors.push(event.message));let opened=0;plugin.openFileInMainTab=()=>{opened++};
 for(const definition of [...M.builtInPlexViews.available,M.exampleViewDefinition]){
  const ui=await mount(definition),accepted=[];
  ui.props.onActivate=(page,intent)=>{
   if(intent==='destination'&&definition.navigation==='rooted'&&!ui.session.setRoot(page.path))return false;
   accepted.push({path:page.path,intent});ui.props.activePath=page.path;ui.render();return true;
  };ui.render();
  const implementations=Object.fromEntries(Object.keys(ui.ports.current.implementations).map(id=>[id,{
   availability:context=>ui.ports.current.implementations[id].availability(context),execute:context=>ui.ports.current.implementations[id].execute(context)}]));
  const release=plugin.actionManager.registerSurface({id:ui.props.actionSurfaceId,generation:1,
   readSnapshot:()=>({mounted:true,visible:true,windowId:'main',center:M.actionNodeRef(pages.get(ui.props.activePath)),selected:null,focusRegion:'graph',interactionRevision:0,viewRevision:ui.session.getSnapshot()}),implementations});
  const card=ui.container.querySelector('.kplex-thought[data-kplex-path="B.md"]');check(card,'Displayed B '+definition.id);
  if(definition.navigation==='rooted'){
   M.flushSync(()=>card.dispatchEvent(new MouseEvent('click',{bubbles:true})));await wait();
   check(ui.session.layoutRoot('B.md')==='B.md'&&accepted.length===1&&accepted[0].intent==='destination','Ordinary note click uses accepted centering');
   check(ui.session.setRoot('A.md'),'Reset explicit test root');ui.props.activePath='A.md';ui.render();await wait();accepted.length=0;
  }
  M.flushSync(()=>ui.container.querySelector('.kplex-thought[data-kplex-path="B.md"]').dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,altKey:true,detail:1})));await wait();await wait();
  check(accepted.length===1&&accepted[0].path==='B.md'&&accepted[0].intent==='destination','Shared destination accepted '+definition.id);
  check(ui.props.activePath==='B.md','Attention centered '+definition.id);
  if(definition.navigation==='rooted')check(ui.session.layoutRoot('B.md')==='B.md','Pinned root changed explicitly');
  const centered=ui.container.querySelector('.kplex-thought[data-kplex-path="B.md"]');
  M.flushSync(()=>centered.dispatchEvent(new MouseEvent('dblclick',{bubbles:true,altKey:true,detail:2})));await wait();
  check(opened===0,'Alt/Option center double-click cannot also open file '+definition.id);
  if(definition.navigation==='rooted'){
   ui.session.editors.open({viewId:definition.id,occurrenceId:'root',target:{nodeId:'B.md',path:'B.md',fileIdentity:M.actionNodeRef(pages.get('B.md')).fileIdentity},dimensions:{width:420,height:240},mode:'source'});
   check(ui.session.editors.bindings.length===1,'Existing binding admitted for guard proof');
   const refused=await plugin.actionManager.dispatch({id:'node.activate',source:'context-menu',surfaceId:ui.props.actionSurfaceId,
    target:{kind:'explicit',node:M.actionNodeRef(pages.get('A.md'))},args:{intent:'destination'}});
   check(refused.status==='unavailable'&&ui.session.layoutRoot('B.md')==='B.md'&&accepted.length===1,'Center action must preserve live occurrence editor/root');
  }
  release();ui.close();
 }
 check(errors.length===0,'No DOM errors '+errors.join(';'));check(work.body===0&&work.scans===0,'No source work');return true})()`),true)}finally{await host.cleanup()}
});

test('Wander starts, highlights and navigates with local proof in Compass, Mind Map, Wu Xing and the public example',async()=>{
 const host=await chromiumHarness(output.outputFiles[0].text+';window.sourceModules=sourceModules;');
 try{assert.equal(await host.evaluate(`(async()=>{${initialize}
 for(const definition of [...M.builtInPlexViews.available,M.exampleViewDefinition]){
  const ui=await mount(definition),initial=ui.ports.current.readWanderScene();
  check(initial.center==='A.md'&&initial.candidates.length>0,'Displayed canonical candidates '+definition.id);
  check(initial.ready,'Prepared local scene with unavailable numerical gate counts must be ready: '+definition.id);
  prepared=false;check(!ui.ports.current.readWanderScene().ready,'Unprepared attention must wait '+definition.id);prepared=true;
  visible=false;check(!ui.ports.current.readWanderScene().ready,'Hidden native canvas cannot navigate '+definition.id);visible=true;
  const acquisitions=work.acquisitions,gateReads=work.gateReads;
  for(let i=0;i<50;i++)check(ui.ports.current.readWanderScene().ready,'Read-only readiness '+definition.id);
  check(work.acquisitions===acquisitions&&work.gateReads===gateReads,'Polls cannot acquire or query gate counts '+definition.id);
  let now=0,scheduled=null,zen=false;const controller=new M.WanderController({
   readScene:()=>ui.ports.current.readWanderScene(),highlight:d=>ui.ports.current.highlightWander(d),clear:()=>ui.ports.current.clearWander(),
   navigate:d=>ui.ports.current.navigateWander(d),readZen:()=>zen,setZen:value=>{zen=value},now:()=>now,random:()=>0,
   schedule:(callback,delay)=>{const entry={callback,at:now+delay};scheduled=entry;return()=>{if(scheduled===entry)scheduled=null}}});
  controller.start();const tick=()=>{const next=scheduled;check(next,'One owned timer '+definition.id);scheduled=null;now=next.at;M.flushSync(()=>next.callback())};
  tick();check(ui.container.querySelector('.is-keyboard-selected'),'Real shared selection '+definition.id);
  tick();check(ui.moves.length===1&&ui.moves[0]!=='A.md','Accepted navigation '+definition.id);await wait();await wait();
  check(ui.ports.current.readWanderScene().center===ui.moves[0],'Attention follows navigation '+definition.id);
  check(ui.ports.current.readWanderScene().ready,'Ready after navigation '+definition.id);tick();check(controller.getSnapshot().phase==='playing','Arrival completes '+definition.id);
  if(definition.navigation==='rooted')check(ui.session.layoutRoot(ui.moves[0])==='A.md','Wander retains rooted policy');
  controller.stop();check(!zen&&scheduled===null,'Stop restores Zen/timer '+definition.id);controller.dispose();ui.close();
 }
 check(work.body===0&&work.scans===0,'No body reads or vault scans');return true})()`),true)}finally{await host.cleanup()}
});
