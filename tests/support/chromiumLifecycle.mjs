/**
 * Opt-in test-browser shutdown diagnostics. Owns only the supplied disposable child/socket and
 * requires an observed clean exit after Browser.close; timeout or forced cleanup never becomes a
 * graceful pass. Default Chromium harness shutdown remains outside this module and unchanged.
 */
import { performance } from "node:perf_hooks";

/** Attach the finite lifecycle receipt to a failure so callers can retain unfavorable outcomes. */
export function chromiumLifecycleError(message, receipt) {
  const error = new Error(message);
  error.name = "ChromiumLifecycleError";
  error.lifecycleReceipt = receipt;
  return error;
}

/** Retain only finite drain coordinates and reject an explicitly unrestored observer binding. */
function requireDrained(guard, receipt) {
  receipt.precondition = { pendingTransactions: guard?.pendingTransactions ?? null,
    completedTransactions: Number.isSafeInteger(guard?.completedTransactions) ? guard.completedTransactions : null,
    abortedTransactions: Number.isSafeInteger(guard?.abortedTransactions) ? guard.abortedTransactions : null,
    bindingsRestored: typeof guard?.bindingsRestored === "boolean" ? guard.bindingsRestored : null };
  if (!guard || guard.pendingTransactions !== 0 || guard.bindingsRestored === false)
    throw chromiumLifecycleError("Native transactions/bindings are not proven retired before Chromium shutdown", receipt);
}

/**
 * Close one owned Chromium process through its existing CDP socket, then wait for its real exit.
 * The drain callback must report zero pending native transactions before any close command is sent.
 * A missing CDP acknowledgement is acceptable only after a sent command and exit code zero without
 * a signal. A protocol error remains failure even if a later exit is clean. The five-second close
 * window matches the existing harness force-escalation window; it does not alter default deadlines.
 * Optional clock functions support deterministic lifecycle contracts without starting a browser.
 */
export async function closeChromiumGracefully({ child, socket, commandId, beforeShutdown }, clock = {}) {
  const now = clock.now ?? (() => performance.now());
  const schedule = clock.setTimeout ?? setTimeout, cancel = clock.clearTimeout ?? clearTimeout;
  const started = now();
  const receipt = { mode: "graceful", status: "incomplete", oldPid: child?.pid ?? null,
    precondition: null, guardElapsedMs: null, shutdownElapsedMs: null, elapsedMs: null,
    closeTimeoutMs: 5000, browserClose: { sent: false, acknowledged: false, protocolError: null, sendError: null },
    exit: null, timedOut: false, fallback: null };
  let timer = null, closeAt = null, resolveExit, rejectExit;
  const exit = new Promise(/** The actual child exit or explicit failure, never a socket disconnect, completes shutdown. */(resolve, reject) => { resolveExit = resolve; rejectExit = reject; });
  /** Preserve one real child exit identity; a clean exit before command dispatch is not a graceful-close result. */
  const onExit = (code, signal) => {
    receipt.exit = { pid: child.pid, code, signal: signal ?? null };
    if (!receipt.browserClose.sent) return;
    receipt.shutdownElapsedMs = now() - closeAt;
    if (code === 0 && signal == null && !receipt.browserClose.protocolError && !receipt.browserClose.sendError) resolveExit();
    else rejectExit(chromiumLifecycleError("Chromium did not exit cleanly after Browser.close", receipt));
  };
  /** Observe only this close command; all other CDP messages retain their existing owner. */
  const onMessage = event => {
    let message;
    try { message = JSON.parse(event.data); } catch { return; }
    if (message.id !== commandId || !receipt.browserClose.sent) return;
    if (message.error) {
      receipt.browserClose.protocolError = JSON.stringify(message.error);
      rejectExit(chromiumLifecycleError("Browser.close returned a protocol error", receipt));
    } else receipt.browserClose.acknowledged = true;
  };
  let childSubscribed = false, socketSubscribed = false;
  try {
    if (!child || !Number.isInteger(child.pid) || child.pid <= 0 || child.exitCode !== null || child.signalCode != null)
      throw chromiumLifecycleError("Graceful restart requires the live owned Chromium child", receipt);
    if (!socket || socket.readyState !== 1 || !Number.isSafeInteger(commandId) || commandId <= 0)
      throw chromiumLifecycleError("Graceful restart requires the live owned CDP socket", receipt);
    if (typeof beforeShutdown !== "function") throw chromiumLifecycleError("Graceful restart requires an actual native-transaction drain guard", receipt);
    child.once("exit", onExit); childSubscribed = true;
    socket.addEventListener("message", onMessage); socketSubscribed = true;
    const guard = await beforeShutdown();
    receipt.guardElapsedMs = now() - started;
    requireDrained(guard, receipt);
    if (receipt.exit || child.exitCode !== null || child.signalCode != null)
      throw chromiumLifecycleError("Chromium exited before Browser.close dispatch", receipt);
    closeAt = now(); receipt.browserClose.sent = true;
    timer = schedule(/** A close timeout fails this arm; only later explicit cleanup may force termination. */() => {
      receipt.timedOut = true; receipt.shutdownElapsedMs = now() - closeAt;
      rejectExit(chromiumLifecycleError("Graceful Chromium shutdown timed out", receipt));
    }, receipt.closeTimeoutMs);
    try { socket.send(JSON.stringify({ id: commandId, method: "Browser.close", params: {} })); }
    catch (error) {
      receipt.browserClose.sendError = String(error.stack ?? error);
      rejectExit(chromiumLifecycleError("Browser.close dispatch failed", receipt));
    }
    await exit;
    receipt.status = "passed";
    return receipt;
  } catch (error) {
    receipt.status = "failed";
    if (error?.lifecycleReceipt === receipt) throw error;
    receipt.guardError = String(error.stack ?? error);
    throw chromiumLifecycleError("Graceful Chromium shutdown prerequisite failed", receipt);
  } finally {
    try { if (timer !== null) cancel(timer); }
    finally {
      try { if (childSubscribed) child.removeListener("exit", onExit); }
      finally {
        try { if (socketSubscribed) socket.removeEventListener("message", onMessage); }
        finally { receipt.elapsedMs = now() - started; }
      }
    }
  }
}

/** Record the unchanged forced signal sequence and actual terminal event for only this owned child. */
async function terminateOwnedChromium(child, fallback) {
  if (!fallback.needed) {
    fallback.exit = child ? { pid: child.pid, code: child.exitCode, signal: child.signalCode ?? null } : null;
    return fallback;
  }
  let resolveExit;
  const exited = new Promise(/** Cleanup retains a real terminal child event instead of assuming kill() completed. */resolve => { resolveExit = resolve; });
  /** Preserve actual cleanup exit code/signal alongside the attempted signals. */
  const onExit = (code, signal) => { fallback.exit = { pid: child.pid, code, signal: signal ?? null }; resolveExit(); };
  child.once("exit", onExit);
  const kill = setTimeout(/** Preserve the existing five-second force escalation and make it explicit in the receipt. */() => { fallback.sigkillSent = true; child.kill("SIGKILL"); }, 5000);
  try { fallback.sigtermSent = true; child.kill("SIGTERM"); await exited; }
  finally { clearTimeout(kill); child.removeListener("exit", onExit); }
  return fallback;
}

/** Record forced cleanup after an opt-in failure without changing that failure into a graceful pass. */
export async function cleanupFailedChromium(child, receipt) {
  receipt.fallback = terminationReceipt(child);
  await terminateOwnedChromium(child, receipt.fallback);
  return receipt.fallback;
}

/** Apply the unchanged force signals under an explicit drained protocol, retaining actual exit identity. */
export async function closeChromiumForced({ child, socket, beforeShutdown }) {
  const started = performance.now();
  const receipt = { mode: "forced", status: "incomplete", oldPid: child?.pid ?? null, precondition: null,
    guardElapsedMs: null, shutdownElapsedMs: null, elapsedMs: null, exit: null, forced: null, fallback: null };
  try {
    if (!child || !Number.isInteger(child.pid) || child.pid <= 0 || child.exitCode !== null || child.signalCode != null)
      throw chromiumLifecycleError("Forced restart requires the live owned Chromium child", receipt);
    if (typeof beforeShutdown !== "function") throw chromiumLifecycleError("Forced restart requires an actual native-transaction drain guard", receipt);
    const guard = await beforeShutdown();
    receipt.guardElapsedMs = performance.now() - started; requireDrained(guard, receipt);
    if (child.exitCode !== null || child.signalCode != null) throw chromiumLifecycleError("Chromium exited before forced shutdown dispatch", receipt);
    const closeAt = performance.now(); socket.close(); receipt.forced = terminationReceipt(child);
    await terminateOwnedChromium(child, receipt.forced);
    receipt.shutdownElapsedMs = performance.now() - closeAt; receipt.exit = receipt.forced.exit;
    receipt.status = "passed"; return receipt;
  } catch (error) {
    receipt.status = "failed";
    if (error?.lifecycleReceipt === receipt) throw error;
    receipt.guardError = String(error.stack ?? error);
    throw chromiumLifecycleError("Forced Chromium shutdown prerequisite failed", receipt);
  } finally { receipt.elapsedMs = performance.now() - started; }
}

/** Allocate finite signal/exit observations before cleanup can throw or be interrupted. */
function terminationReceipt(child) {
  return { needed: Boolean(child && child.exitCode === null && child.signalCode == null), pid: child?.pid ?? null,
    sigtermSent: false, sigkillSent: false, exit: null };
}

/**
 * Sequence an explicit lifecycle: observed root exit, socket retirement, optional owned-profile
 * observation, then a distinct new root. Hook and launch elapsed times remain separate. A failed
 * hook or shutdown never starts a replacement or turns force cleanup into a successful arm.
 */
export async function restartChromiumWithLifecycle({ mode, identity, shutdown, retireSocket, afterShutdown, start }, clock = {}) {
  const now = clock.now ?? (() => performance.now()), began = now(), old = identity();
  const receipt = { mode, status: "incomplete", oldPid: old.pid, newPid: null, shutdown: null,
    shutdownElapsedMs: null, afterShutdown: null, launchElapsedMs: null, elapsedMs: null, fallback: null };
  try {
    if (!["graceful", "forced"].includes(mode)) throw chromiumLifecycleError("Explicit Chromium shutdown mode is invalid", receipt);
    receipt.shutdown = await shutdown(); receipt.shutdownElapsedMs = receipt.shutdown.shutdownElapsedMs;
    if (receipt.shutdown.status !== "passed" || receipt.shutdown.oldPid !== old.pid || receipt.shutdown.exit?.pid !== old.pid)
      throw chromiumLifecycleError("Restart lacks the old root's proven terminal identity", receipt);
    if (mode === "graceful" && (receipt.shutdown.exit.code !== 0 || receipt.shutdown.exit.signal !== null))
      throw chromiumLifecycleError("Graceful restart lacks a clean old-root exit", receipt);
    await retireSocket();
    if (afterShutdown !== undefined) {
      if (typeof afterShutdown !== "function") throw chromiumLifecycleError("afterShutdown must be an owned observation callback", receipt);
      const hookAt = now(); receipt.afterShutdown = { elapsedMs: null, result: null };
      try { receipt.afterShutdown.result = await afterShutdown({ ...old, exit: receipt.shutdown.exit }); }
      finally { receipt.afterShutdown.elapsedMs = now() - hookAt; }
    }
    const launchAt = now();
    try { await start(); }
    finally { receipt.launchElapsedMs = now() - launchAt; receipt.newPid = identity().pid; }
    if (!Number.isInteger(receipt.newPid) || receipt.newPid <= 0 || receipt.newPid === old.pid)
      throw chromiumLifecycleError("Restart did not establish a different Chromium process identity", receipt);
    receipt.status = "passed"; return receipt;
  } catch (error) {
    if (error?.lifecycleReceipt && error.lifecycleReceipt !== receipt) {
      receipt.shutdown = error.lifecycleReceipt; receipt.shutdownElapsedMs = receipt.shutdown.shutdownElapsedMs;
    }
    receipt.status = "failed"; receipt.error = String(error.stack ?? error);
    throw chromiumLifecycleError("Explicit Chromium lifecycle failed", receipt);
  } finally { receipt.elapsedMs = now() - began; }
}
