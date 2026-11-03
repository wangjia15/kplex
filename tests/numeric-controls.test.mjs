/** Enforce the standing numeric UI rule across every Settings, modal and view module. */
import test from 'node:test';import assert from 'node:assert/strict';
import {auditNumericControls,numericControlViolations} from '../scripts/check-numeric-controls.mjs';
test('every production numeric preference uses shared slider owners',()=>{const result=auditNumericControls();assert(result.files>100);assert.deepEqual(result.errors,[]);});
test('negative fixtures reject numeric fields and private rails while literal editors remain valid',()=>{
 for(const source of ['const x=<input type="number"/>','const x=<input type={"number"}/>','const x=<input type="range"/>','row.addText(input=>input.onChange(raw=>Number(raw)))','row.addSlider(slider=>slider.setValue(5))','root.createEl("input",{attr:{type:"number"}})','const control={type:"number",key:"width"}','input.type="number"','input.setAttribute("type","number")'])assert(numericControlViolations(source,'src/ui/Probe.tsx').length,source);
 assert.deepEqual(numericControlViolations('row.addText(input=>input.onChange(value=>setName(value)));const x=<textarea/>','src/ui/Probe.tsx'),[]);
 assert.deepEqual(numericControlViolations('row.addSlider(c=>c.setValue(5))','src/ui/numberSlider.ts'),[]);
 assert.deepEqual(numericControlViolations('const x=<input type="range"/>','src/ui/components/LayoutSlider.tsx'),[]);
});
