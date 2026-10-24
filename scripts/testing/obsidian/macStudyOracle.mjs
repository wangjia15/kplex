/**
 * Bounded post-timing native navigation oracle for PR203. Uses existing navigation, query and
 * evidence owners, preserves declaration multiplicity, and removes only generated evidence IDs.
 * Raw target identities stay in private reports. API/DOM availability is not physical input/paint.
 */
export async function runMacStudyOracle(app,options={}) {
  const p=app.plugins.plugins['k-plex'],index=p?.index,hash=require('crypto').createHash;
  if(!p||!index)throw Error('Oracle needs the measured loaded plugin');
  const leaf=app.workspace.getLeavesOfType('k-plex-react-view')[0];
  if(!leaf)throw Error('Oracle Plex missing');
  const initial=p.settings.lastActivePath,targets=options.targets??[];
  if(!targets.length) {
    const pages=Array.from(index.state.pages.values());
    targets.push({kind:'saved-center',path:initial});
    const markdown=app.vault.getMarkdownFiles().find(/** Choose one ordinary existing note without reading its body. */ file=>file.path!==initial&&file.stat.size<50000);
    if(markdown)targets.push({kind:'markdown',path:markdown.path});
    // CLI evaluations do not receive a plugin's custom require('obsidian') resolver. Obtain the
    // actual native folder constructor from the existing root, without loading another module.
    const TFolder=app.vault.getRoot().constructor;
    const nativeFolder=app.vault.getAllLoadedFiles().find(/** Select a small real native folder; availability vocabulary has no hydrated adjacency yet. */ file=>file instanceof TFolder&&file.path&&file.children.length>0&&file.children.length<=3);
    if(nativeFolder)targets.push({kind:'folder',path:index.hostFolderSearchPage(nativeFolder).path});
    const tag=pages.find(/** Existing metadata-owner maps bound a leaf tag to at most three direct witnesses. */ page=>page.isTag&&(index.hostPreview.tagMembers.get(page.path)?.size??0)>0&&(index.hostPreview.tagMembers.get(page.path)?.size??0)<=3&&!(index.hostPreview.tagChildren.get(page.path)?.size??0));
    if(tag)targets.push({kind:'tag',path:tag.path});
    const url=Array.from(index.publishedUrlState.pages.values()).find(/** The completed independent URL owner supplies real bounded adjacency, not opaque-ID heuristics. */ page=>page.url&&page.neighbours.size>0&&page.neighbours.size<=8);
    if(url)targets.push({kind:'url',path:url.path});
    const virtual=pages.find(/** Bound unresolved witnesses through the existing reverse-metadata owner. */ page=>!page.file&&!page.url&&!page.isTag&&!page.isFolder&&(index.hostPreview.unresolvedIncoming.get(page.path)?.size??0)>0&&(index.hostPreview.unresolvedIncoming.get(page.path)?.size??0)<=3);
    if(virtual)targets.push({kind:'virtual',path:virtual.path});
    const attachment=app.vault.getFiles().find(/** Bound native image/document preview size. */ file=>['png','jpg','pdf'].includes(file.extension)&&file.stat.size<500000);
    if(attachment)targets.push({kind:'attachment',path:attachment.path});
  }
  const rows=[],deadline=performance.now()+120000;
  const requiredKinds=options.requiredKinds??['saved-center','markdown','folder','tag','url','virtual','attachment'];
  options.onProgress?.({targets,rows,requiredKinds});
  const missing=requiredKinds.filter(/** Missing workload coverage is explicit, never a passing optional skip. */ kind=>!targets.some(/** Match an existing selected kind. */ target=>target.kind===kind));
  if(missing.length)throw Error('Oracle target kinds unavailable: '+missing.join(','));
  /** Retire observation after cancellation or its fixed total budget, before another navigation. */
  function guard() {
    if(options.isCancelled?.()||performance.now()>=deadline)throw Error('Oracle cancelled or observation limit reached');
  }
  /** Use host timers only to observe existing navigation; never hold an indexing scheduler lane. */
  const wait=/** Yield the oracle without changing native indexing deadlines. */ ms=>new Promise(/** Resolve the observing timer. */ done=>window.setTimeout(done,ms));
  /** Stable scalar/object order makes the semantic hash independent of object insertion order. */
  function canonical(value) {
    if(Array.isArray(value))return value.map(canonical);
    if(value&&typeof value==='object')return Object.fromEntries(Object.keys(value).sort().map(/** Canonicalize one retained finite value. */ key=>[key,canonical(value[key])]));
    return value;
  }
  // This separate functional lane explicitly disables native document follow to avoid opening
  // external URLs. Both arms use this same profile, and the driver's original layout/data own restore.
  await p.setDocumentSyncMode(leaf,'off');
  for(const target of targets) {
    guard();
    const at=performance.now(),before=index.getSourceAcquisitionCounters();
    if(!index.get(target.path))throw Error('Oracle target unavailable: '+target.kind);
    p.notifyNavigation(target.path,leaf);
    let rendered=false,canonicalReady=false;
    for(let attempt=0;attempt<300;attempt++) {
      guard();
      rendered=Array.from(leaf.view.containerEl.querySelectorAll('.kplex-role-center[data-kplex-path]')).some(/** Compare exact path identities internally; never interpolate a selector. */ el=>el.getAttribute('data-kplex-path')===target.path);
      const page=index.get(target.path);canonicalReady=!page?.file||page.file.extension!=='md'||index.isSemanticWriteReady(page.path,page.path);
      if(rendered&&canonicalReady&&!index.hasActiveSemanticPreparation())break;
      await wait(100);
    }
    guard();
    if(!rendered||!canonicalReady||index.hasActiveSemanticPreparation()) {
      rows.push({kind:target.kind,status:'timeout',rendered,canonicalReady,semanticActive:index.hasActiveSemanticPreparation(),elapsedMs:performance.now()-at,semantic:index.getSemanticPreparationDiagnostics()});
      options.onProgress?.({targets,rows,requiredKinds});
      throw Error('Oracle navigation did not settle: '+target.kind);
    }
    const page=index.get(target.path),publication=index.publicationRevision,relations=[],decisions=[];
    if(page.file&&page.file!==app.vault.getFileByPath(page.file.path)&&!page.isFolder)throw Error('Oracle native identity mismatch');
    for(const role of ['parent','child','left','right','previous','next'])for(const relation of index.neighbours(page,role)) {
      if(relations.length>=1000)throw Error('Oracle relation budget exceeded');
      relations.push([role,relation.page.path,relation.relationType,relation.typeDefinition??null,relation.linkDirection]);
      const explanation=index.explainRelationship(page.path,relation.page.path);
      if(explanation) {
        const evidence=explanation.decisions.map(/** Remove generated IDs only; preserve provenance values and duplicate declarations. */ value=>{
          const source={...value.evidence};delete source.id;return canonical({...value,evidence:source});
        }).map(/** Encode one complete provenance decision, retaining duplicates. */ value=>JSON.stringify(value)).sort();
        decisions.push([relation.page.path,explanation.hidden,explanation.summary,explanation.resolvedRoles,evidence]);
      }
    }
    relations.sort(/** Compare complete tuple strings without changing tuple multiplicity. */ (a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)));
    decisions.sort(/** Compare complete pair projections deterministically. */ (a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)));
    const gates=canonical(index.gateStats(page));
    const search=index.search(index.titleFor(page),40,'vault'),found=search.some(/** Verify exact target availability after its normal navigation. */ value=>value.path===target.path);
    // Vault Find intentionally excludes virtual/unresolved vocabulary. Normal Plex navigation
    // still covers that target; expected search exclusion must not be reported as a product fault.
    const searchExpected=Boolean(page.url||page.isTag||page.isFolder||page.file);
    if(publication!==index.publicationRevision)throw Error('Oracle publication changed during synchronous capture');
    const after=index.getSourceAcquisitionCounters();
    rows.push({kind:target.kind,rendered,elapsedMs:performance.now()-at,relations:relations.length,decisionPairs:decisions.length,gates,searchFound:found,searchExpected,
      sha256:hash('sha256').update(JSON.stringify({relations,decisions,gates})).digest('hex'),
      sourceReads:after.vaultReads-before.vaultReads,sourceParses:after.parses-before.parses});
    options.onProgress?.({targets,rows,requiredKinds});
  }
  guard();
  p.notifyNavigation(initial,leaf);
  return {targets,rows,requiredKinds,passed:rows.every(/** Require actual navigation and the established vault-Find eligibility. */ row=>row.rendered&&row.searchFound===row.searchExpected),profile:'Bounded existing-target v2; separate post-timing functional lane; native document follow off. Normal source work is allowed. DOM/API latency is not actual paint or physical input.'};
}
