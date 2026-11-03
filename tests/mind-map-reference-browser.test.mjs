/** Real shared node click/selection/reveal with a bounded anonymous ancestor cycle. Production
 * vault observation remains strictly read-only; this fixture owns every mutation below. */
import assert from 'node:assert/strict';
import test from 'node:test';
import {chromiumHarness} from './support/browserTypeScript.mjs';
import {plexViewBrowserModules} from './support/plexViewBrowser.mjs';
import {canvasSceneFixture} from './support/canvasSceneFixture.mjs';
const output=await plexViewBrowserModules({captureNotices:true});

test('Mind Map hydrates canonical gate counts and cached branch status independently of expansion prefixes',async()=>{
 const host=await chromiumHarness(output.outputFiles[0].text+';window.sourceModules=sourceModules;');
 try{assert.equal(await host.evaluate(`(async()=>{${canvasSceneFixture}
 index.viewScopeCoverage=()=>({coverage:'cached',prepared:false,complete:false,pending:false});
 index.gateStats=()=>{work.gateReads++;return {top:{visibleCount:7,hasAny:true},bottom:{visibleCount:16,hasAny:true},left:{visibleCount:1,hasAny:true},right:{visibleCount:1,hasAny:true}}};
 const ui=await mount(M.builtInPlexViews.resolve('mindmap')),root=()=>ui.container.querySelector('[data-kplex-keyboard-id="root"]');
 const count=side=>root().querySelector('.gate-wrap-'+side+' .kplex-gate-count')?.textContent;
 check(count('top')==='7'&&count('bottom')==='16'&&count('left')==='2','Exact canonical totals replace truncated incidence: '+root().textContent);
 const status=root().querySelector('.kplex-node-status');check(status.textContent===plugin.translator('mindmap.partial')&&status.ariaLabel===plugin.translator('mindmap.partialHint'),'Known cached children have explanatory incomplete metadata status');
 check(root().querySelector('.kplex-accessible-name').textContent.includes(plugin.translator('mindmap.partial')),'The owning accessible node includes status text as well as its explanation');
 check(ui.container.querySelector('[data-kplex-path="B.md"]'),'Cached children remain visible');
 check(work.body===0&&work.scans===0,'Count rendering never parses or scans');ui.close();return true})()`),true)}finally{await host.cleanup()}
});

test('Facets area width reflows measured cards into columns and back without semantic work',async()=>{
 const host=await chromiumHarness(output.outputFiles[0].text+';window.sourceModules=sourceModules;');
 try{assert.equal(await host.evaluate(`(async()=>{${canvasSceneFixture}
 const ui=await mount(M.builtInPlexViews.resolve('wuxing')),id=JSON.stringify(['facets','wuxing','category','water']);
 const cards=()=>['B.md','C.md'].map(path=>ui.container.querySelector('[data-kplex-path="'+path+'"]'));
 const lefts=()=>cards().map(el=>Math.round(el.getBoundingClientRect().left));
 const before={acquisitions:work.acquisitions,body:work.body,scans:work.scans};
 ui.session.setAreaWidth(id,1000);ui.render();await wait();let positions=lefts();check(positions[0]!==positions[1],'Wide area should use multiple columns: '+JSON.stringify(positions));
 ui.session.setAreaWidth(id,220);ui.render();await wait();positions=lefts();check(positions[0]===positions[1],'Narrow area returns to one column: '+JSON.stringify(positions));
 check(work.acquisitions===before.acquisitions&&work.body===before.body&&work.scans===before.scans,'Presentation-only resizing adds no source work');
 check(ui.props.activePath==='A.md','Resize preserves attention');ui.close();return true})()`),true)}finally{await host.cleanup()}
});

test('Mind Map branch disclosure clicks are isolated from body activation and file opening',async()=>{
 const host=await chromiumHarness(output.outputFiles[0].text+';window.sourceModules=sourceModules;');
 try{assert.equal(await host.evaluate(`(async()=>{${canvasSceneFixture}
 const ui=await mount(M.builtInPlexViews.resolve('mindmap'));let activated=0,opened=0;ui.props.onActivate=()=>{activated++};ui.props.onOpen=()=>{opened++};ui.render();
 const implementations=Object.fromEntries(Object.keys(ui.ports.current.implementations).map(id=>[id,{availability:c=>ui.ports.current.implementations[id].availability(c),execute:c=>ui.ports.current.implementations[id].execute(c)}]));
 const release=plugin.actionManager.registerSurface({id:ui.props.actionSurfaceId,generation:1,readSnapshot:()=>({mounted:true,visible:true,windowId:'main',center:M.actionNodeRef(pages.get('A.md')),selected:ui.ports.current.readSelected(),focusRegion:'graph',interactionRevision:0,viewRevision:ui.session.getSnapshot()}),implementations});
 const control=()=>ui.container.querySelector('[data-kplex-keyboard-id="root"] .is-branch-disclosure');
 check(control()?.ariaLabel===plugin.translator('mindmap.collapseBranch'),'Branch disclosure is distinct from the Markdown section plus/minus: '+control()?.outerHTML);
 const before={root:ui.session.layoutRoot('A.md'),attention:ui.props.activePath};
 control().dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,cancelable:true}));control().click();await wait();ui.render();await wait();
 check(!ui.container.querySelector('[data-kplex-path="B.md"]')&&control().getAttribute('aria-expanded')==='false','Disclosure folds once');
 control().click();await wait();ui.render();await wait();check(ui.container.querySelector('[data-kplex-path="B.md"]')&&control().getAttribute('aria-expanded')==='true','Disclosure unfolds once');
 control().dispatchEvent(new MouseEvent('dblclick',{bubbles:true,cancelable:true}));await wait();
 check(!activated&&!opened&&ui.props.activePath===before.attention&&ui.session.layoutRoot('A.md')===before.root,'Disclosure never activates/opens/reroots the body');
 check(work.body===0&&work.scans===0,'No Markdown body or inventory work');release();ui.close();return true})()`),true)}finally{await host.cleanup()}
});

test('legacy expand-primary cycle click reveals the genuine earlier occurrence without changing its native owners',async()=>{
 const host=await chromiumHarness(output.outputFiles[0].text+';window.sourceModules=sourceModules;');
 try{assert.equal(await host.evaluate(`(async()=>{${canvasSceneFixture}
 const graph={'A.md':['B.md'],'B.md':['C.md'],'C.md':['B.md']};
 index.neighbours=(page,role)=>role==='child'?(graph[page.path]??[]).map(path=>({page:pages.get(path),role,relationType:1,typeDefinition:'Related',linkDirection:1})):[];
 const base=M.builtInPlexViews.resolve('mindmap'),definition={...base,id:'legacy-cycle',hierarchy:{...base.hierarchy,primary:'expand'}},ui=await mount(definition);
 const earlier=JSON.stringify(['A.md','B.md']),middle=JSON.stringify(['A.md','B.md','C.md']),reference=JSON.stringify(['A.md','B.md','C.md','B.md']);
 ui.session.updateState({version:1,scope:'A.md',initialGenerations:1,expanded:[earlier,middle],collapsed:[],sides:{}});ui.render();await wait();await wait();
 const cards=()=>[...ui.container.querySelectorAll('.kplex-thought')],find=id=>cards().find(el=>el.dataset.kplexKeyboardId===id);
 const source=find(earlier),repeated=find(reference);check(source&&repeated&&source!==repeated,'Independent exact occurrences exist');
 const input=document.createElement('input');document.body.append(input);input.value='Unsaved native-like control';input.focus();input.setSelectionRange(7,7);
 const before={state:JSON.stringify(ui.session.state),attention:ui.props.activePath,root:ui.session.layoutRoot('A.md'),acquisitions:work.acquisitions,editors:JSON.stringify(ui.session.editors.bindings)};
 M.flushSync(()=>repeated.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true})));await wait();
 check(find(earlier).classList.contains('is-keyboard-selected'),'Nearest ancestor occurrence revealed/selected');
 check(!find(reference).classList.contains('is-keyboard-selected'),'Reference must not remain the selected occurrence');
 check(window.testNotices?.length===1&&window.testNotices[0].message===plugin.translator('mindmap.cycleReference')&&window.testNotices[0].duration===5000,'Localized cycle explanation appears once');
 check(JSON.stringify(ui.session.state)===before.state&&ui.props.activePath===before.attention&&ui.session.layoutRoot('A.md')===before.root,'No fold, attention or root mutation');
 check(JSON.stringify(ui.session.editors.bindings)===before.editors,'No editor retarget');check(document.activeElement===input&&input.selectionStart===7&&input.value==='Unsaved native-like control','No focus/caret/content change');
 check(work.acquisitions===before.acquisitions&&work.body===0&&work.scans===0,'Reveal adds no source demand/body/scan');
 ui.session.setRoot('B.md');M.flushSync(()=>repeated.dispatchEvent(new MouseEvent('click',{bubbles:true})));
 check(window.testNotices.length===1,'Changed root cannot follow a previous scene reference');
 ui.session.select('classic');M.flushSync(()=>repeated.dispatchEvent(new MouseEvent('click',{bubbles:true})));
 check(window.testNotices.length===1,'Retired view cannot follow an old reference');input.remove();ui.close();return true})()`),true)}finally{await host.cleanup()}
});

/** Modified Enter uses the shared fold action independently of plain Enter centering. */
test('keyboard-selected Mind Map occurrence folds through its shared action without attention or root changes',async()=>{
 const host=await chromiumHarness(output.outputFiles[0].text+';window.sourceModules=sourceModules;');
 try{assert.equal(await host.evaluate(`(async()=>{${canvasSceneFixture}
 const graph={'A.md':['B.md','C.md'],'B.md':['C.md']};index.neighbours=(page,role)=>role==='child'?(graph[page.path]??[]).map(path=>({page:pages.get(path),role,relationType:1,typeDefinition:'Related',linkDirection:1})):[];
 const ui=await mount(M.builtInPlexViews.resolve('mindmap'));let activated=0;ui.props.onActivate=()=>{activated++};ui.render();
 const implementations=Object.fromEntries(Object.keys(ui.ports.current.implementations).map(id=>[id,{availability:c=>ui.ports.current.implementations[id].availability(c),execute:c=>ui.ports.current.implementations[id].execute(c)}]));
 const release=plugin.actionManager.registerSurface({id:ui.props.actionSurfaceId,generation:1,readSnapshot:()=>({mounted:true,visible:true,windowId:'main',center:M.actionNodeRef(pages.get('A.md')),selected:ui.ports.current.readSelected(),focusRegion:'graph',interactionRevision:0,viewRevision:ui.session.getSnapshot()}),implementations});
 const key=async id=>{const outcome=await plugin.actionManager.dispatch({id,source:'local-hotkey',surfaceId:ui.props.actionSurfaceId});ui.render();await wait();return outcome};
 const first=await key('selection.center'),second=await key('selection.section.right');await key('selection.move.down');await key('selection.move.up');check(ui.ports.current.readSelected()?.node.identity==='B.md','Arrow moves to the real displayed B occurrence '+JSON.stringify({first,second,selected:ui.ports.current.readSelected()}));
 const before={root:ui.session.layoutRoot('A.md'),attention:ui.props.activePath};
 check((await key('branch.toggle')).status==='completed','Modified Enter action expands selected branch');check([...ui.container.querySelectorAll('[data-kplex-path="C.md"]')].some(el=>el.dataset.kplexKeyboardId===JSON.stringify(['A.md','B.md','C.md'])),'Exact branch child becomes visible');
 check((await key('branch.toggle')).status==='completed','Modified Enter action collapses selected branch');check(![...ui.container.querySelectorAll('[data-kplex-path="C.md"]')].some(el=>el.dataset.kplexKeyboardId===JSON.stringify(['A.md','B.md','C.md'])),'Exact branch child folds away');
 check(ui.ports.current.readSelected()?.node.identity==='B.md','Exact parent selection retained');check(!activated&&ui.session.layoutRoot('A.md')===before.root&&ui.props.activePath===before.attention,'Enter does not navigate, reroot or rename');
 check(work.body===0&&work.scans===0,'Branch action performs no body/index work');release();ui.close();plugin.actionManager.dispose();style.remove();return true})()`),true)}finally{await host.cleanup()}
});
