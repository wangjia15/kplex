/** Bounded explicit field transforms use the same portable policy for drop, accessible action
 * and guarded undo. Native mutation/convergence is tested at its separate existing host owner. */
import {legacyWuXingPreset} from './support/facetPresetArchive.mjs';
import assert from 'node:assert/strict';
import test from 'node:test';
import {loadPortableModules} from './support/portableTypeScript.mjs';
const {exports:M}=loadPortableModules(['src/core/plex/views/propertyAssignment.ts','src/core/plex/views/facets/assignment.ts',
 'src/core/plex/views/facets/templates.ts']);
const configuration=presets=>({status:'available',values:{presets}});
const targets=(preset=legacyWuXingPreset(M.FACET_TEMPLATES.wuxing),state={version:1,preset:'wuxing'})=>M.facetPropertyAssignments(state,configuration({wuxing:preset}));
const metal=()=>targets().find(row=>row.value==='metal'),clear=()=>targets().find(row=>row.value===undefined);
const present=value=>({present:true,value});

test('all eight templates grant targets only to explicit property presets, retaining safe clear',()=>{
 for(const [id,preset]of Object.entries(M.FACET_TEMPLATES)){
  const entries=M.facetPropertyAssignments({version:1,preset:id},configuration({}));
  if(preset.source!=='property'){assert.deepEqual(entries,[],id+' rules/type/tag preset must not acquire property write authority');continue;}
  assert.equal(entries.length,preset.order.length+1);assert(entries.every(M.validPropertyAssignment));
  assert(entries.every(entry=>entry.field===preset.field));assert.equal(entries.at(-1).value,undefined);
  assert.equal(new Set(entries.map(entry=>entry.id)).size,entries.length);
 }
});

test('type/tag/computed/future/missing intent never borrows a fallback property-write capability',()=>{
 for(const source of ['type','tag','rules'])assert.deepEqual(targets({...legacyWuXingPreset(M.FACET_TEMPLATES.wuxing),source}),[]);
 for(const state of [{version:9,preset:'wuxing'},{version:1,preset:'future'},'malformed'])assert.deepEqual(targets(undefined,state),[]);
 assert.deepEqual(M.facetPropertyAssignments(null,{status:'unavailable',reason:'unsupported'}),[]);
});

test('a canonical assignment must be recognized exclusively by its destination category',()=>{
 const preset=structuredClone(legacyWuXingPreset(M.FACET_TEMPLATES.wuxing));preset.categories.water.assignment='not-recognized';
 assert(!targets(preset).some(row=>row.value==='not-recognized'));
 preset.categories.water.assignment='water';preset.categories.metal.values.push('water');
 assert(!targets(preset).some(row=>row.value==='water'),'Conflicting canonical value grants no assignment authority');
 delete preset.categories.wood.assignment;assert(!targets(preset).some(row=>row.id.includes('wood')));
});

test('scalar assignment changes only the configured field and preserves exact alias no-ops',()=>{
 assert.deepEqual(M.planPropertyAssignment(present('water'),metal()).after,present('metal'));
 assert.deepEqual(M.planPropertyAssignment({present:false},metal()).after,present('metal'));
 const target={...metal(),matching:['metal','Method'],recognized:[...metal().recognized,'Method']};
 for(const value of ['metal',' Method ','Method'])assert.equal(M.planPropertyAssignment(present(value),target).status,'unchanged');
 assert.equal(M.planPropertyAssignment(present('method'),target).status,'changed','Case remains exact');
});

test('list assignment retains order, list shape and unrelated primitive values while replacing all recognized memberships',()=>{
 const before=present(['water','custom',17,true,null,'fire','water']);
 const result=M.planPropertyAssignment(before,metal());assert.equal(result.status,'changed');
 assert.deepEqual(result.after,present(['custom',17,true,null,'metal']));
 assert.deepEqual(before.value,['water','custom',17,true,null,'fire','water']);
 const alias={...metal(),matching:['metal','Method'],recognized:[...metal().recognized,'Method']};
 assert.equal(M.planPropertyAssignment(present(['custom','Method','metal']),alias).status,'unchanged');
});

test('Unassigned removes only recognized memberships and retains empty lists or unrecognized scalar content',()=>{
 assert.deepEqual(M.planPropertyAssignment(present(['water','unknown','fire']),clear()).after,present(['unknown']));
 assert.deepEqual(M.planPropertyAssignment(present(['water']),clear()).after,present([]));
 assert.deepEqual(M.planPropertyAssignment(present('water'),clear()).after,{present:false});
 for(const before of [present('unknown'),{present:false},present(null),present([])])assert.equal(M.planPropertyAssignment(before,clear()).status,'unchanged');
});

test('nested/incompatible/oversized metadata stays read-only without partial transformations',()=>{
 for(const value of [42,true,{phase:'water'},[['water']],['water',{}],Array(257).fill('water'),'x'.repeat(4097)])
  assert.equal(M.planPropertyAssignment(present(value),metal()).status,'unsupported');
 assert.equal(M.planPropertyAssignment(present(Array(16).fill('x'.repeat(4096))),metal()).reason,'budget');
});

test('reserved and configured semantic fields cannot be disguised by case or normalization',()=>{
 for(const field of ['tags','TAG','Aliases','cssclasses','position','__proto__','constructor','prototype',' phase','phase\n'])
  assert.equal(M.writableAssignmentField(field),false,field);
 assert.equal(M.writableAssignmentField('Parents',['parents']),false);
 assert.equal(M.writableAssignmentField('Note type',['note-type']),false);
 assert.equal(M.writableAssignmentField('State',['parents','Note type']),true);
});

test('current native field coordinates preserve spelling and reject ambiguous equivalent keys',()=>{
 assert.deepEqual(M.assignmentField({Phase:'water',other:1},'phase'),{key:'Phase',snapshot:present('water')});
 assert.equal(M.assignmentField({phase:'water',Phase:'metal'},'phase'),null);
 assert.deepEqual(M.assignmentField({},'phase'),{key:'phase',snapshot:{present:false}});
});

test('native callback applies one exact planned field and guarded undo refuses a later edit',()=>{
 const frontmatter={title:'Keep',Phase:['water','private'],parents:['[[A]]']},before=structuredClone(frontmatter);
 const plan=M.planPropertyAssignment(present(frontmatter.Phase),metal());M.applyPropertyField(frontmatter,'phase',plan.before,plan.after);
 assert.deepEqual(frontmatter,{...before,Phase:['private','metal']});assert.deepEqual(Object.keys(frontmatter),Object.keys(before));
 M.applyPropertyField(frontmatter,'phase',plan.after,plan.before);assert.deepEqual(frontmatter,before);
 frontmatter.Phase=['Later edit'];assert.throws(()=>M.applyPropertyField(frontmatter,'phase',plan.after,plan.before));
 assert.deepEqual(frontmatter.Phase,['Later edit']);
});

test('new fields append and an applied absent-field undo removes only that added coordinate',()=>{
 const frontmatter={title:'Keep',parents:['[[A]]']},before=structuredClone(frontmatter),plan=M.planPropertyAssignment({present:false},metal());
 M.applyPropertyField(frontmatter,'phase',plan.before,plan.after);assert.deepEqual(Object.keys(frontmatter),['title','parents','phase']);
 M.applyPropertyField(frontmatter,'phase',plan.after,plan.before);assert.deepEqual(frontmatter,before);
});

test('native callback copies admitted lists and rejects unplanned nested values without a host clone API',()=>{
 const frontmatter={phase:'wood'},value=['metal','private',17,true,null];
 M.applyPropertyField(frontmatter,'phase',present('wood'),present(value));
 assert.deepEqual(frontmatter.phase,value);assert.notEqual(frontmatter.phase,value);
 value.push('later');assert.equal(frontmatter.phase.length,5);
 for(const proposed of [{phase:'fire'},[['fire']],undefined]){
  assert.throws(()=>M.applyPropertyField(frontmatter,'phase',present(frontmatter.phase),present(proposed)));
  assert.deepEqual(frontmatter.phase,['metal','private',17,true,null]);
 }
});

test('runtime target bounds reject arbitrary or oversized field-write proposals',()=>{
 for(const target of [{...metal(),id:'x'.repeat(129)},{...metal(),recognized:Array(3585).fill('x')},{...metal(),matching:Array(513).fill('x')},
  {...metal(),recognized:[{}]},{...metal(),field:'tags'},{...metal(),value:''}])assert.equal(M.validPropertyAssignment(target),false);
});
