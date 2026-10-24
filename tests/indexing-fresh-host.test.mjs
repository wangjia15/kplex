/**
 * Native transport contracts for PR201's fresh-process driver. Inject plain process results;
 * no test launches an app, quits Obsidian, stages artifacts or changes host configuration.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import {createFreshHost} from '../scripts/testing/obsidian/indexingFreshHost.mjs';
import {obsidianCliExecutable} from '../scripts/testing/obsidian/processTools.mjs';

/** Supply finite native results and retain exact shell-free argument arrays/options. */
function fixture(results) {
  const calls=[];
  /** Return only queued transport results; never delegate to an actual native process. */
  function native(file,args,options) {
    calls.push({file,args,options});
    assert(results.length,'Unexpected native transport call');
    return {status:0,stderr:'',stdout:'',...results.shift()};
  }
  return {calls,host:createFreshHost({vault:'C:\\Obsidian\\kplex-test-small'},'unused-private-receipts',{native})};
}

/** Ordinary CLI commands keep their existing deadline and cannot create a visible console. */
test('fresh host CLI uses hidden shell-free exact arguments and established bounds',()=>{
  const {host,calls}=fixture([{stdout:'  kplex-test-small\r\n'}]);
  assert.equal(host.cli('vault','info=name'),'kplex-test-small');
  assert.deepEqual(calls,[{file:obsidianCliExecutable(),args:['vault=kplex-test-small','vault','info=name'],
    options:{encoding:'utf8',timeout:15000,maxBuffer:2*1024*1024,windowsHide:true}}]);
});

/** Evaluation preserves renderer code as one argument and accepts both normal result encodings. */
test('fresh host evaluate decodes ordinary and displayed-prefix JSON without a shell',()=>{
  const {host,calls}=fixture([{stdout:'=> {"ready":true}\r\n'},{stdout:' {"ready":false} '}]);
  const code='JSON.stringify({ready:true})';
  assert.deepEqual(host.evaluate(code),{ready:true});
  assert.deepEqual(host.evaluate('JSON.stringify({ready:false})'),{ready:false});
  assert.deepEqual(calls[0],{file:obsidianCliExecutable(),args:['vault=kplex-test-small','eval','code='+code],
    options:{encoding:'utf8',timeout:15000,maxBuffer:2*1024*1024,windowsHide:true}});
  assert.equal(calls[1].options.windowsHide,true);
});

/** Offline checkpoint operations retain their separate bounded deadline and exact code payload. */
test('fresh host checkpoint uses a hidden console and its existing independent deadline',()=>{
  const {host,calls}=fixture([{stdout:'=> {"sha256":"receipt","stores":15}\r\n'}]);
  const code='(async()=>JSON.stringify(await offlineCheckpoint()))()';
  assert.deepEqual(host.checkpoint(code),{sha256:'receipt',stores:15});
  assert.deepEqual(calls,[{file:obsidianCliExecutable(),args:['vault=kplex-test-small','eval','code='+code],
    options:{encoding:'utf8',timeout:120000,maxBuffer:2*1024*1024,windowsHide:true}}]);
});

/** Power observation hides both console helpers while retaining a read-only native query. */
test('fresh host power hides powercfg and its Electron query with exact arguments and deadlines',()=>{
  const nativeFacts={onBattery:false,displays:[{id:1,bounds:{x:0,y:0,width:1920,height:1080},scaleFactor:1}],throttle:true,visible:true};
  const {host,calls}=fixture([{stdout:'  Power Scheme GUID: test (Balanced)\r\n'},{stdout:JSON.stringify(nativeFacts)}]);
  const result=host.power();
  assert(Number.isFinite(result.at));assert.equal(result.plan,'Power Scheme GUID: test (Balanced)');
  assert.deepEqual({...result,at:0},{at:0,plan:'Power Scheme GUID: test (Balanced)',...nativeFacts});
  assert.deepEqual(calls[0],{file:'powercfg.exe',args:['/getactivescheme'],options:{encoding:'utf8',timeout:10000,windowsHide:true}});
  assert.deepEqual(calls[1],{file:obsidianCliExecutable(),args:['vault=kplex-test-small','eval',
    `code=JSON.stringify((()=>{const r=require('@electron/remote');return {onBattery:r.powerMonitor.isOnBatteryPower(),
      displays:r.screen.getAllDisplays().map(d=>({id:d.id,bounds:d.bounds,scaleFactor:d.scaleFactor})),
      throttle:r.getCurrentWindow().webContents.getBackgroundThrottling(),visible:r.getCurrentWindow().isVisible()}})())`],
    options:{encoding:'utf8',timeout:15000,maxBuffer:2*1024*1024,windowsHide:true}});
});

/** A failed native read cannot be mistaken for successful evidence or trigger follow-up work. */
test('fresh host native failures reject without another subprocess attempt',()=>{
  for(const method of ['cli','checkpoint','power']) {
    const {host,calls}=fixture([{status:1,stdout:'Error: failed read',stderr:'failed read'}]);
    assert.throws(/** Invoke only an injected read path, never lifecycle methods. */ ()=>host[method]('test'),/failed read/);
    assert.equal(calls.length,1);assert.equal(calls[0].options.windowsHide,true);
  }
});
