/**
 * Passive, test-only native transaction completion proof for PR207 shutdown comparisons.
 * It changes no requests, callbacks, storage values or scheduling. Only active transactions are
 * retained; terminal events release them. The caller drains and restores the binding before quit.
 */
export function installRestartCompletionObserver() {
  if (window.__kplexRestartCompletion) throw Error("Previous restart completion observer remains");
  const original = IDBDatabase.prototype.transaction, active = new Map(), waiters = new Set();
  const report = { started: 0, completed: 0, aborted: 0, pendingTransactions: 0, maximumPending: 0, bindingsRestored: false };
  /** Return scalar receipts without exposing native transactions or source data. */
  const snapshot = () => ({ ...report });
  /** Forward exact request ownership while observing every native terminal event. */
  function tracked(...args) {
    const transaction = original.apply(this, args);
    report.started++; report.pendingTransactions++; report.maximumPending = Math.max(report.maximumPending, report.pendingTransactions);
    /** A transaction earns completion exactly once; remove both listeners and release its reference. */
    const finish = event => {
      if (!active.has(transaction)) return;
      transaction.removeEventListener("complete", finish); transaction.removeEventListener("abort", finish);
      active.delete(transaction); report.pendingTransactions--; report[event.type === "complete" ? "completed" : "aborted"]++;
      if (active.size === 0) { for (const resolve of waiters) resolve(snapshot()); waiters.clear(); }
    };
    active.set(transaction, finish);
    transaction.addEventListener("complete", finish); transaction.addEventListener("abort", finish);
    return transaction;
  }
  IDBDatabase.prototype.transaction = tracked;
  window.__kplexRestartCompletion = {
    snapshot,
    /** Wait for actual native terminal events; the existing CDP deadline bounds an incomplete drain. */
    drain() { return active.size === 0 ? Promise.resolve(snapshot()) : new Promise(resolve => waiters.add(resolve)); },
    /** Restore only our own binding. Pending native operations forbid a passing shutdown receipt. */
    retire() {
      if (active.size !== 0) throw Error("Native transactions remain before browser shutdown");
      if (!report.bindingsRestored) {
        if (IDBDatabase.prototype.transaction !== tracked) throw Error("Restart completion binding changed");
        IDBDatabase.prototype.transaction = original; report.bindingsRestored = true;
      }
      return snapshot();
    },
  };
  return true;
}
