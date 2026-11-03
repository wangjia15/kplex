/** Exact-build native Facets Help acceptance inside the existing disposable Small controller.
 * Uses real Info/preset controls, MarkdownRenderer, queued Save/Cancel and native Escape.
 * The caller owns fixture notes, artifact staging, outer backup and unconditional restoration. */
export async function acceptFacets222Help(x){
 const {app,p,c,host,restores,cases,root,check,wait,until,panel,quiet,remote}=x,doc=root(host).ownerDocument;
 const settingsDocument=()=>p.settingsTab?.containerEl?.ownerDocument??doc;
 const accessible=button=>button.getAttribute('aria-label')??button.ownerDocument.getElementById(button.getAttribute('aria-labelledby'))?.textContent??button.textContent;
 const button=(element,label)=>[...element.querySelectorAll('button')].find(row=>accessible(row)===label||row.textContent===label);
 const help=()=>doc.querySelector('.kplex-markdown-help-modal'),editor=()=>settingsDocument().querySelector('.kplex-facet-help-settings')?.closest('.modal');
 const fields=(element,label)=>[...element.querySelectorAll('.setting-item')].find(row=>row.querySelector('.setting-item-name')?.textContent===label)?.querySelector('input,textarea,select');
 const closeOwned=async()=>{
  for(const owner of new Set([settingsDocument(),doc])) for(let i=0;i<6&&owner.querySelector('.modal');i++){
   const modal=[...owner.querySelectorAll('.modal')].at(-1);modal.querySelector('.modal-close-button')?.click();await wait(60);
  }
  if(app.setting.isOpen)app.setting.close();
 };
 check(!doc.querySelector('.modal'),'A user-owned modal must not be touched');restores.push(closeOwned);
 const original=JSON.stringify(p.settings.canvasViewSettings),state=JSON.stringify(host.view.documentSession.plexView.getState()),attention=host.view.documentSession.centerPath,camera=root(host).querySelector('.kplex-camera').style.transform;
 const stop=quiet();root(host).querySelector('.kplex-filter-trigger').click();await until(()=>panel(host),'Views and lenses absent');
 const row=panel(host).querySelector('[data-kplex-view-choice="preset"]'),buttons=[...row.querySelectorAll('button')];
 check(buttons.length===2&&accessible(buttons[1])===p.translator('view.helpFor',{name:p.translator('facets.presetWuXing')}),'Info must follow the existing cog');
 buttons[1].click();await until(()=>help()?.querySelector('.kplex-markdown-help-content h1'),'Real native Markdown help did not render');
 c.progress={...c.progress,helpMarkup:{lists:help().querySelectorAll('ul li').length,pre:help().querySelectorAll('pre').length,code:help().querySelectorAll('code').length}};
 // The default Wu Xing help uses paragraphs for its five relative roles. The authored preview
 // below deliberately supplies a list and keeps the strict native list/strong/code/link checks.
 check(help().querySelector('pre code')?.textContent.includes('phase: wood'),'Native renderer did not preserve the default fenced YAML');
 check(!help().querySelector('iframe,img,object,embed'),'Help introduced automatic resources');
 cases.push({id:'native-info-cog-order-real-markdown-headings-code'});
 const edit=button(help(),p.translator('view.editHelp'));check(edit,'Captured Edit help absent');edit.click();
 await until(()=>!help()&&editor()?.querySelector('textarea'),'Edit help did not open the existing native preset editor');
 const source=fields(editor(),p.translator('facets.help'));check(source?.value.startsWith('# Wu Xing'),'Captured editor Help source is not Wu Xing');
 check(JSON.stringify(p.settings.canvasViewSettings)===original,'Opening Info/Edit materialized defaults');
 const details=editor().querySelector('.kplex-facet-help-settings');details.open=true;
 const markdown='# Native Facets help\n\n- **Purpose**: controlled native acceptance.\n\n```yaml\nphase: wood\n```\n\n[Guide](https://github.com/zsviczian/kplex)\n\n```dataviewjs\nwindow.kplexIndexingProbe.nativeHelpExecuted = true\n```';
 source.value=markdown;source.dispatchEvent(new source.ownerDocument.defaultView.Event('input',{bubbles:true}));button(editor(),p.translator('facets.previewHelp')).click();
 await until(()=>editor()?.querySelector('.kplex-preset-help-preview h1')?.textContent==='Native Facets help','Unsaved native Markdown preview absent');
 const preview=editor().querySelector('.kplex-preset-help-preview');
 check(preview.querySelector('ul li strong')&&preview.querySelector('pre code')&&preview.querySelector('a[href="https://github.com/zsviczian/kplex"]'),'Real native preview lost Markdown structure or safe links');
 check(c.nativeHelpExecuted!==true&&!preview.querySelector('.block-language-dataviewjs'),'Executable fenced language was not neutralized');
 check(JSON.stringify(p.settings.canvasViewSettings)===original,'Preview wrote settings');
 check(host.view.documentSession.centerPath===attention&&root(host).querySelector('.kplex-camera').style.transform===camera&&JSON.stringify(host.view.documentSession.plexView.getState())===state,'Help retargeted attention/camera/session');
 cases.push({id:'native-unsaved-preview-safe-links-plain-fences-no-activation'});
 button(editor(),p.translator('common.cancel')).click();await until(()=>!editor(),'Native Cancel did not retire preview');
 await closeOwned();await wait(100);check(JSON.stringify(p.settings.canvasViewSettings)===original,'Canceled Help changed accepted settings');
 stop('native-info-edit-preview-cancel-zero-source-work');
 const savedStop=quiet();check(p.openCanvasViewSettings('wuxing','wuxing'),'Native preset deep link failed');await until(()=>editor()?.querySelector('textarea'),'Native editor not reopened');
 const next=fields(editor(),p.translator('facets.help'));next.value=markdown;next.dispatchEvent(new next.ownerDocument.defaultView.Event('input',{bubbles:true}));
 const save=button(editor(),p.translator('common.save'));check(save&&!save.disabled,'Safe Help Save unavailable');save.click();
 await until(()=>!editor()&&p.settings.canvasViewSettings.wuxing?.values.presets?.wuxing?.helpMarkdown===markdown,'Native Help Save did not persist');await p.settingsWriteQueue;await closeOwned();
 check(p.settings.canvasViewSettings.wuxing.values.presets.wuxing.helpSourceLocale==='en','Help source locale not retained');
 cases.push({id:'native-help-save-existing-queued-preset-writer'});
 if(!panel(host))root(host).querySelector('.kplex-filter-trigger').click();await until(()=>panel(host)?.isConnected,'Views panel not reopened');
 const info=button(panel(host),p.translator('view.helpFor',{name:p.translator('facets.presetWuXing')}));check(info,'Updated Info absent');info.click();
 await until(()=>help()?.querySelector('h1')?.textContent==='Native Facets help','Info did not read the saved literal Help');
 const native=remote.getCurrentWindow();native.webContents.focus();for(const type of ['keyDown','keyUp'])native.webContents.sendInputEvent({type,keyCode:'Escape'});
 await until(()=>!help(),'Native Escape did not close Help');
 panel(host)?.querySelector('.kplex-filter-panel-header button')?.click();savedStop('native-help-save-reopen-escape-zero-source-work');
 cases.push({id:'native-help-saved-source-and-escape-cleanup'});
}
