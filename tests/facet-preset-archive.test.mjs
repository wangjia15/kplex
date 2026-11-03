/** Retired presets remain ordinary portable packages, admitted by the same production owner. */
import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {loadPortableModules} from './support/portableTypeScript.mjs';
import {archivedFacetPresets} from './support/facetPresetArchive.mjs';
const h=loadPortableModules(['src/core/plex/sharing/validation.ts','src/core/plex/sharing/transfer.ts','src/core/plex/views/facets/templates.ts',
 'src/core/plex/views/facets/configuration.ts','src/core/plex/views/facets/state.ts','src/core/plex/views/configuration.ts',
 'src/core/plex/views/facets/classification.ts','src/core/plex/views/facets/layout.ts','src/core/plex/views/facets/labels.ts']);
const M=h.exports;
const files={arc:['arc','arc',3],para:['para','para',4],'gtd-horizons':['gtd','horizon',6],eaccess:['eaccess','access',7],sensemaking:['sensemaking','sensemaking',4],'publishing-pipeline':['publishing','state',5]};
for(const [file,[id,field,count]]of Object.entries(files))test(`archived ${id} retains a complete independently importable definition`,()=>{
 const pkg=JSON.parse(readFileSync(`presets/facets/${file}.json`,'utf8')),result=M.validatePortablePackage(pkg);
 assert.equal(result.status,'valid');assert.equal(pkg.kind,'facets');assert.equal(pkg.id,id);assert.equal(pkg.preset.field,field);assert.equal(pkg.preset.order.length,count);
 assert(pkg.preset.helpMarkdown.length>500);assert.equal(pkg.preset.helpSourceLocale,'en');assert.equal(pkg.lenses,undefined);assert.equal(pkg.palette,undefined);
 for(const category of Object.values(pkg.preset.categories)){assert(category.label&&!category.label.startsWith('facets.'));assert(category.values.length>0);assert(category.color);}
 const state={presets:{},lenses:[],palette:[]},plan=M.preparePortableImport(result.value,{targetId:id,replace:false,lensIds:[],replacePalette:[]},state),installed=M.applyPortableImport(plan,state);
 assert.deepEqual(installed.preset,pkg.preset);assert.deepEqual(state,{presets:{},lenses:[],palette:[]});assert.deepEqual(installed.lenses,[]);
 if(id==='sensemaking')assert(Object.values(pkg.preset.categories).every(category=>category.rule.includes('note.approach')&&category.rule.includes('note.mode')));
});
test.after(()=>h.cleanup());

test('fresh installations inherit only two presets; saved retired entries and missing canvas intent survive',()=>{
 const definition={id:'wuxing',configuration:M.facetsConfigurationSchema},read=stored=>M.facetLibrary(M.readViewConfiguration(definition,stored));
 assert.deepEqual(M.FACET_TEMPLATE_ORDER,['wuxing','map-roles']);assert.deepEqual(Object.keys(read({}).presets),['wuxing','map-roles']);
 const stored={wuxing:{version:2,values:{presets:archivedFacetPresets,presetOrder:['arc','para','gtd','eaccess','sensemaking','publishing','wuxing','map-roles']}}},before=JSON.stringify(stored),library=read(stored);
 for(const [id,preset]of Object.entries(archivedFacetPresets)){assert.deepEqual(library.presets[id],preset);assert.equal(M.resolveFacetPreset(library,id).status,'ready');}
 assert.equal(JSON.stringify(stored),before);const missing=M.resolveFacetPreset(read({}),'arc');assert.equal(missing.status,'missing');assert.equal(missing.requestedId,'arc');assert.equal(missing.id,'wuxing');
});
test('Dumo-compatible status emoji aliases use one cached property and never change saved note classifications',()=>{
 const preset=M.FACET_TEMPLATES.wuxing,emojis={wood:'🟢',fire:'🔴',earth:'🟤',metal:'🟡',water:'🔵'},reads=[];
 assert.equal(preset.field,'status');assert.deepEqual(preset.order,Object.keys(emojis));assert.equal(preset.start,'wood');
 for(const [phase,emoji]of Object.entries(emojis)){
  assert.equal(preset.categories[phase].assignment,emoji);
  for(const value of [emoji,[emoji,emoji],emoji+'\uFE0F',phase])assert.deepEqual(M.classifyFacetValues(value,preset),{status:'assigned',category:phase});
 }
 assert.equal(M.classifyFacetValues(['🟢','🟡'],preset).status,'conflicting');assert.equal(M.classifyFacetValues(undefined,preset).status,'unassigned');assert.equal(M.classifyFacetValues('?',preset).status,'unassigned');
 const node={id:'note',kind:'document',file:{extension:'md'}},read={properties:{read:(id,field)=>{reads.push([id,field]);return {status:'available',value:'🟢'}}}};
 assert.deepEqual(M.classifyFacetNode(node,read,preset),{status:'assigned',category:'wood'});assert.deepEqual(reads,[['note','status']]);
 const before=JSON.stringify(preset),wood=preset.order.map(phase=>M.facetRelativeLabel(preset,'wood',phase)),metal=preset.order.map(phase=>M.facetRelativeLabel(preset,'metal',phase));assert.notDeepEqual(wood,metal);
 assert.equal(wood[0].key,'facets.relativeSame');assert.equal(metal[0].key,'facets.relativeRegulate');assert.equal(JSON.stringify(preset),before);
 assert(preset.order.every(phase=>M.facetRelativeLabel(preset,undefined,phase).key==='facets.relativeUnavailable'));
});
test('Wu Xing uses fixed clockwise phase positions with ten decorative guides and a centered focus',()=>{
 const preset=M.FACET_TEMPLATES.wuxing,rows=[{id:'focus'},...preset.order.map(phase=>({id:phase,areaId:JSON.stringify(['facets','wuxing','category',phase])}))],projection={entry:'focus',occurrences:rows,edges:[]},before=JSON.stringify(projection);
 const result=M.layoutFacets(projection,rows.map(row=>({id:row.id,width:160,height:40})),'wuxing',preset),centers=Object.fromEntries(preset.order.map(phase=>{const area=result.areas.find(area=>area.id===JSON.stringify(['facets','wuxing','category',phase]));return [phase,{x:area.bounds.x+area.bounds.width/2,y:area.bounds.y+area.bounds.height/2}]}));
 assert(Math.abs(centers.wood.x)<.001&&centers.wood.y<0);assert(centers.fire.x>0&&centers.fire.y<0);assert(centers.earth.x>0&&centers.earth.y>0);assert(centers.metal.x<0&&centers.metal.y>0);assert(centers.water.x<0&&centers.water.y<0);
 const guides=result.decorations.filter(mark=>mark.kind==='guide');assert.equal(guides.length,10);assert(guides.every(mark=>!mark.source&&!mark.targetNode));assert.equal(result.positions.get('focus').x,0);assert.equal(result.positions.get('focus').y,0);assert.equal(JSON.stringify(projection),before);
});
