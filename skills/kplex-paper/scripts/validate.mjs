/** Source-backed skill contract checks. Bundles the real portable owners without host doubles,
 * writes no build artifacts and never reads or changes a personal vault. Run with Node's test runner
 * from a K-Plex checkout with its normal esbuild dependency installed. */
import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const entries = [
  'src/core/plex/sharing/validation.ts',
  'src/core/plex/sharing/transfer.ts',
  'src/core/plex/views/facets/classification.ts',
  'src/core/plex/views/facets/rules.ts',
  'src/core/plex/predicateParser.ts',
  'src/paper/PaperIdentifier.ts',
  'src/paper/PaperNoteBuilder.ts',
  'src/index/SectionContent.ts',
];
const bundle = await build({stdin: {resolveDir: root, contents: entries.map(path => `export * from './${path}';`).join('\n')},
  write: false, bundle: true, format: 'esm', platform: 'node'});
const M = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);
const pkg = JSON.parse(readFileSync(new URL('../presets/paper-roles.json', import.meta.url), 'utf8'));
const fixtures = JSON.parse(readFileSync(new URL('../evals/fixtures.json', import.meta.url), 'utf8'));

/** Supply finite immutable property availability to the real classifier, without any native host. */
function propertyRead(value, status = 'available', pending = false) {
  return {isCurrent: () => true, scope: () => ({pending}),
    properties: {read: () => ({status, value}), availability: () => status}};
}
const node = {id: 'fixture-paper', kind: 'document', path: 'fixture.md', file: {extension: 'md'}};

test('portable preset passes canonical admission, private-content check and exact round-trip', () => {
  const admitted = M.validatePortablePackage(JSON.stringify(pkg));
  assert.equal(admitted.status, 'valid', JSON.stringify(admitted));
  assert.deepEqual(admitted.value, pkg);
  assert.deepEqual(admitted.privacy, []);
  assert.deepEqual(M.validatePortablePackage(JSON.stringify(admitted.value)).value, pkg);
});

test('admission refuses missing Help, unsupported fields and invalid rules', () => {
  const missing = structuredClone(pkg); delete missing.preset.helpMarkdown;
  assert.equal(M.validatePortablePackage(missing).status, 'invalid');
  assert.equal(M.validatePortablePackage({...pkg, enabled: true}).status, 'invalid');
  const rules = structuredClone(pkg); rules.preset.source = 'rules';
  for (const category of Object.values(rules.preset.categories)) category.rule = 'fetch("https://example.org")';
  assert.equal(M.validatePortablePackage(rules).status, 'invalid');
});

test('each English/Chinese role is exclusive; missing, unknown, case and multi-role values retain diagnostics', () => {
  for (const id of pkg.preset.order) {
    for (const value of pkg.preset.categories[id].values) {
      assert.deepEqual(M.classifyFacetValues(value, pkg.preset), {status: 'assigned', category: id});
    }
  }
  for (const value of [undefined, null, '', 'unknown', 'METHOD']) {
    assert.deepEqual(M.classifyFacetValues(value, pkg.preset), {status: 'unassigned'});
  }
  assert.deepEqual(M.classifyFacetValues(['method', '方法'], pkg.preset), {status: 'assigned', category: 'method'});
  assert.deepEqual(M.classifyFacetValues(['method', 'application'], pkg.preset), {status: 'conflicting', categories: ['method', 'application']});
  assert.deepEqual(M.classifyFacetNode(node, propertyRead(undefined), pkg.preset), {status: 'unassigned'});
  assert.deepEqual(M.classifyFacetNode(node, propertyRead(undefined, 'unavailable'), pkg.preset), {status: 'unresolved', reason: 'metadata'});
  assert.deepEqual(M.classifyFacetNode(node, propertyRead(undefined, 'unavailable', true), pkg.preset), {status: 'checking'});
});

test('current parser supports bracket properties; former blanket Paper fallback demonstrably conflicts', () => {
  assert(M.tryParseGraphPredicateExpression('note["Paper role"] == "method"').expression);
  const overlap = structuredClone(pkg.preset); overlap.source = 'rules';
  for (const [id, category] of Object.entries(overlap.categories)) category.rule = `note["Paper role"] == "${id}"`;
  overlap.categories.application.rule += ' || note["Note type"] == "Paper"';
  const read = propertyRead(); read.properties.read = (_id, field) => ({status: 'available', value: field === 'Paper role' ? 'method' : 'Paper'});
  const classify = M.facetRuleClassifier(read, node, M.compileFacetRules(overlap));
  assert.deepEqual(classify.classify(node, []), {status: 'conflicting', categories: ['method', 'application']});
});

test('actual import plan preserves unrelated state, requires explicit collision choice and supports repeat replacement', () => {
  const state = {presets: {existing: {custom: 'untouched'}}, lenses: [], palette: []};
  const before = structuredClone(state);
  const choices = {targetId: pkg.id, replace: false, lensIds: [], replacePalette: []};
  const result = M.applyPortableImport(M.preparePortableImport(pkg, choices, state), state);
  assert.deepEqual(state, before);
  assert.deepEqual(result.preset, pkg.preset);
  assert.deepEqual(result.lenses, []);
  assert.equal(result.enabled, undefined);
  const installed = {...state, presets: {...state.presets, [pkg.id]: result.preset}};
  assert.throws(() => M.preparePortableImport(pkg, choices, installed), /explicitly/);
  const rerun = M.applyPortableImport(M.preparePortableImport(pkg, {...choices, replace: true}, installed), installed);
  assert.deepEqual(rerun.preset, pkg.preset);
  assert.deepEqual(installed.presets.existing, before.presets.existing);
});

test('custom note-type property and missing identifiers follow real paper builder contracts', () => {
  const record = fixtures.metadataOnly.record;
  const fm = M.paperFrontmatter(record, fixtures.customOntology.styleField, 'Paper');
  assert.equal(fm['文献类型'], 'Paper');
  assert.equal(fm['Note type'], undefined);
  assert.equal(fm.doi, undefined); assert.equal(fm.arxiv, undefined); assert.equal(fm.year, undefined);
  assert.equal(fm.citations, undefined);
  assert.equal(M.paperNoteBody(record, null, 'sections', 'zh-CN'), '');
});

test('normalized identity, existing metadata and abstract sections survive a second run', () => {
  assert.deepEqual(M.parsePaperId('https://arxiv.org/abs/1706.03762v7'), {kind: 'arxiv', value: '1706.03762'});
  assert.deepEqual(M.parsePaperId('https://doi.org/10.1000/ABC'), {kind: 'doi', value: '10.1000/abc'});
  const existing = fixtures.rerun.existing;
  const before = structuredClone(existing);
  const record = {...fixtures.metadataOnly.record, ids: [{kind: 'doi', value: '10.1000/fixture'}], abstract: 'Synthetic abstract for contract testing only.'};
  const missing = M.missingPaperProperties(existing, record);
  assert.equal(missing.title, undefined); assert.equal(missing.doi, undefined); assert.equal(missing.aliases, undefined);
  assert.deepEqual(existing, before);
  const body = '# Reader notes\n\nPreserve this annotation.\n';
  const first = M.appendAbstractSections(body, record.abstract, null, 'sections', 'zh-CN');
  assert(first.startsWith(body));
  assert.equal(M.appendAbstractSections(first, record.abstract, null, 'sections', 'zh-CN'), null);
});

test('documented note syntax reaches native Section parser; Mermaid fences do not become images', () => {
  const section = M.extractSectionContent(fixtures.sectionMarkdown);
  assert.equal(section.highlights.length, 1);
  assert.deepEqual(section.highlights[0].comments, ['读者评论：仅用于语法验证']);
  assert.equal(section.figures.length, 2);
  assert.equal(section.figures[0].caption, 'Figure 1: Synthetic caption for parser testing.');
  assert.equal(section.figures[1].caption, 'Table 1: Synthetic table caption.');
  assert.match(M.sectionPanelSpeechText(section, false), /读者评论/);
  assert.match(M.sectionPanelSpeechText(section, true), /Synthetic table caption/);
});
