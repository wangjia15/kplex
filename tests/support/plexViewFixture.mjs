/** Finite host doubles around the real Classic projection, styles and geometry. */
import { build } from 'esbuild';

/** Bundle actual modules while keeping native host construction outside these pure fixtures. */
export async function plexViewModules(entries = []) {
  const output = await build({stdin:{resolveDir:process.cwd(),contents:[
    'src/ui/layout.ts','src/ui/relationGroups.ts','src/settings.ts','src/index/GraphIndex.ts',...entries,
  ].map(path=>`export * from './${path}';`).join('\n')},write:false,bundle:true,format:'cjs',platform:'node',
  plugins:[{name:'finite-native-host',setup(builder){
    builder.onResolve({filter:/^obsidian$/},()=>({path:'host',namespace:'finite'}));
    builder.onLoad({filter:/.*/,namespace:'finite'},()=>({contents:`
      export class App {} export class ButtonComponent {} export class Modal {} export class SuggestModal extends Modal {}
      export class Component {load(){} unload(){}}
      export const MarkdownRenderer={render:()=>{throw Error('Native Markdown rendering is unavailable in the portable graph fixture')}};
      export class ColorComponent {} export class Notice {} export class Setting {} export class AbstractInputSuggest {}
      export class ExtraButtonComponent {} export class Scope {} export class SecretComponent {} export class SearchComponent {} export class PluginSettingTab {}
      export class TFile {} export class TFolder {} export const normalizePath=p=>p;
      export const setIcon=()=>{}; export const setTooltip=()=>{}; export const getIcon=()=>null; export const getIconIds=()=>[];
      export const getAllTags=()=>[]; export const getLanguage=()=> 'en'; export const Platform={};
    `}));
  }}]});
  const module={exports:{}}; Function('module','exports',output.outputFiles[0].text)(module,module.exports);return module.exports;
}

/** Named pages deliberately carry no host graph reader or source acquisition capability. */
export function viewPage(path) {
  return {path,name:path,file:{path,extension:'md'},url:null,isFolder:false,isTag:false,aliases:[],tags:[],styleTags:[],
    primaryStyleTag:null,noteType:null,maxLabelLength:30,neighbours:new Map()};
}

/** Exercise ordering, direct caps, previous/next merging and duplicate sibling witnesses. */
export function classicFixture(M) {
  const pages=new Map();const page=id=>{if(!pages.has(id))pages.set(id,viewPage(id));return pages.get(id);};
  const relation=(id,role,type=1)=>({page:page(id),role,relationType:type,linkDirection:0,typeDefinition:role});
  const rows=new Map([
    ['root:parent',[relation('p2','parent'),relation('p1','parent'),relation('p3','parent')]],
    ['root:child',[relation('c1','child'),relation('c2','child'),relation('c3','child')]],
    ['root:left',[relation('l','left')]],['root:previous',[relation('prev','previous'),relation('prev2','previous')]],
    ['root:right',[relation('r','right')]],['root:next',[relation('next','next'),relation('next2','next')]],
    ['p2:child',[relation('root','child'),relation('s1','child'),relation('s2','child',2),relation('c1','child')]],
    ['p1:child',[relation('s1','child',2),relation('s3','child'),relation('s2','child')]],
  ]);
  // Select a finite cap directly: settings migration intentionally clamps public UI limits.
  const settings={...M.migrateAndMergeSettings({renderSiblings:true}),maxItemCount:2};page('root');
  const work={neighbours:0,title:0,counts:0};
  const index={plugin:{settings},get:id=>pages.get(id),neighbours:(p,role)=>{work.neighbours++;return rows.get(p.path+':'+role)??[];},
    sortNeighbours:items=>items.sort((a,b)=>a.page.path.localeCompare(b.page.path)),
    titleFor:p=>{work.title++;return p.name;},neighbourCount:()=>{work.counts++;return 0;},gateStats:()=>{work.counts++;return{};},
    visibleRelationshipsWithin:()=>[]};
  return {pages,settings,index,work,neighborhood:M.GraphIndex.prototype.getNeighborhood.call(index,'root')};
}

/** Capture observable geometry only: no source clocks, generated IDs or mutable host objects. */
export function classicGeometrySnapshot(M) {
  const cases=[];
  for(const lateralArrangement of ['split','left'])for(const graphDepth of [1,2])for(const compactingFactor of [1,3]){
    const f=classicFixture(M),settings={...f.settings,lateralArrangement,graphDepth,compactingFactor,horizontalCompactingFactor:compactingFactor};
    for(const editor of [undefined,{width:580,height:340}]){
      const scene=M.buildScene(f.neighborhood,f.index,settings,false,editor,true);
      cases.push({lateralArrangement,graphDepth,compactingFactor,editor:!!editor,
        nodes:scene.nodes.map(n=>({path:n.page.path,role:n.role,x:n.x,y:n.y,width:n.width,height:n.height,label:n.label})),
        edges:scene.edges.map(e=>({id:e.id,sourcePath:e.sourcePath,targetPath:e.targetPath,role:e.role,relationType:e.relationType,direction:e.direction,isCrossLink:e.isCrossLink})),areas:scene.zoneAreas,viewports:scene.zoneViewports});
    }
  }
  return cases;
}
