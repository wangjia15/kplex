/**
 * Portable contracts for the private fresh-process acceptance observer. These tests
 * model native process identity and lifecycle, bounded retained samples, and exact
 * forwarding/independent restoration of diagnostic wrappers without Obsidian.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {createFreshObservation} from '../scripts/testing/obsidian/indexingFreshObservation.mjs';

/** Construct one Electron-shaped process metric with cumulative CPU seconds. */
function metric(pid, creationTime, cumulativeCPUUsage, type = 'Tab') {
  return {pid, creationTime, cpu: {cumulativeCPUUsage}, type};
}

/** Supply a deterministic epoch clock for process births and observation gaps. */
function fixture(options = {}) {
  let at = 10000;
  /** Return the current controlled epoch timestamp. */
  const now = () => at;
  const observer = createFreshObservation({now, ...options});
  /** Advance the clock without scheduling real timers. */
  function advance(ms) { at += ms; }
  return {observer, advance};
}

test('serialized helper keeps cumulative process CPU without counting worker threads again', /** Exercise the exact self-contained injection form used by the native driver. */ () => {
  const factory = (0, eval)(`(${createFreshObservation.toString()})`);
  let at = 10000;
  /** Expose a controlled epoch timestamp to the injected factory. */
  const observer = factory({now: () => at});
  observer.sample([metric(1, 9000, 10, 'Browser'), metric(2, 9000, 20)]);
  at += 1000;
  observer.sample([metric(1, 9000, 11, 'Browser'), metric(2, 9000, 22)]);
  const endpoint = observer.endpoint('complete');
  assert.equal(endpoint.seconds, 3);
  assert.equal(endpoint.processes.length, 2);
  assert.equal(endpoint.valid, true);
  assert.equal(endpoint.sampledAt, at);
});

test('newborn processes count from birth and a reused PID remains a distinct identity', /** Preserve process births even when a previous PID disappears. */ () => {
  const {observer, advance} = fixture();
  observer.sample([metric(1, 9000, 50)]);
  advance(1000);
  observer.sample([metric(1, 9000, 51), metric(2, 10500, 0.4)]);
  advance(1000);
  observer.sample([metric(1, 11500, 0.2), metric(2, 10500, 0.6)]);
  const endpoint = observer.endpoint('post');
  assert.equal(endpoint.processes.length, 3);
  assert.equal(endpoint.seconds, 1.8);
  assert.equal(endpoint.terminalCpuComplete, false);
  assert.deepEqual(observer.samples[2].disappearances, [{identity: '1:9000', lastSeenAt: 11000}]);
  assert.equal(observer.samples[1].births[0].createdDuringObservation, true);
});

test('disappearance is bounded by last sighting and a later sample closes a presence gap', /** Distinguish missing terminal CPU from a counter reset. */ () => {
  const {observer, advance} = fixture();
  observer.sample([metric(1, 9000, 1), metric(2, 9000, 1)]);
  advance(3500);
  observer.sample([metric(2, 9000, 2)]);
  assert.equal(observer.endpoint('missing').terminalCpuComplete, false);
  advance(1000);
  observer.sample([metric(1, 9000, 3), metric(2, 9000, 3)]);
  assert.equal(observer.endpoint('returned').terminalCpuComplete, true);
  assert.equal(observer.endpoint('returned').maximumGapMs, 3500);
  assert.equal(observer.samples[1].gapMs, 3500);
  assert.equal(observer.endpoint('returned').processes[0].disappearances, 1);
});

test('counter regressions and malformed or duplicate metrics fail acceptance closed', /** Invalid CPU evidence must remain visible rather than being silently dropped. */ () => {
  const {observer, advance} = fixture();
  observer.sample([metric(1, 9000, 5)]);
  advance(1000);
  observer.sample([metric(1, 9000, 4), metric(1, 9000, 4), metric(3, 9000, NaN), metric(-1, 9000, 1)]);
  assert.equal(observer.endpoint('invalid').valid, false);
  assert.deepEqual(observer.errors, ['process-cpu-regression', 'duplicate-process-identity', 'invalid-process-cpu', 'invalid-process-identity']);
});

test('sample limit is bounded and endpoints do not take hidden samples', /** An exceeded capacity invalidates the trial while retaining the accepted prefix. */ () => {
  const {observer} = fixture({maximumSamples: 1});
  observer.sample([metric(1, 9000, 5)]);
  assert.equal(observer.sample([metric(1, 9000, 6)]), null);
  assert.equal(observer.endpoint('bounded').valid, false);
  assert.equal(observer.samples.length, 1);
  assert.equal(observer.endpoint('bounded').seconds, 0);
  assert.ok(observer.errors.includes('sample-limit'));
});

test('memory and context retain allowed scalar samples without source data', /** Samples are resource receipts rather than arbitrary application snapshots. */ () => {
  const {observer} = fixture();
  observer.sample([metric(1, 9000, 1)], {rss: 10, heapUsed: 4, allocation: 100, source: 'private'},
    {hidden: false, documentFocused: true, generation: 'private', currentRendererPid: 1});
  assert.deepEqual(observer.samples[0].memory, {rss: 10, heapUsed: 4});
  assert.deepEqual(observer.samples[0].context, {hidden: false, documentFocused: true, currentRendererPid: 1});
  observer.event('maintenance', {pending: 2, source: 'private', error: new Error('private')});
  assert.deepEqual(observer.events[0].detail, {pending: 2});
});

test('wrapping forwards exact receiver, arguments, result and synchronous error identity', /** Diagnostic wrappers must not change the observed method contract. */ () => {
  const {observer} = fixture();
  const args = [{a: 1}, Symbol('argument')], result = {}, thrown = new Error('original');
  const owner = {
    /** Assert receiver and arguments before returning a retained test token. */
    method(...received) { assert.equal(this, owner); assert.deepEqual(received, args); return result; },
    /** Throw the original application error object synchronously. */
    throws() { throw thrown; }
  };
  const original = owner.method;
  observer.wrap(owner, 'method', 'maintenance');
  observer.wrap(owner, 'throws', 'failure');
  assert.equal(owner.method(...args), result);
  assert.throws(() => owner.throws(), /** Match identity, not an observer-created error. */ error => error === thrown);
  assert.deepEqual(observer.events.map(/** Extract safe lifecycle labels for comparison. */ row => row.label), ['maintenance:invoke', 'maintenance:return', 'failure:invoke', 'failure:throw']);
  assert.deepEqual(observer.stop().conflicts, []);
  assert.equal(owner.method, original);
});

test('promise return identity and settlement are retained without returning the observer chain', /** Native async callers must receive the exact promise produced by production. */ async () => {
  const {observer} = fixture();
  const success = Promise.resolve({private: 'ignored'}), failure = Promise.reject(new Error('original'));
  const owner = {
    /** Return the original success promise. */
    success() { return success; },
    /** Return the original rejection promise. */
    failure() { return failure; }
  };
  observer.wrap(owner, 'success', 'cleanup'); observer.wrap(owner, 'failure', 'failed');
  assert.equal(owner.success(), success); assert.equal(owner.failure(), failure);
  await success; await assert.rejects(failure);
  assert.ok(observer.events.some(/** Identify the successful asynchronous completion. */ row => row.label === 'cleanup:fulfilled'));
  assert.ok(observer.events.some(/** Identify rejection without retaining its payload. */ row => row.label === 'failed:rejected'));
});

test('cleanup restores inherited methods and every independent wrapper after ownership conflicts', /** A later instrumentation owner must survive unrelated cleanup. */ () => {
  const {observer} = fixture();
  const prototype = {/** Return a simple inherited value. */ method() { return 1; }};
  const inherited = Object.create(prototype);
  const owner = {/** Return an independent method value. */ a() { return 2; }, /** Return another independent value. */ b() { return 3; }};
  const originalB = owner.b;
  observer.wrap(inherited, 'method', 'inherited'); observer.wrap(owner, 'a', 'a'); observer.wrap(owner, 'b', 'b');
  /** Represent a later owner whose method must not be overwritten. */
  const later = () => 4;
  owner.a = later;
  assert.deepEqual(observer.stop().conflicts, ['a']);
  assert.equal(Object.hasOwn(inherited, 'method'), false);
  assert.equal(owner.a, later); assert.equal(owner.b, originalB);
  assert.equal(observer.endpoint('stopped').valid, false);
  assert.deepEqual(observer.stop().conflicts, []);
});

test('cleanup failure does not prevent another restoration or append late settlements', /** Cleanup remains independent when a method becomes non-configurable. */ async () => {
  const {observer} = fixture();
  let resolve;
  /** Capture deferred settlement without a timer or external lifecycle owner. */
  const pending = new Promise(done => { resolve = done; });
  const owner = {/** Return the pending promise. */ a() { return pending; }, /** Return a synchronous value. */ b() { return 1; }};
  const originalB = owner.b;
  observer.wrap(owner, 'a', 'a'); observer.wrap(owner, 'b', 'b');
  owner.a();
  Object.defineProperty(owner, 'a', {configurable: false, writable: false});
  assert.deepEqual(observer.stop().conflicts, ['a']);
  assert.equal(owner.b, originalB);
  const count = observer.events.length;
  resolve(); await pending;
  assert.equal(observer.events.length, count);
});
