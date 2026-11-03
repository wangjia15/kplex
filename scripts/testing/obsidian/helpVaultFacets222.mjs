/** Render an exact public Help checkpoint through production native views in the existing
 * disposable controller. The caller supplies a frozen Markdown/config snapshot and owns all
 * fixtures, settings, window, native leaves and unconditional outer restoration. */
export async function acceptHelpVaultFacets222(x) {
  const {app,p,c,host,native,files,releases,restores,cases,path,root,center,check,wait,until,choose,panel}=x;
  const payload=c.helpVault,doc=root(host).ownerDocument,session=host.view.documentSession.plexView;
  check(payload?.repository==='zsviczian/kplex-help'&&/^[a-f0-9]{40}$/.test(payload.commit),'Exact public Help checkpoint required');
  const fresh=p.readPortableSharingState().presets;
  check(JSON.stringify(Object.keys(fresh))===JSON.stringify(['wuxing','map-roles']),'Fresh inherited library must contain only Wu Xing and Local map roles');
  check(fresh.wuxing.field==='status'&&fresh.wuxing.start==='wood'&&fresh.wuxing.categories.wood.assignment==='🟢'&&fresh.wuxing.categories.metal.assignment==='🟡','Fresh Wu Xing must use Dumo status/emoji/phase order');
  const untouched=JSON.stringify(p.settings.canvasViewSettings);
  check(p.settingsTab.openCanvasViewManager('wuxing'),'Fresh native preset manager refused');
  await until(()=>doc.querySelectorAll('.kplex-style-manager-row').length===2,'Native manager must show exactly two built-ins');
  const freshNames=[...doc.querySelectorAll('.kplex-style-manager-name')].map(el=>el.textContent);
  check(freshNames.includes(p.translator('facets.presetWuXing'))&&freshNames.includes(p.translator('facets.presetMapRoles')),'Native built-in identities differ');
  const freshRect=doc.querySelector('.kplex-style-manager-modal').getBoundingClientRect();
  require('node:fs').writeFileSync(c.screenshotPrefix+'-help-two-builtins.png',(await native.webContents.capturePage({x:Math.ceil(freshRect.x),y:Math.ceil(freshRect.y),width:Math.floor(freshRect.width),height:Math.floor(freshRect.height)})).toPNG());
  for(const type of ['keyDown','keyUp'])native.webContents.sendInputEvent({type,keyCode:'Escape'});
  await until(()=>!doc.querySelector('.modal'),'Fresh manager did not close');
  check(JSON.stringify(p.settings.canvasViewSettings)===untouched,'Opening fresh defaults must not materialize presets');
  cases.push({id:'native-two-builtins-status-emoji-and-defaults-without-save',names:freshNames});
  check(JSON.stringify(p.settings.hierarchy)===JSON.stringify(payload.hierarchy)&&p.settings.noteTypeField===payload.noteTypeField,'Disposable ontology must match Help');
  const byPath=new Map(payload.notes.map(note=>[note.path.replace(/\.md$/,''),note])),byName=new Map(payload.notes.map(note=>[note.name,note]));
  check(byName.size===payload.notes.length&&payload.notes.length<250,'Bounded uniquely named Help snapshot required');
  const owned=note=>path(note.name),refs=new Map();
  /** Rewrite only known fixture links so each copy resolves to its owned canonical target. */
  const copyText=text=>text.replace(/\[\[([^\]]+)\]\]/g,(original,content)=>{
    const split=content.indexOf('|'),link=split<0?content:content.slice(0,split),caption=split<0?'':content.slice(split),hash=link.indexOf('#');
    const key=(hash<0?link:link.slice(0,hash)).replace(/\.md$/,'').trim(),section=hash<0?'':link.slice(hash),target=byPath.get(key)??byName.get(key);
    return target?'[['+owned(target).replace(/\.md$/,'')+section+caption+']]':original;
  });
  for(const note of payload.notes){const file=await app.vault.create(owned(note),copyText(note.text));files.push(file);refs.set(note.path.replace(/\.md$/,''),file);p.index.insertCreatedFile(file);releases.push(p.index.acquireSemanticDemand(file.path));}
  await until(()=>[...refs.values()].every(file=>app.metadataCache.getFileCache(file))&&!p.index.hasActiveSemanticPreparation(),'Help fixture metadata did not settle',60000);
  p.settings.renderAlias=payload.renderAlias;p.settings.nameFields=payload.nameFields;
  p.settings.canvasViewSettings=structuredClone(payload.canvasViewSettings);await p.saveSettings(false,false);p.index.notifyPresentation();
  /** Keep every modal opened by this scenario under its exact cleanup lifetime. */
  const closeModals=async()=>{for(let i=0;i<8&&doc.querySelector('.modal');i++){for(const type of ['keyDown','keyUp'])native.webContents.sendInputEvent({type,keyCode:'Escape'});await wait(90);}if(app.setting.isOpen)app.setting.close();check(!doc.querySelector('.modal'),'Owned modal did not close');};
  restores.push(closeModals);
  const screenshot=async name=>{
    // Use ordinary shared zoom actions to make the demonstrated content readable without cutting it.
    check(!doc.querySelector('.modal'),'Canvas capture blocked by an owned modal');
    const graph=root(host).querySelector('.kplex-plex'),surface=[...p.actionSurfaceHosts].find(([,entry])=>entry.leaf===host)?.[0];
    const measured=()=>{
      const regions=[...graph.querySelectorAll('.kplex-view-region')].map(el=>el.getBoundingClientRect()),nodes=[...graph.querySelectorAll('.kplex-thought')].map(el=>{const r=el.getBoundingClientRect(),scroll=el.closest('.kplex-zone-scroll');if(!scroll)return r;const c=scroll.getBoundingClientRect(),left=Math.max(r.left,c.left),right=Math.min(r.right,c.right),top=Math.max(r.top,c.top),bottom=Math.min(r.bottom,c.bottom);return {left,right,top,bottom,width:right-left,height:bottom-top}});
      return [...regions,...nodes].filter(b=>b.width>0&&b.height>0);
    };
    const bounds=()=>{const all=measured();return {left:Math.min(...all.map(b=>b.left)),right:Math.max(...all.map(b=>b.right)),top:Math.min(...all.map(b=>b.top)),bottom:Math.max(...all.map(b=>b.bottom))}};
    for(let attempt=0;attempt<6;attempt++){
      const b=bounds(),canvas=graph.getBoundingClientRect(),centerX=(b.left+b.right)/2,centerY=(b.top+b.bottom)/2,x=Math.round(canvas.x+canvas.width/2),y=Math.round(canvas.y+canvas.height/2),dx=Math.round((x-centerX)*.4),dy=Math.round((y-centerY)*.4);if(Math.abs(dx)+Math.abs(dy)<5)break;
      native.webContents.sendInputEvent({type:'mouseMove',x,y});await wait(20);native.webContents.sendInputEvent({type:'mouseDown',x,y,button:'middle',clickCount:1});await wait(20);native.webContents.sendInputEvent({type:'mouseMove',x:x+dx,y:y+dy,button:'middle'});await wait(40);native.webContents.sendInputEvent({type:'mouseUp',x:x+dx,y:y+dy,button:'middle',clickCount:1});await wait(70);
    }
    for(let step=0;step<10;step++){
      const r=graph.getBoundingClientRect(),items=measured();if(!items.length)break;
      const b={left:Math.min(...items.map(b=>b.left)),right:Math.max(...items.map(b=>b.right)),top:Math.min(...items.map(b=>b.top)),bottom:Math.max(...items.map(b=>b.bottom))},x=r.x+r.width/2,y=r.y+r.height/2;
      if(x+(b.left-x)*1.15<r.left+36||x+(b.right-x)*1.15>r.right-36||y+(b.top-y)*1.15<r.top+36||y+(b.bottom-y)*1.15>r.bottom-36)break;
      await p.actionManager.dispatch({id:'view.zoom-in',source:'internal',surfaceId:surface});await wait(40);
    }
    await wait(180);const framed=bounds(),r=graph.getBoundingClientRect();c.progress={...c.progress,helpFraming:{name,bounds:framed,canvas:{left:r.left,right:r.right,top:r.top,bottom:r.bottom}}};check(framed.left>=r.left&&framed.right<=r.right&&framed.top>=r.top&&framed.bottom<=r.bottom,'Help content clipped during screenshot: '+name);require('node:fs').writeFileSync(c.screenshotPrefix+'-help-'+name+'.png',(await native.webContents.capturePage({x:Math.ceil(r.x),y:Math.ceil(r.y),width:Math.floor(r.width),height:Math.floor(r.height)})).toPNG());
  };
  const captureModal=async name=>{await wait(140);const r=[...doc.querySelectorAll('.modal')].at(-1).getBoundingClientRect();require('node:fs').writeFileSync(c.screenshotPrefix+'-help-'+name+'.png',(await native.webContents.capturePage({x:Math.ceil(r.x),y:Math.ceil(r.y),width:Math.floor(r.width),height:Math.floor(r.height)})).toPNG());};
  const card=note=>[...root(host).querySelectorAll('.kplex-thought')].find(el=>el.dataset.kplexPath===owned(note));
  for(const demo of payload.demos){
    const target=refs.get(demo.center);check(target,'Help center missing');p.notifyNavigation(target.path,host);await until(()=>center(host)===target.path,'Help attention absent');
    await choose(host,'wuxing');const select=panel(host).querySelector('[data-kplex-view-choice="preset"] select');check(select,'Shared preset selector absent');
    check(JSON.stringify([...select.options].map(option=>option.value))===JSON.stringify(payload.selectable),'Unused presets remain in Help selector');
    select.value=demo.preset;select.dispatchEvent(new doc.defaultView.Event('change',{bubbles:true}));await until(()=>session.state?.preset===demo.preset&&!root(host).querySelector('.kplex-view-error'),'Help preset did not render');panel(host).querySelector('.kplex-filter-panel-header button').click();
    await until(()=>Object.entries(demo.membership).every(([source,expected])=>{const note=byPath.get(source),el=note&&card(note);if(!el)return false;if(source===demo.center)return expected.status!=='assigned'||Boolean(el.querySelector('.kplex-node-badge'));const area=[...el.closest('.kplex-zone-panel')?.classList??[]].find(name=>name.startsWith('kplex-zone-')&&name!=='kplex-zone-panel');const definition=payload.canvasViewSettings.wuxing.values.presets[demo.preset];return area?.slice('kplex-zone-'.length)===JSON.stringify(expected.status==='assigned'?['facets',demo.preset,'category',expected.category]:definition.diagnostics.combined?['facets',demo.preset,'diagnostics']:['facets',demo.preset,'status',expected.status]);}),'Actual native classification differs from production classifier for '+demo.preset,30000);
    const statuses=[...root(host).querySelectorAll('.kplex-node-status')];
    check(statuses.length>0&&statuses.every(el=>el.getBoundingClientRect().top>=el.closest('.kplex-thought').getBoundingClientRect().bottom-1&&getComputedStyle(el).fontSize==='10px'&&getComputedStyle(el).left==='0px'&&!el.closest('.kplex-node-badge')),'Diagnostics did not use shared card-edge node statuses');
    const surface=[...p.actionSurfaceHosts].find(([,entry])=>entry.leaf===host)?.[0];await p.actionManager.dispatch({id:'view.fit',source:'internal',surfaceId:surface});await screenshot(demo.preset);
    cases.push({id:'native-help-facets-classification-and-canvas',preset:demo.preset,source:demo.source,layout:demo.layout,classified:Object.keys(demo.membership).length});
    if(demo.preset==='help-workshop'){
      const scroll=[...root(host).querySelectorAll('.kplex-zone-scroll')].find(el=>el.scrollHeight>el.clientHeight+5);check(scroll,'Public diagnostic overflow fixture absent');
      /** Snapshot direct route identities; optional cross-link discovery has its own lifetime. */
      const routeIds=()=>[...root(host).querySelectorAll('.kplex-edge:not(.is-cross-link) .kplex-edge-hit')].map(el=>el.dataset.kplexEdgeId).sort();
      /** Read only this current canonical neighborhood, never scan or acquire source work. */
      const canonical=()=>JSON.stringify(['parent','child','left','right','previous','next'].map(role=>p.index.neighbours(p.index.get(target.path),role).map(row=>[row.page.path,row.role,row.relationType,row.typeDefinition,row.linkDirection])));
      const topRoutes=routeIds(),beforeCanonical=canonical(),beforeScroll=scroll.scrollTop;
      scroll.scrollTop=scroll.scrollHeight-scroll.clientHeight;scroll.dispatchEvent(new doc.defaultView.Event('scroll',{bubbles:true}));await wait(200);
      const marks=[...root(host).querySelectorAll('[data-kplex-edge-continuation]')];check(marks.length>0,'Hidden counterparts lost their boundary continuations');
      check(JSON.stringify(routeIds())===JSON.stringify(topRoutes)&&canonical()===beforeCanonical,'Native scrolling changed canonical direct routes');
      check(marks.every(mark=>mark.getAttribute('pointer-events')==='none'&&!mark.closest('.kplex-edge').querySelector('.kplex-edge-visible').getAttribute(mark.dataset.kplexEdgeContinuation==='source'?'marker-start':'marker-end')),'Continuation gained hidden-note arrow or edit target');
      scroll.scrollTop=beforeScroll;scroll.dispatchEvent(new doc.defaultView.Event('scroll',{bubbles:true}));await wait(150);
      check(JSON.stringify(routeIds())===JSON.stringify(topRoutes),'Returning native scroll lost a direct route');
      cases.push({id:'native-help-scroll-continuations-keep-visible-counterpart-routes',routes:topRoutes.length,continuations:marks.length});
      root(host).querySelector('.kplex-filter-trigger').click();await until(()=>panel(host),'Preset Help panel absent');panel(host).querySelector('[data-kplex-view-choice="preset"]').querySelectorAll('button')[1].click();
      await until(()=>doc.querySelector('.kplex-markdown-help-modal h1'),'Real preset Help absent');await captureModal('preset-help');
      await closeModals();if(panel(host))panel(host).querySelector('.kplex-filter-panel-header button').click();cases.push({id:'native-help-preset-markdown-captured'});
    }
  }

  const tooMany=[];
  for(const [source,file]of refs){const page=p.index.get(file.path),children=p.index.neighbours(page,'child');if(children.length>12)tooMany.push({source,children:children.map(row=>row.page.path.startsWith(file.parent.path+'/')?row.page.path.slice(file.parent.path.length+1):row.page.path)});}
  c.progress={...c.progress,helpCanonicalChildren:{checked:refs.size,tooMany}};check(!tooMany.length,'Native Help child count exceeds12: '+JSON.stringify(tooMany));
  cases.push({id:'native-help-canonical-child-budget',checked:refs.size,maximum:12});
  check(p.settingsTab.openCanvasViewManager('wuxing','help-workshop'),'Registered preset manager refused editor');await until(()=>doc.querySelector('.kplex-facet-preset-editor'),'Registered native preset editor absent');await captureModal('preset-editor');
  const sizeModal=doc.querySelector('.kplex-facet-preset-editor'),firstCategory=sizeModal.querySelector('h3')?.parentElement;
  const widthRow=[...firstCategory.querySelectorAll('.setting-item')].find(row=>row.querySelector('.setting-item-name')?.textContent===p.translator('wuxing.width'));
  const widthInput=widthRow?.querySelector('input[type=range]'),widthOutput=widthRow?.querySelector('output'),widthReset=widthRow?.querySelector('.extra-setting-button');
  check(widthInput&&widthOutput&&widthReset&&!sizeModal.querySelector('input[type=number]'),'Native optional sizes must use common sliders and readouts');
  const oldWidth=Number(widthInput.value),oldOutput=widthOutput.textContent,savedPreset=JSON.stringify(p.settings.canvasViewSettings);
  widthInput.scrollIntoView({block:'center'});widthInput.focus();
  for(const type of ['keyDown','keyUp'])native.webContents.sendInputEvent({type,keyCode:'Right'});
  await until(()=>Number(widthInput.value)>oldWidth,'Trusted native size slider key did not advance');
  check(widthInput.getAttribute('aria-valuetext')===widthOutput.textContent&&widthOutput.textContent!==oldOutput,'Native size readout did not follow the slider');
  const inheritedWidth=payload.canvasViewSettings.wuxing.values.presets['help-workshop'].regionWidth;
  widthReset.click();await until(()=>Number(widthInput.value)===inheritedWidth&&widthOutput.textContent.includes(p.translator('colors.inherit')),'Native reset did not restore inherited size');
  widthInput.blur();await wait(160);
  await captureModal('numeric-area-sliders');await closeModals();check(JSON.stringify(p.settings.canvasViewSettings)===savedPreset,'Cancelled numeric preset draft saved settings');
  cases.push({id:'native-help-preset-area-sliders-value-keyboard-inherit-reset-cancel',range:[Number(widthInput.min),Number(widthInput.max)],opening:oldOutput,inheritedWidth});
  cases.push({id:'native-help-preset-editor-captured-through-registered-settings-owner-without-save'});
  // Capture actual native sharing/review surfaces without copying, downloading or importing.
  check(p.settingsTab.openCanvasViewManager('wuxing','help-workbench'),'Registered rule preset editor refused');
  await until(()=>doc.querySelector('.kplex-facet-preset-editor'),'Native rule preset editor absent');
  await until(()=>doc.querySelector('.kplex-facet-preset-editor .kplex-predicate-rule-editor button'),'Native rule editor has not mounted');
  const ruleModal=doc.querySelector('.kplex-facet-preset-editor'),codeButton=[...ruleModal.querySelectorAll('.kplex-predicate-rule-editor button')].find(button=>button.textContent.trim()===p.translator('filter.code'));
  check(codeButton,'Shared rule Code mode absent');codeButton.click();
  await until(()=>ruleModal.querySelector('.kplex-predicate-expression-field textarea'),'Shared native expression field absent');
  const expression=ruleModal.querySelector('.kplex-predicate-expression-field textarea'),field=expression.closest('.kplex-predicate-expression-field'),box=expression.getBoundingClientRect(),label=field.querySelector('label > span').getBoundingClientRect();
  check(Math.abs(box.width-field.getBoundingClientRect().width)<2&&box.top>=label.bottom&&box.height>=60&&getComputedStyle(expression).fontFamily.includes('mono'),'Native category Code editor is not full-width below its label');
  expression.scrollIntoView({block:'center'});await captureModal('rule-code-editor');await closeModals();
  cases.push({id:'native-help-category-code-shares-full-width-monospace-expression-field-without-save',width:box.width,height:box.height});
  check(p.settingsTab.openCanvasViewManager('wuxing'),'Native preset manager refused');await until(()=>doc.querySelector('.kplex-style-manager-modal'),'Preset manager absent');
  const manager=doc.querySelector('.kplex-style-manager-modal'),exportButton=[...manager.querySelectorAll('button')].find(button=>button.textContent===p.translator('sharing.exportPreset'));check(exportButton,'Native export action absent');exportButton.click();
  await until(()=>doc.querySelector('.kplex-portable-package-modal textarea')?.value,'Native export JSON absent');const exported=doc.querySelector('.kplex-portable-package-modal textarea').value;check(JSON.parse(exported),'Export is not JSON');await captureModal('sharing-export');
  const cancelExport=[...doc.querySelector('.kplex-portable-package-modal').querySelectorAll('button')].find(button=>button.textContent===p.translator('common.cancel'));check(cancelExport,'Native export Cancel absent');cancelExport.click();await wait(80);[...manager.querySelectorAll('button')].find(button=>button.textContent===p.translator('sharing.importPreset')).click();
  await until(()=>doc.querySelector('.kplex-portable-package-modal textarea'),'Native import source absent');const incoming=doc.querySelector('.kplex-portable-package-modal textarea');incoming.value=exported;incoming.dispatchEvent(new doc.defaultView.Event('input',{bubbles:true}));
  const accessible=button=>button.getAttribute('aria-label')??(button.getAttribute('aria-labelledby')??'').split(/\s+/).map(id=>doc.getElementById(id)?.textContent??'').join(' ')??button.textContent;
  const preview=[...doc.querySelector('.kplex-portable-package-modal').querySelectorAll('button')].find(button=>accessible(button)===p.translator('sharing.preview'));check(preview,'Native Preview import action absent');preview.click();
  await until(()=>doc.querySelector('.kplex-package-preview')?.textContent.trim(),'Native import review absent');await captureModal('sharing-preview');await closeModals();cases.push({id:'native-help-sharing-export-preview-captured-without-import-download-or-clipboard'});
  const mind=refs.get('09 Showcase examples/Example - Workshop plan');if(mind){p.notifyNavigation(mind.path,host);await until(()=>center(host)===mind.path,'Workshop plan absent');await choose(host,'mindmap');panel(host).querySelector('.kplex-filter-panel-header button').click();await wait(180);const surface=[...p.actionSurfaceHosts].find(([,entry])=>entry.leaf===host)?.[0];await p.actionManager.dispatch({id:'view.fit',source:'internal',surfaceId:surface});const material=byPath.get('09 Showcase examples/Example - Workshop materials'),disclosure=material&&card(material)?.querySelector('.is-branch-disclosure');if(disclosure?.getAttribute('aria-expanded')==='false'){disclosure.click();await wait(200);await p.actionManager.dispatch({id:'view.fit',source:'internal',surfaceId:surface});}await screenshot('mindmap-workshop');cases.push({id:'native-help-mindmap-canvas-captured'});await choose(host,'classic');panel(host).querySelector('.kplex-filter-panel-header button').click();await p.actionManager.dispatch({id:'view.fit',source:'internal',surfaceId:surface});await screenshot('compass-workshop');await p.actionManager.dispatch({id:'keyboard.help',source:'internal',surfaceId:surface});await until(()=>doc.querySelector('.modal'),'Native keyboard Help absent');await captureModal('keyboard-help');await closeModals();cases.push({id:'native-help-compass-and-current-keyboard-help-captured'});}
  // Native Settings has its own document/activation. Run it after canvas-owned dialogs,
  // so no later modal borrows its retired source scope after Settings closes.
  app.setting.open();app.setting.openTabById('k-plex');p.settingsTab.update();await wait(160);
  check(p.settingsTab.openSettingsPage(p.translator('settings.ui.plex.behavior')),'Native Canvas behavior settings page absent');await wait(120);
  check(p.settingsTab.openSettingsPage(p.translator('view.mindmap')),'Native Mind Map settings page absent');await wait(120);
  const settingsDoc=p.settingsTab.containerEl.ownerDocument;
  c.progress={...c.progress,numericSettingsMount:{sameDocument:settingsDoc===doc,tabConnected:p.settingsTab.containerEl.isConnected,readouts:settingsDoc.querySelectorAll('.kplex-number-value').length,inputs:[...settingsDoc.querySelectorAll('.setting-item input[type=range]')].map(input=>({name:input.getAttribute('aria-label'),row:input.closest('.setting-item')?.querySelector('.setting-item-name')?.textContent,key:input.closest('.setting-item')?.dataset.kplexSettingKey,output:input.closest('.setting-item')?.querySelector('output')?.textContent}))}};
  await until(()=>[...settingsDoc.querySelectorAll('[data-kplex-setting-key]')].filter(el=>el.dataset.kplexSettingKey.includes('canvasView:mindmap:')).length===8,'Native current Settings rows did not mount');
  const nativeSliders=[...settingsDoc.querySelectorAll('[data-kplex-setting-key]')].filter(el=>el.dataset.kplexSettingKey.includes('canvasView:mindmap:')&&el.getClientRects().length>0);
  c.progress={...c.progress,numericControls:{count:nativeSliders.length,values:nativeSliders.map(el=>({key:el.dataset.kplexSettingKey,output:el.querySelector('output')?.textContent,aria:el.querySelector('input')?.getAttribute('aria-valuetext')})),widthHtml:widthRow.innerHTML}};
  check(nativeSliders.length===8&&nativeSliders.every(el=>{const input=el.querySelector('input[type=range]'),output=el.querySelector('output');return input&&output?.textContent&&input.getAttribute('aria-valuetext')===output.textContent}),'Every native Mind Map numeric setting needs its shared permanent readout');
  // Settings may render in its own document; captureModal belongs only to the canvas window.
  if(settingsDoc===doc)await captureModal('numeric-mindmap-settings');
  await closeModals();cases.push({id:'native-help-mindmap-settings-common-sliders-permanent-values',controls:nativeSliders.length,owningSettingsDocument:settingsDoc!==doc});

}
