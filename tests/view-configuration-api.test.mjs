/** Exercise real versioned/scoped configuration operations; persistence and native synchronization
 * use their separate actual-host browser lane. Unknown values are inert, never replacement defaults. */
import assert from 'node:assert/strict';
import test from 'node:test';
import {loadPortableModules} from './support/portableTypeScript.mjs';
const {exports:M}=loadPortableModules(['src/core/plex/views/configuration.ts']);
/** Small JSON library represents independently editable presets without a test-only settings owner. */
function definition(version=1,migrations){return{id:'org.example.facets',configuration:{version,migrations,fields:{
 library:{defaultValue:{alpha:{name:'Alpha',colors:['red','blue']},beta:{name:'Beta',colors:['green']}},validate:value=>!!value&&typeof value==='object'&&!Array.isArray(value)&&Object.values(value).every(row=>row&&typeof row.name==='string'&&Array.isArray(row.colors))},
 spacing:{defaultValue:24,validate:value=>typeof value==='number'&&Number.isFinite(value)&&value>=12&&value<=200},
}}};}
/** Save one effective field while preserving a bounded opaque future namespace. */
function stored(d=definition()){return{[d.id]:{version:d.configuration.version,opaque:'retain',values:{spacing:32,unknownFuture:{enabled:true},library:structuredClone(d.configuration.fields.library.defaultValue)}},'future.extension':{version:9,values:{untouched:['data']}}};}

test('defaults remain read-only and old scalar edits retain their public API',()=>{
 const d=definition(),empty={};assert.equal(M.readViewConfiguration(d,empty).values.spacing,24);assert.deepEqual(empty,{});
 const next=M.editViewConfiguration(d,empty,'spacing',40);assert.deepEqual(next,{[d.id]:{version:1,values:{spacing:40}}});assert.deepEqual(empty,{});
});

test('optional entry defaults seed only the edited entry and rebase leaf edits',()=>{
 const d=definition();Object.assign(d.configuration.fields.library,{entries:true,inheritEntries:true});
 M.validateViewConfigurationSchema(d.configuration);
 const fresh=M.editViewConfigurationAt(d,{}, {field:'library',path:['alpha','name']},{kind:'set',value:'Fresh'});
 assert.deepEqual(fresh[d.id].values.library,{alpha:{name:'Fresh',colors:['red','blue']}},'Fresh fields materialize only the addressed entry');
 const initial=stored(d);initial[d.id].values.library={};const before=structuredClone(initial);
 const a={field:'library',path:['alpha','name']},b={field:'library',path:['beta','colors']};
 const expected=M.readViewConfigurationAt(d,initial,a);assert.deepEqual(expected,{present:true,value:'Alpha'});
 assert.deepEqual(M.readViewConfiguration(d,initial).values.library,{});assert.deepEqual(initial,before);
 let next=M.editViewConfigurationAt(d,initial,b,{kind:'set',value:['violet']});
 assert.deepEqual(Object.keys(next[d.id].values.library),['beta']);
 next=M.editViewConfigurationAt(d,next,a,{kind:'set',value:'Renamed'},expected);
 assert.deepEqual(next[d.id].values.library.alpha,{name:'Renamed',colors:['red','blue']});
 assert.deepEqual(next[d.id].values.library.beta.colors,['violet']);assert.deepEqual(initial,before);
 next[d.id].values.library.alpha={name:'Future',colors:[]};
 assert.deepEqual(M.readViewConfigurationAt(d,next,{field:'library',path:['alpha','absent']}),{present:false});
 const bad=definition();bad.configuration.fields.library.inheritEntries=true;
 assert.throws(()=>M.validateViewConfigurationSchema(bad.configuration));
});

test('increasing migrations preserve unknown values, detach inputs and become idempotent when committed',()=>{
 let calls=0;const d=definition(2,[{from:1,to:2,migrate:values=>{calls++;return{...values,spacing:values.oldSpacing}}}]);
 const original={[d.id]:{version:1,opaque:'wrapper',values:{oldSpacing:70,unknownFuture:{x:1}}}},before=structuredClone(original);
 assert.equal(M.readViewConfiguration(d,original).values.spacing,70);assert.deepEqual(original,before);
 const migrated=M.migrateViewConfiguration(d,original);assert.equal(migrated.status,'migrated');assert.equal(migrated.settings[d.id].version,2);assert.equal(migrated.settings[d.id].opaque,'wrapper');assert.deepEqual(migrated.settings[d.id].values.unknownFuture,{x:1});
 const count=calls;assert.equal(M.migrateViewConfiguration(d,migrated.settings).status,'unchanged');assert.equal(calls,count);assert.deepEqual(original,before);
 const edited=M.editViewConfiguration(d,original,'spacing',80);assert.equal(edited[d.id].version,2);assert.equal(edited[d.id].values.oldSpacing,70);
});

test('failed, invalid and asynchronous migrations preserve the original payload and expose recovery',()=>{
 for(const migrate of [values=>{values.oldSpacing=1;throw Error('Expected migration failure')},()=>({spacing:-1}),()=>({padding:'x'.repeat(17000)}),()=>Promise.resolve({spacing:30})]){
  const d=definition(2,[{from:1,to:2,migrate}]),original={[d.id]:{version:1,values:{oldSpacing:44}}},before=structuredClone(original);
  const outcome=M.migrateViewConfiguration(d,original);assert.equal(outcome.status,'unavailable');assert.equal(outcome.reason,'migration-failed');assert.equal(outcome.original,original);assert.deepEqual(original,before);
  assert.equal(M.readViewConfiguration(d,original).reason,'migration-failed');
  assert.throws(()=>M.editViewConfiguration(d,original,'spacing',30));assert.deepEqual(original,before);
 }
});

test('future/missing extension settings remain inert; reset cannot downgrade them',()=>{
 const d=definition(),original=stored(d);original[d.id].version=8;const before=structuredClone(original);
 assert.deepEqual(M.readViewConfiguration(d,original),{status:'unavailable',reason:'unsupported'});assert.equal(M.migrateViewConfiguration(d,original).original,original);
 assert.throws(()=>M.resetViewConfiguration(d,original));assert.throws(()=>M.editViewConfiguration(d,original,'spacing',30));assert.deepEqual(original,before);
 const missing={id:'not.installed'};assert.equal(M.migrateViewConfiguration(missing,original).status,'unchanged');assert.deepEqual(original,before);
 const removed=M.removeViewConfiguration(original,d.id);assert.deepEqual(removed,{'future.extension':original['future.extension']});assert.deepEqual(original,before);
});

test('scoped queued edits preserve another preset, unknown fields and another view',()=>{
 const d=definition(),initial=stored(d),a={field:'library',path:['alpha','name']},b={field:'library',path:['beta','colors']};
 const expected=M.readViewConfigurationAt(d,initial,a);
 let next=M.editViewConfigurationAt(d,initial,b,{kind:'set',value:['violet','green']});
 next=M.editViewConfigurationAt(d,next,a,{kind:'set',value:'Renamed'},expected);
 assert.equal(next[d.id].values.library.alpha.name,'Renamed');assert.deepEqual(next[d.id].values.library.beta.colors,['violet','green']);assert.equal(next[d.id].opaque,'retain');assert.deepEqual(next[d.id].values.unknownFuture,{enabled:true});assert.deepEqual(next['future.extension'],initial['future.extension']);assert.equal(initial[d.id].values.library.alpha.name,'Alpha');
});

test('a stale leaf cannot overwrite a newer edit, while unrelated edits remain acceptable',()=>{
 const d=definition(),initial=stored(d),a={field:'library',path:['alpha','name']},old=M.readViewConfigurationAt(d,initial,a);
 const changed=M.editViewConfigurationAt(d,initial,a,{kind:'set',value:'Other editor'});
 assert.throws(()=>M.editViewConfigurationAt(d,changed,a,{kind:'set',value:'Stale editor'},old),/changed/);
 const elsewhere=M.editViewConfiguration(d,initial,'spacing',90);assert.equal(M.editViewConfigurationAt(d,elsewhere,a,{kind:'set',value:'Current'},old)[d.id].values.spacing,90);
});

test('explicit reset has a precise scope and preserves other presets, views and unknown fields',()=>{
 const d=definition(),initial=stored(d),a={field:'library',path:['alpha','name']};
 let next=M.editViewConfigurationAt(d,initial,a,{kind:'set',value:'Changed'});next=M.editViewConfigurationAt(d,next,{field:'library',path:['beta','name']},{kind:'set',value:'Other'});
 const reset=M.resetViewConfiguration(d,next,a);assert.equal(reset[d.id].values.library.alpha.name,'Alpha');assert.equal(reset[d.id].values.library.beta.name,'Other');assert.equal(reset[d.id].values.spacing,32);assert.deepEqual(reset['future.extension'],initial['future.extension']);
 const viewReset=M.resetViewConfiguration(d,next);assert.equal(viewReset[d.id].values.spacing,24);assert.deepEqual(viewReset[d.id].values.unknownFuture,{enabled:true});assert.equal(viewReset[d.id].opaque,'retain');
});

test('resetting a declared entry collection retains additional presets instead of deleting them',()=>{
 const d=definition();d.configuration.fields.library.entries=true;const initial=stored(d);
 initial[d.id].values.library.custom={name:'User preset',colors:['orange']};initial[d.id].values.library.alpha.name='Edited';
 for(const address of [undefined,{field:'library'}]){
  const next=M.resetViewConfiguration(d,initial,address);assert.equal(next[d.id].values.library.alpha.name,'Alpha');assert.deepEqual(next[d.id].values.library.custom,initial[d.id].values.library.custom);assert.deepEqual(next[d.id].values.unknownFuture,{enabled:true});
 }
});

test('array removals are explicit, bounded and immutable; root field removal inherits defaults',()=>{
 const d=definition(),initial=stored(d),address={field:'library',path:['alpha','colors',0]};
 const next=M.editViewConfigurationAt(d,initial,address,{kind:'remove'});assert.deepEqual(next[d.id].values.library.alpha.colors,['blue']);assert.deepEqual(initial[d.id].values.library.alpha.colors,['red','blue']);
 const inherited=M.editViewConfigurationAt(d,initial,{field:'spacing'},{kind:'remove'});assert.equal(M.readViewConfiguration(d,inherited).values.spacing,24);assert.equal(Object.hasOwn(inherited[d.id].values,'spacing'),false);
});

test('unsafe, unavailable and oversized addresses fail without traversing foreign fields',()=>{
 const d=definition(),initial=stored(d);
 for(const address of [{field:'__proto__'},{field:'missing'},{field:'library',path:['constructor']},{field:'library',path:['__proto__']},{field:'library',path:['../alpha']},{field:'library',path:['alpha','colors',4096]},{field:'library',path:Array(7).fill('a')},{field:'library',path:['missing','name']}])assert.throws(()=>M.editViewConfigurationAt(d,initial,address,{kind:'set',value:'x'}));
 assert.deepEqual(M.readViewConfigurationAt(d,initial,{field:'missing'}),{present:false});assert.equal({}.polluted,undefined);
});

test('configuration size/depth/collection guards remain finite and never truncate user data',()=>{
 const d=definition(),initial=stored(d);assert.equal(M.VIEW_CONFIGURATION_LIMITS.encodedCharacters,16384);assert.equal(M.VIEW_CONFIGURATION_LIMITS.depth,8);
 assert.throws(()=>M.editViewConfigurationAt(d,initial,{field:'library',path:['alpha','name']},{kind:'set',value:'x'.repeat(17000)}));
 const fields=Object.fromEntries(Array.from({length:64},(_,n)=>['unknown'+n,n]));const full={[d.id]:{version:1,values:fields}};assert.throws(()=>M.editViewConfiguration(d,full,'spacing',32));assert.equal(Object.keys(full[d.id].values).length,64);
 const map=Object.fromEntries(Array.from({length:32},(_,n)=>['owner.view'+n,{version:9}]));assert.throws(()=>M.editViewConfiguration(d,map,'spacing',30));assert.equal(Object.keys(map).length,32);
});

test('registration refuses ambiguous/non-increasing migration chains and invalid defaults',()=>{
 for(const migrations of [[{from:1,to:1,migrate:v=>v}],[{from:1,to:2,migrate:v=>v},{from:1,to:2,migrate:v=>v}],[{from:2,to:1,migrate:v=>v}]])assert.throws(()=>M.validateViewConfigurationSchema(definition(2,migrations).configuration));
 const gap=definition(3,[{from:2,to:3,migrate:v=>v}]);assert.equal(M.readViewConfiguration(gap,{[gap.id]:{version:1,values:{}}}).reason,'unsupported');
 const bad=definition();bad.configuration.fields.spacing.defaultValue=Infinity;assert.throws(()=>M.validateViewConfigurationSchema(bad.configuration));
});
