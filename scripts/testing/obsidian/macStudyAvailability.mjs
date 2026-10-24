/**
 * Separate diagnostic normal-use workload during indexing. Replays only a private preselected
 * existing-target sequence through production navigation/search, with document follow off. It
 * records bounded DOM/API availability and provisional gates; these are not semantic completeness,
 * trusted physical input or actual-paint claims. The serial driver owns cancellation and restore.
 */
export async function runMacStudyAvailability(app,options) {
  const plugin=app.plugins.plugins['k-plex'],index=plugin?.index,leaf=app.workspace.getLeavesOfType('k-plex-react-view')[0];
  if(!index||!leaf||!Array.isArray(options.targets)||options.targets.length>8)throw Error('Existing bounded availability workload required');
  for(const kind of ['saved-center','markdown','folder','tag','url','virtual','attachment'])if(!options.targets.some(/** Require the declared seven-kind workload rather than passing an empty plan. */ target=>target.kind===kind))throw Error('Availability target kind missing: '+kind);
  const rows=[],started=performance.now(),initial=plugin.settings.lastActivePath;
  /** Observe through host timers without changing or holding a production scheduler. */
  const wait=/** Yield between DOM observations. */ ms=>new Promise(/** Resolve this observing timer. */ done=>window.setTimeout(done,ms));
  /** Stop before another action when the caller retires this owned workload. */
  function guard(){if(options.isCancelled()||performance.now()-started>60000)throw Error('Availability workload cancelled or expired');}
  await plugin.setDocumentSyncMode(leaf,'off');
  for(const target of options.targets) {
    guard();const at=performance.now(),before=index.getSourceAcquisitionCounters(),activity=index.sourceAcquisition.getActivityState(),status=plugin.getIndexStatus();
    const available=Boolean(index.get(target.path));let rendered=false,searchFound=false;
    if(available) {
      plugin.notifyNavigation(target.path,leaf);
      while(performance.now()-at<5000) {
        guard();rendered=[...leaf.view.containerEl.querySelectorAll('.kplex-role-center[data-kplex-path]')].some(/** Compare exact private identities without constructing a selector. */ el=>el.getAttribute('data-kplex-path')===target.path);
        if(rendered)break;await wait(100);
      }
      const page=index.get(target.path);if(page)searchFound=index.search(index.titleFor(page),40,'vault').some(/** Report the selected existing target's actual Find availability. */ value=>value.path===target.path);
    }
    guard();const page=index.get(target.path),after=index.getSourceAcquisitionCounters();
    rows.push({kind:target.kind,available,rendered,elapsedMs:performance.now()-at,searchFound,searchExpected:Boolean(page&&(page.url||page.isTag||page.isFolder||page.file)),
      readyAtStart:status.upToDate,sourceActiveAtStart:activity.sourceActive,semanticActiveAtEnd:index.hasActiveSemanticPreparation(),
      gates:page?index.gateStats(page):null,sourceReads:after.vaultReads-before.vaultReads,sourceParses:after.parses-before.parses});
    options.onProgress({rows,elapsedMs:performance.now()-started});
  }
  guard();plugin.notifyNavigation(initial,leaf);
  return {rows,elapsedMs:performance.now()-started,scope:'Separate normal-use diagnostic; provisional DOM/API availability during background work; no paint or complete-semantic claim'};
}
