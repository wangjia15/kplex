/**
 * Test-only lifecycle contracts for the opt-in disposable Chromium shutdown diagnostic. Controlled
 * child/socket events prove ordering, missing-ack handling and failed cleanup without launching a
 * browser, waiting on real deadlines, or replacing the separate real-browser validation lane.
 */
import assert from "node:assert/strict";
import test from "node:test";
import { EventEmitter } from "node:events";
import { closeChromiumForced, closeChromiumGracefully, cleanupFailedChromium,
  restartChromiumWithLifecycle } from "./support/chromiumLifecycle.mjs";

/** Emit actual terminal events under explicit test control; signals remain observable independently. */
class Child extends EventEmitter {
  /** Start with one owned live process identity. */
  constructor(pid = 1001) { super(); this.pid = pid; this.exitCode = null; this.signalCode = null; this.signals = []; }
  /** Record the terminal identity before notifying listeners, like a completed child process. */
  exit(code, signal = null) { this.exitCode = code; this.signalCode = signal; this.emit("exit", code, signal); }
  /** Make forced cleanup deterministic while retaining its signal and terminal-event evidence. */
  kill(signal) { this.signals.push(signal); this.exit(null, signal); return true; }
}

/** Deliver explicit CDP messages without introducing real socket or timer lifetimes. */
class Socket extends EventEmitter {
  /** Keep the response action separate from lifecycle code so each contract controls event ordering. */
  constructor(action) { super(); this.readyState = 1; this.action = action; this.commands = []; this.closed = false; }
  /** Model the existing socket's event-listener interface. */
  addEventListener(name, listener) { this.on(name, listener); }
  /** Remove the exact diagnostic callback, preserving any unrelated socket owner. */
  removeEventListener(name, listener) { this.off(name, listener); }
  /** Record the close request before the test emits its independent acknowledgement/exit events. */
  send(text) { const command = JSON.parse(text); this.commands.push(command); this.action(command, this); }
  /** Send only the supplied protocol response; socket closure alone is never a child exit. */
  respond(message) { this.emit("message", { data: JSON.stringify(message) }); }
  /** Retain the observable default close-before-force sequence. */
  close() { this.closed = true; this.readyState = 3; }
}

/** Expose deadline firing directly, so timeout contracts never sleep or modify production deadlines. */
function controlledClock() {
  let time = 0, next = 0;
  const timers = new Map();
  return {
    /** Supply deterministic elapsed coordinates. */
    now: () => time,
    /** Record the requested native deadline without scheduling real work. */
    setTimeout: (callback, delay) => { const id = ++next; timers.set(id, { callback, delay }); return id; },
    /** Retire the exact owned deadline. */
    clearTimeout: id => timers.delete(id),
    /** Advance only elapsed observations, without implicitly delivering callbacks. */
    advance: amount => { time += amount; },
    /** Deliver a captured timeout once, matching timer retirement semantics. */
    fire: () => { const [id, timer] = timers.entries().next().value; time += timer.delay; timers.delete(id); timer.callback(); },
    timers,
  };
}

/** Report a real-drain-shaped finite receipt without pretending to emulate IndexedDB behavior. */
function drained() { return { pendingTransactions: 0, completedTransactions: 3, abortedTransactions: 0, bindingsRestored: true }; }

/** A matching acknowledgement still requires a separate clean root exit and retires all owned observers. */
test("graceful shutdown requires actual clean exit after its matching Browser.close", async () => {
  const child = new Child(), clock = controlledClock();
  const socket = new Socket(/** Unrelated protocol messages must not satisfy this command. */(command, owner) => {
    assert.equal(command.method, "Browser.close");
    owner.respond({ id: command.id + 1, error: { message: "unrelated" } });
    owner.respond({ id: command.id, result: {} }); clock.advance(9); child.exit(0);
  });
  const result = await closeChromiumGracefully({ child, socket, commandId: 4, beforeShutdown: drained }, clock);
  assert.equal(result.status, "passed"); assert.equal(result.browserClose.acknowledged, true);
  assert.deepEqual(result.exit, { pid: 1001, code: 0, signal: null });
  assert.equal(result.shutdownElapsedMs, 9); assert.equal(result.fallback, null);
  assert.equal(clock.timers.size, 0); assert.equal(child.listenerCount("exit"), 0); assert.equal(socket.listenerCount("message"), 0);
  assert.deepEqual(child.signals, []);
});

/** Browser.close can destroy its socket before acknowledgement, but only a proven exit zero permits that race. */
test("graceful shutdown accepts missing acknowledgement only with a sent command and clean exit", async () => {
  const child = new Child(), socket = new Socket(/** Close the transport before delivering the independent root exit. */(_command, owner) => { owner.close(); child.exit(0); });
  const result = await closeChromiumGracefully({ child, socket, commandId: 1, beforeShutdown: drained }, controlledClock());
  assert.equal(result.status, "passed"); assert.equal(result.browserClose.sent, true);
  assert.equal(result.browserClose.acknowledged, false); assert.equal(result.exit.code, 0);
});

/** A protocol rejection remains adverse evidence even when the process later exits cleanly. */
test("graceful shutdown rejects Browser.close protocol errors instead of treating exit as an override", async () => {
  const child = new Child(), clock = controlledClock();
  const socket = new Socket(/** Report a rejected close before a later clean exit. */(command, owner) => { owner.respond({ id: command.id, error: { code: -1, message: "close denied" } }); child.exit(0); });
  await assert.rejects(closeChromiumGracefully({ child, socket, commandId: 2, beforeShutdown: drained }, clock),
    /** The failure must retain the protocol error and actual terminal identity together. */error => {
      assert.equal(error.lifecycleReceipt.status, "failed"); assert.match(error.lifecycleReceipt.browserClose.protocolError, /close denied/);
      assert.equal(error.lifecycleReceipt.exit.code, 0); return true;
    });
  assert.equal(clock.timers.size, 0); assert.equal(socket.listenerCount("message"), 0);
});

/** Nonzero or signal termination is not a clean graceful result even after a successful acknowledgement. */
test("graceful shutdown rejects nonzero and signalled exits", async () => {
  for (const [code, signal] of [[1, null], [null, "SIGTERM"]]) {
    const child = new Child(), socket = new Socket(/** A close acknowledgement cannot excuse an adverse terminal event. */(command, owner) => { owner.respond({ id: command.id, result: {} }); child.exit(code, signal); });
    await assert.rejects(closeChromiumGracefully({ child, socket, commandId: 3, beforeShutdown: drained }, controlledClock()),
      /** Preserve the exact adverse exit coordinates. */error => { assert.equal(error.lifecycleReceipt.status, "failed"); assert.deepEqual(error.lifecycleReceipt.exit, { pid: child.pid, code, signal }); return true; });
  }
});

/** Timeout fails before cleanup; later forced retirement is retained without promoting the failed arm. */
test("graceful timeout stays failed and explicit cleanup records the forced terminal event", async () => {
  const child = new Child(), clock = controlledClock();
  const socket = new Socket(/** Leave the process alive while delivering the unchanged five-second timeout. */() => clock.fire());
  let receipt;
  await assert.rejects(closeChromiumGracefully({ child, socket, commandId: 5, beforeShutdown: drained }, clock),
    /** Retain the failed receipt by identity so cleanup can append its fallback evidence. */error => { receipt = error.lifecycleReceipt; return receipt.status === "failed" && receipt.timedOut; });
  assert.equal(receipt.closeTimeoutMs, 5000); assert.equal(receipt.exit, null); assert.deepEqual(child.signals, []);
  const fallback = await cleanupFailedChromium(child, receipt);
  assert.equal(receipt.status, "failed"); assert.equal(fallback.sigtermSent, true); assert.equal(fallback.sigkillSent, false);
  assert.deepEqual(fallback.exit, { pid: child.pid, code: null, signal: "SIGTERM" }); assert.equal(child.listenerCount("exit"), 0);
});

/** Failed drain prerequisites prevent any shutdown command and leave observer bindings retired. */
test("shutdown prerequisites reject pending transactions, unrestored bindings and an already exited child", async () => {
  for (const guard of [{ ...drained(), pendingTransactions: 1 }, { ...drained(), bindingsRestored: false }]) {
    const child = new Child(), socket = new Socket(/** Dispatch would violate the drain-before-close contract. */() => assert.fail("must not dispatch"));
    await assert.rejects(closeChromiumGracefully({ child, socket, commandId: 6,
      /** Supply the independently failing prerequisite under test. */beforeShutdown: () => guard }, controlledClock()), /not proven retired/);
    assert.equal(socket.commands.length, 0); assert.deepEqual(child.signals, []); assert.equal(child.listenerCount("exit"), 0);
    assert.equal(socket.listenerCount("message"), 0);
  }
  const child = new Child(); child.exit(0);
  await assert.rejects(closeChromiumGracefully({ child, socket: new Socket(drained), commandId: 1, beforeShutdown: drained }, controlledClock()), /live owned Chromium/);
});

/** A send failure is awaited, retained and cleaned up without a second unhandled promise rejection. */
test("Browser.close dispatch failure retains its cause and retires the deadline", async () => {
  const child = new Child(), clock = controlledClock(), socket = new Socket(/** Simulate a synchronous native transport failure. */() => { throw new Error("transport failed"); });
  await assert.rejects(closeChromiumGracefully({ child, socket, commandId: 7, beforeShutdown: drained }, clock),
    /** Distinguish transport failure from an absent acknowledgement after a clean exit. */error => { assert.match(error.lifecycleReceipt.browserClose.sendError, /transport failed/); assert.equal(error.lifecycleReceipt.status, "failed"); return true; });
  assert.equal(clock.timers.size, 0); assert.equal(child.listenerCount("exit"), 0); assert.equal(socket.listenerCount("message"), 0);
});

/** Explicit forced diagnostics preserve socket-close/SIGTERM order and record the actual terminal event. */
test("explicit forced protocol guards drain and preserves the default signal order", async () => {
  const child = new Child(), socket = new Socket(drained), kill = child.kill.bind(child);
  child.kill = /** No force signal may precede CDP transport retirement. */signal => { assert.equal(socket.closed, true); return kill(signal); };
  const receipt = await closeChromiumForced({ child, socket, beforeShutdown: drained });
  assert.equal(receipt.status, "passed"); assert.equal(receipt.forced.sigtermSent, true);
  assert.deepEqual(receipt.exit, { pid: child.pid, code: null, signal: "SIGTERM" });
  assert.equal(child.listenerCount("exit"), 0);
});

/** Supply a lifecycle with independent root-exit evidence and deterministic post-exit/launch clocks. */
function plan() {
  const clock = controlledClock(), order = [], state = { pid: 2001, profile: "owned-profile" };
  const options = {
    mode: "graceful",
    /** Expose only the currently owned identity. */
    identity: () => ({ ...state }),
    /** Produce proven old-root exit before any observation or new launch. */
    shutdown: async () => { order.push("old root exited"); clock.advance(5); return { status: "passed", oldPid: 2001, exit: { pid: 2001, code: 0, signal: null }, shutdownElapsedMs: 5 }; },
    /** Socket retirement follows actual old-root exit. */
    retireSocket: async () => { order.push("socket retired"); },
    /** Profile observations occur after old-root exit and before new launch, outside launch timing. */
    afterShutdown: async identity => { order.push("post-exit observation"); assert.equal(identity.pid, 2001); assert.equal(identity.exit.code, 0); clock.advance(7); return { regularFileBytes: 123 }; },
    /** New startup consumes its own elapsed interval and must yield a different process identity. */
    start: async () => { order.push("new root started"); clock.advance(11); state.pid = 2002; },
  };
  return { options, clock, order, state };
}

/** Profile observation and replacement startup must be sequenced after proven exit and timed separately. */
test("restart records post-exit observation separately from shutdown and new-process launch", async () => {
  const { options, clock, order } = plan();
  const result = await restartChromiumWithLifecycle(options, clock);
  assert.equal(result.status, "passed"); assert.deepEqual(order, ["old root exited", "socket retired", "post-exit observation", "new root started"]);
  assert.equal(result.oldPid, 2001); assert.equal(result.newPid, 2002); assert.equal(result.shutdownElapsedMs, 5);
  assert.deepEqual(result.afterShutdown, { elapsedMs: 7, result: { regularFileBytes: 123 } });
  assert.equal(result.launchElapsedMs, 11); assert.equal(result.elapsedMs, 23);
});

/** Failed post-exit observation must not start another browser or conceal the failed diagnostic. */
test("post-exit hook failure retains its elapsed interval and prevents replacement startup", async () => {
  const { options, clock, order } = plan();
  options.afterShutdown = /** Simulate a bounded owned-profile observation failure after its actual elapsed work. */async () => { order.push("failed observation"); clock.advance(4); throw new Error("stat failed"); };
  await assert.rejects(restartChromiumWithLifecycle(options, clock),
    /** Preserve the shutdown proof and failed hook cost without inventing a launch. */error => { const receipt = error.lifecycleReceipt; assert.equal(receipt.status, "failed"); assert.equal(receipt.shutdown.exit.pid, 2001); assert.equal(receipt.afterShutdown.elapsedMs, 4); assert.equal(receipt.launchElapsedMs, null); assert.equal(receipt.newPid, null); return true; });
  assert.deepEqual(order, ["old root exited", "socket retired", "failed observation"]);
});

/** Neither a malformed exit proof nor PID reuse establishes an isolated replacement process. */
test("restart rejects missing old-root exit proof and reused replacement PID", async () => {
  const first = plan();
  first.options.shutdown = /** A successful label without actual old-root identity is insufficient. */async () => ({ status: "passed", oldPid: 2001, exit: null });
  await assert.rejects(restartChromiumWithLifecycle(first.options, first.clock), /lifecycle failed/);
  assert.deepEqual(first.order, []);
  const second = plan();
  second.options.start = /** A launch returning the same process is not a fresh process. */async () => { second.order.push("reused root"); };
  await assert.rejects(restartChromiumWithLifecycle(second.options, second.clock),
    /** The failed isolation receipt retains both identical coordinates for review. */error => { assert.equal(error.lifecycleReceipt.status, "failed"); assert.equal(error.lifecycleReceipt.oldPid, error.lifecycleReceipt.newPid); return true; });
});
