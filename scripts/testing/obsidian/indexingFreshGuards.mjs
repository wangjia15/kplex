/**
 * Pure admission guards for PR201's disposable Windows fresh-process measurements.
 * These checks perform no host, filesystem or process operations. The native driver must
 * collect fresh inventories immediately before a restart and retain them in its receipt.
 */
import {win32} from 'node:path';

const SMALL_VAULT='c:\\obsidian\\kplex-test-small';
const MAIN_HASHES={
  A:'3b96f51e8b734bd622fb0034f1e17682efb17eda8b6caed6e2d69ac7bd05e5f3',
  F:'c39fb4876315a3348b782fe91400398faab1f98de8c0852eb9cc06bf24509a58',
};

/** Normalize an absolute Windows vault identity without consulting or changing disk state. */
function normalizedVault(value) {
  if(typeof value!=='string'||!value.trim()||!win32.isAbsolute(value))throw Error('Fresh-process vault must be an absolute Windows path');
  return win32.normalize(value).replace(/[\\/]+$/,'').toLowerCase();
}

/** Require a complete native process identity; a PID alone cannot establish a new lifetime. */
function assertProcessIdentity(process) {
  if(!process||!Number.isSafeInteger(process.pid)||process.pid<=0||!Number.isFinite(process.created)||process.created<=0)
    throw Error('Fresh-process inventory contains an invalid PID or creation time');
}

/** Compare the native PID and creation timestamp together, accepting a genuinely reused PID. */
function sameProcess(left,right) {
  return left.pid===right.pid&&left.created===right.created;
}

/**
 * Admit only the existing Small vault with one recognizable Obsidian window and one Browser.
 * The owning renderer must resolve uniquely in the native metrics; extra process identities
 * remain visible to CPU accounting rather than being silently discarded by this safety guard.
 */
export function assertFreshTarget(inventory,expectedVault) {
  if(normalizedVault(expectedVault)!==SMALL_VAULT||normalizedVault(inventory?.vault)!==SMALL_VAULT)
    throw Error('Fresh-process target is not the pinned disposable Small vault');
  if(!Array.isArray(inventory.windows)||inventory.windows.length!==1)
    throw Error('Fresh-process restart requires exactly one Obsidian BrowserWindow');
  const window=inventory.windows[0];
  if(!window||!Number.isSafeInteger(window.id)||window.id<=0||typeof window.title!=='string'
    ||!window.title.includes(' - kplex-test-small - Obsidian')||window.url!=='app://obsidian.md/index.html')
    throw Error('Fresh-process window does not identify the disposable Small vault');
  if(!Array.isArray(inventory.processes)||!inventory.processes.length)
    throw Error('Fresh-process native process metrics are missing');
  const pids=new Set();
  let browser,renderer;
  for(const process of inventory.processes) {
    assertProcessIdentity(process);
    if(pids.has(process.pid))throw Error('Fresh-process inventory has an ambiguous duplicate PID');
    pids.add(process.pid);
    if(typeof process.type!=='string'||!process.type.trim())throw Error('Fresh-process inventory has no process type');
    if(process.type==='Browser') {
      if(browser)throw Error('Fresh-process inventory contains more than one Browser process');
      browser={pid:process.pid,created:process.created};
    }
    if(process.pid===window.pid) {
      if(process.type!=='Tab')throw Error('Fresh-process window PID is not a Tab renderer');
      renderer={pid:process.pid,created:process.created};
    }
  }
  if(!browser||!renderer)throw Error('Fresh-process inventory cannot identify both Browser and owning Tab renderer');
  return {browser,renderer,processes:inventory.processes};
}

/** Reject a reload-only comparison: both Browser and owning renderer must have new lifetimes. */
export function assertFreshProcesses(previous,current) {
  for(const role of ['browser','renderer']) {
    assertProcessIdentity(previous?.[role]);
    assertProcessIdentity(current?.[role]);
    if(sameProcess(previous[role],current[role]))throw Error('Fresh-process '+role+' lifetime was reused');
  }
  return current;
}

/**
 * Bind A/F measurements to the pinned production bundle, independently of later tooling commits.
 * Manifest and stylesheet hashes must be present for the receipt; their identities are recorded
 * without inventing a baseline equality requirement. This function never reads or stages files.
 */
export function assertPinnedArtifacts(hashes,arm) {
  if(!Object.hasOwn(MAIN_HASHES,arm))throw Error('Fresh-process artifact arm must be A or F');
  if(!hashes||hashes.main!==MAIN_HASHES[arm])throw Error('Fresh-process main.js hash does not match pinned '+arm+' runtime');
  for(const file of ['manifest','styles']) {
    if(typeof hashes[file]!=='string'||!/^[0-9a-f]{64}$/.test(hashes[file]))throw Error('Fresh-process '+file+' SHA-256 is missing or malformed');
  }
  return hashes;
}
