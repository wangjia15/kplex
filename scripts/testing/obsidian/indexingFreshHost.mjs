/**
 * Test-only guarded Windows lifecycle transport for the existing PR201 Small vault.
 * Native quit is graceful and requires a fresh single-vault window inventory each time.
 * No process is killed, profile created, global storage edited or runtime built here.
 */
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {join, dirname, resolve} from 'node:path';
import {writeFileSync} from 'node:fs';
import {obsidianCliExecutable, spawnNativeSync} from './processTools.mjs';
import {assertFreshTarget, assertFreshProcesses} from './indexingFreshGuards.mjs';

/** Provide bounded native operations; the supplied directory owns all private receipts. */
export function createFreshHost(target, directory, {native = spawnNativeSync} = {}) {
  const executable = obsidianCliExecutable();
  const history = [];
  /** Use the established console/long-eval transport with no shell or unbounded requests. */
  function cli(command, ...args) {
    const result = native(executable, ['vault=kplex-test-small', command, ...args], {
      encoding: 'utf8', timeout: 15000, maxBuffer: 2 * 1024 * 1024, windowsHide: true
    });
    if (result.error || result.status !== 0 || /^Error:/m.test(result.stdout)) throw Error(result.error?.message || result.stderr || result.stdout);
    return result.stdout.trim();
  }
  /** Decode the CLI's JSON value without assuming it omits its displayed result prefix. */
  function evaluate(code) {
    return JSON.parse(cli('eval', 'code=' + code).replace(/^=>\s*/, ''));
  }
  /** Wait only between lifecycle checks; this does not change any product scheduler. */
  function delay(ms) { return new Promise(/** Resolve a bounded driver wait. */ resolveWait => setTimeout(resolveWait, ms)); }
  /** Observe all native windows before admitting an application-wide lifecycle operation. */
  function inventory() {
    const raw = evaluate(`JSON.stringify((()=>{const r=require('@electron/remote');return {vault:app.vault.adapter.basePath,
      windows:r.BrowserWindow.getAllWindows().map(w=>({id:w.id,title:w.getTitle(),url:w.webContents.getURL(),pid:w.webContents.getOSProcessId()})),
      processes:r.app.getAppMetrics().map(m=>({pid:m.pid,created:m.creationTime,type:m.type}))}})())`);
    const identities = assertFreshTarget(raw, target.vault);
    history.push({at: Date.now(), raw, identities});
    writeFileSync(join(directory, 'lifecycle.json'), JSON.stringify(history, null, 2) + '\n');
    return identities;
  }
  /** Probe existence only; never send a signal that could terminate another vault. */
  function alive(pid) {
    try { process.kill(pid, 0); return true; } catch (error) { if (error.code === 'ESRCH') return false; throw error; }
  }
  /** Gracefully close the verified disposable-only app and wait for every observed process exit. */
  async function quit() {
    const previous = inventory();
    const approved = evaluate(`JSON.stringify((()=>{const r=require('@electron/remote'),w=r.getCurrentWindow(),all=r.BrowserWindow.getAllWindows();
      if(app.vault.adapter.basePath!==${JSON.stringify(target.vault)}||all.length!==1||all[0].id!==w.id)throw Error('Restart guard changed');
      window.setTimeout(()=>r.app.quit(),500);return {gracefulQuitScheduled:true}})())`);
    assert(approved.gracefulQuitScheduled);
    const end = Date.now() + 30000;
    while (previous.processes.some(/** All native metric owners must leave before a new arm. */ p => alive(p.pid))) {
      assert(Date.now() < end, 'Graceful Obsidian shutdown did not finish; no forced termination permitted');
      await delay(250);
    }
    history.push({at: Date.now(), allObservedProcessesExited: previous.processes});
    writeFileSync(join(directory, 'lifecycle.json'), JSON.stringify(history, null, 2) + '\n');
    return previous;
  }
  /** Launch the same registered vault/profile through its URI and prove a new native lifetime. */
  async function launch(previous) {
    const exe = join(dirname(executable), 'Obsidian.exe');
    const launched = spawn(exe, ['obsidian://open?vault=kplex-test-small'], {detached: true, stdio: 'ignore', windowsHide: true});
    let launchError;
    launched.on('error', /** Retain launcher failure without killing or replacing another process. */ error => { launchError = error; });
    launched.unref();
    await delay(5000);
    const end = Date.now() + 120000;
    let lastError;
    while (Date.now() < end) {
      if (launchError) throw launchError;
      try {
        assert.equal(resolve(cli('vault', 'info=path').replace(/^path\s+/, '')), target.vault);
        const current = inventory(); if (previous) assertFreshProcesses(previous, current);
        return current;
      } catch (error) { lastError = error; await delay(1000); }
    }
    throw lastError ?? Error('Fresh Obsidian startup unavailable');
  }
  /** Retain host power conditions outside CPU observation, without changing the power plan. */
  function power() {
    const result = native('powercfg.exe', ['/getactivescheme'], {encoding: 'utf8', timeout: 10000, windowsHide: true});
    assert.equal(result.status, 0, result.stderr);
    const nativeFacts = evaluate(`JSON.stringify((()=>{const r=require('@electron/remote');return {onBattery:r.powerMonitor.isOnBatteryPower(),
      displays:r.screen.getAllDisplays().map(d=>({id:d.id,bounds:d.bounds,scaleFactor:d.scaleFactor})),
      throttle:r.getCurrentWindow().webContents.getBackgroundThrottling(),visible:r.getCurrentWindow().isVisible()}})())`);
    return {at: Date.now(), plan: result.stdout.trim(), ...nativeFacts};
  }
  /** Checkpoint work has a separate bounded native deadline; no acceptance deadline is relaxed. */
  function checkpoint(code) {
    const result = native(executable, ['vault=kplex-test-small', 'eval', 'code=' + code], {
      encoding: 'utf8', timeout: 120000, maxBuffer: 2 * 1024 * 1024, windowsHide: true
    });
    assert(!result.error && result.status === 0 && !/^Error:/m.test(result.stdout), result.error?.message || result.stdout || result.stderr);
    return JSON.parse(result.stdout.trim().replace(/^=>\s*/, ''));
  }
  return {cli, evaluate, delay, inventory, quit, launch, power, checkpoint, history};
}
