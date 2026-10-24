/**
 * Portable contracts for the private offline checkpoint's actual injectable function and codec.
 * These tests use Node VM, V8 and filesystem APIs without launching Obsidian or opening a vault.
 * No fake IndexedDB is installed: successful database capture/restore is covered by native gates,
 * while these contracts cover codec semantics and rejection before filesystem/IDB access.
 */
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import {createRequire} from 'node:module';
import {tmpdir} from 'node:os';
import {join,resolve,sep} from 'node:path';
import test from 'node:test';
import v8 from 'node:v8';
import {runInNewContext} from 'node:vm';
import {runIndexingCheckpoint} from '../scripts/testing/obsidian/indexingCheckpoint.mjs';

const require=createRequire(import.meta.url);

/** Extract the actual lexical codec without reimplementing its algorithm or opening storage. */
function actualCodec() {
  const source=runIndexingCheckpoint.toString();
  const begin=source.indexOf('function semanticDigest('),end=source.indexOf('/** Read exact bytes');
  assert(begin>=0&&end>begin,'Actual checkpoint codec boundaries must remain reviewable');
  return runInNewContext(`(()=>{const MAX_FRAME=16*1024*1024;${source.slice(begin,end)};return {digest:semanticDigest,encode:encoded};})()`,{crypto,v8,Buffer});
}

/** Invoke actual frame preflight using real private files, with all IDB access forbidden. */
function actualPreflight(handle,expectedSha256) {
  const source=runIndexingCheckpoint.toString(),begin=source.indexOf('function semanticDigest(');
  const firstEnd=source.indexOf('/** Hash the real current Vault-visible inventory');
  const readerBegin=source.indexOf('function reader(handle)'),end=source.indexOf('\n  try {');
  assert(begin>=0&&firstEnd>begin&&readerBegin>firstEnd&&end>readerBegin,'Actual preflight boundaries must remain reviewable');
  const indexedDB=new Proxy({}, {
    /** Preflight of an empty checkpoint must neither inspect nor mutate any database. */
    get(){throw Error('Unexpected IndexedDB access during file preflight');},
  });
  const inspect=runInNewContext(`(()=>{const MAX_FILE=512*1024*1024,MAX_FRAME=16*1024*1024,MAGIC=Buffer.from('KPX201C1');
    /** Isolate pure file validation from the native app ownership boundary tested separately. */
    function guard(){};${source.slice(begin,firstEnd)};${source.slice(readerBegin,end)};return inspectFile;})()`,
    {fs,crypto,v8,Buffer,expectedSha256,indexedDB});
  return inspect(handle);
}

/** Build a tiny real format-2 checkpoint with one empty store and authenticated semantic hashes. */
function emptyCheckpoint() {
  const codec=actualCodec(),schema={version:1,stores:[{name:'facts',keyPath:null,autoIncrement:false,indexes:[]}]},inventory=[];
  const header={format:2,schema,schemaHash:codec.digest(schema),inventory,inventoryHash:codec.digest(inventory)};
  const rows=[{count:0,sha256:crypto.createHash('sha256').digest('hex')}];
  /** Frame the unmodified actual codec's output in the production binary layout. */
  function frame(type,value){const payload=codec.encode(value),head=Buffer.alloc(9);head[0]=type;head.writeUInt32LE(payload.length,5);return Buffer.concat([head,payload]);}
  return Buffer.concat([Buffer.from('KPX201C1'),frame(1,header),frame(3,{rows})]);
}

/** Invoke the unchanged toString-injected helper with observers that forbid all storage access. */
async function rejectedBeforeStorage({app,request}) {
  const accesses=[];
  const observedFs=new Proxy(fs,{
    /** Fail immediately if an invalid request reaches a filesystem operation. */
    get(target,key) {
      if(typeof target[key]!=='function')return target[key];
      /** Record the operation name only; never touch an actual vault or record raw arguments. */
      return function forbiddenFilesystemOperation(){accesses.push('fs:'+String(key));throw Error('Unexpected filesystem access');};
    },
  });
  const indexedDB=new Proxy({}, {
    /** No rejected input may query, open, create or mutate an IndexedDB database. */
    get(_target,key){accesses.push('idb:'+String(key));throw Error('Unexpected IndexedDB access');},
  });
  /** Supply genuine Node modules, changing only filesystem access into a fail-fast observer. */
  function hostRequire(name){return name==='node:fs'?observedFs:require(name);}
  const injected=runInNewContext(`(${runIndexingCheckpoint.toString()})`,{require:hostRequire,indexedDB,window:{setTimeout,clearTimeout}});
  let failure;
  try{await injected(app,request);}catch(error){failure=error;}
  assert(failure,'Invalid input must reject');assert.deepEqual(accesses,[],'Rejected input must have no filesystem/IDB effects');
  return failure;
}

/** Invalid injected requests must fail before any actual filesystem or database admission. */
test('checkpoint injection rejects invalid ownership/cancellation before any storage access',async()=>{
  const app={vault:{/** Model the owned vault without providing any file access capability. */getName(){return 'kplex-test-small';}},plugins:{plugins:{}}};
  const request={action:'capture',vaultPath:'C:\\Obsidian\\kplex-test-small'};
  assert.match((await rejectedBeforeStorage({app,request:{...request,action:'invalid'}})).message,/Unknown checkpoint action/);
  assert.match((await rejectedBeforeStorage({app,request:{...request,cancelled:true}})).message,/Checkpoint cancelled/);
  assert.match((await rejectedBeforeStorage({app:{...app,vault:{/** Model a foreign vault that must be rejected immediately. */getName(){return 'personal';}}},request})).message,/Offline Small vault required/);
  assert.match((await rejectedBeforeStorage({app:{...app,plugins:{plugins:{'k-plex':{}}}},request})).message,/Offline Small vault required/);
  assert.match((await rejectedBeforeStorage({app,request:{...request,vaultPath:'C:\\Other'}})).message,/Explicit native Small vault path required/);
});

/** Supported scalar, cyclic, sparse and collection facts must survive the actual V8 codec. */
test('checkpoint codec roundtrips supported clone graphs and stable semantic digests',()=>{
  const codec=actualCodec(),shared={value:'shared'},sparse=new Array(4);sparse[2]=undefined;
  const graph={undefinedValue:undefined,nan:NaN,negativeZero:-0,positiveInfinity:Infinity,negativeInfinity:-Infinity,
    integer:12345678901234567890n,text:'exact \ud800 and \udc00',date:new Date(1700000000000),
    regexp:/alpha/giu,map:new Map(),set:new Set(),sparse,left:shared,right:shared};
  graph.self=graph;graph.map.set(shared,graph);graph.set.add(shared);graph.set.add(graph);
  const restored=v8.deserialize(codec.encode(graph));
  assert.deepEqual(restored,graph);assert.equal(restored.self,restored);assert.equal(restored.left,restored.right);
  assert.equal(restored.map.get(restored.left),restored);assert(restored.set.has(restored));
  assert.equal(0 in restored.sparse,false);assert.equal(2 in restored.sparse,true);assert.equal(Object.is(restored.negativeZero,-0),true);
  assert.equal(codec.digest(restored),codec.digest(graph));
  const invalidDate=new Date(NaN),restoredInvalidDate=v8.deserialize(codec.encode(invalidDate));
  assert(Number.isNaN(restoredInvalidDate.getTime()));assert.equal(codec.digest(restoredInvalidDate),codec.digest(invalidDate));
  assert.equal(codec.digest({b:2,a:1}),codec.digest({a:1,b:2}),'Object insertion order is representation, not fact content');
  const slicedTwoByte=('\u0100'+'latin text '.repeat(32)).slice(1),literalLatin='latin text '.repeat(32);
  assert.equal(codec.digest(v8.deserialize(codec.encode(slicedTwoByte))),codec.digest(literalLatin),
    'String representation history must not affect the semantic digest after V8 reconstruction');
  for(const [a,b]of [[undefined,null],[NaN,null],[-0,0],[Infinity,-Infinity],[1n,1],['\ud800','\ufffd'],[[],new Array(1)],[new Map(),{}]]){
    assert.notEqual(codec.digest(a),codec.digest(b),'Distinct supported semantics must retain distinct digests');
  }
});

/** Binary view digests compare logical view bytes after V8 chooses its own backing allocation. */
test('checkpoint semantic digest survives V8 normalized standalone binary views',()=>{
  const codec=actualCodec();
  for(const original of [new Uint8Array([1,2,255]),new Uint16Array([1,512]),new Float64Array([NaN,-0,Infinity]),
    new DataView(Uint8Array.from([0,7,9,0]).buffer,1,2),Uint8Array.from([1,2,3]).buffer]){
    const value={value:original,alias:original},restored=v8.deserialize(codec.encode(value));
    assert.equal(restored.value,restored.alias,'Explicit object aliases must survive');
    assert.equal(Object.prototype.toString.call(restored.value),Object.prototype.toString.call(original));
    assert.equal(codec.digest(restored),codec.digest(value),'Backing allocation offsets cannot cause false digest failures');
  }
});

/** V8 introduces backing-store sharing for independent views, so reject that input before capture. */
test('checkpoint codec cannot silently introduce backing-store sharing',()=>{
  const codec=actualCodec(),value={a:new Uint8Array([1,2]),b:new Uint8Array([3,4])};
  const nativeRestored=v8.deserialize(v8.serialize(value));
  assert.equal(nativeRestored.a.buffer,nativeRestored.b.buffer,'Pinned V8 characterization: distinct views acquire a shared wire backing allocation');
  assert.throws(/** Reject this demonstrated lossy topology before a checkpoint frame is written. */()=>codec.encode(value),/Multiple checkpoint binary views unsupported/);
});

/** Reject data the V8 codec would lose, including invisible properties and backing-store edges. */
test('checkpoint codec rejects unsupported clone values and lossy backing-store topology',()=>{
  const codec=actualCodec(),buffer=new ArrayBuffer(8),view=new Uint8Array(buffer);
  const accessor={};Object.defineProperty(accessor,'value',{enumerable:true,/** Reject the descriptor without executing user code. */get(){throw Error('Accessor must never execute');}});
  const hidden={};Object.defineProperty(hidden,'secret',{value:1});
  const hiddenArray=[];Object.defineProperty(hiddenArray,'secret',{value:1});
  const regexp=/value/g;regexp.lastIndex=2;
  const decoratedDate=new Date(0);decoratedDate.extra='would disappear';
  const decoratedMap=new Map();decoratedMap.extra='would disappear';
  const decoratedView=new Uint8Array([1]);decoratedView.extra='would disappear';
  for(const value of [Symbol('private'),/** Functions cannot be checkpoint clone facts. */()=>1,new Error('host object'),Object.create(null),accessor,{[Symbol('key')]:1},
    {buffer,view},{view,buffer},[view,new DataView(buffer)],[new Uint8Array(buffer,0,2),new Uint8Array(buffer,4,2)],
    hidden,hiddenArray,regexp,decoratedDate,decoratedMap,decoratedView,
    new SharedArrayBuffer(4),new Uint8Array(new SharedArrayBuffer(4)),new ArrayBuffer(4,{maxByteLength:8})]){
    assert.throws(/** Every unsupported synthetic graph must fail before serialization is accepted. */()=>codec.encode(value),/Unsupported|unsupported|Symbol|Accessor|Resizable/);
  }
  assert.doesNotThrow(/** A repeated reference is supported without introducing a second backing view. */()=>codec.encode({a:view,b:view}),'Repeating the same standalone view preserves explicit identity');
});

/** The codec must reject a bounded oversized string before allocating its serialized frame. */
test('checkpoint codec bounds oversized graphs before retaining an oversized frame',()=>{
  const codec=actualCodec();
  assert.throws(/** Exceed the estimate by one fixed frame without building an unbounded fixture. */()=>codec.encode('x'.repeat(8*1024*1024)),/frame estimate exceeds bound/);
});

/** Private file preflight must authenticate complete bytes before any database admission. */
test('checkpoint raw SHA/truncation/trailing-data preflight rejects before database admission',()=>{
  const directory=fs.mkdtempSync(join(tmpdir(),'kplex-pr201-resume-portable-')),path=join(directory,'private.bin');
  const bytes=emptyCheckpoint(),sha256=crypto.createHash('sha256').update(bytes).digest('hex');
  /** Inspect one private fixture with guaranteed descriptor closure, including failed preflight. */
  function inspect(data,expected){fs.writeFileSync(path,data);const handle=fs.openSync(path,'r');try{return actualPreflight(handle,expected);}finally{fs.closeSync(handle);}}
  try{
    const receipt=inspect(bytes,sha256);assert.equal(receipt.sha256,sha256);assert.equal(receipt.rows.length,1);assert.equal(receipt.rows[0].count,0);
    assert.throws(/** Authenticate against a deliberately different expected raw file digest. */()=>inspect(bytes,'0'.repeat(64)),/SHA256 mismatch/);
    assert.throws(/** A short final frame must fail without accepting a partial footer. */()=>inspect(bytes.subarray(0,bytes.length-1),sha256),/bound\/truncation|Incomplete/);
    assert.throws(/** Extra bytes after the footer must never be ignored. */()=>inspect(Buffer.concat([bytes,Buffer.from([0])]),sha256),/trailing\/changed data/);
    assert.equal(fs.readFileSync(path).length,bytes.length+1,'Preflight never rewrites even a rejected private input');
  }finally{
    const root=resolve(tmpdir())+sep,target=resolve(directory);
    assert(target.startsWith(root)&&target.slice(root.length).startsWith('kplex-pr201-resume-portable-'),'Cleanup stays in the owned temporary fixture');
    fs.rmSync(target,{recursive:true,force:true});
  }
});
