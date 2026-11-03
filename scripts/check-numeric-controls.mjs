/** Source guard for numeric preference UI. Scalar controls share native/React slider owners;
 * literal text (including arbitrary predicate/property values) retains its existing editors. */
import ts from 'typescript';
import {readdirSync,readFileSync} from 'node:fs';
import {resolve,relative} from 'node:path';
import {pathToFileURL} from 'node:url';

/** Report raw number fields, numeric text callbacks and slider implementations outside owners. */
export function numericControlViolations(source,path) {
 const file=ts.createSourceFile(path,source,ts.ScriptTarget.Latest,true,path.endsWith('tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS),errors=[];
 const owner=path.replaceAll('\\','/'),native=owner==='src/ui/numberSlider.ts',react=owner==='src/ui/components/LayoutSlider.tsx';
 const report=(node,message)=>errors.push(`${path}:${file.getLineAndCharacterOfPosition(node.getStart(file)).line+1}: ${message}`);
 const literal=node=>node&&ts.isStringLiteralLike(node)?node.text:undefined;
 const visit=node=>{
  if(ts.isCallExpression(node)&&ts.isPropertyAccessExpression(node.expression)){
   const method=node.expression.name.text;
   if(['setAttribute','setAttr'].includes(method)&&literal(node.arguments[0])==='type'&&['number','range'].includes(literal(node.arguments[1])))report(node,'Use shared sliders instead of installing a raw numeric input type.');
   if(method==='addSlider'&&!native)report(node,'Use numberSlider for native numeric controls and their visible values.');
   if(method==='addText'&&node.arguments.some(arg=>/\b(?:Number|parseInt|parseFloat)\s*\(/.test(arg.getText(file))))report(node,'Numeric preferences require a shared slider, not a text callback.');
   if(method==='createEl'&&literal(node.arguments[0])==='input'){
    const text=node.arguments[1]?.getText(file)??'';
    if(/\btype\s*:\s*["']number["']/.test(text))report(node,'Numeric input fields are forbidden for preferences.');
    if(/\btype\s*:\s*["']range["']/.test(text)&&!native)report(node,'Use numberSlider instead of a private range input.');
   }
  }
  if(ts.isJsxAttribute(node)&&node.name.getText(file)==='type'){
   const type=literal(node.initializer)||(node.initializer&&ts.isJsxExpression(node.initializer)?literal(node.initializer.expression):undefined);
   if(type==='number')report(node,'Use LayoutSlider instead of a numeric input.');
   if(type==='range'&&!react)report(node,'Use LayoutSlider instead of a private range input.');
  }
  if(ts.isPropertyAssignment(node)&&node.name.getText(file)==='type'&&literal(node.initializer)==='number')report(node,'Numeric control declarations must be bounded sliders.');
  if(ts.isBinaryExpression(node)&&node.operatorToken.kind===ts.SyntaxKind.EqualsToken&&ts.isPropertyAccessExpression(node.left)&&node.left.name.text==='type'&&['number','range'].includes(literal(node.right)))report(node,'Do not create numeric controls outside shared slider owners.');
  ts.forEachChild(node,visit);
 };visit(file);return errors;
}

/** Walk every production UI/configuration source, including future modal and view modules. */
export function auditNumericControls(root=process.cwd()) {
 const files=[];
 const walk=dir=>{for(const entry of readdirSync(dir,{withFileTypes:true})){const path=resolve(dir,entry.name);if(entry.isDirectory())walk(path);else if(/\.tsx?$/.test(entry.name))files.push(path);}};
 walk(resolve(root,'src/ui'));files.push(resolve(root,'src/settings.ts'));
 return {files:files.length,errors:files.flatMap(file=>numericControlViolations(readFileSync(file,'utf8'),relative(root,file).replaceAll('\\','/')))};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){const result=auditNumericControls();if(result.errors.length){console.error(result.errors.join('\n'));process.exitCode=1;}else console.log(`Numeric controls: ${result.files} UI/settings sources, shared slider owners only.`);}
