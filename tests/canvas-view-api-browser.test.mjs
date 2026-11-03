/** Real Chromium contribution controls and actual native-Settings/queued-writer method bodies. */
import assert from 'node:assert/strict';
import test from 'node:test';
import {colorEditorScenario} from './support/colorEditorBrowser.mjs';
import {readFileSync} from 'node:fs';
const initialize=`
const M=sourceModules,R=M.React,t=M.createTranslator('en'),check=(value,message)=>{if(!value)throw Error(message)},equal=(a,b,message)=>check(JSON.stringify(a)===JSON.stringify(b),message+' '+JSON.stringify([a,b]));
const definition=M.exampleViewDefinition,views=new M.PlexViewRegistry([M.classicViewDefinition,definition]),registry=new M.CanvasViewSettingsRegistry(views,[M.exampleSettingsContribution]);
const create=async()=>{
 const p=await createAppearanceHost({});p.viewSettingsRegistry=registry;p.writes=[];p.manifest={id:'k-plex'};
 Object.assign(p,{actionPreferenceQueue:Promise.resolve(),actionPreferenceListeners:new Set(),graphLensListeners:new Set(),appearanceThemeListeners:new Set(),appearanceThemeActivation:0,externalSettingsRefresh:0,externalSettingsQueued:false,externalSettingsFailureNotified:false});
 let disk=structuredClone(p.settings);p.loadData=async()=>structuredClone(disk);p.saveData=async value=>{p.writes.push(structuredClone(value));disk=structuredClone(value)};
 const work={presentation:0,semantic:0,settings:0,camera:0,failures:0};
 p.index.refreshPresentationSettings=async()=>work.presentation++;p.index.refreshSemanticSettings=async()=>{work.semantic++;throw Error('Unexpected semantic work')};
 p.index.invalidateSemanticPolicy=()=>{work.semantic++;throw Error('Unexpected semantic work')};p.index.notifyPresentation=()=>{};p.index.invalidateNodeVisuals=()=>{};
 p.initializeSettingsReconciliation(structuredClone(p.settings));
 const session=new M.PlexViewSession(views,()=>{});session.select(definition.id);
 const controller=new M.CanvasViewContributionController(session,registry,{settings:()=>p.settings.canvasViewSettings,mounted:()=>true,
  beforePresentationChange:()=>work.camera++,update:(id,address,edit,expected)=>p.updateCanvasViewConfiguration(id,address,edit,expected),
  openSettings:id=>{check(id===definition.id,'Exact page owner');work.settings++;return true},failed:()=>work.failures++});
 return{p,work,session,controller};
};
`;
const scenario=body=>colorEditorScenario(`(async()=>{${initialize}${body};return true})()`);

test('adjacent view/choice cogs retain the opening canvas and selected entry, repeat safely and wrap on narrow panels',async()=>{
 assert.equal(await scenario(`
 const a=await create(),b=await create(),calls=[],style=document.createElement('style');style.textContent=${JSON.stringify(readFileSync('styles.css','utf8'))};document.head.append(style);
 const contribution={...M.exampleSettingsContribution,choices:context=>M.exampleSettingsContribution.choices(context).map(choice=>({...choice,settings:{kind:'settings',target:choice.selected}}))};
 const localRegistry=new M.CanvasViewSettingsRegistry(views,[contribution]);
 a.controller=new M.CanvasViewContributionController(a.session,localRegistry,{settings:()=>a.p.settings.canvasViewSettings,mounted:()=>true,beforePresentationChange:()=>{},update:()=>{throw Error('Unexpected settings write')},openSettings:(id,target)=>{calls.push({id,target});return true},failed:error=>{throw error}});
 const container=createDiv();document.body.append(container);const root=M.createRoot(container),index={suggestionCatalog:()=>({tags:[],noteTypes:[],folders:[],properties:[],paths:[]})};let owner=a;
 const render=()=>M.flushSync(()=>root.render(R.createElement(M.PlexFilter,{index,revision:0,value:{...M.EMPTY_PLEX_FILTER},onChange:()=>{},lenses:[],onLensesChange:()=>{},layoutMode:'keep',onLayoutModeChange:()=>{},showSiblings:false,onShowSiblingsChange:()=>{},visibility:{},onVisibilityChange:()=>{},sortOrder:'name-asc',onSortOrderChange:()=>{},translate:t,viewSession:owner.session,viewContributions:owner.controller})));
 render();M.flushSync(()=>container.querySelector('.kplex-filter-trigger').click());await waitFor(()=>document.querySelector('.kplex-view-choice button'));
 const panel=document.querySelector('.kplex-filter-panel'),view=()=>panel.querySelector('.kplex-view-selector select'),choice=()=>panel.querySelector('[data-kplex-view-choice] select');
 check(Math.abs(view().getBoundingClientRect().top-choice().getBoundingClientRect().top)<2,'Selectors share a row when space allows');
 panel.style.width='230px';await new Promise(resolve=>setTimeout(resolve,40));check(choice().getBoundingClientRect().top>view().getBoundingClientRect().bottom,'Narrow panel wraps the same controls');
 const frame=document.createElement('iframe');document.body.append(frame);const input=frame.contentDocument.createElement('input');frame.contentDocument.body.append(input);input.focus();owner=b;render();
 panel.querySelector('.kplex-view-selector button').click();await waitFor(()=>calls.length===1);equal(calls[0],{id:definition.id},'View cog uses opening owner');
 for(let repeat=0;repeat<2;repeat++){panel.querySelector('.kplex-view-choice button').click();await waitFor(()=>calls.length===repeat+2)}
 equal(calls.slice(1),[{id:definition.id,target:'right'},{id:definition.id,target:'right'}],'Preset/choice navigation can reopen without writes');
 choice().value='left';M.flushSync(()=>choice().dispatchEvent(new Event('change',{bubbles:true})));await waitFor(()=>a.session.state.side===-1);
 panel.querySelector('.kplex-view-choice button').click();await waitFor(()=>calls.length===4);equal(calls[3],{id:definition.id,target:'left'},'Cog follows the selected stable entry');
 equal(b.session.state.side,1,'Other canvas retained');equal(a.p.writes.length+b.p.writes.length,0,'Navigation never persists settings');equal(a.work.semantic+b.work.semantic,0,'Navigation starts no semantics');
 check([...panel.querySelectorAll('[data-kplex-control-tooltip]')].every(button=>!button.hasAttribute('title')),'Cogs use one shared accessible tooltip');
 root.unmount();a.controller.dispose();b.controller.dispose();a.session.dispose();b.session.dispose();container.remove();frame.remove();style.remove();
 `),true);
});

test('open Views and lenses choices retain the opening canvas when props/focus move to another document',async()=>{
 assert.equal(await scenario(`
 const a=await create(),b=await create(),container=createDiv();document.body.append(container);const root=M.createRoot(container);
 const index={suggestionCatalog:()=>({tags:[],noteTypes:[],folders:[],properties:[],paths:[]}),read:()=>{throw Error('Unexpected source read')}};
 let owner=a;const base={index,revision:0,value:{...M.EMPTY_PLEX_FILTER},onChange:()=>{},lenses:[],onLensesChange:()=>{},
  layoutMode:'keep',onLayoutModeChange:()=>{},showSiblings:false,onShowSiblingsChange:()=>{},visibility:{},onVisibilityChange:()=>{},sortOrder:'name-asc',onSortOrderChange:()=>{},translate:t};
 const render=()=>M.flushSync(()=>root.render(R.createElement(M.PlexFilter,{...base,viewSession:owner.session,viewContributions:owner.controller})));render();
 M.flushSync(()=>container.querySelector('.kplex-filter-trigger').click());await waitFor(()=>document.querySelector('[data-kplex-view-choice] select'));
 const frame=document.createElement('iframe');document.body.append(frame);const input=frame.contentDocument.createElement('input');frame.contentDocument.body.append(input);input.focus();
 owner=b;render();const select=document.querySelector('[data-kplex-view-choice] select');select.value='left';
 M.flushSync(()=>select.dispatchEvent(new Event('change',{bubbles:true})));await waitFor(()=>a.session.state.side===-1);
 equal(b.session.state.side,1,'Focus/props must not redirect to B');equal(a.work.semantic+b.work.semantic,0,'No source work');
 const stale=document.querySelector('[data-kplex-view-choice] select');a.controller.dispose();stale.value='right';M.flushSync(()=>stale.dispatchEvent(new Event('change',{bubbles:true})));
 await new Promise(resolve=>setTimeout(resolve,0));equal(a.session.state.side,-1,'Disposed canvas cannot be changed');
 M.flushSync(()=>root.unmount());b.controller.dispose();container.remove();frame.remove();
 `),true);
});

test('public example renders shared choices, literal/empty headings and rails without a built-in ID branch',async()=>{
 assert.equal(await scenario(`
 const f=await create(),other=await create(),container=createDiv();document.body.append(container);const root=M.createRoot(container);
 function Shell(){R.useSyncExternalStore(f.session.subscribe,f.session.getSnapshot);const context=f.controller.context();return R.createElement(R.Fragment,null,
  R.createElement(M.CanvasViewChoices,{controller:f.controller,translate:t}),R.createElement(M.CanvasViewHeading,{heading:{literal:'view.choose'},translate:t}),
  R.createElement(M.CanvasViewLayoutControls,{controls:registry.layoutControls(definition,context),configuration:context.configuration,translate:t,
   onChange:(control,value)=>{void f.controller.capture({kind:'configuration',address:{field:control.field,path:control.path},edit:{kind:'set',value}}).run().then(render)}}))}
 const render=()=>M.flushSync(()=>root.render(R.createElement(Shell)));render();
 const select=container.querySelector('select');equal(select.getAttribute('aria-label'),'Branch side','Literal native label');
 select.value='left';M.flushSync(()=>select.dispatchEvent(new Event('change',{bubbles:true})));await waitFor(()=>f.session.state.side===-1);
 equal(other.session.state.side,1,'Other canvas retained');equal(container.querySelector('.kplex-view-heading').textContent,'view.choose','Literal bypasses catalog');
 const checkbox=container.querySelector('input[type=checkbox]');M.flushSync(()=>checkbox.click());await waitFor(()=>f.p.writes.length===1);
 equal(M.readViewConfiguration(definition,f.p.settings.canvasViewSettings).values.showHeading,false,'Rail uses actual durable writer');
 equal(f.work.semantic,0,'Presentation controls do no semantic work');
 M.flushSync(()=>root.render(R.createElement(M.CanvasViewHeading,{heading:{literal:''},translate:t})));check(!container.querySelector('.kplex-view-heading'),'Explicit empty');
 M.flushSync(()=>root.render(R.createElement(M.CanvasViewHeading,{heading:null,translate:t})));check(!container.querySelector('.kplex-view-heading'),'Explicit null');
 M.flushSync(()=>root.render(R.createElement(M.CanvasViewHeading,{translate:t})));check(!container.querySelector('.kplex-view-heading'),'Inherited unchanged host');
 M.flushSync(()=>root.unmount());f.controller.dispose();other.controller.dispose();container.remove();
 `),true);
});

test('contributed native Settings and live rails share committed values and fail without optimistic publication',async()=>{
 assert.equal(await scenario(`
 const f=await create(),tab=new M.KplexSettingTab({},f.p),key='canvasView:'+definition.id+':spacing';
 equal(tab.getControlValue(key),80,'Read does not save defaults');equal(f.p.writes.length,0,'Opening quiet');
 await tab.setControlValue(key,120);equal(f.controller.context().configuration.values.spacing,120,'Native setting visible on rail');
 const original=structuredClone(f.p.settings.canvasViewSettings),save=f.p.saveData;f.p.saveData=async()=>{throw Error('Expected storage failure')};
 const outcome=await f.controller.capture({kind:'configuration',address:{field:'spacing'},edit:{kind:'set',value:150}}).run();
 equal(outcome.status,'failed','Failure outcome');equal(f.p.settings.canvasViewSettings,original,'No optimistic configuration');equal(f.work.failures,1,'Actionable failure');
 f.p.saveData=save;await f.controller.capture({kind:'configuration',address:{field:'spacing'},edit:{kind:'set',value:140}}).run();
 equal(tab.getControlValue(key),140,'Rail write visible in native Settings');equal(f.work.semantic,0,'No source/semantic work');
 f.controller.dispose();tab.hide();tab.containerEl.remove();
 `),true);
});

test('nested native Settings addresses use declared preset ownership and preserve sibling entries',async()=>{
 assert.equal(await scenario(`
 const f=await create(),nested={...definition,id:'org.example.nested',configuration:{version:2,fields:{presets:{entries:true,
  defaultValue:{one:{spacing:30},two:{spacing:50}},validate:value=>!!value&&typeof value==='object'&&Object.values(value).every(row=>row&&typeof row.spacing==='number')}}}};
 f.p.viewSettingsRegistry=new M.CanvasViewSettingsRegistry(new M.PlexViewRegistry([M.classicViewDefinition,nested]),[{id:nested.id,
  items:({key})=>[{name:'One spacing',control:{type:'slider',key:key('presets',['one','spacing']),min:20,max:200,step:1}}]}]);
 const tab=new M.KplexSettingTab({},f.p),pages=f.p.viewSettingsRegistry.pages({translate:t,areaTint:()=>({name:'Area'})}),key=pages[0].items[0].control.key;
 check(key.endsWith(':presets:one/spacing'),'Stable native address');equal(tab.getControlValue(key),30,'Nested default');
 await tab.setControlValue(key,70);equal(M.readViewConfiguration(nested,f.p.settings.canvasViewSettings).values.presets,{one:{spacing:70},two:{spacing:50}},'Sibling preserved');
 equal(tab.receivedControlDomain(key),'canvasViewSettings:org.example.nested:presets:one','Same entry epoch as queued writer');
 equal(f.work.semantic,0,'No indexing work');f.controller.dispose();tab.hide();tab.containerEl.remove();
 `),true);
});
