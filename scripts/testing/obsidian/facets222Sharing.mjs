/** Exact-build native transfer acceptance inside the existing Small resource owner. Actual controls, safe Help, atomic saves and zero-source-work; no OS clipboard/download claims. */
export async function acceptFacets222Sharing(x){
 const {app,p,c,host,restores,cases,root,center,check,wait,until,panel,quiet,reveal}=x,doc=root(host).ownerDocument;
 const settingsDocument=()=>p.settingsTab?.containerEl?.ownerDocument??doc;
 const accessible=button=>button.getAttribute('aria-label')??button.ownerDocument.getElementById(button.getAttribute('aria-labelledby'))?.textContent??button.textContent;
 const button=(element,label)=>[...element.querySelectorAll('button')].find(row=>accessible(row)===label||row.textContent===label);
 const modal=owner=>[...owner.querySelectorAll('.kplex-portable-package-modal')].at(-1);
 const event=(element,name)=>new element.ownerDocument.defaultView.Event(name,{bubbles:true});
 const fill=(element,value)=>{element.value=value;element.dispatchEvent(event(element,'input'))};
 const close=async element=>{
  const cancel=button(element,p.translator('common.cancel'));c.progress={...c.progress,closeAttempt:{cancel:!!cancel,nativeClose:!!element.querySelector('.modal-close-button')}};
  if(cancel)cancel.click();else{const contents=element.ownerDocument.defaultView.require('@electron/remote').getCurrentWindow().webContents;for(const type of ['keyDown','keyUp'])contents.sendInputEvent({type,keyCode:'Escape'});}
  await until(()=>!element.isConnected,'Owned native dialog did not close');
 };
 check(!doc.querySelector('.modal')&&!app.setting.isOpen,'A user-owned modal/settings must not be touched');
 const ownedDialogs=owner=>[...owner.querySelectorAll('.kplex-portable-package-modal,.kplex-style-manager-modal')];
 restores.push(async()=>{for(const owner of new Set([settingsDocument(),doc]))for(let i=0;i<8&&ownedDialogs(owner).length;i++)await close(ownedDialogs(owner).at(-1));if(app.setting.isOpen)app.setting.close()});
 const attention=center(host),state=JSON.stringify(host.view.documentSession.plexView.getState()),camera=root(host).querySelector('.kplex-camera').style.transform;
 const stop=quiet();await reveal(host);if(!panel(host))root(host).querySelector('.kplex-filter-trigger').click();await until(()=>panel(host),'Views/lenses absent');
 panel(host).querySelector('[data-kplex-view-choice="preset"] button').click();
 await until(()=>settingsDocument().querySelector('.kplex-facet-help-settings'),'Preset cog did not open native editor');
 const settingsDoc=settingsDocument(),editor=settingsDoc.querySelector('.kplex-facet-help-settings').closest('.modal');button(editor,p.translator('common.cancel')).click();await until(()=>!editor.isConnected,'Preset Cancel failed');
 const manager=[...settingsDoc.querySelectorAll('.modal')].find(element=>element.querySelector('.kplex-style-manager-row'));check(manager,'Preset manager absent');
 const names=[...manager.querySelectorAll('.kplex-style-manager-name')].map(element=>element.textContent);check(names.length===8&&names[0]===p.translator('facets.presetArc'),'Eight curated native defaults absent');
 button(manager,p.translator('sharing.exportPreset')).click();await until(()=>modal(settingsDoc),'Native export absent');
 let transfer=modal(settingsDoc),source=transfer.querySelector('textarea'),exported=JSON.parse(source.value);
 check(exported.kind==='facets'&&exported.preset.helpMarkdown.startsWith('# ')&&exported.aiContext.includes('helpMarkdown')&&!exported.lenses,'Effective Help/inert AI/explicit-only dependencies export failed');
 check(!JSON.stringify(exported).includes('"enabled"')&&!exported.preset.nameKey,'Export leaked activation/translation state');
 await close(transfer);button(manager,p.translator('sharing.copyPrompt')).click();await until(()=>modal(settingsDoc),'Native prompt surface absent');
 check(modal(settingsDoc).querySelector('textarea').value.includes('https://github.com/zsviczian/kplex/blob/main/docs/FACETS_AUTHORING.md'),'Detailed native authoring context absent');await close(modal(settingsDoc));
 stop('native-export-prompt-cancel-zero-source-work');cases.push({id:'native-eight-presets-export-effective-help-inert-ai-explicit-dependencies'});
 const help='# Native shared preset\n\n- **Purpose**: deliberate explicit categories.\n\n```yaml\narc: relate\n```\n\n[Guide](https://github.com/zsviczian/kplex/blob/main/docs/FACETS.md)';
 const incoming={...exported,id:'native-shared-preset',preset:{...exported.preset,name:'Native shared preset',helpMarkdown:help,helpSourceLocale:'en'}};
 const importStop=quiet(),oldLenses=JSON.stringify(p.settings.graphLenses),oldHierarchy=JSON.stringify(p.settings.hierarchy);
 button(manager,p.translator('sharing.importPreset')).click();await until(()=>modal(settingsDoc),'Native import absent');transfer=modal(settingsDoc);source=transfer.querySelector('textarea');fill(source,JSON.stringify(incoming));button(transfer,p.translator('sharing.preview')).click();
 check(transfer.querySelector('pre')?.textContent.includes('native-shared-preset')&&!button(transfer,p.translator('sharing.apply')).disabled,'Exact preview/new target absent');
 button(transfer,p.translator('sharing.previewHelp')).click();await until(()=>transfer.querySelector('.kplex-markdown-help-content h1'),'Imported native Help did not render');
 check(transfer.querySelector('ul li strong')&&transfer.querySelector('pre code')&&transfer.querySelector('a[href^="https://"]'),'Native imported Markdown list/code/link absent');
 button(transfer,p.translator('sharing.apply')).click();await until(()=>!transfer.isConnected&&p.readPortableSharingState().presets['native-shared-preset'],'Atomic native preset import failed');
 check(p.readPortableSharingState().presets['native-shared-preset'].helpMarkdown===help,'Saved Help source changed');
 check(JSON.stringify(p.settings.graphLenses)===oldLenses&&JSON.stringify(p.settings.hierarchy)===oldHierarchy,'Preset import activated lenses or changed ontology');
 check(center(host)===attention&&JSON.stringify(host.view.documentSession.plexView.getState())===state&&root(host).querySelector('.kplex-camera').style.transform===camera,'Preset import changed attention/camera/session');
 importStop('native-preset-import-preview-help-save-zero-source-work');cases.push({id:'native-preset-json-help-preview-atomic-save-no-activation'});
 // Every native Settings document is derived from the actual controls. Close only owned dialogs.
 for(let i=0;i<6&&ownedDialogs(settingsDoc).length;i++)await close(ownedDialogs(settingsDoc).at(-1));if(app.setting.isOpen)app.setting.close();
 await reveal(host);if(!panel(host))root(host).querySelector('.kplex-filter-trigger').click();await until(()=>panel(host),'Owning filter absent');
 const lensStop=quiet(),before=JSON.stringify(p.settings.canvasViewSettings),enabledBefore=p.settings.graphLenses.filter(lens=>lens.enabled).map(lens=>lens.id);
 button(panel(host),p.translator('sharing.importLens')).click();await until(()=>modal(doc),'Native lens import absent');transfer=modal(doc);
 const lensPackage={format:'kplex-preset',version:1,kind:'lens',id:'native-shared-lens',lens:{id:'native-shared-lens',name:'Native shared lens',scope:'node',mode:'style',expression:'note.state == "draft"',style:{node:{borderColor:{kind:'theme',variable:'--color-orange'},strokeWidth:2}}},aiContext:'Inert native fixture documentation.'};
 fill(transfer.querySelector('textarea'),JSON.stringify(lensPackage));button(transfer,p.translator('sharing.preview')).click();check(!button(transfer,p.translator('sharing.apply')).disabled,'Native lens preview refused');button(transfer,p.translator('sharing.apply')).click();
 await until(()=>!transfer.isConnected&&p.settings.graphLenses.some(lens=>lens.id==='native-shared-lens'),'Native lens import failed');
 check(p.settings.graphLenses.find(lens=>lens.id==='native-shared-lens').enabled===false&&JSON.stringify(p.settings.graphLenses.filter(lens=>lens.enabled).map(lens=>lens.id))===JSON.stringify(enabledBefore),'Imported lens activated');
 check(JSON.stringify(p.settings.canvasViewSettings)===before&&center(host)===attention&&root(host).querySelector('.kplex-camera').style.transform===camera,'Lens import changed another owner');
 lensStop('native-disabled-lens-import-zero-source-work');cases.push({id:'native-existing-lens-manager-import-disabled-preserves-preset-camera-attention'});
 await wait(80);c.progress={...c.progress,sharing:{presets:8,helpSourcePreserved:true,importedLensEnabled:false,clipboard:'not exercised',download:'not exercised'}};
}
