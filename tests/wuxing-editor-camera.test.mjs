/** Exercise the real shared attention-editor camera callbacks with an off-origin phase anchor.
 * Native document/content and resize/reclassification acceptance remain in the Windows lane. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import ts from 'typescript';

const source=ts.createSourceFile('PlexGraph.tsx',readFileSync(new URL('../src/ui/PlexGraph.tsx',import.meta.url),'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
/** Extract an actual callback, supplying only its surrounding host capabilities. */
function callback(kind,dependencies){
 let selected;
 const visit=node=>{
  if(kind==='maximize'&&ts.isCallExpression(node)&&node.expression.getText(source)==='useLayoutEffect'
   &&node.arguments[0]?.getText(source).includes('if (!restoreCentralEditorCamera.current'))selected=node.arguments[0].getText(source);
  if(kind==='fit'&&ts.isVariableDeclaration(node)&&node.name.getText(source)==='fit')selected=node.initializer?.getText(source);
  if(kind==='reframe'&&ts.isBinaryExpression(node)&&node.left.getText(source)==='reframeSidecarViewport.current')selected=node.right.getText(source);
  ts.forEachChild(node,visit);
 };
 visit(source);assert(selected,'Existing shared camera callback must be present');
 const code=ts.transpileModule('const selected='+selected,{compilerOptions:{target:ts.ScriptTarget.ES2021,module:ts.ModuleKind.None}}).outputText;
 return Function(...Object.keys(dependencies),code+';return selected;')(...Object.values(dependencies));
}
/** Retain a manual camera and actual measured editor occurrence without mocking its translation. */
function fixture(maximized=true){
 const camera={x:93,y:-48,scale:1.7},node={x:320,y:-280,width:780,height:540},calls=[];
 const dependencies={viewport:{current:{clientWidth:800,clientHeight:600}},centralEditorMaximized:maximized,centralEditorAvailable:true,
  centralEditorNode:node,displayResizePending:{current:false},displayResizeLayout:{current:false},
  restoreCentralEditorCamera:{current:false},centralEditorRestoreCamera:{current:null},
  applyCamera:(value,automatic)=>{Object.assign(camera,typeof value==='function'?value(camera):value);calls.push({automatic})},flushCameraTransform:()=>{}};
 return {camera,node,calls,dependencies};
}
for(const kind of ['maximize','fit'])test('expanded '+kind+' centers the actual editor occurrence at full scale',()=>{
 const f=fixture();callback(kind,f.dependencies)();
 assert.deepEqual({x:f.camera.x+f.node.x*f.camera.scale,y:f.camera.y+f.node.y*f.camera.scale},{x:400,y:300});
 assert.equal(f.camera.scale,1);assert.equal(f.calls.length,1);
});
test('ordinary editor reflow retains the manual camera; explicit restore recovers its exact coordinates',()=>{
 const f=fixture(false),before={...f.camera};callback('maximize',f.dependencies)();assert.deepEqual(f.camera,before);assert.equal(f.calls.length,0);
 f.dependencies.restoreCentralEditorCamera.current=true;f.dependencies.centralEditorRestoreCamera.current={x:-71,y:82,scale:2.2};
 callback('maximize',f.dependencies)();assert.deepEqual(f.camera,{x:-71,y:82,scale:2.2});assert.equal(f.dependencies.restoreCentralEditorCamera.current,false);assert.equal(f.dependencies.centralEditorRestoreCamera.current,null);
});
test('maximized Sidecar reflow uses the actual editor anchor even when automatic zoom is disabled',()=>{
 const f=fixture();f.dependencies.viewport.current.isConnected=true;
 callback('reframe',{...f.dependencies,settings:{allowAutozoom:false},framingOccurrence:()=>({x:-999,y:999}),fit:()=>callback('fit',f.dependencies)()})();
 assert.deepEqual({x:f.camera.x+f.node.x*f.camera.scale,y:f.camera.y+f.node.y*f.camera.scale},{x:400,y:300});assert.equal(f.camera.scale,1);
});
