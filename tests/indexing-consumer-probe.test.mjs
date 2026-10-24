/** Portable contracts for bounded raw-family diagnostics, independent of selected-read authority. */
import assert from 'node:assert/strict';
import test from 'node:test';
import {createRequire} from 'node:module';
import {runInNewContext} from 'node:vm';
import {createIndexingConsumerProbe} from '../scripts/testing/obsidian/indexingConsumerProbe.mjs';

const createProbe = runInNewContext('(' + createIndexingConsumerProbe.toString() + ')', {require: createRequire(import.meta.url)});

/** Supply exact public fixture coordinates without introducing note text or a storage implementation. */
function view(revision = 'head-one', sourceId = 'private-fixture-owner.md') {
  return {sequence: 1, head: {sourceId, sourceRevision: revision, families: {
    values: {revision: 'values-one', chunks: 1, records: 1, bytes: 10, postings: 1, digest: 'digest', postingDigest: 'posting'},
    metadata: {revision: 'metadata-one', chunks: 1, records: 1, bytes: 10, postings: 1, digest: 'digest', postingDigest: 'posting'},
  }}};
}

/** Model method ownership and caller-supplied async work while retaining exact promises and receivers. */
function fixture() {
  let visit = /** Complete an ordinary raw visit without inventing selected-read authentication. */ () => Promise.resolve('ready');
  const receivers = [];
  const prototype = {/** The probe must restore this inherited implementation by deleting its own wrapper. */
    visitFamily(...args) { receivers.push(this); return visit(...args); }};
  const repository = Object.create(prototype);
  repository.readSelected = /** Authenticate only when the entire independent read completes ready. */ async function (work, outcome = 'ready') {
    await work(); return {outcome};
  };
  const acquisition = {repository,
    /** Execute a nested degree consumer within its caller's request lineage. */
    prepareRequestedCandidateDegrees(work) { return work(); },
  };
  const index = {sourceAcquisition: acquisition, publicationRevision: 1,
    /** Return exactly the product's promise under a newly attributed root request. */
    prepareSemanticScope(work) { return work(); },
  };
  return {index, repository, receivers, originalVisit: prototype.visitFamily,
    /** Replace only the fixture producer, keeping the production observer untouched. */
    setVisit(next) { visit = next; },
  };
}

test('raw attempts outside selected reads retain exact promises and separate consumer repetition', /** Exercise pin/inspect-like visits and whole-read credit independently. */ async () => {
  const f = fixture(), probe = createProbe(f.index), selected = view();
  try {
    const promise = Promise.resolve('ready'); f.setVisit(/** Reuse a known product promise to check exact forwarding. */ () => promise);
    const result = f.index.prepareSemanticScope(/** Nested consumers must share request identity without sharing authority. */ async () => {
      assert.equal(f.repository.visitFamily(selected, 'values'), promise);
      await promise;
      await f.index.sourceAcquisition.prepareRequestedCandidateDegrees(/** Attribute this repeat to degree work. */ () => f.repository.visitFamily(selected, 'values'));
    });
    await result;
    const snapshot = probe.snapshot();
    assert.equal(snapshot.rawFamilies.attempts, 2);
    assert.equal(snapshot.rawFamilies.ready, 2);
    assert.equal(snapshot.rawFamilies.outsideSelectedRead, 2);
    assert.equal(snapshot.rawFamilies.repeats.attempted.sameRequestOtherConsumer, 1);
    assert.equal(snapshot.rawFamilies.repeats.ready.sameRequestOtherConsumer, 1);
    assert.equal(snapshot.coverage.authenticatedReads, 0);
    assert.equal(snapshot.coverage.authenticatedFamilies, 0);
    assert(f.receivers.every(/** Receiver substitution would change product semantics. */ receiver => receiver === f.repository));
    await f.index.prepareSemanticScope(/** Only this independent whole selected read can grant authenticated credit. */ () =>
      f.repository.readSelected(/** Traverse an actual family inside the selected lifetime. */ () => f.repository.visitFamily(selected, 'values')));
    assert.equal(probe.snapshot().coverage.authenticatedFamilies, 1);
    assert.equal(probe.snapshot().rawFamilies.insideSelectedRead, 1);
    assert(!JSON.stringify(probe.snapshot()).includes('private-fixture-owner.md'));
  } finally { probe.stop(); }
  assert.equal(Object.hasOwn(f.repository, 'visitFamily'), false);
  assert.equal(f.repository.visitFamily, f.originalVisit);
});

test('raw exact identities distinguish requests, publication changes and source/head/family revisions', /** Retain exact tuple comparisons without treating publication as authority. */ async () => {
  const f = fixture(), probe = createProbe(f.index), selected = view();
  try {
    /** Submit one new root request for the supplied exact tuple. */
    const request = (input = selected, family = 'values') => f.index.prepareSemanticScope(/** Keep the raw visit within the request's async lineage. */ () => f.repository.visitFamily(input, family));
    await request(); await request();
    f.index.publicationRevision++; await request();
    await request(view('head-two'));
    await request(view('head-one', 'different-private-owner.md'));
    await request(selected, 'metadata');
    const raw = probe.snapshot().rawFamilies;
    assert.equal(raw.repeats.attempted.first, 4);
    assert.equal(raw.repeats.ready.first, 4);
    assert.equal(raw.repeats.attempted.otherRequestSamePublication, 1);
    assert.equal(raw.repeats.attempted.otherRequestChangedPublication, 1);
    assert.equal(raw.repeats.ready.otherRequestChangedPublication, 1);
    assert.equal(raw.scope.tuples, 4);
    assert.equal(probe.snapshot().scope.tuples, 0);
  } finally { probe.stop(); }
});

test('raw failed/held visits preserve errors and cannot mutate counters after stop', /** Completion outcomes remain diagnostic even when selected work is rejected or superseded. */ async () => {
  const f = fixture(), probe = createProbe(f.index), selected = view(), error = new Error('fixture rejection');
  let release;
  try {
    f.setVisit(/** A resolved non-ready family is not a ready completion. */ () => Promise.resolve('invalid-frame'));
    await f.repository.visitFamily(selected, 'values');
    f.setVisit(/** Preserve the exact rejecting product promise. */ () => Promise.reject(error));
    await assert.rejects(f.repository.visitFamily(selected, 'values'), /** Check exception identity without exposing its contents. */ failure => failure === error);
    f.setVisit(/** Preserve synchronous product exceptions as well. */ () => { throw error; });
    assert.throws(/** Invoke the original synchronous failure through the observer. */ () => f.repository.visitFamily(selected, 'values'), /** Require the same product exception. */ failure => failure === error);
    const held = new Promise(/** Hold only fixture completion, independently of the observer lifetime. */ resolve => { release = resolve; });
    f.setVisit(/** Return the held product promise unchanged. */ () => held);
    assert.equal(f.repository.visitFamily(selected, 'values'), held);
    f.index.publicationRevision++;
    const stopped = probe.stop(), frozen = JSON.stringify(stopped);
    assert.equal(stopped.rawFamilies.notReady, 1);
    assert.equal(stopped.rawFamilies.rejected, 1);
    assert.equal(stopped.rawFamilies.thrown, 1);
    assert.equal(stopped.rawFamilies.ready, 0);
    assert.equal(stopped.rawFamilies.pendingAtStop, 1);
    release('ready'); await held;
    assert.equal(JSON.stringify(probe.snapshot()), frozen);
    assert.equal(JSON.stringify(probe.stop()), frozen);
  } finally { release?.('ready'); probe.stop(); }
});

test('raw map/byte and pending-visit limits expose losses without consuming authenticated capacity', /** Bound deliberately dense diagnostic inputs and release every held producer. */ async () => {
  const f = fixture(), probe = createProbe(f.index), pending = [], releases = [];
  try {
    for (let n = 0; n < 4200; n++) {
      await f.repository.visitFamily(view('head-' + n), 'values');
    }
    const limited = probe.snapshot();
    assert(limited.rawFamilies.scope.tuples <= 4096);
    assert(limited.rawFamilies.scope.tupleBytes <= 2 * 1024 * 1024);
    assert(limited.rawFamilies.dropped.tuples > 0);
    assert.equal(limited.scope.tuples, 0);
    f.setVisit(/** Manufacture pending original work to exercise only diagnostic admission loss. */ () => new Promise(/** Keep release handles outside observer state. */ resolve => releases.push(resolve)));
    for (let n = 0; n < 4100; n++) pending.push(f.repository.visitFamily(view(), 'values'));
    const full = probe.snapshot();
    assert.equal(full.rawFamilies.scope.pendingVisits, 4096);
    assert.equal(full.rawFamilies.dropped.pendingVisits, 4);
    assert.equal(full.rawFamilies.completionUntracked, 4);
    probe.stop();
    for (const release of releases) release('ready');
    await Promise.all(pending);
    assert.equal(probe.snapshot().rawFamilies.pendingAtStop, 4096);
  } finally { for (const release of releases) release('ready'); probe.stop(); }
});

test('raw source-byte limits and invalid prevalidation fields never consume authenticated identities', /** Exercise byte rejection before tuple serialization without publishing private input. */ async () => {
  const f = fixture(), probe = createProbe(f.index);
  try {
    for (let n = 0; n < 80; n++) await f.repository.visitFamily(view('head', 'private-' + n + '-'.repeat(16000)), 'values');
    const bad = view();
    bad.head.sourceRevision = {/** Unvalidated containers must be rejected without invoking serialization hooks. */
      toJSON() { throw new Error('Observer must not serialize this value'); }};
    await f.repository.visitFamily(bad, 'values');
    const snapshot = probe.snapshot();
    assert(snapshot.rawFamilies.scope.sourceBytes <= 2 * 1024 * 1024);
    assert(snapshot.rawFamilies.dropped.sources > 0);
    assert(snapshot.rawFamilies.dropped.invalidIdentities > 0);
    assert.equal(snapshot.scope.sources, 0);
    assert.equal(snapshot.errors, 0);
    assert(!JSON.stringify(snapshot).includes('private-'));
  } finally { probe.stop(); }
});

test('raw memory selections accept null sequence and remain distinct from disk selections', /** Preserve exact optional sequence identity without treating memory as disk authority. */ async () => {
  const f = fixture(), probe = createProbe(f.index), memory = view(), disk = view();
  memory.sequence = null;
  try {
    await f.index.prepareSemanticScope(/** Observe a valid in-memory selected family. */ () => f.repository.visitFamily(memory, 'values'));
    await f.index.prepareSemanticScope(/** The same head at a disk sequence is a distinct raw identity. */ () => f.repository.visitFamily(disk, 'values'));
    const raw = probe.snapshot().rawFamilies;
    assert.equal(raw.ready, 2);
    assert.equal(raw.scope.tuples, 2);
    assert.equal(raw.repeats.attempted.first, 2);
    assert.equal(raw.dropped.invalidIdentities, 0);
  } finally { probe.stop(); }
});

test('raw unattributed predecessors cannot be classified as another known request', /** Publication equality never manufactures missing request membership. */ async () => {
  const f = fixture(), probe = createProbe(f.index), selected = view();
  try {
    await f.repository.visitFamily(selected, 'values');
    await f.index.prepareSemanticScope(/** Supply known lineage only for the later occurrence. */ () => f.repository.visitFamily(selected, 'values'));
    const raw = probe.snapshot().rawFamilies;
    assert.equal(raw.repeats.attempted.membershipUnknown, 1);
    assert.equal(raw.repeats.ready.membershipUnknown, 1);
    assert.equal(raw.repeats.attempted.otherRequestSamePublication, 0);
    assert.equal(raw.repeats.ready.otherRequestSamePublication, 0);
    assert.equal(raw.repeats.attempted.otherRequestChangedPublication, 0);
  } finally { probe.stop(); }
});

test('raw ready completion grants no authentication when the whole selected read fails', /** A successful family is not a successful selection lifetime. */ async () => {
  const f = fixture(), probe = createProbe(f.index), selected = view();
  try {
    await f.index.prepareSemanticScope(/** Finish the enclosing read as cancelled after its family succeeds. */ () =>
      f.repository.readSelected(/** Observe an ordinary ready family inside the failed selection. */ () => f.repository.visitFamily(selected, 'values'), 'cancelled'));
    const snapshot = probe.snapshot();
    assert.equal(snapshot.rawFamilies.ready, 1);
    assert.equal(snapshot.rawFamilies.insideSelectedRead, 1);
    assert.equal(snapshot.coverage.authenticatedReads, 0);
    assert.equal(snapshot.coverage.authenticatedFamilies, 0);
    assert.equal(snapshot.scope.tuples, 0);
  } finally { probe.stop(); }
});

test('raw visits report publication changes before their completion', /** Keep admission and completion publication observations distinct. */ async () => {
  const f = fixture(), probe = createProbe(f.index), selected = view();
  let release;
  const held = new Promise(/** Hold original completion while the publication observation advances. */ resolve => { release = resolve; });
  try {
    f.setVisit(/** The observer must preserve this pending product promise. */ () => held);
    const result = f.index.prepareSemanticScope(/** Capture a known request before publication changes. */ () => f.repository.visitFamily(selected, 'values'));
    assert.equal(result, held);
    f.index.publicationRevision++; release('ready'); await result;
    const raw = probe.snapshot().rawFamilies;
    assert.equal(raw.publicationChangedDuringVisit, 1);
    assert.equal(raw.ready, 1);
    assert.equal(raw.publicationUnknown, 0);
    assert.equal(probe.snapshot().coverage.authenticatedFamilies, 0);
  } finally { release?.('ready'); probe.stop(); }
});
